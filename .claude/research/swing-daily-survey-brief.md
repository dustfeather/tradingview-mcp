# Survey Brief — Swing/Daily Axis (post-momentum-null)

**Status:** scoping brief (not the survey itself). Defines the axis, constraints, and
deliverable for the next literature survey after the intraday/4H momentum shortlist was
exhausted. See `RESEARCH.md` §"Strategy Pipeline — Lessons Learned (2026-06-07)".

## Why this axis

The momentum null result is **horizon-specific**: every candidate (#1–#3) cleared a
positive *gross* signal but failed to beat ~0.20% net per trade after 0.17% round-trip
friction + funding, at intraday/4H resolution. The fee bar is a *fixed per-trade* cost;
it is binding at 4H precisely because the per-trade move is small. Over a multi-day swing
the same 0.17% RT amortizes against a much larger move, so the binding constraint relaxes.
The recorded null **does not bound swing/daily** (RESEARCH.md §145–147). This axis attacks
the exact constraint that killed the last three.

## Hard scope rules

1. **This is NOT a revival of #1–#3 on a daily chart.** Their deaths do not transplant
   (death-cause audit): #1's premise is intrinsically intraday (session continuation —
   no daily analogue); #2 died to OOS non-generalization (horizon-independent); #3 died to
   ablation (ATR-adaptation lost to a fixed-% band) + a bull-beta long-only artifact.
   Relifting any of them earns no discount — it would face fresh ablation/OOS/per-leg
   gates anyway, starting from a corpse. The survey must source **horizon-native alpha**,
   not relifted intraday signal.
2. **One instrument family to start:** `BYBIT:BTCUSDT.P` (continuity with the existing
   harness + funding fold). Candidate widening (ETH perp, a basket) is a later fan, not
   part of v1.
3. **No order-book/L2 dependency in v1** — survey must stay within OHLCV + derivatives
   overlay (funding, OI, liquidations) the harness can already fetch.

## Inherited gate discipline (non-negotiable, from lessons #1–#7)

- **Symmetric long/short, P&L reported PER LEG at every gate.** Lesson #2 — the single
  most important reporting discipline. A combined positive expectancy that is entirely the
  long leg riding 2023–24 BTC appreciation is levered beta, not edge. Short leg must stand
  on its own.
- **Ablation is a first-class kill gate.** Each candidate's namesake mechanism must beat
  its own degenerate baseline (e.g. a regime gate vs always-on; an adaptive band vs a
  fixed band). Failing ablation = dead regardless of headline PF; no sweep rescues it.
- **OOS is the graveyard.** Any in-sample regime/classifier result is unproven until it
  holds out-of-sample. Treat IS edge as a hypothesis, not a finding.
- **Anchors before backtest.** Parameter anchors written into the spec *before* the first
  run; sweep grids declared as robustness fans, not optimizers.
- **Fee bar, restated for the horizon.** Still 0.17% RT friction, but per-trade net is now
  measured against a multi-day move. **Funding is now load-bearing** and is correctly
  modelled: full-history funding fold via `scripts/funding_fold.js` (the prior ~200-row
  pager cap is fixed — verified 1099 rows/yr, ~+12%/yr long drag in 2024). Funding must be
  subtracted per-hold via `fundingCostOverHold`, not approximated as a flat constant.
- **External fold is authoritative** (TV strategy-tester read is broken): replay exact
  Pine logic over Bybit klines + the full funding history. Reproducible, comparable across
  candidates.

## Families to survey (the search axes)

Horizon-native, fee-tolerant, non-(intraday-momentum). Survey should rank, not assume:

- **Daily/weekly time-series & cross-sectional momentum** (the classic 3–12 month
  formation / 1-month hold factor) — genuinely a different beast from intraday continuation;
  the family with the most robust published out-of-sample evidence across asset classes.
- **Mean-reversion / overextension on daily** (e.g. multi-day RSI(2)-style, Bollinger
  reversion) — opposite payoff shape to momentum, different failure modes.
- **Funding-rate carry / basis harvest** — funding was treated purely as a *cost* in
  #1–#3; on perps it is a *harvestable* signal (persistently positive funding ⇒ short-carry
  premium). Sidesteps the AMH/efficiency-decay problem entirely. Now that the funding fold
  is correct, this family is finally measurable.
- **Trend-following with regime/vol filters at daily scale** — only if the survey finds a
  filter that ablates clean; #3 is a cautionary precedent here.

Excluded from v1: anything needing L2 depth, sub-daily microstructure, or cross-exchange
plumbing.

## Search queries (seed set)

- "cryptocurrency time series momentum daily weekly out-of-sample transaction costs"
- "crypto cross-sectional momentum factor Bitcoin altcoin holding period"
- "perpetual funding rate carry strategy basis premium backtest"
- "Bitcoin mean reversion RSI2 daily overextension profitability after fees"
- "trend following Bitcoin volatility regime filter daily out-of-sample"

## Deliverable

A ranked shortlist (§5-style, mirroring the momentum survey's format) of **3–5 horizon-native
candidates**, each with: premise, mechanism, the specific ablation baseline it must beat,
its biggest a-priori risk, and a one-line honesty caveat on whether any cited source proves
a fee-positive *tradable* edge at this horizon (the momentum survey's honesty caveat is the
template — it correctly predicted the null). The shortlist feeds the same
scaffold → Pine → gate → keep-or-shelve loop. Harness is the reusable asset; alpha is
disposable.

## Prerequisite — DONE

Funding full-history fold (`scripts/funding_fold.js`) — the harness debt that had to be
repaid before any longer-hold gate is trustworthy. Complete and verified.
