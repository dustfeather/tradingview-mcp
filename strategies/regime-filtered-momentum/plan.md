# Plan — regime-filtered-momentum (#2)

Build order. Each step is confirm-or-kill; do not tune past a failed gate.
Engine = **TradingView Strategy Tester** (4H/3yr fits natively). Funding + exact friction
computed externally from `data_get_trades` + Bybit funding-history API. See spec.md
"Locked decisions".

Fee-bar-first: build the simplest version that can fail the cost+funding bar (Phase 1).
Do not add robustness/decay machinery until the base regime-gated signal proves it has
room to clear cost.

## Phase 0 — harness  ✅ decisions locked
- [x] Data: **`BYBIT:BTCUSDT.P` @ 4-hour**, UTC-pinned, 2023–2025. Daily = Phase-4 anchor.
- [x] Friction = **0.085%/side** (taker 0.055 + slippage 0.030), tick-slippage 0.
- [x] Funding = **first-class signed cost**, Bybit `/v5/market/funding/history` via
      `ctx_execute`+curl. **Verify 2023-01 coverage before Phase 1.**

## Phase 1 — base signal, regime-gated  ✅ Gate A + ablation PASS (2026-06-07)
- [x] **Signal:** `sign(close − close[L])`; **Gate:** Kaufman ER over L `> τ`.
      Single lookback **L=20** (M=N=L), τ_entry **0.35** / τ_exit **0.25** (hysteresis).
- [x] **Structure (b):** enter on `ER>τ_entry` + momentum sign → **hold across days** →
      exit on `ER<τ_exit` OR momentum-flip (→ FLAT) OR ATR stop. Single position, no
      pyramiding. `process_orders_on_close=true`, fill on signal-bar close.
- [x] **Stop:** `2.5 × prior-day daily ATR` via `request.security(lookahead_off)`+`[1]`.
- [x] **Symmetric** long/short; instrument long & short P&L separately.
- [x] Push: `pine_set_source` → `pine_smart_compile`, clean compile (TV-native).
- [x] **Gate A (fee bar, IS 2023-01→2024-06): PASS (conditional).** Net computed
      externally on Bybit klines (TV read path broken). **ALL: n=118, net PF 1.44,
      net/trade +0.424%** (≥30/leg ✓). **Caveat:** all edge is the long leg in a bull;
      short leg loses (PF 0.51). Both-legs test deferred to Gate B.
- [x] **Gate A-ablation: PASS.** Gated +0.424%/t (PF 1.44) **>** ungated +0.164%/t
      (PF 1.18) → ER gate concentrates the edge; not decoration.

## Phase 2 — OOS stability  ❌ Gate B FAILED → #2 SHELVED (2026-06-07)
- [x] **Gate B (OOS 2024-07→2025-12): FAIL (decisive).** ALL n=120, net PF **0.829**,
      net/trade **−0.182%**, totRet −21.8% (N not collapsed → genuine fail). Both legs fail
      to contribute (long +0.08%, short −0.44%). **Ablation flips OOS → gate NULL** (gated
      worse than ungated). Per-year: edge is 2023-bull only (PF 2.25→0.90→0.66, monotonic).
      Regime classifier does not generalize OOS — #2's dominant red flag, realized.
      **Premise falsified → SHELVED.** Do not tune past a failed make-or-break gate.

## Phase 3 — robustness sweep (only if Gate A & B pass)  — SKIPPED (Gate B failed)
- [ ] Declared a-priori grids (fans, not optimizers): L∈{10,20,40}, τ_entry∈{0.30,0.35,0.40}
      (τ_exit=τ_entry−0.10), ATR mult∈{2.0,2.5,3.0}. Edge surviving at only one cell = noise.
- [ ] Confirm no single (L,τ,mult) cell carries the result.

## Phase 4 — validation
- [ ] Decay check = net metrics **per year 2023/2024/2025**; no single-year dependence.
- [ ] Robustness: re-run on **daily** anchor; edge must persist across both anchors.
- [ ] Leverage 2×/5× as **liquidation-survival check** (computed MAE vs maintenance
      margin on 1× path); PF reported at 1×.
- [ ] **Final gate:** net PF>1.3 AND net per-trade>~0.20%, in both IS & OOS, positive each
      year, across both anchors, surviving leverage check. Pass → promote. Fail → shelve,
      move to #3 (ATR/Keltner multi-day trend, survey §5).

## Notes
- Metric discipline: **PF + net expectancy** drive every gate; **hit-rate is reported, never
  gated** — trend systems win <50% by design (#1's killer metric is wrong here).
- The ablation (Phase 1) is non-negotiable: it isolates whether the *regime gate* is the
  edge or just decoration on plain momentum.
- Per project convention: after editing `strategy.pine`, push via
  `pine_set_source` → `pine_smart_compile` so the chart runs current code.
