# Spec — regime-filtered-momentum (#2)

Regime/volatility-filtered momentum, standalone (survey §3.3). Distinct premise from
shelved #1: NOT early→late intraday session continuation (falsified). Here a base
momentum signal is **gated to trending/predictable regimes** and held across days while
the regime persists. The whole fee-defensibility thesis is *trade rarely, only inside
inefficiency windows*.

Core honesty caveat (carried from survey): §3.3's own net-of-fees verdict calls
regime-filtering "best used as a filter on 3.1, not standalone." 3.1 is dead, so #2 gates
a **different** base signal. The dominant model risk — stated by the survey as #2's
single biggest red flag — is that **the regime classifier fails to generalize
out-of-sample**. Gate B (OOS) and the ablation are the make-or-break, not Gate A.

This is a hypothesis test, not a known winner. No cited source proves a fee-positive
standalone regime-momentum edge on BTC perps.

---

## Locked decisions

All locked via end-to-end grill 2026-06-07. Anchor parameter values are written here
**before** the first backtest; the sweep grids are robustness fans, not optimizers.

### Premise & structure
- **(b) Regime-persistent multi-day hold.** Enter when regime + momentum align; **hold
  across days** while the regime stays trending; exit on regime collapse / momentum flip
  / stop. Holding period = however long the trending regime lasts. One round-trip per
  trend, not per day → conserves friction budget. This is what makes #2 categorically
  distinct from #1, not just a signal swap.
- **Resolution: 4-hour primary; daily = Phase-4 robustness anchor.** 4H (~6 bars/day)
  matches the multi-day horizon and kills intraday microstructure noise that would
  corrupt the efficiency ratio, while still catching a regime turn within ~4–8h. The
  survey's "5-min less efficient" hint pointed at scalping inefficiency — irrelevant once
  riding multi-day trends; we want the clean trend signal, not the noisy-exploitable one.
  Full departure from #1's 30-min harness (resolution is not a cross-strategy constant).

### Signal
- **Base momentum:** trailing N-bar time-series momentum, `sign(close − close[N])`.
  Canonical TS-momentum (Moskowitz/Ooi/Pedersen). "Holds while trend persists" — pairs
  naturally with the regime gate.
