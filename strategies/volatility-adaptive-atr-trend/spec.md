# Spec — volatility-adaptive-atr-trend (#3)

Volatility-adaptive (ATR/Keltner) trend-following on BTC perpetual (survey §5 #3, the
fallback candidate; engine family §3.1-with-ATR). A trend signal whose entry/exit
envelope **breathes with ATR**, so the same logic self-scales across volatility regimes.
The vol-adaptation *is* the thesis — if a fixed-width channel does as well, #3 is dead
(see Gate A-ablation).

Distinct from the two shelved predecessors — this is not a signal swap:
- **vs #1 (intraday-tsmom, shelved):** NOT early→late intraday session continuation
  (that premise was falsified at Gate A). #3 is a multi-day trend follower; session
  timing is irrelevant.
- **vs #2 (regime-filtered-momentum, shelved):** NOT a separate Efficiency-Ratio regime
  gate layered over a TSmom signal. Here the vol-adaptive channel is the signal and the
  filter **fused into one mechanism** — price clearing an ATR-scaled envelope is itself
  both the trend trigger and the noise gate. #2's ER gate failed OOS; #3 does not reuse it.

Core honesty caveat (from survey §5 #3): the one cited net result ([ATR systems](https://doi.org/10.1002/for.2906))
is **abstract-level only** — no post-fee per-trade P&L — and reports **long trades
outperforming short**, which may be a 2016–2018 bull artifact rather than a real edge.
The dominant model risk for #3 is therefore **long-bias masquerading as alpha**: a beta
bet on a rising market dressed as a trend edge. Gate B's both-legs-contributing test is
the make-or-break, the same way OOS-generalization was for #2.

This is a hypothesis test, not a known winner. No cited source proves a fee-positive
vol-adaptive trend edge on BTC perps at intraday/4H resolution.

---

## Locked decisions

Harness constants (engine, data, costs, look-ahead, IS/OOS) are **reused verbatim** from
the #1/#2 harness so results stay comparable across the pipeline. Strategy-specific alpha
(signal, stop) is locked here with anchors written **before** the first backtest; sweep
grids are robustness fans, not optimizers.

### Premise & structure
- **Multi-day, regime-persistent trend hold.** Enter on trend ignition (price clears the
  ATR-scaled envelope), **hold across days** while the trend persists, exit on
  trail-stop / envelope reversal. One round-trip per trend, not per day → conserves the
  friction budget the fee bar demands. (Same horizon logic as #2; opposite of #1's
  per-day churn.)
- **Resolution: 4-hour primary; daily = Phase-4 robustness anchor.** Reused from the #2
  harness — 4H (~6 bars/day) matches the multi-day horizon and suppresses intraday
  microstructure noise that would corrupt an ATR envelope, while still catching a trend
  turn within ~4–8h. 4H over 2023–25 ≈ 6,570 bars — inside TV Strategy-Tester limits.

### Signal — **LOCKED: Formulation A, Keltner breakout** (user pick 2026-06-07)
- **Envelope:** `midline = EMA(close, L)`; `offset = k·ATR(L)`;
  `upper = midline + offset`, `lower = midline − offset`.
- **Entry:** flat → enter **long** on `close > upper`, **short** on `close < lower`
  (bar-close-confirmed; fill at that close via `process_orders_on_close`).
- **Exit (whichever first):** ATR trailing stop (see Stop) OR `close` re-crosses the
  midline OR daily-ATR catastrophe backstop.
- **Flat-then-re-enter, never same-bar reverse.** Entries gate on `position_size == 0`;
  a bar that exits cannot also re-enter (state still non-flat) → re-entry earliest next bar.
- **3 knobs:** `L` (EMA+ATR length, anchor **20**, sweep `{10,20,40}`), `k` (band width,
  anchor **2.0**, sweep `{1.5,2.0,2.5}`), `s` (trail multiple, in Stop). Anchors written
  before the first backtest; grids are robustness fans, not a search.
- **Known cost of A (accepted):** breakout entries are taker-heavy (cross the spread,
  survey §3.2) → the entry leg pays full friction; modelled at 0.085%/side. No separate
  chop filter ⇒ band width `k` + the trail are the only whipsaw defence.

### Direction — **the #3 kill discipline**
- **Symmetric long & short, identical logic.** No directional prior baked in.
- **Long and short P&L reported separately at EVERY gate.** This is non-negotiable for #3
  specifically: the cited evidence's long>short result is the prime suspect for a bull
  artifact. A gate that passes only because the long leg rode 2023–24 BTC appreciation
  while the short leg bled is a **fail dressed as a pass**. The short leg earning its keep
  is the difference between a trend edge and levered beta.

### Stop — ATR is #3's native engine (primary exit, not just catastrophe)
- **ATR trailing stop = the primary exit.** Chandelier-style: for a long, trail =
  `highest(high, since-entry) − s·ATR(L)`; mirror for short. Anchor **s = 3.0**, sweep
  `{2.5, 3.0, 3.5}`. (Contrast #2, where the ATR stop was a catastrophe backstop and soft
  exits did the work — here the trail *is* the exit engine, by design.)
- **Hard catastrophe backstop:** `2.5 × prior-day daily ATR` on the prior **completed**
  daily bar (no look-ahead), to cap a gap/flash-crash (short-leg squeeze risk) before the
  intraday trail can react.
- **Diagnostic:** the ATR trail SHOULD be the binding exit on most completed trends — for
  #3 that is correct (it is the engine), the inverse of #2's diagnostic. If the *hard*
  daily backstop is binding frequently, the trail multiple is too wide — flag it.

### Engine & execution (reused harness)
- **TV-native Strategy Tester.** Real Pine strategy, real equity curve; pull
  `data_get_trades`, fold funding + exact friction externally (per memory:
  strategy-tester read is flaky → compute net externally from Bybit klines).
- **Look-ahead discipline:**
  - Envelope (EMA, ATR, channel) computed on **closed bars only** (`[1]`), act at close.
  - Daily ATR via `request.security(..., lookahead_off)` + `[1]` (prior completed bar).
  - Any in-position state flag carried in a `var`, updated only on confirmed closed-bar
    crossings.
- **Fill on signal-bar close**, `process_orders_on_close = true` (matches #1/#2 so fee
  models stay comparable).

### Sizing / leverage (reused harness)
- **1× notional, 100% equity per trade. Single position, no pyramiding** (pyramiding = 0).
- **No discretionary kill-switch.** Risk-off is structural: no trend ⇒ no envelope break
  ⇒ flat. A consecutive-loss halt is an extra fitted knob (violates ≤3-knob parsimony)
  and reintroduces #1's halt-state bug class.
- **Leverage 2×/5× = Phase-4 liquidation-survival check only.** Compute MAE vs maintenance
  margin on the 1× trade path; leverage never changes signals. PF always reported at 1×.

### Costs / net model (reused harness)
- **Friction = 0.085%/side** (taker 0.055 + slippage 0.030), round-trip 0.17%.
  - ⚠ **Formulation A caveat:** breakout entries cross the spread (taker-heavy, survey
    §3.2). If A is chosen, slippage realism matters more; consider whether a resting-limit
    re-entry is feasible, else accept full taker on the entry leg.
- **Funding = first-class, signed cost** (multi-day holds span many intervals; Bybit
  charges 3×/day at 00:00 / 08:00 / 16:00 UTC). Per-trade:
  `net = gross price P&L − round-trip friction − Σ(signed funding over every open interval)`.
  - Long pays `f × notional` when funding f>0; short receives; vice-versa for f<0.
  - **Source:** Bybit public funding-rate history `/v5/market/funding/history`, fetched via
    `ctx_execute`+curl. **Verify coverage back to 2023-01 first.**
  - Reported as its own line (gross → −friction → −funding → net), per leg.

### Data (reused harness)
- **`BYBIT:BTCUSDT.P`**, 2023–2025, UTC-pinned day.
- **IS = 2023-01 → 2024-06; OOS = 2024-07 → 2025-12.** OOS gate via `input.time` windows.

---

## Validation gates (kill-or-confirm; do not tune past a failed gate)
Metrics: **net profit factor + net per-trade expectancy.** **Hit-rate reported but NEVER
a gate** — a trend follower wins <50% by design (few big winners, many small stopped
exits); gating on win-rate would false-fail it.

- **Gate A (IS fee bar):** net PF > 1.3 AND mean net per-trade > 0 after friction+funding
  AND ≥ 30 trades/leg (else inconclusive, not pass).
- **Gate A-ablation (mandatory, same phase):** the **ATR-adaptive** envelope's net
  expectancy must exceed a **fixed-width** envelope's (same L, same costs; bands =
  midline ± k·(fixed % of price) instead of k·ATR). **Fail → the vol-adaptation adds
  nothing → #3 collapses to a plain breakout → dead as conceived.** This tests #3's
  namesake mechanism directly, the way #2's ER-ablation tested its regime gate.
- **Gate B (OOS):** PF > 1.3 & positive net expectancy hold on OOS, with **BOTH legs
  contributing** — the short leg must be positive (or at minimum not bleeding) net of
  costs. A long-only pass = bull-artifact fail. OOS N collapse → inconclusive, not pass.
  **This is #3's dominant risk and single biggest red flag.**
- **Final (Phase-4):** net PF > 1.3 AND per-trade > 0.20% in BOTH IS & OOS, positive
  EACH year 2023/24/25, on BOTH anchors (4H + daily), surviving 2×/5× liquidation check.
  Pass → promote. Fail → shelve, return to the survey backlog.
