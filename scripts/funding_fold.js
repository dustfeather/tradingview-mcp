#!/usr/bin/env node
// Bybit v5 funding-rate full-history fetcher + per-trade accrual helper.
//
// Why this file exists (RESEARCH.md lesson #6, "harness debt"):
//   The external-fold harness reconstructs net P&L by replaying Pine logic over
//   Bybit klines minus trade fees minus FUNDING accrued over each hold. The
//   funding fetch used during candidates #1-#3 was inline ctx_execute code that
//   only ever grabbed the newest page of /v5/market/funding/history (~200 rows,
//   limit-capped). That was immaterial for intraday/4H holds (funding
//   ~0.002%/tr, three orders below the ~0.20% edge bar, and it only subtracts).
//
//   It becomes LOAD-BEARING for swing/daily horizons: multi-day holds cross many
//   funding stamps and the backtest window reaches years back, well past the
//   newest 200 rows. /v5/market/funding/history exposes no opaque cursor — full
//   history is obtained ONLY by walking the endTime window backward. This module
//   does that walk correctly, so longer-hold net is trustworthy from trade one.

const BYBIT = 'https://api.bybit.com';
const FUNDING_PATH = '/v5/market/funding/history';
const MAX_LIMIT = 200; // Bybit hard cap per page

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch the COMPLETE funding-rate history for [startTime, endTime].
 *
 * The endpoint returns at most MAX_LIMIT rows, newest-first, for the requested
 * window. We page by moving endTime to (oldest_ts - 1) each round, keeping
 * startTime pinned, until a page comes back short or empty, or we cross
 * startTime. Returns ASC by timestamp, de-duplicated.
 *
 * @param {Object} o
 * @param {string} o.symbol       e.g. "BTCUSDT"
 * @param {string} [o.category]   "linear" (default) | "inverse"
 * @param {number} o.startTime    inclusive floor, ms epoch
 * @param {number} [o.endTime]    inclusive ceil, ms epoch (default: now)
 * @param {number} [o.pauseMs]    inter-page delay, ms (default 120 — rate-limit courtesy)
 * @param {function} [o.fetchImpl] override for testing (default global fetch)
 * @returns {Promise<Array<{ts:number, rate:number}>>}
 */
async function fetchFundingHistory({
  symbol,
  category = 'linear',
  startTime,
  endTime = Date.now(),
  pauseMs = 120,
  fetchImpl = fetch,
}) {
  if (!symbol) throw new Error('fetchFundingHistory: symbol required');
  if (!Number.isFinite(startTime)) throw new Error('fetchFundingHistory: startTime (ms) required');

  const byTs = new Map(); // ts -> rate, dedupes overlap at page boundaries
  let cursorEnd = endTime;
  let guard = 0; // hard backstop against an endpoint that never shortens

  while (cursorEnd >= startTime) {
    if (++guard > 10_000) throw new Error('fetchFundingHistory: page guard tripped — endpoint not advancing');

    const url = `${BYBIT}${FUNDING_PATH}?category=${category}&symbol=${symbol}`
      + `&startTime=${startTime}&endTime=${cursorEnd}&limit=${MAX_LIMIT}`;

    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`funding fetch HTTP ${res.status} for ${symbol}`);
    const body = await res.json();
    if (body.retCode !== 0) throw new Error(`funding fetch retCode ${body.retCode}: ${body.retMsg}`);

    const list = body?.result?.list ?? [];
    if (list.length === 0) break;

    let oldest = Infinity;
    for (const row of list) {
      const ts = Number(row.fundingRateTimestamp);
      if (ts < oldest) oldest = ts;
      if (ts >= startTime && ts <= endTime) byTs.set(ts, Number(row.fundingRate));
    }

    // Short page => window exhausted. Else step the ceiling below the oldest row.
    if (list.length < MAX_LIMIT) break;
    const nextEnd = oldest - 1;
    if (nextEnd >= cursorEnd) break; // no progress — bail rather than spin
    cursorEnd = nextEnd;

    if (pauseMs) await sleep(pauseMs);
  }

  return [...byTs.entries()].map(([ts, rate]) => ({ ts, rate })).sort((a, b) => a.ts - b.ts);
}

/**
 * Funding paid (>0) or received (<0) by a position held over [entryTs, exitTs].
 *
 * Sign convention: a LONG pays positive funding; a SHORT pays negative funding.
 * Returned value is the fraction of notional the position LOSES to funding
 * (positive = cost). Multiply by notional for currency, or use directly as a
 * per-trade % drag in the net-edge gate.
 *
 * @param {Array<{ts:number, rate:number}>} funding  ASC history (from fetchFundingHistory)
 * @param {number} entryTs   ms epoch, inclusive
 * @param {number} exitTs    ms epoch, inclusive
 * @param {1|-1}   side      1 = long, -1 = short
 * @returns {number} signed funding cost as a fraction (e.g. 0.0009 = 9 bps drag)
 */
function fundingCostOverHold(funding, entryTs, exitTs, side) {
  let sumRate = 0;
  for (const { ts, rate } of funding) {
    if (ts >= entryTs && ts <= exitTs) sumRate += rate;
  }
  return side * sumRate;
}

export { fetchFundingHistory, fundingCostOverHold, MAX_LIMIT };

// CLI: node scripts/funding_fold.js <symbol> <startISO> [endISO]
// Prints row count + summed funding over the window (sanity check the full walk).
if (import.meta.url === `file://${process.argv[1]}`) {
  const [symbol, startISO, endISO] = process.argv.slice(2);
  if (!symbol || !startISO) {
    console.error('usage: node scripts/funding_fold.js <symbol> <startISO> [endISO]');
    process.exit(1);
  }
  const startTime = Date.parse(startISO);
  const endTime = endISO ? Date.parse(endISO) : Date.now();
  fetchFundingHistory({ symbol, startTime, endTime })
    .then((hist) => {
      const total = hist.reduce((s, r) => s + r.rate, 0);
      const span = hist.length
        ? `${new Date(hist[0].ts).toISOString()} … ${new Date(hist[hist.length - 1].ts).toISOString()}`
        : '(empty)';
      console.log(JSON.stringify({
        symbol,
        rows: hist.length,
        span,
        summedFundingRate: total,
        summedPct: (total * 100).toFixed(4) + '%',
      }, null, 2));
    })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
