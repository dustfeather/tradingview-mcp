# Spec — Derivatives-Confirmed Intraday TS Momentum (BTC-Perp)

> Source: `.claude/research/momentum-strategy-survey.md` §5 #1 + §6 prototype plan.
> Status: **prototype / hypothesis test** — no cited source proves a fee-positive
> intraday BTC-perp edge. This is built to be confirmed-or-killed by backtest.

## Thesis

Early-session intraday return predicts late-session continuation in BTC
([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290): first half-hour
predicts last half-hour, stronger in downturns). Trade that continuation, but only
inside regimes where crypto is actually predictable (AMH: unpredictable most of the
time), and only when the derivatives overlay (funding/OI) confirms the move. Single
position, flat by EOD.

## Scope / constraints (hard)

- **Instrument:** BTC perpetual futures, Bybit. Single position. $100k account.
- **Style:** intraday momentum, few trades/day, flat by end of day.
- **Data:** OHLCV + derivatives overlay (funding rate, open interest, liquidations).
  **No order-book depth** (deferred to v2).
- **Fee bar:** Bybit round-trip friction ~0.13–0.30% (taker ~0.055%/side + slippage
  + partial funding). A trade "survives" only if median net per-trade edge > ~0.20%,
  i.e. average winners must clear ~0.33–0.50% gross.

## Entry logic

1. Compute **early-session intraday return** — first 30-min bar (or first fixed
   fraction of the UTC day). Anchor is a fixed-clock parameter, set a priori,
   alternatives tested as fixed variants (never post-hoc).
2. **Signal direction** = sign of early-session return.
3. **Arm** only when `|early return|` exceeds a volatility-scaled (ATR-normalized)
   threshold — noise-sized moves do not trigger.
4. Prefer **maker fills** (resting limit at signal price) to shave the taker leg.

## Regime + derivative confirmation (BOTH required to fire)

