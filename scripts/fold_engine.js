#!/usr/bin/env node
// Reusable external-fold backtest engine for swing/daily candidates.
//
// Why this exists (RESEARCH.md lesson #7): the harness is the reusable asset, the alpha is
// disposable. This engine owns everything that is constant across candidates — data fetch,
// indicators, the no-look-ahead simulator, friction, signed funding, per-LEG stats, IS/OOS
// split, the gate, and the ablation runner. Each strategy supplies only a thin signal module
// (strategies/<name>/signal.js) that maps bars(+funding) → a target-position series.
//
// Cost model (inherited): 0.17% round-trip friction per trade; funding subtracted (or, for the
// carry candidate, added as revenue) per-hold via funding_fold.js fundingCostOverHold against
// the full-history fold. Net is authoritative here — NOT the TV strategy-tester (read broken).

import { fetchFundingHistory, fundingCostOverHold } from './funding_fold.js';

const BYBIT = 'https://api.bybit.com';
const KLINE_PATH = '/v5/market/kline';
const KLINE_MAX = 1000; // Bybit hard cap per page
export const FRICTION_RT = 0.0017; // 0.17% round trip (taker + slippage)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * Full daily (or any-interval) kline history for [startTime, endTime], ASC, deduped.
 * Bybit returns newest-first, ≤1000/page; we page by walking `end` backward, mirroring the
 * funding fold. interval: "D","W","60","240",... per Bybit v5.
 * @returns {Promise<Array<{ts,open,high,low,close,volume}>>}
 */
export async function fetchKlines({
  symbol, interval = 'D', startTime, endTime = Date.now(),
  category = 'linear', pauseMs = 120, fetchImpl = fetch,
}) {
  if (!symbol) throw new Error('fetchKlines: symbol required');
  if (!Number.isFinite(startTime)) throw new Error('fetchKlines: startTime (ms) required');
  const byTs = new Map();
  let cursorEnd = endTime, guard = 0;
  while (cursorEnd >= startTime) {
    if (++guard > 10_000) throw new Error('fetchKlines: page guard tripped');
    const url = `${BYBIT}${KLINE_PATH}?category=${category}&symbol=${symbol}`
      + `&interval=${interval}&start=${startTime}&end=${cursorEnd}&limit=${KLINE_MAX}`;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`kline fetch HTTP ${res.status} for ${symbol}`);
    const body = await res.json();
    if (body.retCode !== 0) throw new Error(`kline retCode ${body.retCode}: ${body.retMsg}`);
    const list = body?.result?.list ?? [];
    if (list.length === 0) break;
    let oldest = Infinity;
    for (const r of list) { // [start, open, high, low, close, volume, turnover]
      const ts = Number(r[0]);
      if (ts < oldest) oldest = ts;
      if (ts >= startTime && ts <= endTime) {
        byTs.set(ts, { ts, open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] });
      }
    }
    if (list.length < KLINE_MAX) break;
    const nextEnd = oldest - 1;
    if (nextEnd >= cursorEnd) break;
    cursorEnd = nextEnd;
    if (pauseMs) await sleep(pauseMs);
  }
  return [...byTs.values()].sort((a, b) => a.ts - b.ts);
}

// ---------------------------------------------------------------------------
// Indicators (return arrays aligned to bars; NaN where insufficient history)
// ---------------------------------------------------------------------------

export function sma(xs, len) {
  const out = new Array(xs.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    sum += xs[i];
    if (i >= len) sum -= xs[i - len];
    if (i >= len - 1) out[i] = sum / len;
  }
  return out;
}

export function ema(xs, len) {
  const out = new Array(xs.length).fill(NaN);
  const k = 2 / (len + 1);
  let prev;
  for (let i = 0; i < xs.length; i++) {
    if (i === len - 1) { // seed with SMA
      let s = 0; for (let j = 0; j < len; j++) s += xs[j];
      prev = s / len; out[i] = prev;
    } else if (i >= len) {
      prev = xs[i] * k + prev * (1 - k); out[i] = prev;
    }
  }
  return out;
}

