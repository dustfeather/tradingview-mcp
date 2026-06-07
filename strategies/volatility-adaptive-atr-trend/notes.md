# Notes — volatility-adaptive-atr-trend (#3)

Running log. Newest first.

## 2026-06-07 — Phase-1: Formulation A locked
- Fork resolved → **A (Keltner breakout)**. Reason: parsimony (3 knobs), cleanest read on
  Gate A-ablation (band-adaptation isolated; ATR trail held constant across the toggle).
- `strategy.pine` written: EMA(L)±k·ATR(L) bands, close-beyond-band entry, ATR chandelier
  trail (s) + midline re-cross + 2.5×daily-ATR catastrophe backstop, flat-then-re-enter.
- Ablation wired as a single input toggle `useAdaptive` (off ⇒ fixed-% band k·pct·price);
  trail stays ATR either way so the toggle isolates the namesake mechanism.
- Anchors: L=20, k=2.0, s=3.0, hardMult=2.5. Sweeps declared in inputs as comments.
- On-chart commission 0.085%/side = friction sanity only; funding folded externally.
- **Next:** compile clean (needs TV running), sanity trade count on 4H IS window → Gate A.

## 2026-06-07 — Scaffold (#3 opened, fallback candidate)
- #1 (intraday-tsmom-deriv-confirmed) shelved: Gate A falsified.
- #2 (regime-filtered-momentum) shelved: Gate B FAIL (decisive) — ER regime gate did not
  generalize OOS.
- Both predecessor branches fast-forwarded onto `main` (linear, no merge commit); #3
  branched off `main` tip (`feat/volatility-adaptive-atr-trend`).
- #3 = survey §5 fallback: **volatility-adaptive (ATR/Keltner) trend.** Vol-adaptation is
  the thesis; Gate A-ablation (ATR vs fixed-width envelope) is the make-or-break for the
  mechanism, Gate B (both legs) for the bull-artifact risk.
- Harness reused verbatim from #1/#2 (data/costs/funding/look-ahead/IS-OOS/gates).
- **Open:** signal fork A (Keltner breakout) vs B (ATR-channel + MA-cross) — see plan.md.
  Recommended A for parsimony; awaiting user pick before Phase-1 Pine.

### Carried-forward discipline from shelved predecessors
- Long & short P&L always separated (a long-only "edge" is beta, not alpha) — doubly
  important here since the cited ATR result's long>short may be a bull artifact.
- Anchors written before backtest; sweep grids are robustness fans, not optimizers.
- TV strategy-tester read is flaky → compute net externally from Bybit klines/funding.
- ≤3-knob parameter budget (overfit is the survey's #1 red flag; filter-lag compounds it).