- **Regime gate:** rolling volatility/trend-strength filter; trade only inside
  "inefficiency windows." Start simple (vol regime / trend strength) before any
  HMM — complex regime models fail out-of-sample
  ([Understanding intraday momentum](https://doi.org/10.1002/fut.22375)). Candidate
  split to test: downturn-conditioning of the base effect.
- **Derivative confirmation:** require OI building in signal direction AND funding
  not extreme-against the trade. Treated as a precision filter, **not** standalone
  alpha. Veto entries into an offside liquidation cluster.

## Exit / guardrail wiring

- **ATR stop** on every position (volatility-adaptive).
- **EOD flatten** unconditionally — caps overnight/funding exposure; base effect
  resolves into the close.
- **Daily kill-switch:** halt for the day at **+3R** or after **2 consecutive losses**.
- **Single position only** — no pyramiding, no concurrent exposure.

## Fee / funding backtest model

- Taker **0.055%/side** default; credit maker fills where limits rest.
- Slippage **0.01–0.08%/side**, scaled up in high-vol regimes.
- **Partial funding** for any hold straddling a funding stamp; ~0 if flat by EOD.
- Report **per-trade NET P&L distribution**, not just aggregate return.

## Validation kill-criteria (fail any → shelve, drop to #2)

1. **Fee bar:** median net per-trade edge > ~0.20% after full friction. If the gross
   early→late effect can't reach ~0.33–0.50% on average winners → **kill**.
2. **OOS regime stability:** regime gate must hold out-of-sample; if predictability
   vanishes OOS, strip/simplify the gate.
3. **Decay check:** test recent sub-periods (2023–2025). If edge is concentrated
   pre-2018, distrust it.
4. **Confirmation lift:** derivatives filter must measurably improve net hit-rate vs
   price-only; if not, drop it.

**Pass = net profit factor > 1.3 AND net per-trade edge > ~0.20%, holding across
both anchor choices and both leverages (2×, 5×) on 2023–2025 walk-forward.**

## Fallbacks (if this fails its backtest)

- **#2** — regime/volatility-filtered momentum standalone (§3.3).
- **#3** — volatility-adaptive ATR/Keltner trend momentum (§3.1 with ATR engine).

---

## Locked decisions (grill 2026-06-07) — authoritative

Engine reality: **no Python harness exists**; the backtest engine is the
**TradingView Strategy Tester** running `strategy.pine`. Anything Pine can't model
(partial funding, vol-scaled slippage, per-trade NET distribution, derivatives,
liquidation) is computed **externally** from the realized trade list pulled via MCP
`data_get_trades` / `data_get_strategy_results`.

### Instrument & clock
- Symbol **`BYBIT:BTCUSDT.P`** (linear USDT perp) @ **30-min** chart for Phase 1.
  5-min is a fixed robustness variant (Phase 4), never re-tuned post-hoc.
- Trading "day" pinned to **UTC** (`time("D","UTC")`); crypto has no native session.
- Early-session window = **first 30-min bar 00:00–00:30 UTC**.
  `earlyRet = close − open` of that single bar.

### Trade structure (Phase 1, price-only)
- direction = `sign(earlyRet)`; **arm** when `|earlyRet| > armMult × ATR30`.
- Structure (A): **market entry at 00:30 close**, hold, **flatten at 00:00 UTC**
  (`strategy.close_all` on the bar whose `time_close` is 00:00).
- `process_orders_on_close = true` so entry fills at the 00:30 close and EOD flatten
  fills at the 00:00 close (avoids the 30-min next-bar-open distortion).
- **Two ATRs:** 30-min `ta.atr(14)` arms the entry; **prior completed daily ATR**
  (`request.security(...,"D",...,lookahead_off)`) sizes the **stop** and defines **R**.
  Default `atrStopMult = 1.0 × dailyATR`.
- **Kill-switch** reinterpreted for 1-trade/day: skip entries after **2 consecutive
  losing days** (the +3R intraday cap is unreachable at one trade/day → dropped;
  input kept dormant).
- Sizing **1× / 100% equity** for Phase 1. Leverage (2×/5×) deferred to Phase 4 and
  is per-trade-% / PF-invariant → tested as a **liquidation-survival check**, not a
  PF re-run (TV does not model liquidation).
- Friction folded to **0.085 %/side percent commission** (taker 0.055 + mid slippage
  0.030 = 0.17% round-trip). Tick-slippage = **0** (price-level invariant across the
  $16k→$100k 2023–25 window; tick-slippage would corrupt the decay check). Exposed as
  an input for fixed sweeps 0.065 → 0.135.

### Phase 2 — regime gate
- **Downturn conditioning** (the paper's actual finding): trade only when **prior
  daily close < daily EMA(N)**, measured on the **prior completed daily bar** `[1]`
  (zero lookahead). **EMA50 primary, EMA200 variant.**
- **Symmetric:** regime decides *whether* to trade; early-return sign decides
  *direction*. Vol-percentile regime kept as a fixed variant, not stacked.
- **Gate B (OOS):** TV has no native walk-forward → add `input.time` **date-window**
  inputs gating entries; run per window, pull metrics via `data_get_strategy_results`.
  Split: **IS 2023-01 → 2024-06, OOS 2024-07 → 2025-12**. Gate passes only if the
  gate's *lift over Phase-1 price-only* survives OOS. If OOS trade-count collapses
  (downturn gate in a bull window) → **inconclusive, not pass** (small-N PF is noise).

### Phase 3 — derivative confirmation (external post-filter, no derivatives in Pine)
- Run Phase-2 strategy → pull realized trades via `data_get_trades` → for each entry
  timestamp fetch Bybit **OI / funding / liquidations** via API (`ctx_execute`+curl),
  evaluated **as-of the 00:30 entry** (lookahead-safe). Gate C = A/B of Phase-2 set
  vs derivative-filtered subset. **Verify 2023 OI retention first**; if missing, Gate C
  runs on the shorter window and says so.
- **(i) OI building in signal direction:** `ΔOI` over 00:00→00:30 **> +0.5%** of prior
  OI AND price moved in signal direction (new positions opening with the trend). OI↓ =
  no confirm.
- **(ii) Funding not extreme-against:** veto **long** if funding ≤ −X, **short** if
  funding ≥ +X, where **X = 1.5 × rolling 30-day stdev of funding** (adaptive). Same-
  side-crowding/squeeze is a separate hypothesis, not bolted on now.
- **(iii) Liquidation-cluster veto:** veto when signal-direction-side liquidations in
  the prior ~2h exceed the **rolling 95th percentile** (longs just flushed ⇒ long
  continuation unreliable, and vice-versa).
- All thresholds **pre-declared / fixed**, swept only as robustness variants — never
  hand-tuned to maximize Gate C.

### Phase 4 — validation mechanics
- **Per-trade NET edge** computed **externally** from `data_get_trades`, price-based
  (compounding-free): `net = dir×(exit−entry)/entry − 2×friction − partial funding`
  (funding debit for holds straddling 00/08/16 UTC stamps). Report **median, mean,
  P25/P75, %>0, histogram**. All gates read the **median net** off this, not TV's panel.
- **Walk-forward degenerates to the IS/OOS holdout** — the strategy has ~no fitted
  parameters (fixed clock, fixed thresholds), so rolling re-fit tests only stationarity.
- **Decay check** = metrics reported **per calendar year 2023 / 2024 / 2025**; edge must
  not live in a single year. (Pre-2018 is out of window.)
- **Leverage robustness** = computed **liquidation/MAE-vs-maintenance-margin check** at
  2×/5× on the price-based returns; PF reported at 1×.
- **Final-gate pass:** net PF > 1.3 **and** median net per-trade > 0.20%, holding in
  **both IS and OOS**, **positive each year 2023/24/25**, across **both anchors
  (30/5-min)**, surviving the **2×/5× liquidation check**.
