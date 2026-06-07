# Notes — regime-filtered-momentum (#2)

## Provenance
Selected as **#2** (fallback) from `.claude/research/momentum-strategy-survey.md` §5 after
**#1 (intraday-tsmom-deriv-confirmed) failed Gate A decisively** (early→late session
continuation falsified on BTCUSDT.P: sign(earlyRet) hit-rate 47.3%, median net −0.346%).
#2 chosen because its premise is **distinct** — regime/vol-filtered momentum, NOT intraday
session continuation — so it is not killed by #1's finding. #3 (ATR/Keltner trend) remains
open as the next fallback if #2 fails.

## Core honesty caveat
No cited source proves a fee-positive **standalone** regime-momentum edge on BTC perps.
The survey's §3.3 net verdict explicitly says regime-filtering is "best used as a filter
on 3.1, not a standalone alpha" — and 3.1 is now dead, so #2 gates a *different* base
signal (trailing N-bar TS momentum). The survey names #2's single biggest red flag:
**the regime classifier must generalize out-of-sample** — "the literature's biggest red
flag." This is a hypothesis test, not a known winner.

## Why this differs from #1 (so it can't inherit #1's failure)
- **#1:** single early-bar predicts rest-of-session; intraday, EOD-flat. → faintly
  mean-reverting, dead.
- **#2:** multi-bar TS momentum gated by trend-efficiency regime; **held multi-day** while
  regime persists. Different signal, different horizon, different exit logic. The dead
  early→late effect is not in the signal path.

## Open questions (carry into backtest)
- **Does the ER gate add value?** The whole thesis. The Phase-1 **ablation** (gated vs
  ungated momentum) answers it directly. If gated ≤ ungated net → #2 is decoration on a
  plain momentum bet → shelve.
- **OOS regime generalization (dominant risk):** survey's biggest red flag. Regime edges
  "repeatedly vanish out-of-sample" (Understanding intraday momentum, fut.22375). Gate B
  is the make-or-break.
- **Long/short asymmetry:** crypto short squeezes are vicious; ER can read "trending down"
  right before a face-rip. Symmetric-with-split-reporting is the guard. Watch the short
  leg under the 2.5× ATR backstop.
- **Funding drag on multi-day holds:** 3×/day Bybit; a 5-day trend = 15 funding events. At
  stressed rates funding can swamp the gross edge — first-class signed cost in the net.
- **Bull-beta mirage:** 2023–25 mostly up. A long-only-looking pass IS would be the
  survey's "long-bias = bull artifact" trap → split reporting + each-year-positive guard.
- **Efficiency decay:** crypto trending more efficient at 30-min over time; 4H trend signal
  may also be weakening — per-year decay check (Phase 4).
- **ATR-stop binding:** if the hard stop is the usual exit, soft exits are mis-tuned — a
  diagnostic, not a win.

## Decisions log
- 2026-06-07 — Folder created on branch `feat/regime-filtered-momentum` after #1 shelved.
  #2 taken from survey §5. New strategy built from scratch; only the strategy-agnostic
  harness constants reused from #1 (symbol, friction, IS/OOS split, fill convention).
