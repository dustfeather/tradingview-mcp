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
  - strategy.pine **NOT yet written** — Phase 1 is the next turn.
