// funding-carry-tilt — signal module (survey rank #1). Backtest-only; consumed by
// scripts/fold_engine.js. Edge = harvest persistently-signed funding (revenue), not price.
// Funding is BOTH the signal and the per-hold revenue → it lives entirely in the external fold
// (Pine cannot read Bybit funding). See plan.md / spec.md for pre-registered anchors.
import { fundingEMA, asOf } from '../../scripts/fold_engine.js';

export const meta = {
  name: 'funding-carry-tilt',
  symbol: 'BTCUSDT', interval: 'D',
  startTime: Date.parse('2020-03-25T00:00:00Z'),
  isOOSBoundary: Date.parse('2024-01-01T00:00:00Z'),
};

// Anchors (fractions; funding rate is per-8h-stamp, e.g. 0.0001 = 0.01%/8h).
export const anchors = {
  K: 21,                 // funding lookback in 8h stamps (≈7 days)
  thrShort: 0.000033,    // EMA ≥ +0.0033%/8h ≈ +3%/yr ⇒ short (get paid)
  thrLong: -0.000033,    // EMA ≤ −0.0033%/8h ⇒ long (get paid)
  holdCapDays: 30,
  get holdCapBars() { return this.holdCapDays; }, // daily bars
  atrLen: 14, atrMult: 3,
};

// Per-bar funding-EMA gate, no look-ahead (stamps strictly before bar open).
export function target(bars, funding, p = anchors) {
  const fe = fundingEMA(funding, p.K);
  return bars.map((b) => {
    const e = asOf(fe, b.ts, 'ema');
    if (e == null) return 0;
    if (e >= p.thrShort) return -1;
    if (e <= p.thrLong) return 1;
    return 0; // dead-band
  });
}

export const ablations = {
  alwaysShort: (bars) => bars.map(() => -1),
  alwaysLong: (bars) => bars.map(() => 1),
  // flat-constant funding: replace the full-history fold with a single average — if this
  // matches the gated result, the fold/signal is doing nothing (spec ablation #3).
  flatConstantFunding: (bars, funding, p = anchors) => {
    const avg = funding.reduce((s, x) => s + x.rate, 0) / (funding.length || 1);
    const sig = avg >= p.thrShort ? -1 : avg <= p.thrLong ? 1 : 0;
    return bars.map(() => sig);
  },
};

export default { meta, anchors, target, ablations };
