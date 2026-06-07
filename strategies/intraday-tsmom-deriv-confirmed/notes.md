# Notes — intraday-tsmom-deriv-confirmed

## Provenance
Selected as **#1** from `.claude/research/momentum-strategy-survey.md` (survey rebuilt
via ctx_execute+curl over Semantic Scholar/arXiv/Crossref; degoog bypassed). Chosen for
fee-defensibility for this exact spec, not raw alpha.

## Core honesty caveat
No cited source proves a fee-positive intraday BTC-perp edge. On-target evidence is
**gross and abstract-level**; the "survives costs" proof is equities (KOSPI), not crypto.
The fee bar is first-principles. **This is a hypothesis test, not a known winner.**

## Open questions (carry into backtest)
- **Magnitude gap (#1 unknown):** no bp figure for the BTC early→late effect — can it
  clear ~0.33–0.50% gross? Untested.
- **Bar resolution:** efficiency trended up at 30-min, down at 5-min — right signal bar
  is open.
- **OOS fragility:** regime predictability vanishing OOS is the dominant model risk.
- **Efficiency/factor decay:** crypto trending more efficient; edge may be pre-2018.
- **Filter lag:** MA/momentum filters mis-sign at reversals.
- **Reversal risk:** 2/6 crypto/direction cases reversed after shocks — regime gate must
  screen reversal-prone setups.
- **Backtest realism:** ignore corpus headline figures (85% accuracy, 1500–8000%) — gross,
  not per-trade net.

## Decisions log
- (date) Folder created, #1 taken from survey. Branch `feat/intraday-tsmom-deriv-confirmed`.
- 2026-06-07 — design grilled end-to-end (Phases 1–4). Full locked set in spec.md
  "Locked decisions". Headlines:
  - Engine = **TradingView Strategy Tester** (no Python harness found in src/scripts);
    everything Pine can't model computed externally from `data_get_trades`.
  - `BYBIT:BTCUSDT.P` @ 30-min, **UTC-pinned** day; early = first 30-min bar `close−open`.
  - Structure (A): market-enter 00:30 close → hold → flatten 00:00 UTC,
    `process_orders_on_close=true`.
  - Two ATRs (30-min arms / prior-day daily stop). Kill = 2 consecutive losing days
    (+3R dropped — unreachable at 1 trade/day).
  - Friction = **0.085%/side percent commission**, tick-slippage 0 (tick-% varies
    $16k→$100k → would corrupt decay check).
  - Phase 2: downturn gate (prior daily close < EMA50, symmetric). OOS via `input.time`
    windows, IS 2023-01/2024-06, OOS 2024-07/2025-12.
  - Phase 3: **external post-filter** (Bybit OI/funding/liq as-of entry) — derivatives
    NOT in Pine. ΔOI>+0.5%, funding ±1.5σ(30d), liq 95th-pct veto.
  - Phase 4: per-trade NET price-based & external; walk-forward = IS/OOS holdout
    (~no fitted params); decay = per-year; leverage = liquidation-survival check, not PF.
  - strategy.pine **Phase 1 written**; NOT yet pushed to TV (push/compile pending).
- 2026-06-07 — **Gate A: FAIL (decisive).** Computed externally on Bybit public kline
  (52,608 × 30-min bars, 2023-01-01→2025-12-31; TV non-premium can't deep-backtest that
  depth, MCP range/scroll tools also broken — see infra note). Engine deviation approved
  by user.
  - Locked design (ARM=1.0, structure A, 1×daily-ATR stop, 0.085%/side):
    96 trades, win 36.5%, **median net −0.346%**, mean −0.239%, net PF 0.767. Kill-cooldown
    variant worse (−0.397%). Bar was +0.20%.
  - Diagnostic isolates **signal, not stop**: no-stop EOD-only still −0.346%.
  - **Premise falsified:** raw `sign(earlyRet)` hit-rate over 1092 days = **47.3%**
    (sub-coinflip), mean signed rest-of-day drift **−0.05% gross**. Early move does NOT
    predict late continuation on BTCUSDT-perp/30m/UTC-midnight — faintly mean-reverting.
  - Arm sweep: only ARM=2.0 turns marginally +ve (n=14/3yr, median +0.073%, <bar) → noise.
  - **Action:** Phase 1 gate failed → do NOT build Phase 2/3 on this signal. Open question:
    test pre-declared a-priori variants (5-min resolution, alternate fixed anchor) before
    shelving, OR drop to fallback #2 (regime/vol-filtered momentum standalone). Pending user.
  - Carry-over bug (moot if shelved): Pine kill-switch permanently halts — `consecLoss`
    resets only on a winning *closed* trade, but skipped entries never close → after first
    2-loss streak it never trades again. Needs cooldown reset if revived.
- 2026-06-07 — **A-priori variant grid: confirms FAIL family-wide.** 5-min Bybit data
  (315,648 bars), 24 cells = day-anchor {0,4,8,12,16,20 UTC} × early-window {30,60,120,240m},
  metric = friction-free directional hit-rate + EOD-only median net.
  - 21/24 cells: hit <50%, negative drift, median net ≈ −0.2%.
  - Only positive cluster: **anchor 04:00 UTC** (hit 51.8–52.4%, drift +0.03→+0.09%).
    Best cell anchor04/win240: hit 52.4% (~1.6σ over coinflip, n=1095), gross drift
    **+0.087%** — < half the 0.17% round-trip friction; median net still **−0.094%**.
  - **Verdict:** early→late intraday continuation premise is dead on BTC-perp 2023–25.
    Where present (04:00 anchor) far too small to clear costs. No variant clears the bar.
  - **Decision: SHELVE this strategy (#1).** Move to fallback #2 (regime/vol-filtered
    momentum standalone, §3.3) — distinct premise (not intraday session continuation),
    not killed by this finding. #3 (ATR/Keltner multi-day trend) also still open.
