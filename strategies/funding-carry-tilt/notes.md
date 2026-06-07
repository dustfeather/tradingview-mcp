# funding-carry-tilt — Notes (run log)

Scaffolded 2026-06-07. Locked design, signal fork open. No runs yet.

## Reminders before Gate A
- Funding is REVENUE here — sign it correctly in the fold (negative cost on the right leg).
- The #1 risk is the unhedged price leg: a positive-funding regime usually = rising price, so
  the SHORT leg can bleed price faster than it earns funding. Watch short-leg PF specifically.
- Ablation is the real test: if always-short matches funding-gated-short, it's just short-beta.

## Open fork
- Signal: 7-day funding-EMA gate (anchor) vs alternatives (percentile gate, OI-confirmed).

## Log
- **2026-06-07 — Gate A + ablation: FAIL (decisive). SHELVED.**
  External fold (`scripts/run_fold.js funding-carry-tilt`), 2266 daily bars + 6794 funding
  stamps, 2020-03-25→2026-06-07, 191 trades. Anchors as pre-registered (K=21, ±0.0033%/8h,
  ATR×3, hold-cap 30d).
  - SHORT leg: n=162, exp **−2.32%/tr**, PF **0.53**, net −376% (gross −430%, funding revenue
    +81.6% — sign/magnitude correct, ≈+13%/yr, consistent with the verified +12%/yr fold).
  - LONG leg: n=29, exp +2.98%, PF 5.86 — few trades, mostly bull-beta.
  - Combined PF 0.64 < 1.3. **Both IS and OOS FAIL.**
  - **Ablation:** beats always-short & flat-constant-funding, but **LOSES to always-long**
    (−289% vs +34%). The funding gate is strictly worse than passive long.
  - **Cause:** the single-leg directional tilt can't survive — funding-positive regimes coincide
    with rising price, so the short bleeds price faster than it earns funding. The price risk the
    delta-neutral (2-leg) construction hedges away IS the edge-killer. Survey honesty caveat
    upheld (BIS high Sharpe is delta-neutral, not single-leg).
  - **Next axis (out of v1 scope):** delta-neutral long-spot + short-perp needs a 2nd instrument
    — defer to a v2 that admits it.
- **2026-06-07 (CORRECTION) — kill stands, now quantified on the market-neutral lens.** The
  funding signal DOES carry positive alpha (regression intercept: IS +35.5%/yr, OOS +8.9%/yr),
  but the position runs **beta −0.68** (net short a 4x-rising asset), so risk-adjusted it loses:
  **OOS Sharpe −0.23, compounds to 0.66x.** This is the delta-neutral point made precise — the
  alpha is real but unharvestable without hedging the −0.68 beta (the 2nd leg). Shelved; revival
  = delta-neutral 2-leg, out of v1 scope.
