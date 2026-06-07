# Plan — intraday-tsmom-deriv-confirmed

Build order. Each step is confirm-or-kill; do not tune past a failed gate.
Engine = **TradingView Strategy Tester** (no Python harness). Everything Pine can't
model is computed externally from `data_get_trades`. See spec.md "Locked decisions".

## Phase 0 — harness  ✅ decisions locked
- [x] Pin data: **`BYBIT:BTCUSDT.P` @ 30-min**, UTC-pinned day, 2023–2025.
      5-min = fixed Phase-4 variant.
- [x] Friction = **0.085%/side percent commission** (taker 0.055 + slippage 0.030),
      tick-slippage 0. Per-trade NET distribution computed **externally** (price-based)
      from `data_get_trades`, funding debit folded in.

## Phase 1 — base signal (3.1), price-only  ← BUILT (strategy.pine)
- [x] earlyRet = first 30-min UTC bar `close−open`; arm `|earlyRet| > armMult×ATR30`;
      structure (A) market-enter 00:30 close → hold → `close_all` at 00:00 UTC;
      `process_orders_on_close=true`.
- [x] Stop = `atrStopMult × prior-day daily ATR` (lookahead_off). Kill-switch = skip
      after **2 consecutive losing days** (+3R dropped). 1× / 100% equity.
- [x] **Gate A (fee bar): FAILED (2026-06-07).** median net **−0.346%** (bar +0.20%),
      96 trades, win 36.5%, net PF 0.767, computed on full Bybit 2023–25 30-min history.
      Signal—not stop—falsified: raw sign(earlyRet) hit-rate 47.3% over 1092 days,
      −0.05% gross drift. Base effect absent on BTC-perp/30m/UTC. → STOP. See notes.md.

## Phase 2 — regime gate (3.3)
- [ ] **Downturn conditioning:** trade only when prior daily close < daily **EMA50**
      (EMA200 variant), measured on prior completed daily bar. **Symmetric.**
- [ ] **Gate B (OOS stability):** `input.time` date-window gate; **IS 2023-01→2024-06,
      OOS 2024-07→2025-12**. Lift over Phase-1 must survive OOS. OOS N collapse →
      inconclusive, not pass. If it vanishes OOS → strip/simplify.

## Phase 3 — derivative confirmation (3.4) — external post-filter (no derivs in Pine)
- [ ] Pull Phase-2 trades → fetch Bybit OI/funding/liq as-of 00:30 entry (Bybit API
      via `ctx_execute`). Verify 2023 OI retention first.
- [ ] Filters: ΔOI > +0.5% in signal dir; funding not beyond ±1.5σ(30d) against;
      liq-cluster veto > 95th pct on signal side. Fixed thresholds, swept as variants.
- [ ] **Gate C (confirmation lift):** measurable net hit-rate improvement vs Phase 2
      price-only? If no → drop it (cut complexity + look-ahead risk).

## Phase 4 — validation
- [ ] Walk-forward degenerates to **IS/OOS holdout** (~no fitted params).
- [ ] Decay check = metrics **per year 2023/2024/2025**; no single-year dependence.
- [ ] Robustness: both anchors (30/5-min); leverage 2×/5× as **liquidation-survival
      check** (computed MAE vs maintenance margin), PF reported at 1×.
- [ ] **Final gate:** net profit factor > 1.3 AND net per-trade edge > ~0.20%, in both
      IS & OOS, positive each year, across both anchors, surviving leverage check.
      Pass → promote. Fail → shelve, move to #2.

## Notes
- Build simplest version that can fail the fee bar first (Phase 1). Don't add the
  regime/derivatives machinery until the base effect proves it has room to clear cost.
- Per project convention: after editing `strategy.pine`, push via
  `pine_set_source` → `pine_smart_compile` so the chart runs current code.
