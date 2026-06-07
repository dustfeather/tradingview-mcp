# Notes — volatility-adaptive-atr-trend (#3)

Running log. Newest first.

## 2026-06-07 — Gate A FAIL (decisive) + ablation FAIL → SHELVE #3
External sim on Bybit 4H+daily klines, IS window 2023-01→2024-06, anchors L=20 k=2.0
s=3.0, friction 0.085%/side. Funding folded but coverage partial (Bybit
`/v5/market/funding/history` pager returned only newest 200 rows; fund/tr ≈ 0.002% —
three orders below the per-trade edge, immaterial; and funding only subtracts from a
long-carried book, so it cannot rescue a sub-threshold PF).

Results (net of friction+funding):
- **ALL:** n=73, PF=**1.28**, exp=+0.420%/tr
- **LONG:** n=39, PF=2.46, exp=+1.846%
- **SHORT:** n=34, PF=**0.32**, exp=−1.217%
- Ablation FIXED-% (k·1.5%·price, ATR trail held constant): ALL exp=**0.565%** (n=64)

Three independent fails at anchors:
1. **Gate A FAIL** — combined net PF 1.28 < 1.3 threshold.
2. **Ablation FAIL** — adaptive exp 0.420% < fixed-% exp 0.565%. The vol-adaptation (the
   entire thesis of #3) is not merely unhelpful, it is **strictly worse** than a dumb
   fixed-width band. Namesake mechanism falsified.
3. **Gate-B preview / bull-artifact** — the +0.420% combined is entirely the long leg
   (PF 2.46); the short leg collapses (PF 0.32, exp −1.217%). The book is levered long
   beta riding 2023–24 BTC appreciation, not a trend edge — exactly the survey's named #3
   risk ([ATR systems](https://doi.org/10.1002/for.2906) long>short = bull artifact).

Verdict: **shelve #3.** No tuning past the failed gate (spec discipline); the ablation
kill is structural, not a tuning miss — a parameter sweep cannot make adaptation beat its
own fixed-% twin when it loses at the anchor by 0.145%/trade.

Meta: #1, #2, #3 were the survey's *entire* ranked shortlist (§5). All three falsified on
BTC-perp. The backlog is exhausted; next requires a new survey axis (different instrument,
resolution, or the excluded families §4), not another shortlist candidate.

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
