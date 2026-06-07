# daily-trend-regime — Spec (pre-registered)

Instrument: `BYBIT:BTCUSDT.P` · Timeframe: `D` · Symmetric long/short, **P&L per leg**.
External fold authoritative — replay exact Pine over Bybit klines + full funding history.

## Pre-registered anchors (locked before first run)

| Anchor | Value | Rationale |
|---|---|---|
| Trend signal | EMA(20) vs EMA(50) cross | Standard daily trend; long EMA20>EMA50, short below |
| Regime gate | Efficiency Ratio(10) ≥ 0.30 | Trade only in directional states (Kaufman ER) |
| Regime gate (fork) | ADX(14) ≥ 25 | Alternative trend-strength gate |
| Price stop | ATR(14) × 3 (daily) | Bound per-trade loss |
| Position | one at a time, 100% equity | Single-instrument v1 |

Position rule: enter on trend signal **only while regime gate is on**; exit on opposite trend
signal, regime-off, or ATR stop.

## Sweep grid (robustness fan — NOT an optimizer)
- EMA pair ∈ {(10,30), (20,50), (50,100)}
- ER gate ∈ {0.20, 0.30, 0.40}  /  ADX gate ∈ {20, 25, 30}
- Stop ∈ {ATR×2, ATR×3}

## Ablation baselines (must beat — THE point of this candidate)
1. **always-on trend** (same EMA signal, regime gate removed). If ungated matches, the regime
   filter adds nothing — dead, exactly like #2.
2. **fixed band vs adaptive** — if any adaptive element is introduced via the fork, it must beat
   its fixed-% equivalent (the #3 grave). At the anchor there is no adaptive band; keep it that
   way unless it earns its place against fixed.

## Gates
- **Gate A:** per-leg net expectancy > ~0.20%/trade after 0.17% RT friction + funding; each leg
  PF alone; combined net PF ≥ 1.3.
- **Ablation gate:** gated trend beats always-on trend at the anchor.
- **Gate B (OOS):** Gate A + ablation hold OOS.

## Fee / funding model
- 0.17% round-trip friction per turn.
- Funding subtracted per-hold, signed, via `scripts/funding_fold.js` `fundingCostOverHold`
  (full-history fold).

## IS / OOS
- **IS:** 2020-03-25 → 2023-12-31 (incl. 2021 bull + 2022 bear).
- **OOS:** 2024-01-01 → present.
- *Data caveat:* if Bybit `BTCUSDT.P` history starts later than 2020-03, IS floor shifts.

## Kill criteria (any ⇒ shelve)
- Regime gate fails to beat always-on trend at the anchor (the #2 death).
- Any adaptive element loses to its fixed equivalent (the #3 death).
- Either leg's net edge ≤ bar; or combined positive is all long-leg bull-beta.
- Edge IS, gone OOS.
