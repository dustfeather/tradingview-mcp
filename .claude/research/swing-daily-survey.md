# Swing/Daily Axis — Survey + Ranked Shortlist (post-momentum-null)

Sourced from `.claude/research/swing-daily-survey-brief.md`. Mirrors the §5 format of
`momentum-strategy-survey.md`. Scope: `BYBIT:BTCUSDT.P`, OHLCV + derivatives overlay
(funding/OI/liquidations), no L2. Horizon: multi-day swing / daily-rebalance. The intraday/4H
momentum backlog (#1–#3) is exhausted and shelved; this axis attacks the binding constraint
that killed it (fixed per-trade fee vs small per-trade move) by amortizing the same 0.17% RT
over a multi-day move. See `RESEARCH.md` §"Strategy Pipeline — Lessons Learned (2026-06-07)".

---

## 1. Executive Summary

**What the evidence bounds (gross level).**

1. **Daily/weekly time-series momentum exists in crypto.** Liu & Tsyvinski find strong
   time-series momentum at 1–4 week horizons on the crypto market factor
   ([Risks and Returns of Cryptocurrency, NBER w24877](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf)).
   This is the best-evidenced *gross* horizon-native signal in the survey and, unlike #1's
   intraday session-continuation premise, has a genuine multi-day analogue.
2. **A funding/short-perp carry premium is documented and high-Sharpe.** Prior literature
   shows "a carry trade that is short perpetual futures generates high Sharpe ratios"
   ([BIS WP1087, Crypto carry, 2025](https://www.bis.org/publ/work1087.pdf)). This is the
   only family in the survey that harvests a *structural cash flow* (funding) rather than a
   price-prediction edge, so it sidesteps the AMH/efficiency-decay problem that the momentum
   null was partly attributed to.
3. **Short-term reversal/contrarian also exists on daily crypto** — the opposite payoff
   shape — with one study reporting "clear and significant dominance of the short-term
   contrarian effect over the momentum effect"
   ([Dynamic time series momentum of cryptocurrencies](https://www.sciencedirect.com/science/article/abs/pii/S1062940821000590)).

**What the evidence does NOT show.**
- **No cited source proves a fee-positive, *tradable* edge on a single BTC perp at this
  horizon.** The momentum results that *do* survive transaction costs are **cross-sectional
  baskets** (e.g. the CTREND trend factor is "resilient to transaction costs"
  [JFQA 2025](https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/trend-factor-for-the-cross-section-of-cryptocurrency-returns/4C1509ACBA33D5DCAF0AC24379148178)),
  which **violate v1's single-instrument scope**.
- When momentum is "appropriately assessed, e.g. accounting for transaction costs and daily
  price fluctuations, many momentum portfolios are liquidated and many with statistically
  significant returns earn insignificant profits"
  ([Han, Kang & Ryu, SSRN 4675565](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4675565)).
- On perps specifically, a cross-sectional alpha screen produced a **positive information
  coefficient but net Sharpe −2.91** — costs and unstable position assignment destroyed
  capital monotonically (Fayez, *Failure of Cross-Sectional Alpha Screening on Crypto
  Perpetual Futures*, working paper). The fee bar does not vanish at the daily horizon; it
  *relaxes*, and only for low-turnover designs.
- The proven carry variant is **delta-neutral** (long spot + short perp), a two-leg trade
  ([funding-rate-arb backtest](https://github.com/zwmjj/funding-rate-arb)). The single-leg
  directional variant that fits v1 scope is *not* the thing the BIS Sharpe is measured on.

**Recommendation.** Prototype **#1: a funding-gated directional short-carry tilt** — the
only family whose edge is a structural cash flow rather than a decaying price anomaly, the
lowest-turnover (hence most fee-defensible at this horizon), and the one the now-correct
full-history funding fold finally makes measurable. Its fee-defensibility — and the question
of whether a *single-leg directional* harvest survives once the price risk the delta-neutral
version hedges away is left in — must be the kill criterion, not an assumption.

---

## 2. Methodology + Horizon-Restated Fee Bar

**Method.** Each family is described mechanically, attached to cited evidence
(flagged gross/net/cross-sectional/single-asset), scored on **Difficulty (1=easy … 5=hard)**
and **Reliability (1=fragile … 5=robust)**, and given a net-of-fees verdict *at the
swing/daily horizon*. Ranking is by fee-defensibility under v1's single-instrument scope.

**Fee bar, restated for the horizon.** Still **0.17% round-trip friction**, but per-trade net
is now measured against a *multi-day* move, so the same fixed cost amortizes against a much
larger gross. The binding-at-4H constraint relaxes — but only for designs that actually hold
multiple days and trade rarely; a daily-churning reversion system re-imports the 4H fee
problem.

**Funding is now load-bearing and correctly modelled** (the prior ~200-row pager cap is fixed;
`scripts/funding_fold.js` verified 1099 rows/yr, ~+12%/yr long drag in 2024). It must be
subtracted per-hold via `fundingCostOverHold`, **not** approximated as a flat constant. For
the carry family funding flips from *cost* to *revenue* — the same fold is the signal.

| Quantity | Value | Basis |
|---|---|---|
| Round-trip friction | 0.17% | Harness constant (taker + slippage) |
| Funding | per-hold, signed | `fundingCostOverHold`, full-history fold; ~+12%/yr long drag 2024 |
| Min net edge to survive | > ~0.20% per trade | Inherited bar; far easier to clear on a multi-day move |

**Gate discipline (non-negotiable, from lessons #1–#7).** Symmetric long/short with **P&L
reported per leg at every gate** (lesson #2 — a combined positive that is all long-leg riding
2023–24 BTC appreciation is levered beta, not edge); **ablation is a first-class kill gate**
(namesake mechanism must beat its degenerate baseline); **OOS is the graveyard** (#2 died
there); **anchors before backtest, sweeps as robustness fans**; **external fold is
authoritative** (TV strategy-tester read is broken — replay exact Pine over Bybit klines +
full funding history).

---

## 3. Family Survey

### 3.1 Daily/weekly time-series momentum (single-asset)
1–4 week formation, ~1-week hold, long/short on sign of trailing return. **Gross** evidence
strong and horizon-native ([Liu & Tsyvinski](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf);
1–4 week TS momentum). Genuinely different from #1's intraday session continuation — a true
multi-day analogue, not a relifted intraday signal. **Net** evidence sobering: realistic-cost
assessment liquidates many momentum portfolios and shrinks significant returns to
insignificance ([Han, Kang & Ryu](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4675565));
replication finds the effect fragile ([Grobys et al., "momentum has (not) its moments"](https://link.springer.com/article/10.1007/s11408-025-00474-9)).

### 3.2 Funding-rate carry / basis harvest
On perps, persistently positive funding ⇒ shorts are *paid* to hold. Directional **short-carry
tilt**: hold short while funding-regime is persistently positive, harvesting funding as a cash
flow rather than predicting price. **Strongest academic Sharpe in the survey**
([BIS WP1087](https://www.bis.org/publ/work1087.pdf)) — but that Sharpe is on the
**delta-neutral** (long-spot/short-perp) construction
([funding-rate-arb](https://github.com/zwmjj/funding-rate-arb)), not the single-leg variant.
Uniquely **decay-resistant**: it harvests a market-structure premium, not an inefficiency.

### 3.3 Trend-following with vol/regime filter (daily)
Daily MA/breakout trend, gated by a volatility or regime filter to deploy only in trending
states. The cost-resilient academic result (CTREND) is **cross-sectional**
([JFQA 2025](https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/trend-factor-for-the-cross-section-of-cryptocurrency-returns/4C1509ACBA33D5DCAF0AC24379148178));
also [Systematic Trend-Following w/ Adaptive Portfolio, arXiv 2602.11708](https://arxiv.org/html/2602.11708v1)).
**Direct cautionary precedent:** #3's ATR-adaptive band lost ablation to a fixed-% band, and
#2's regime gate died OOS. Only admissible if the filter ablates clean.

### 3.4 Mean-reversion / overextension (daily)
Multi-day RSI(2)-style or Bollinger reversion — opposite payoff shape, different failure modes.
**Gross** reversal/contrarian documented on daily crypto, even reported as *dominating*
momentum ([Dynamic TS momentum](https://www.sciencedirect.com/science/article/abs/pii/S1062940821000590);
2/6 cases reverse after shocks, [one-day abnormal returns](https://doi.org/10.1007/s11408-020-00357-1)).
But the natural implementation trades **more often / shorter holds**, which *re-imports* the
fee problem the swing thesis is meant to escape. Academic net-of-fee BTC-perp daily proof is
absent (RSI2/Bollinger evidence is practitioner-grade).

### Family scorecard
| Family | Difficulty | Reliability | Single-asset BTC evidence? | Net-of-fees verdict (swing) |
|---|---|---|---|---|
| 3.1 Daily/weekly TS momentum | 2 | 3 | Gross yes; net shrinks under costs | Horizon-native; prove net per-leg |
| 3.2 Funding short-carry | 3 | 3 | Sharpe is delta-neutral, not single-leg | Most fee-defensible; single-leg unproven |
| 3.3 Trend + regime filter | 4 | 2 | Cost-resilient result is a basket | Admissible only if filter ablates clean |
| 3.4 Mean-reversion daily | 2 | 2 | Gross reversal yes; net no | Fee profile worst; diversifier only |

---

## 4. Excluded Families (v1)

| Family | Why out of scope |
|---|---|
| **Cross-sectional momentum / factor baskets** | The cost-resilient momentum evidence lives here (CTREND), but it needs a multi-coin basket — **violates the single-instrument `BTCUSDT.P` scope**. On perps a XS alpha screen produced +IC but **net Sharpe −2.91** (Fayez). Deferred to the later candidate-widening fan, not v1. |
| **Delta-neutral / calendar basis carry** | The proven high-Sharpe carry construction is two-leg (long spot + short perp, or spot vs dated future) — needs a second instrument / cross-venue plumbing. v1 admits only the single-leg directional tilt (3.2). |
| **L2 / microstructure / liquidation-cascade** | Needs order-book depth — excluded by mandate (OHLCV + derivatives overlay only). Liquidations usable only as a coarse overlay, not a depth signal. |
| **Relifted #1 / #2 / #3** | Death-cause audit (brief §1): #1 intrinsically intraday (no daily analogue); #2 OOS non-generalization (horizon-independent); #3 ablation failure + bull-beta artifact. Relifting earns no discount — would face fresh ablation/OOS/per-leg gates from a corpse. Survey sources horizon-native alpha only. |

---

## 5. Ranked Shortlist (by fee-defensibility at the swing/daily horizon)

### #1 — Funding-gated directional short-carry tilt (3.2)
- **Premise.** On BTC perps funding is *persistently positive* in normal regimes (~+12%/yr
  long drag verified in the 2024 fold); a short pays itself from that cash flow. Harvest a
  market-structure premium, not a decaying price anomaly.
- **Mechanism.** Hold short while a funding-persistence signal is on (e.g. trailing funding
  EMA > threshold for N consecutive stamps); size/flatten by the same signal; funding is
  booked as revenue per-hold via `fundingCostOverHold`. Lowest turnover in the survey →
  the 0.17% friction amortizes hardest.
- **Ablation baseline it must beat.** **Funding-gated short vs always-short.** If a static
  short over the same window captures the same net, the funding *gate* adds nothing and the
  result is just short-beta in a sideways/down tape. (Gate must also beat funding-as-flat-
  constant, i.e. the signal must come from the *full-history fold*, not a single average.)
- **Biggest a-priori risk.** The single-leg tilt carries the directional price risk the
  delta-neutral version hedges away — a funding-positive regime often coincides with a *rising*
  market, so the short bleeds price faster than it earns funding. BIS frames the carry Sharpe
  as compensation for **crash/convergence risk**, i.e. a risk premium, not free alpha.
- **Honesty caveat.** *No cited source proves the single-leg directional variant is net-
  positive; the documented high Sharpe ([BIS WP1087](https://www.bis.org/publ/work1087.pdf))
  is on the delta-neutral two-leg trade, which is out of v1 scope.*

### #2 — Daily/weekly time-series momentum, single-asset, per-leg (3.1)
- **Premise.** Trailing 1–4 week return predicts the next week — a genuine multi-day momentum
  effect ([Liu & Tsyvinski](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf)),
  distinct from #1's intraday continuation.
- **Mechanism.** Long/short on the sign (or z-score) of trailing N-week return, weekly
  rebalance, ATR or fixed-% stop. Weekly cadence keeps trade count low → fee-amortizing.
- **Ablation baseline it must beat.** **TS-momentum timing vs buy-and-hold (always-long).**
  If long-only buy-and-hold matches the combined return, the "timing" is levered beta — the
  exact #3 trap. Per-leg reporting mandatory: the **short leg must stand alone**.
- **Biggest a-priori risk.** Realistic-cost assessment shrinks crypto momentum to
  insignificance ([Han, Kang & Ryu](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4675565))
  and replication finds it fragile ([Grobys et al.](https://link.springer.com/article/10.1007/s11408-025-00474-9));
  high risk the entire combined edge is the long leg riding the 2023–24 bull.
- **Honesty caveat.** *The cost-resilient momentum evidence is cross-sectional (basket); no
  cited source proves a fee-positive net edge for single-asset BTC TS-momentum at this
  horizon.*

### #3 — Daily trend-following with a clean-ablating vol/regime filter (3.3)
- **Premise.** Daily BTC trends are gross-positive and persistent; a vol/regime gate should
  concentrate exposure into trending states and cut chop.
- **Mechanism.** MA-cross or channel breakout entry, gated by a volatility-regime filter
  (e.g. realized-vol percentile, ADX, or efficiency-ratio), ATR exit, daily evaluation.
- **Ablation baseline it must beat.** **Regime/vol-gated trend vs always-on trend** (and any
  adaptive band vs a fixed-% band). This is the *exact* gate that killed #2 (regime died OOS)
  and #3 (ATR-adaptive lost to fixed band) — admissible only if it clears it this time.
- **Biggest a-priori risk.** Regime/classifier edges vanish OOS (#2's grave); adaptive
  machinery loses ablation to its trivial version (#3's grave). Strong precedent for failure.
- **Honesty caveat.** *The only cost-resilient trend result cited is a cross-sectional factor
  (CTREND, basket); no cited source proves a single-asset daily trend filter is net-positive
  OOS — and the in-house precedent (#2, #3) is two-for-two against it.*

### #4 — Daily mean-reversion / overextension (3.4) — diversifier, not lead
- **Premise.** Multi-day overextension reverts; reversal is documented gross on daily crypto
  and in one study *dominates* momentum
  ([Dynamic TS momentum](https://www.sciencedirect.com/science/article/abs/pii/S1062940821000590)).
- **Mechanism.** RSI(2)-style or Bollinger reversion entry on overextension, exit on reversion
  to mean, daily bars.
- **Ablation baseline it must beat.** **Threshold reversion vs unconditional reversion**
  (always fade) and vs buy-and-hold — does the overextension *threshold* add over fading every
  pullback?
- **Biggest a-priori risk.** The natural implementation trades often / holds briefly, which
  **re-imports the per-trade fee problem** the swing thesis exists to escape; reversion also
  pays for being wrong during trends (tail risk on the losing side).
- **Honesty caveat.** *Reversal is documented only gross; no cited source proves a fee-positive
  net daily BTC-perp reversion edge, and its turnover profile is the least aligned of the four
  with the fee-amortization thesis.*

---

## 6. #1 Recommendation — Prototype Sketch

Scaffold `strategies/funding-carry-tilt/` (locked design, signal fork open):
- **Signal.** Funding-persistence gate from the full-history fold: short when trailing funding
  EMA over the last K stamps exceeds a threshold; flat/long-exempt otherwise.
- **Anchors before backtest.** K (stamps), funding threshold, hold cap, ATR/price stop —
  written into `spec.md` first; sweep grids declared as robustness fans, not optimizers.
- **Fee/funding model.** 0.17% RT friction per turn; funding booked per-hold as *revenue*
  (signed) via `fundingCostOverHold` against the verified full-history fold.
- **Gates.** Gate A = net edge per leg over friction+funding, **short leg reported alone**;
  **ablation** = funding-gated short vs always-short (+ vs funding-as-flat-constant); Gate B =
  OOS hold-out. Any leg that only works because the window was sideways/down = dead.
- **External fold authoritative** — replay exact Pine over Bybit klines + full funding history;
  do not trust TV strategy-tester read.

---

## 7. Open Questions / Risks

- **Single-leg vs delta-neutral.** The entire #1 thesis hinges on whether a directional short
  can keep enough funding revenue after the unhedged price leg. If it can't, the honest answer
  is "carry needs the spot leg" → defer to a v2 that admits a second instrument.
- **Funding regime stationarity.** The +12%/yr long drag is a 2024 figure; funding sign/size
  is regime-dependent (flips negative in hard sell-offs). The gate must be tested across
  funding regimes, not just the 2024 fold.
- **Per-leg honesty (again).** Every candidate here can produce a combined positive that is
  pure bull-beta on the long side. Lesson #2 is the single most important reporting discipline;
  apply it from Gate A.
- **Harness is the asset, alpha is disposable.** Same scaffold → Pine → gate → keep-or-shelve
  loop as #1–#3. Expect to shelve; the win is a trustworthy kill at low cost.