- 2026-06-07 — **Design grilled end-to-end (10 forks), full locked set in spec.md.**
  Headlines:
  - Structure **(b) regime-persistent multi-day hold** (not EOD-flat) — trade rarely, ride
    the trend across days; one round-trip per trend conserves friction.
  - **4-hour primary** (≈6,570 bars 2023–25 → TV-native Strategy Tester, no Python-on-klines
    workaround needed unlike #1); daily = Phase-4 robustness anchor.
  - Signal = `sign(close−close[L])`; gate = Kaufman **Efficiency Ratio** over L `> τ`.
    **3 knobs only:** tied **L=20** (M=N=L), **τ_entry 0.35 / τ_exit 0.25** hysteresis.
    A-priori anchors + declared robustness fan; OOS is the verdict (no HMM/latent states →
    minimize overfit).
  - Exit = `ER<τ_exit` OR momentum-flip OR ATR-stop, whichever first; **flat on flip, not
    reverse**; re-entry needs fresh ER>τ_entry.
  - **Symmetric** long/short, **P&L reported per leg** (catch bull-beta passes).
  - Stop = **2.5× prior-day daily ATR** (`lookahead_off`+`[1]`), wide catastrophe backstop.
  - Engine = **TV-native Strategy Tester** + external net overlay; closed-bar signals,
    fill-on-close (`process_orders_on_close=true`).
  - **1× / 100% equity, NO kill-switch** (ER gate is the risk-off; avoids #1's halt bug);
    leverage 2×/5× = liquidation-survival check only, PF at 1×.
  - **Funding = first-class signed cost** (Bybit `/v5/market/funding/history` via
    ctx_execute+curl; verify 2023 coverage first).
  - Gates on **net PF + per-trade expectancy**; **hit-rate reported but NEVER gated**
    (trend systems win <50% by design — #1's killer metric is the wrong metric here).
    Mandatory **Phase-1 ablation** (gated vs ungated). Gate B (OOS, both legs) = dominant
    test. Final = PF>1.3 & per-trade>0.20% both IS&OOS, positive each year, both anchors,
    survive leverage.
  - strategy.pine **written + compiles clean** (TV-native, 4H, ablation toggle + IS/OOS
    window inputs). Backtests on BYBIT:BTCUSDT.P 4H.
- 2026-06-07 — **Gate A: PASS (conditional) + ablation PASS.** Computed externally on
  Bybit klines (TV `data_get_strategy_results`/`data_get_trades` read path broken —
  "No strategy found on chart" though the tester visibly computes; same internal_api
  failure class #1 hit). External replication of the exact Pine logic is authoritative
  per spec's external-net approach. Bybit funding history confirmed back to 2022-12.
  - IS 2023-01→2024-06, gated L=20, τ0.35/0.25, 0.085%/side, signed funding folded:
    - **ALL: n=118, net PF 1.44, net/trade +0.424%** (gross +0.617% − fric 0.17% −
      fund +0.022%), win 27.1%. → clears Gate A thresholds (PF>1.3, net/t>0, ≥30/leg).
    - LONG: n=61, PF 2.27, net/t **+1.250%**. SHORT: n=57, PF 0.51, net/t **−0.460%**.
  - **Ablation (mandatory): gate ADDS value.** Gated +0.424%/t (PF 1.44, n=118) vs
    ungated always-on momentum +0.164%/t (PF 1.18, n=278). ER gate roughly doubles
    per-trade net, lifts PF, halves trade count → the regime classifier concentrates the
    edge; not decoration.
  - **Headline risk → Gate B:** the entire positive result is the LONG leg riding the
    2023→mid-2024 bull (long PF 2.27); the SHORT leg is a net loser (PF 0.51). This is the
    bull-beta shape the spec warned of — "a fail dressed as a pass" unless OOS shows BOTH
    legs contribute. Gate A is IS-only and a strong bull dominates IS, so it proves little
    about genuine edge; **Gate B (OOS, both legs) is the real verdict.**
  - **Diagnostic:** exit mix = 100% regime-collapse (er<τ_exit). Momentum-flip and ATR-stop
    never bound in IS (ER decays before momentum flips; 2.5× daily-ATR stop very wide).
    Consistent with design (soft regime exit primary), but flip-vs-reverse and stop-mult
    choices are untested by IS data.
  - **Cross-check caveat:** TV's own full-range (2023–25, incl. OOS) tester showed gross
    PF ≈ 0.36 — far below the IS 1.44. If real, it implies OOS is sharply negative
    (foreshadows Gate B trouble); could also be replication/fill divergence. Reconcile at
    Gate B (re-run external on OOS window + compare to TV).
  - **Action:** Gate A + ablation pass → proceed to **Phase 2 / Gate B (OOS
    2024-07→2025-12)**, scrutinizing both-legs-contribute. Do NOT tune; OOS is the judge.