- **Regime gate:** Kaufman **Efficiency Ratio**
  `ER = |close − close[M]| / Σ_{i=1..M} |close[i-1] − close[i]|` over M bars.
  ER∈[0,1]; high = directional/predictable (trade), low = chop (sit out). One line, no
  fitted latent states → far lower overfit than HMM/Markov (directly answers the survey's
  #1 red flag). ER is direction-agnostic (measures path efficiency); the momentum sign
  supplies direction.
- **Parameter parsimony — 3 knobs only:**
  1. **L** — single lookback governs BOTH ER window and momentum sign (M = N = L).
     "Over the last L bars, was it directional (ER) and which way (sign)." Anchor **L=20**
     on 4H (~3.3-day window). Sweep `{10, 20, 40}` as a declared robustness grid; if the
     edge survives at only one L, it's noise.
  2. **τ_entry** — ER entry threshold. Anchor **0.35**. Sweep `{0.30, 0.35, 0.40}`.
  3. **τ_exit** — ER exit threshold, hysteresis. Fixed at **τ_entry − 0.10** (anchor 0.25).
- Anchors written before backtest; the grid is a fan, not a search. **OOS is the verdict.**

### Direction
- **Symmetric long & short**, identical logic (ER>τ + momentum sign). No directional prior.
- **Long and short P&L reported separately at every gate.** A regime thesis that only
  works long is a beta bet, not a regime edge. If a gate passes only because the long leg
  rode a bull market while the short leg bled → that is a **fail dressed as a pass**.

### Entry / exit logic
- **Entry:** flat → enter when `ER > τ_entry` AND momentum sign defined; direction = sign.
- **In-regime state** carried in a `var` flag, updated only on confirmed closed-bar
  crossings (hysteresis: enter above τ_entry, stay until below τ_exit).
- **Exit (whichever first):** `ER < τ_exit` (regime collapse) OR momentum flip OR ATR stop.
- **Momentum flip → FLAT, not reverse.** A flip inside a decaying trend is exactly when
  ER is about to fail; reversing there walks into chop and doubles friction. Re-entry
  requires a fresh `ER > τ_entry` + aligned momentum.
- **Single position, no pyramiding** (pyramiding = 0).

### Stop
- **`2.5 × prior-day daily ATR`**, computed on the prior **completed** daily bar (no
  look-ahead). Sweep `{2.0, 2.5, 3.0}`. **Catastrophe backstop only** — the soft exits
  (ER-collapse, momentum-flip) do the real work; the stop only caps a gap/flash-crash
  (esp. short-leg squeeze risk) before ER can react.
- **Diagnostic:** if the ATR stop is the *binding* exit on most trades, the soft exits are
  mis-tuned — flag it; do not read it as the stop "working."

### Engine & execution
- **TV-native Strategy Tester.** 4H over 2023–25 ≈ 6,570 bars — inside TV limits (unlike
  #1's 52,608 × 30-min that forced a Python-on-klines workaround). Real Pine strategy,
  real equity curve; pull `data_get_trades`, fold funding + exact friction externally.
- **Look-ahead discipline:**
  - ER & momentum on **closed bars only** (`[1]`), act at bar close.
  - Daily ATR via `request.security(..., lookahead_off)` + `[1]` (prior completed bar).
  - Hysteresis flag in a `var`, updated only on confirmed closed-bar crossings.
- **Fill on signal-bar close**, `process_orders_on_close = true` (matches #1's convention
  so fee models stay comparable; 4H close-vs-next-open gap is small and symmetric).

### Sizing / leverage
- **1× notional, 100% equity per trade.**
- **No discretionary kill-switch.** The ER gate IS the risk-off — when no trend, ER<τ and
  you're flat by construction. A consecutive-loss halt is an extra fitted knob (violates
  3-knob parsimony) and reintroduces #1's halt-state bug class. Drawdown control = "don't
  trade in chop," not a loss counter.
- **Leverage 2×/5× = Phase-4 liquidation-survival check only.** Compute MAE vs maintenance
  margin on the 1× trade path; leverage never changes signals. PF always reported at 1×.

### Costs / net model
- **Friction = 0.085%/side** (taker 0.055 + slippage 0.030), tick-slippage 0. Round-trip
  0.17%. (Reused #1 harness constant.)
- **Funding = first-class, signed cost** (multi-day holds span many intervals; Bybit
  charges 3×/day at 00:00 / 08:00 / 16:00 UTC). Per-trade:
  `net = gross price P&L − round-trip friction − Σ(signed funding over every open interval)`.
  - Long pays `f × notional` when funding rate f>0; short receives; vice-versa for f<0.
    Applied per interval at held notional.
  - **Source:** Bybit public funding-rate history `/v5/market/funding/history`, fetched via
    `ctx_execute`+curl (same bypass as #1's klines). **Verify coverage back to 2023-01
    first** (analog of #1's "verify 2023 OI retention").
  - Reported as its own line (gross → −friction → −funding → net), per leg.

### Data
- **`BYBIT:BTCUSDT.P`**, 2023–2025, UTC-pinned day. (Reused #1 harness constant.)
- **IS = 2023-01 → 2024-06; OOS = 2024-07 → 2025-12** (reused #1 split). OOS gate via
  `input.time` date windows in Pine.

### Validation gates (kill-or-confirm; do not tune past a failed gate)
Metrics: **net profit factor + net per-trade expectancy.** **Hit-rate reported but NEVER
a gate** — a regime-trend system wins <50% by design (few big winners, many small flat
exits); gating on win-rate would false-fail it (the metric that *correctly* killed #1 is
the wrong metric here).

- **Gate A (IS fee bar):** net PF > 1.3 AND mean net per-trade > 0 after friction+funding
  AND ≥30 trades/leg (else inconclusive, not pass).
- **Gate A-ablation (mandatory, same phase):** ER-gated net expectancy **>** ungated
  always-on momentum net expectancy (same L, same costs). Fail → the regime gate adds
  nothing → #2 is dead as conceived (collapses to a plain momentum bet; survey's "regime
  edges vanish" red flag cashed in).
- **Gate B (OOS):** PF>1.3 & positive net expectancy hold on OOS, **both legs
  contributing** (not one carrying). OOS N collapse → inconclusive, not pass. This is the
  dominant risk — regime generalization is #2's single biggest red flag.
- **Final (Phase-4):** net PF>1.3 AND per-trade>0.20% in BOTH IS & OOS, positive EACH
  year 2023/24/25, on BOTH anchors (4H + daily), surviving 2×/5× liquidation check.
  Pass → promote. Fail → shelve, move to #3 (ATR/Keltner trend, survey §5).
