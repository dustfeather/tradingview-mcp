> **Provenance note.** Sources for this survey were fetched programmatically via `ctx_execute` + `curl` against the Semantic Scholar, arXiv, and Crossref APIs (the `degoog` web-search path being non-functional in this environment). Every citation below traces to a verified source title + DOI/URL supplied in the research brief; no external sources were added. Where the underlying evidence is **abstract-level only** (no full-text figures, basis-point P&L, or fee-net statistics extracted), this is stated inline. **Critical honesty caveat:** none of these sources proves a *fee-positive, tradable* BTC-perpetual intraday momentum edge. The Bybit net-of-fees edge math in this report is **first-principles**, not empirically validated by any cited paper. Inline citations use the form `[short-title](url-or-doi)`.

---

# BTC-Perp Intraday Momentum — Survey + Ranked Shortlist

## 1. Executive Summary

**What the evidence bounds.** The literature establishes, at the *gross* (pre-cost) level, three robust facts relevant to an intraday BTC-perp momentum system:

1. **Intraday time-series momentum exists in Bitcoin specifically.** The first half-hour return positively predicts the last half-hour return, strengthening during downturns ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290)). This is the single most on-target empirical result we have.
2. **Predictability is episodic and regime-dependent, not permanent.** Multiple papers converge on an Adaptive-Market-Hypothesis picture: crypto returns are "unpredictable most of the time" with short inefficiency windows ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4); [AMH evolving predictability of bitcoin](https://doi.org/10.1016/j.econlet.2018.03.005)), and efficiency has been *increasing* over time ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4); [bitcoin-futures efficiency](https://doi.org/10.1002/fut.22164)).
3. **Fees are the binding constraint, and they kill most strategies.** The only paper that directly models fee sensitivity on BTC shows profitable strategies collapsing from 11→5 at a 2% round-trip fee and 11→2 at 4%, with zero profitable at the shortest holding period ([algorithmic BTC profitability](https://doi.org/10.7717/peerj-cs.337)).

**What the evidence does NOT show.** No cited source demonstrates a per-trade net edge above Bybit's ~0.20% friction floor for intraday BTC perpetuals. The on-target intraday-momentum papers are explicitly gross-of-fees ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290); [one-day abnormal returns momentum](https://doi.org/10.1007/s11408-020-00357-1)). The strongest "survives transaction costs" claim is from **equity indices** (KOSPI), not crypto ([MIM KOSPI](https://doi.org/10.3390/jrfm15110523)).

**Recommendation.** Prototype **#1: a derivatives-confirmed intraday time-series momentum strategy** — the [Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290) signal (early-session return → late-session continuation), gated by a volatility/regime filter (to fire only inside inefficiency windows) and confirmed by a derivatives overlay (funding/OI), with an ATR stop and EOD flatten. This stacks the only crypto-specific intraday-momentum result on top of the regime-filtering the AMH literature demands, and concentrates trades into the few high-conviction signals per day that can plausibly clear the fee bar. Fee-defensibility is *unproven* and must be the kill criterion of the backtest, not an assumption.

---

## 2. Methodology + Bybit Net-of-Fees Edge Bar

**Method.** Each momentum family is described mechanically, attached to its cited evidence (flagged gross/net/unstated and abstract-level where applicable), scored on **Difficulty (1=easy … 5=hard to build/operate)** and **Reliability (1=fragile … 5=robust evidence)**, and given a net-of-fees verdict. The fee bar below is first-principles, calibrated to Bybit BTC-perp taker execution. No cited paper validates these specific numbers for Bybit; the fee-sensitivity *direction* is grounded in [algorithmic BTC profitability](https://doi.org/10.7717/peerj-cs.337) and [Using algorithmic trading / fee drag](https://doi.org/10.7717/peerj-cs.337).

### Bybit round-trip friction (taker, BTC-perp)

| Cost component | Per side | Round trip | Notes |
|---|---|---|---|
| Taker fee | ~0.055% | ~0.110% | Bybit standard taker; assumes market/aggressive limit fills |
| Slippage | ~0.01–0.08% | ~0.02–0.16% | Single $100k clip in liquid BTC-perp; widens in fast tape |
| Funding (partial, intraday hold) | — | ~0.00–0.03% | Small if flat by EOD and not straddling funding stamps |
| **Total round-trip friction** | — | **~0.13–0.30%** | Lower bound = clean fills; upper = stressed conditions |

### Edge bar

| Quantity | Value | Source basis |
|---|---|---|
| Round-trip friction | 0.13–0.30% | First-principles (Bybit taker schedule + slippage + funding) |
| **Minimum net edge to survive** | **> ~0.20% per trade** | First-principles midpoint; a signal "survives" only if gross edge − friction > ~0.20% net |
| Required gross per-trade edge | **~0.33–0.50%** | Friction (0.13–0.30%) + required net (0.20%) |

**Implication for design.** To net ~0.20%, the average winning intraday momentum trade must capture **~0.33–0.50% gross**. This forces (a) **few, high-conviction trades** (every marginal trade pays full friction), (b) **maker fills where possible** to shave the taker leg, and (c) regime filtering so capital is deployed only inside predictability windows — directly motivated by [AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4). The fee-sensitivity evidence is sobering: at a 2% round-trip fee, 6 of 11 BTC strategies that were gross-profitable went underwater, and the shortest holding period was unprofitable at every fee level tested ([algorithmic BTC profitability](https://doi.org/10.7717/peerj-cs.337)). Bybit's ~0.2% is far below 2%, but the *shape* of the result — short holds are most fee-fragile — is the central design risk for an intraday system.

---

## 3. Momentum Family Survey

### 3.1 Intraday Time-Series Momentum

**How it works.** Use the sign/magnitude of an early-session return (e.g., first 30-min bar, or rolling intraday return) to predict continuation into the close. Enter in the direction of the established intraday trend; exit by EOD.

**Cited evidence.**
- **Most on-target result:** the **first half-hour Bitcoin return positively predicts the last half-hour return, especially during market downturns**, with volume proxying trading time ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290), abstract-level; gross-of-fees — magnitude and fee survival *not* quantified in the abstract). A companion mechanism note from the same paper is also abstract-level ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290)).
- **Cross-asset benchmark:** "Market Intraday Momentum" is established in the KOSPI index over 10+ years of 30-min bars and is reported **profitable and robust to transaction costs** using cost measures that account for cheaper end-of-day execution ([MIM KOSPI](https://doi.org/10.3390/jrfm15110523), gross/abstract-level, equities not crypto).
- **Foundational:** time-series momentum as a documented factor ([Time Series Momentum](https://doi.org/10.1016/j.jfineco.2011.11.003), abstract-level, gross).
- **Caution — regime split:** a Markov-switching study finds the overnight-to-last-half-hour predictability **disappears out-of-sample** ([Understanding intraday momentum strategies](https://doi.org/10.1002/fut.22375), unstated/abstract-level), and existing filter-based momentum models suffer lag that flips signal sign at trend changes ([HMM intraday momentum](https://arxiv.org/abs/2006.08307)).

**Pros.** Directly evidenced *in Bitcoin*; mechanically simple; EOD-flat by construction; cross-asset analog explicitly survives costs.
**Cons.** Bitcoin result is gross and abstract-level (no bp figure, no fee test); out-of-sample fragility documented elsewhere; filter lag risk.
**Difficulty 2/5 · Reliability 4/5.**
**Net-of-fees verdict.** Best evidence-to-target match in the corpus, but fee survival is *unproven for BTC*. Survives only if the early→late effect is large enough to clear ~0.33–0.50% gross on the average trade — untested. **Build it, prove the fee bar.**

### 3.2 Opening-Range Breakout (ORB)

**How it works.** Define an opening-range window (e.g., first N minutes), enter on a breakout beyond its high/low, stop at the opposite side, flatten EOD.

**Cited evidence.** No cited source studies ORB directly. The *closest* support is indirect: intraday momentum and early-session-conditioning effects ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290), gross/abstract) and the equity intraday-momentum literature ([MIM KOSPI](https://doi.org/10.3390/jrfm15110523), gross/abstract). Momentum after **one-day abnormal returns** is significant in BTC/ETH/LTC ([one-day abnormal returns momentum](https://doi.org/10.1007/s11408-020-00357-1), gross/abstract, no bp figure), giving a loose breakout-after-shock rationale — but the same paper finds **2 of 6 crypto/direction combinations reverse** instead of continuing ([one-day abnormal returns momentum](https://doi.org/10.1007/s11408-020-00357-1)), a contrarian-risk warning for naive breakouts.

**Pros.** Simple, well-defined entries/exits; natural ATR-stop wiring; intuitively aligned with intraday momentum.
**Cons.** **No direct crypto evidence in this corpus.** False-breakout/reversal risk is documented ([one-day abnormal returns momentum](https://doi.org/10.1007/s11408-020-00357-1)). Breakouts are taker-heavy (you cross the spread on the break), worsening the fee bar.
**Difficulty 2/5 · Reliability 2/5.**
**Net-of-fees verdict.** Plausible but **evidentially thin here**. Taker-cost-heavy and reversal-prone. Viable only as a variant of 3.1 with a regime filter, not as a standalone bet.

### 3.3 Regime / Volatility-Filtered Momentum

**How it works.** Run a momentum signal only when a regime classifier says the market is in a trending/predictable state; sit out otherwise. Classifiers in the literature: Markov-switching, HMM latent states, rolling predictability tests.

**Cited evidence.**
- **AMH core:** crypto returns are "unpredictable most of the time" but suffer "short periods of weak-form inefficiency" ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4), gross/abstract); both linear and nonlinear dependence open and close in rolling windows ([AMH evolving predictability](https://doi.org/10.1016/j.econlet.2018.03.005), gross/abstract). Predictability **may be decreasing** over the 2013–2022 sample ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4)).
- **Regime models:** Markov-switching identifies two regimes where overnight→close predictability depends on signal strength — but **vanishes out-of-sample** ([Understanding intraday momentum](https://doi.org/10.1002/fut.22375), unstated/abstract). HMM with 2–3 latent states reaches pre-cost Sharpe >2.0 on ES futures, dropping ~15% post-cost ([HMM intraday momentum](https://arxiv.org/abs/2006.08307), abstract-level, equities not crypto; in-sample), and a state-space formulation reduces the filter-lag that mis-signs momentum at reversals ([HMM intraday momentum](https://arxiv.org/abs/2006.08307)).
- **HF nuance:** at 30-min bars crypto efficiency trended *up*, but at 5-min bars it trended *down* (less efficient) ([HF crypto AMH](https://doi.org/10.2478/ceej-2025-0003), gross/abstract) — suggesting the exploitable window may live at shorter intraday horizons. Intraday return curves show conditional predictability in specific periods ([CIDR predictability](https://doi.org/10.1016/J.IRFA.2021.101784), unstated/abstract).

**Pros.** Directly addresses the fee problem by **not trading** in noise regimes — exactly what the edge-bar math demands. Strongest *conceptual* fit to the AMH evidence. Reduces trade count, conserving friction budget.
**Cons.** Regime edges repeatedly **fail out-of-sample** ([Understanding intraday momentum](https://doi.org/10.1002/fut.22375)); strong HMM Sharpe is **in-sample equities** ([HMM intraday momentum](https://arxiv.org/abs/2006.08307)); overfitting risk in the classifier itself. Higher build complexity.
**Difficulty 4/5 · Reliability 3/5.**
**Net-of-fees verdict.** The **right architecture** for fee-defensibility — it gates a base momentum signal into the few moments that can clear the bar. Best used as a *filter on 3.1*, not a standalone alpha. Out-of-sample discipline is non-negotiable.

### 3.4 Derivatives-Confirmed Momentum (Funding / OI / Liquidations)

**How it works.** Take a price-momentum signal only when derivatives microstructure confirms it: e.g., rising open interest in the trend direction, funding consistent with crowd positioning, or liquidation flow supporting continuation.

**Cited evidence.**
- **Perp pricing structure:** funding-rate volatility drives perpetual-pricing model complexity, and ML/econometric pricing of perpetual BTC futures has been turned into directional trading rules — an EGARCH-driven directional HFT model reports **~85% directional accuracy** on backtests, with ARMA(0,0) best for the intraday conditional mean ([ML/econometric perpetual pricing](https://www.semanticscholar.org/paper/279683d1756fe217b6cf4570d1dfb9addd60ffbe), gross/abstract-level). **Important:** the paper's headline 1500–8000% backtest returns and 85% accuracy are **not** per-trade net-of-fee figures, and directional accuracy ≠ profitable edge.
- **Liquidation structure:** on BitMEX, daily forced liquidations run **3.51% of outstanding longs vs 1.89% of shorts** — a real long/short asymmetry — but the paper is a **margin/risk study, not a trading edge**, and validates no alpha net of fees ([liquidation/leverage/margin](https://arxiv.org/abs/2102.04591), unstated).

**Pros.** Derivatives data is the spec's allowed overlay (funding/OI/liquidations, no order-book depth). Confirmation can raise per-trade hit-rate, improving the chance of clearing the fee bar. Targets the actual instrument (perpetuals).
**Cons.** **No cited source proves a fee-net derivatives-confirmed intraday edge.** The directional-accuracy result is gross and abstract-level with no per-trade P&L ([ML/econometric perpetual pricing](https://www.semanticscholar.org/paper/279683d1756fe217b6cf4570d1dfb9addd60ffbe)); liquidation asymmetry is descriptive risk, not signal ([liquidation/leverage/margin](https://arxiv.org/abs/2102.04591)). Derivatives features add data-engineering and look-ahead-bias risk.
**Difficulty 4/5 · Reliability 2/5.**
**Net-of-fees verdict.** **Confirmation layer, not standalone alpha.** Its value is improving the precision of 3.1's signal so fewer, better trades clear ~0.20% net. Promising but unproven; treat the 85% figure with heavy skepticism.

### 3.5 Liquidation-Cascade / Squeeze

**How it works.** Detect a forced-liquidation cascade (rapid one-sided liquidations driving price) and ride the momentum of the cascade, or fade its exhaustion.

**Cited evidence.** Only **structural/descriptive** support: liquidation asymmetry (3.51% long vs 1.89% short daily on BitMEX) and the recommendation to raise margins to cut margin-call probability to 1% ([liquidation/leverage/margin](https://arxiv.org/abs/2102.04591), unstated/abstract). This establishes that cascades are real and asymmetric but **provides no tradable edge and no fee-net validation**.

**Pros.** Cascades produce large, fast moves — the rare case where a single trade could clear well above ~0.33–0.50% gross. Asymmetry gives a directional prior ([liquidation/leverage/margin](https://arxiv.org/abs/2102.04591)).
**Cons.** **No evidence of a profitable strategy here at all** in the corpus. Cascades are exactly when slippage explodes (pushing friction toward the 0.30% upper bound), fills are worst, and ATR stops gap. Highest operational risk; data latency on liquidation feeds is decisive and unmodeled in any cited source.
**Difficulty 5/5 · Reliability 1/5.**
**Net-of-fees verdict.** **Highest upside per trade, lowest evidential support, worst execution conditions.** Out of scope for a v1 prototype; revisit only with a live liquidation feed and depth data (deferred to v2 per spec).

### Family scorecard

| Family | Difficulty | Reliability | Direct BTC evidence? | Net-of-fees verdict |
|---|---|---|---|---|
| 3.1 Intraday TS momentum | 2 | 4 | **Yes** (gross) | Best fit; fee survival unproven — prove it |
| 3.2 Opening-range breakout | 2 | 2 | No (indirect) | Thin; taker-heavy; only as a 3.1 variant |
| 3.3 Regime/vol-filtered | 4 | 3 | Partial (AMH, gross) | Right architecture; use as filter on 3.1 |
| 3.4 Derivatives-confirmed | 4 | 2 | Partial (gross, abstract) | Confirmation layer, not standalone |
| 3.5 Liquidation-cascade | 5 | 1 | Structural only | Out of scope v1; defer to v2 |

---

## 4. Excluded Families

| Family | Why out of scope for this spec |
|---|---|
| **Mean-reversion** | Opposite of momentum thesis; reversal risk is a *cost* here, not the strategy. Note the corpus shows absolute-return autocorrelation (volatility clustering) but **near-zero raw-return autocorrelation** ([Rise of the machines](https://arxiv.org/abs/2009.04200v1)) and 2/6 crypto cases reverse after shocks ([one-day abnormal returns](https://doi.org/10.1007/s11408-020-00357-1)) — relevant as a momentum *risk*, not a strategy to build. Excluded by mandate (momentum survey). |
| **Grid trading** | Range-bound, high trade-count strategy — fee-fragile under the ~0.20% bar ([algorithmic BTC profitability](https://doi.org/10.7717/peerj-cs.337) shows short-hold/high-turnover dies first) and not momentum. |
| **Carry / funding-arb** | Earns the funding *spread*, not directional momentum; multi-leg, not "single position, flat by EOD." Out of style scope. |
| **Statistical arbitrage** | Cross-asset/pairs; spec is single BTC perp, single position. Out of scope. |
| **Market-making** | Requires order-book depth (explicitly deferred to v2) and inventory/latency infrastructure beyond the OHLCV+derivatives data scope. |
| **Event / sentiment** | Macro/event signals (e.g., volatility around central-bank QE announcements, [CB monetary policy & crypto vol](https://doi.org/10.21511/imfi.14(4).2017.07)) are rare-event regime signals, not a fee-defensible *intraday* per-trade edge — the paper quantifies no net return. Out of scope as a primary strategy; usable only as a risk-off blackout filter. |

---

## 5. Ranked Shortlist (by fee-defensibility)

### #1 — Derivatives-confirmed intraday TS momentum (3.1 × 3.3 × 3.4)
**Fit.** Stacks the only crypto-specific intraday-momentum result ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290)) with a regime gate ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4); [Understanding intraday momentum](https://doi.org/10.1002/fut.22375)) and a derivatives confirmation layer ([ML/econometric perpetual pricing](https://www.semanticscholar.org/paper/279683d1756fe217b6cf4570d1dfb9addd60ffbe)). Few trades/day, EOD-flat — matches the spec and the fee math.
**Failure modes.** Early→late effect too small to clear ~0.33–0.50% gross; regime filter overfits and fails out-of-sample ([Understanding intraday momentum](https://doi.org/10.1002/fut.22375)); derivatives confirmation adds look-ahead bias.
**What must be true.** The Bitcoin early→late momentum effect must be (a) large enough net of ~0.20% friction and (b) concentrated in identifiable regimes so trade count stays low. Both are *currently unproven*.

### #2 — Regime/volatility-filtered momentum (3.3 as standalone)
**Fit.** Most directly attacks the fee problem by trading rarely, only inside inefficiency windows ([AMH evolving predictability](https://doi.org/10.1016/j.econlet.2018.03.005); [HF crypto AMH](https://doi.org/10.2478/ceej-2025-0003)). HMM/Markov machinery is well-studied ([HMM intraday momentum](https://arxiv.org/abs/2006.08307)).
**Failure modes.** Regime edges repeatedly vanish out-of-sample ([Understanding intraday momentum](https://doi.org/10.1002/fut.22375)); strong Sharpe evidence is in-sample equities, not crypto ([HMM intraday momentum](https://arxiv.org/abs/2006.08307)).
**What must be true.** A regime classifier must generalize out-of-sample on BTC perps — the literature's biggest red flag.

### #3 — Volatility-adaptive (ATR/Keltner) trend momentum (3.1 with ATR engine)
**Fit.** ATR-based systems were PSO-optimized for **net** profit on five cryptos and claim trend-prediction capability, with long trades outperforming short ([ATR systems](https://doi.org/10.1002/for.2906), net but abstract-level — no post-fee P&L reported). Maps cleanly onto the spec's required ATR stop.
**Failure modes.** Abstract reports no actual post-fee survival ([ATR systems](https://doi.org/10.1002/for.2906)); long-bias may be a 2016–2018-style bull artifact; filter lag mis-signs at reversals ([HMM intraday momentum](https://arxiv.org/abs/2006.08307)).
**What must be true.** ATR-adaptive entries/exits must capture enough trend to clear the fee bar on BTC perps intraday, which the cited net result does not establish at this resolution.

---

## 6. #1 Recommendation — Prototype Plan

**Strategy:** *Derivatives-confirmed, regime-gated intraday time-series momentum on BTC perpetual (Bybit), single position, flat by EOD.*

### Entry logic
- Compute the **early-session intraday return** (e.g., first 30-min bar or first fixed fraction of the UTC day), per the [Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290) finding that the first half-hour predicts the last half-hour.
- Signal direction = sign of early-session return; only consider entries when |signal| exceeds a volatility-scaled threshold (ATR-normalized) so noise-sized moves don't trigger.
- Prefer **maker fills** (resting limit at signal price) to shave the taker leg off the round-trip and improve the fee bar.

### Regime + derivative confirmation (both required to fire)
- **Regime gate:** a rolling predictability/volatility-regime filter that only permits trading inside "inefficiency windows," motivated by the AMH evidence that crypto is unpredictable most of the time ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4); [AMH evolving predictability](https://doi.org/10.1016/j.econlet.2018.03.005)). Start simple (volatility regime / trend-strength) before any HMM, given out-of-sample failures of complex regime models ([Understanding intraday momentum](https://doi.org/10.1002/fut.22375)). The downturn-conditioning of the base effect ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290)) is a candidate regime split to test.
- **Derivative confirmation:** require OI building in the signal direction and funding not extreme-against the trade; motivated by the perp-pricing/directional literature ([ML/econometric perpetual pricing](https://www.semanticscholar.org/paper/279683d1756fe217b6cf4570d1dfb9addd60ffbe)) — treated as a *filter to raise precision*, not as standalone alpha.

### Exit / guardrail wiring (per spec)
- **ATR stop** on every position (volatility-adaptive, per [ATR systems](https://doi.org/10.1002/for.2906)).
- **EOD flatten** unconditionally — the base effect resolves into the close, and EOD-flat caps overnight/funding exposure.
- **Daily kill-switch:** halt for the day at **+3R** or after **2 consecutive losses** (per spec guardrails).

### Fee / funding backtest model
- Charge **taker 0.055%/side** by default; credit maker fills where the design rests limits.
- Add **slippage 0.01–0.08%/side**, scaled up in high-volatility regimes (cascade-adjacent tape pushes toward the 0.30% upper bound).
- Apply **partial funding** for any hold straddling a funding stamp; near-zero if flat by EOD and not crossing a stamp.
- **Report per-trade NET P&L distribution**, not just aggregate return — the fee-sensitivity evidence shows short-hold strategies die first under cost ([algorithmic BTC profitability](https://doi.org/10.7717/peerj-cs.337); [fee drag / net edge erosion](https://doi.org/10.7717/peerj-cs.337)).

### Validation kill-criteria
1. **Fee bar:** median net per-trade edge must exceed **~0.20%** after full friction. If the gross early→late effect cannot reach ~0.33–0.50% on average winners, **kill it** — directly testing the unproven assumption.
2. **Out-of-sample regime stability:** the regime gate must hold up out-of-sample; if predictability vanishes OOS as in [Understanding intraday momentum](https://doi.org/10.1002/fut.22375), strip or simplify the gate.
3. **Decay check:** test recent sub-periods — efficiency has trended up and predictability down ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4); [bitcoin-futures efficiency](https://doi.org/10.1002/fut.22164)). If edge is concentrated pre-2018-ish, distrust it.
4. **Confirmation lift:** the derivatives filter must measurably improve net hit-rate vs. price-only; if not, drop it to cut complexity and look-ahead risk.

---

## 7. Open Questions / Risks

- **No proof of a fee-positive BTC-perp intraday edge.** The on-target intraday-momentum evidence is gross and abstract-level ([Bitcoin intraday TS momentum](https://doi.org/10.1111/fire.12290)); the "survives costs" proof is equities ([MIM KOSPI](https://doi.org/10.3390/jrfm15110523)). The fee math here is first-principles. The prototype is a *hypothesis test*, not a known winner.
- **Magnitude gap.** No cited source gives the early→late effect in basis points for BTC, so we cannot yet say whether it clears ~0.33–0.50% gross. This is the #1 unknown.
- **Out-of-sample fragility.** Regime predictability disappearing OOS ([Understanding intraday momentum](https://doi.org/10.1002/fut.22375)) is the dominant model risk.
- **Efficiency decay / factor decay.** Crypto markets trending more efficient ([AMH return predictability](https://doi.org/10.18559/ebr.2023.1.4)), futures introduction reducing trend-rule predictability ([bitcoin-futures efficiency](https://doi.org/10.1002/fut.22164)), and TSMOM decay post-2016 noted in equities ([tug of war](https://doi.org/10.1016/j.jfineco.2019.03.011)) all argue any historical edge may already be arbitraged.
- **Resolution ambiguity.** Efficiency trended *up* at 30-min but *down* at 5-min ([HF crypto AMH](https://doi.org/10.2478/ceej-2025-0003)); the right bar size for the entry signal is an open empirical question.
- **Filter lag.** Moving-average/momentum filters mis-sign at reversals ([HMM intraday momentum](https://arxiv.org/abs/2006.08307)); ATR stops and entry filters must account for this.
- **Reversal/contrarian risk.** 2 of 6 crypto/direction cases reversed after shocks ([one-day abnormal returns](https://doi.org/10.1007/s11408-020-00357-1)); the regime gate must screen reversal-prone setups.
- **Backtest realism.** Headline accuracy/return figures in the corpus (e.g., 85% directional accuracy, 1500–8000% returns) are gross and not per-trade net ([ML/econometric perpetual pricing](https://www.semanticscholar.org/paper/279683d1756fe217b6cf4570d1dfb9addd60ffbe)); do not anchor expectations to them.
- **Data scope limit.** No order-book depth in v1 means liquidation-cascade plays (3.5) and true market-making are deferred ([liquidation/leverage/margin](https://arxiv.org/abs/2102.04591) is structural only). v2 with depth + live liquidation feeds reopens those families.
