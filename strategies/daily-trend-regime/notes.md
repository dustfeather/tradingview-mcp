# daily-trend-regime — Notes (run log)

Scaffolded 2026-06-07. Locked design, signal fork open. No runs yet.

## Reminders before Gate A
- This family is 0-for-2 in-house (#2 regime died OOS, #3 adaptive lost ablation). The ablation
  vs always-on trend IS the gate — run it FIRST, before any sweep. If it fails there, shelve;
  no sweep rescues it (lesson #3).
- Keep it non-adaptive at the anchor. Any adaptive band must earn its place vs a fixed band.
- Short leg alone — don't let a long-only trend masquerade as a two-sided edge.

## Open fork
- Regime gate: Efficiency Ratio(10)≥0.30 (anchor) vs ADX(14)≥25.

## Log
- **2026-06-07 — Gate A + ablation: FAIL (decisive, the #2 grave again). SHELVED.**
  External fold, 2266 daily bars, 2020-03→2026-06, 284 trades. Anchors as pre-registered
  (EMA 20/50, ER(10)≥0.30 gate, ATR×3).
  - FULL combined PF 1.22 < 1.3. SHORT leg PF 0.92 (dead). LONG leg PF 1.50.
  - **Ablation: LOSES to always-on trend** (+122% vs +328%). The regime gate is **strictly
    value-destroying** — it cuts good trend exposure. Exactly how #2 died, third confirmation.
  - **OOS: FAIL** — combined PF 0.89, both legs fail.
  - **Cause:** the ER regime filter does not generalize and underperforms ungated trend; short
    leg can't stand alone. No sweep rescues a mechanism that loses to its own degenerate baseline
    (lesson #3). Survey caveat upheld; #2/#3 precedent against single-asset regime filters holds.