export function rsi(close, len) {
  const out = new Array(close.length).fill(NaN);
  let avgG = 0, avgL = 0;
  for (let i = 1; i < close.length; i++) {
    const ch = close[i] - close[i - 1];
    const g = Math.max(ch, 0), l = Math.max(-ch, 0);
    if (i <= len) { avgG += g; avgL += l; if (i === len) { avgG /= len; avgL /= len; out[i] = 100 - 100 / (1 + avgG / (avgL || 1e-12)); } }
    else { avgG = (avgG * (len - 1) + g) / len; avgL = (avgL * (len - 1) + l) / len; out[i] = 100 - 100 / (1 + avgG / (avgL || 1e-12)); }
  }
  return out;
}

/** Wilder ATR aligned to bars. */
export function atr(bars, len) {
  const tr = bars.map((b, i) => i === 0 ? b.high - b.low
    : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)));
  const out = new Array(bars.length).fill(NaN);
  let seed = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i < len) { seed += tr[i]; if (i === len - 1) out[i] = seed / len; }
    else out[i] = (out[i - 1] * (len - 1) + tr[i]) / len;
  }
  return out;
}

/** Kaufman efficiency ratio over `len`, aligned to bars. */
export function efficiencyRatio(close, len) {
  const out = new Array(close.length).fill(NaN);
  for (let i = len; i < close.length; i++) {
    const change = Math.abs(close[i] - close[i - len]);
    let vol = 0;
    for (let j = i - len + 1; j <= i; j++) vol += Math.abs(close[j] - close[j - 1]);
    out[i] = vol ? change / vol : 0;
  }
  return out;
}

/** Running funding EMA over K stamps → [{ts, ema}] ASC (ts = stamp time). */
export function fundingEMA(funding, k) {
  const out = [];
  const mult = 2 / (k + 1);
  let prev;
  for (let i = 0; i < funding.length; i++) {
    const { ts, rate } = funding[i];
    if (i === k - 1) { let s = 0; for (let j = 0; j < k; j++) s += funding[j].rate; prev = s / k; out.push({ ts, ema: prev }); }
    else if (i >= k) { prev = rate * mult + prev * (1 - mult); out.push({ ts, ema: prev }); }
  }
  return out;
}

/** Last value of an ASC [{ts,...}] series with ts STRICTLY before cutoff (no look-ahead). */
export function asOf(series, cutoffTs, field) {
  let lo = 0, hi = series.length - 1, ans = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (series[m].ts < cutoffTs) { ans = series[m]; lo = m + 1; } else hi = m - 1; }
  return ans == null ? null : (field ? ans[field] : ans);
}

// ---------------------------------------------------------------------------
// Simulator — no look-ahead: target[i] is decided on bar i CLOSE, acted on bar i+1 OPEN.
// Stops checked intrabar against the next bars. Funding applied per-hold, signed.
// ---------------------------------------------------------------------------

/**
 * @param {Object} o
 * @param {Array} o.bars
 * @param {Array<-1|0|1>} o.target   desired position decided at each bar's close
 * @param {Array<number>} o.atrArr   ATR aligned to bars (for stops); pass null to disable stops
 * @param {number} o.atrMult
 * @param {Array<{ts,rate}>} o.funding
 * @param {number} [o.friction]
 * @param {number} [o.holdCapBars]   force exit after N bars in a trade
 * @returns {Array} trades [{side, entryTs, exitTs, entryPx, exitPx, bars, gross, friction, funding, net, reason}]
 */
