// daily-trend-regime — signal module (survey rank #3). Backtest-only; consumed by
// scripts/fold_engine.js. Edge = EMA(20/50) trend, gated to fire only in directional regimes
// (Efficiency Ratio). The regime gate MUST beat always-on trend in ablation (the #2/#3 grave).
// Funding is a COST here. See plan.md / spec.md.
import { ema, efficiencyRatio } from '../../scripts/fold_engine.js';

export const meta = {
  name: 'daily-trend-regime',
  symbol: 'BTCUSDT', interval: 'D',
  startTime: Date.parse('2020-03-25T00:00:00Z'),
  isOOSBoundary: Date.parse('2024-01-01T00:00:00Z'),
};

export const anchors = {
  emaFast: 20, emaSlow: 50,
  erLen: 10, erThr: 0.30,   // efficiency-ratio gate
  atrLen: 14, atrMult: 3,
  holdCapBars: Infinity,
};

function trendSeries(bars, p) {
  const close = bars.map((b) => b.close);
  const ef = ema(close, p.emaFast);
  const es = ema(close, p.emaSlow);
  return bars.map((_, i) => (Number.isNaN(ef[i]) || Number.isNaN(es[i])) ? 0 : (ef[i] > es[i] ? 1 : ef[i] < es[i] ? -1 : 0));
}

// Gated trend (main): trend signal AND regime on. No look-ahead (all indicators use ≤ close[i]).
export function target(bars, _funding, p = anchors) {
  const close = bars.map((b) => b.close);
  const trend = trendSeries(bars, p);
  const er = efficiencyRatio(close, p.erLen);
  return bars.map((_, i) => (Number.isFinite(er[i]) && er[i] >= p.erThr) ? trend[i] : 0);
}

export const ablations = {
  // always-on trend: same EMA signal, regime gate removed. If this matches, the gate is dead.
  alwaysOnTrend: (bars, _funding, p = anchors) => trendSeries(bars, p),
};

export default { meta, anchors, target, ablations };
