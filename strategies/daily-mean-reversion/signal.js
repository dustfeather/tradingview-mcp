// daily-mean-reversion — signal module (survey rank #4, diversifier). Backtest-only; consumed
// by scripts/fold_engine.js. Edge = fade multi-day overextension (RSI2) only with the SMA200
// regime; exit on revert to SMA5. Must beat always-fade in ablation and survive turnover-heavy
// friction. Funding is a COST here. See plan.md / spec.md.
import { rsi, sma } from '../../scripts/fold_engine.js';

export const meta = {
  name: 'daily-mean-reversion',
  symbol: 'BTCUSDT', interval: 'D',
  startTime: Date.parse('2020-03-25T00:00:00Z'),
  isOOSBoundary: Date.parse('2024-01-01T00:00:00Z'),
};

export const anchors = {
  rsiLen: 2, loThr: 10, hiThr: 90,
  trendLen: 200, exitLen: 5,
  atrLen: 14, atrMult: 3,
  holdCapBars: Infinity,
};

// Stateful: enter on RSI extreme within the SMA200 regime, hold until close reverts past SMA5.
export function target(bars, _funding, p = anchors) {
  const close = bars.map((b) => b.close);
  const r = rsi(close, p.rsiLen);
  const s200 = sma(close, p.trendLen);
  const s5 = sma(close, p.exitLen);
  const out = new Array(bars.length).fill(0);
  let pos = 0;
  for (let i = 0; i < bars.length; i++) {
    if (Number.isNaN(s200[i]) || Number.isNaN(s5[i]) || Number.isNaN(r[i])) { out[i] = 0; continue; }
    const up = close[i] > s200[i], dn = close[i] < s200[i];
    if (pos > 0 && close[i] > s5[i]) pos = 0;          // revert exit (long)
    else if (pos < 0 && close[i] < s5[i]) pos = 0;     // revert exit (short)
    if (pos === 0) {
      if (r[i] < p.loThr && up) pos = 1;
      else if (r[i] > p.hiThr && dn) pos = -1;
    }
    out[i] = pos;
  }
  return out;
}

export const ablations = {
  // always-fade: no overextension threshold — fade any SMA5 cross within the regime. If this
  // matches, the RSI threshold is decoration.
  alwaysFade: (bars, _funding, p = anchors) => {
    const close = bars.map((b) => b.close);
    const s200 = sma(close, p.trendLen);
    const s5 = sma(close, p.exitLen);
    const out = new Array(bars.length).fill(0);
    let pos = 0;
    for (let i = 0; i < bars.length; i++) {
      if (Number.isNaN(s200[i]) || Number.isNaN(s5[i])) { out[i] = 0; continue; }
      const up = close[i] > s200[i], dn = close[i] < s200[i];
      if (pos > 0 && close[i] > s5[i]) pos = 0;
      else if (pos < 0 && close[i] < s5[i]) pos = 0;
      if (pos === 0) {
        if (close[i] < s5[i] && up) pos = 1;
        else if (close[i] > s5[i] && dn) pos = -1;
      }
      out[i] = pos;
    }
    return out;
  },
};

export default { meta, anchors, target, ablations };