export function simulate({ bars, target, atrArr, atrMult = 3, funding, friction = FRICTION_RT, holdCapBars = Infinity }) {
  const trades = [];
  let pos = 0, entryPx = 0, entryTs = 0, entryIdx = 0, stop = 0;
  const close = (exitTs, exitPx, idx, reason) => {
    const gross = pos * (exitPx - entryPx) / entryPx;
    const fund = fundingCostOverHold(funding, entryTs, exitTs, pos); // +cost / -revenue
    trades.push({ side: pos, entryTs, exitTs, entryPx, exitPx, bars: idx - entryIdx, gross, friction, funding: fund, net: gross - friction - fund, reason });
    pos = 0;
  };
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i];
    if (pos !== 0) {
      const stopHit = atrArr ? (pos > 0 ? b.low <= stop : b.high >= stop) : false;
      const flip = target[i - 1] !== pos;
      const capped = (i - entryIdx) >= holdCapBars;
      if (stopHit) close(b.ts, stop, i, 'stop');
      else if (flip || capped) close(b.ts, b.open, i, capped ? 'holdcap' : 'flip');
    }
    if (pos === 0) {
      const want = target[i - 1];
      if (want !== 0) {
        pos = want; entryPx = b.open; entryTs = b.ts; entryIdx = i;
        const a = atrArr ? atrArr[i - 1] : NaN;
        stop = Number.isFinite(a) ? (pos > 0 ? entryPx - atrMult * a : entryPx + atrMult * a) : (pos > 0 ? -Infinity : Infinity);
      }
    }
  }
  if (pos !== 0) { const last = bars[bars.length - 1]; close(last.ts, last.close, bars.length - 1, 'eod'); }
  return trades;
}

// ---------------------------------------------------------------------------
// Stats / gate / split
// ---------------------------------------------------------------------------

function leg(trades) {
  const n = trades.length;
  const wins = trades.filter((t) => t.net > 0);
  const sumW = wins.reduce((s, t) => s + t.net, 0);
  const sumL = -trades.filter((t) => t.net <= 0).reduce((s, t) => s + t.net, 0);
  const net = trades.reduce((s, t) => s + t.net, 0);
  const gross = trades.reduce((s, t) => s + t.gross, 0);
  const fund = trades.reduce((s, t) => s + t.funding, 0);
  return {
    n, net, gross, funding: fund,
    expectancy: n ? net / n : 0,
    winRate: n ? wins.length / n : 0,
    pf: sumL > 0 ? sumW / sumL : (sumW > 0 ? Infinity : 0),
    frictionPaid: n * FRICTION_RT,
  };
}

/** Per-leg + combined stats from a trade list. */
export function stats(trades) {
  return {
    long: leg(trades.filter((t) => t.side === 1)),
    short: leg(trades.filter((t) => t.side === -1)),
    combined: leg(trades),
  };
}

/** Gate: BOTH legs must clear the per-trade expectancy bar (lesson #2: short stands alone). */
export function gate(s, { minExpectancy = 0.0020, minPF = 1.3 } = {}) {
  const longPass = s.long.n > 0 && s.long.expectancy > minExpectancy;
  const shortPass = s.short.n > 0 && s.short.expectancy > minExpectancy;
  const pfPass = s.combined.pf >= minPF;
  return { longPass, shortPass, pfPass, pass: longPass && shortPass && pfPass, minExpectancy, minPF };
}

/** Split trades by entry time into IS / OOS. */
export function splitISOOS(trades, boundaryMs) {
  return { is: trades.filter((t) => t.entryTs < boundaryMs), oos: trades.filter((t) => t.entryTs >= boundaryMs) };
}

/**
 * Run the main signal + each ablation baseline through the same simulator and compare.
 * A candidate must BEAT every ablation on combined net (else the namesake mechanism adds
 * nothing — dead regardless of headline PF, lesson #3).
 * @param {Object} mod  the signal module (target, ablations, anchors)
 * @param {Array} bars
 * @param {Array} funding
 * @param {Array} atrArr
 */
export function runAblations(mod, bars, funding, atrArr) {
  const p = mod.anchors;
  const mk = (tgt) => stats(simulate({ bars, target: tgt, atrArr, atrMult: p.atrMult, funding, holdCapBars: p.holdCapBars ?? Infinity }));
  const main = mk(mod.target(bars, funding, p));
  const baselines = {};
  for (const [name, fn] of Object.entries(mod.ablations ?? {})) baselines[name] = mk(fn(bars, funding, p));
  const beats = Object.fromEntries(Object.entries(baselines).map(([k, v]) => [k, main.combined.net > v.combined.net]));
  return { main, baselines, beats, beatsAll: Object.values(beats).every(Boolean) };
}
