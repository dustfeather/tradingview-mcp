// daily-ts-momentum — signal module (survey rank #2). Backtest-only; consumed by
// scripts/fold_engine.js. Edge = sign of trailing 28d return, weekly rebalance, long/short.
// Funding is a COST here (subtracted per-hold by the engine). See plan.md / spec.md.

export const meta = {
  name: 'daily-ts-momentum',
  symbol: 'BTCUSDT', interval: 'D',
  startTime: Date.parse('2020-03-25T00:00:00Z'),
  isOOSBoundary: Date.parse('2024-01-01T00:00:00Z'),
};

export const anchors = {
  formLen: 28,           // formation lookback (days)
  holdLen: 7,            // rebalance cadence (days) — only re-decide every holdLen bars
  useZ: false, zThr: 0.5, zLook: 90,
  atrLen: 14, atrMult: 3,
  holdCapBars: Infinity,
};

function trailingReturn(close, i, n) {
  return i < n ? NaN : (close[i] - close[i - n]) / close[i - n];
}

// Re-decide only on rebalance bars; carry the position between. No look-ahead (uses close[i]).
export function target(bars, _funding, p = anchors) {
  const close = bars.map((b) => b.close);
  const out = new Array(bars.length).fill(0);
  let cur = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i % p.holdLen === 0) {
      const r = trailingReturn(close, i, p.formLen);
      if (Number.isNaN(r)) cur = 0;
      else if (p.useZ) {
        // z-score of trailing return over zLook
        const rs = [];
        for (let j = Math.max(p.formLen, i - p.zLook + 1); j <= i; j++) rs.push(trailingReturn(close, j, p.formLen));
        const m = rs.reduce((s, x) => s + x, 0) / rs.length;
        const sd = Math.sqrt(rs.reduce((s, x) => s + (x - m) ** 2, 0) / rs.length) || 1e-12;
        const z = (r - m) / sd;
        cur = z > p.zThr ? 1 : z < -p.zThr ? -1 : 0;
      } else cur = r > 0 ? 1 : r < 0 ? -1 : 0;
    }
    out[i] = cur;
  }
  return out;
}

export const ablations = {
  // buy-and-hold: the momentum timing must add net over simply being long.
  buyAndHold: (bars) => bars.map(() => 1),
};

export default { meta, anchors, target, ablations };
