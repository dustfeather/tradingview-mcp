# funding-carry-tilt — Plan

**Survey rank:** #1 (most fee-defensible at swing/daily). Source:
`.claude/research/swing-daily-survey.md` §5 #1 + §6.

## Premise
On `BYBIT:BTCUSDT.P`, funding is *persistently positive* in normal regimes (~+12%/yr long
drag verified in the 2024 fold). A short position is *paid* from that cash flow. Harvest a
**structural market-structure premium**, not a decaying price anomaly — this is the only
shortlist family that sidesteps the AMH/efficiency-decay problem that the momentum null was
attributed to.

## Why horizon-native (not a relifted #1–#3)
Nothing intraday about it: the edge is a multi-day cash flow accrued across funding stamps.
Holds run as long as the funding regime persists → lowest turnover in the survey → the fixed
0.17% RT friction amortizes hardest. This is the exact constraint that killed #1–#3, relaxed.

## Symmetry (per-leg, lesson #2)
- **Short leg:** funding persistently positive ⇒ short, collect funding.
- **Long leg:** funding persistently negative ⇒ long, collect funding.
Each leg reported on its own at every gate. A combined positive that is all short-leg in a
2022-style down tape (or all long-leg in a bull) is not edge.

## Gate it must clear
- **Gate A:** net edge per leg over 0.17% RT friction **+ signed funding** (funding is
  *revenue* here, booked per-hold via `fundingCostOverHold` against the full-history fold).
- **Ablation (first-class kill):** funding-gated position must beat **always-short / always-long**
  AND beat **funding-as-flat-constant** (the signal must come from the full-history fold, not a
  single average). If a static directional position matches, the gate adds nothing.
- **Gate B (OOS):** holds out-of-sample (2024→now).

## Biggest a-priori risk
The single-leg tilt carries the directional price risk the proven *delta-neutral* (long-spot +
short-perp) construction hedges away. Funding-positive regimes often coincide with *rising*
price → the short bleeds price faster than it earns funding. BIS WP1087 frames the carry
Sharpe as compensation for **crash/convergence risk**, i.e. a risk premium, not free alpha.

## Honesty caveat
No cited source proves the *single-leg directional* variant is net-positive; the documented
high Sharpe (BIS WP1087) is on the delta-neutral two-leg trade, which is out of v1 scope.

## Status
Scaffolded — locked design, **signal fork open**. No backtest run. Anchors pre-registered in
`spec.md` before first run (anchors-before-backtest discipline).
