# daily-ts-momentum — Notes (run log)

Scaffolded 2026-06-07. Locked design, signal fork open. No runs yet.

## Reminders before Gate A
- THE bull-beta trap candidate. Report short leg alone first; if it's dead, the whole thing is
  levered long beta (the #3 grave).
- Ablation = beat buy-and-hold. A momentum timer that underperforms always-long is noise.
- Funding here is a COST (long drag ~+12%/yr in 2024) — subtract per-hold, don't flat-approx.

## Open fork
- Signal: sign of trailing 28d return (anchor) vs z-score>0.5 over 90d.

## Log
- **2026-06-07 — Gate A + ablation: FAIL (decisive, bull-beta). SHELVED.**
  External fold, 2266 daily bars + 6794 funding stamps, 2020-03→2026-06, 89 trades. Anchors as
  pre-registered (form 28d, hold 7d, sign signal, ATR×3).
  - FULL combined PF 1.76 looks alive — but it is the lesson-#2 trap: LONG leg net +395%
    (PF 2.64) carries everything, **SHORT leg dead** (exp −1.04%, PF 0.80, net −44%).
  - **Ablation: LOSES to buy-and-hold** (+351% vs +738%). The momentum timing destroys return
    vs simply being long.
  - **OOS: collapses** — combined PF 0.65, both legs fail (long exp −1.57%, short −2.45%).
  - **Cause:** the entire combined edge is the long leg riding 2020–23 BTC appreciation —
    levered beta, not edge. Short leg can't stand alone; timing loses to buy-and-hold; no OOS
    generalization. Survey honesty caveat upheld (no single-asset BTC TS-mom net edge).
