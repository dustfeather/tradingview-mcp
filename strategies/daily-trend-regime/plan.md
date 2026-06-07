# daily-trend-regime — Plan

**Survey rank:** #3. Source: `.claude/research/swing-daily-survey.md` §5 #3.

## Premise
Daily BTC trends are gross-positive and persistent; a volatility/regime gate should concentrate
exposure into trending states and cut chop.

## Why horizon-native (not a relifted #1–#3)
Daily MA/breakout with a regime gate — but this family is admissible **only if the filter
ablates clean**. It is the survey's explicit cautionary candidate: it shares DNA with #2
(regime gate) and #3 (vol-adaptive engine), both of which died. It carries that warning into
its own gate.

## Symmetry (per-leg, lesson #2)
Long/short on trend sign, gated by regime. Short leg reported alone — a "trend edge" that only
works long is the #3 bull-beta artifact restated.

## Gate it must clear
- **Gate A:** per-leg net edge over 0.17% RT friction + signed funding.
- **Ablation (the whole point):** regime/vol-gated trend must beat **always-on trend** (and any
  adaptive band must beat a **fixed-% band**). This is the *exact* gate that killed #2 (regime
  died OOS) and #3 (adaptive lost to fixed). Admissible only if it clears it this time.
- **Gate B (OOS):** holds out-of-sample (2024→now).

## Biggest a-priori risk
Regime/classifier edges vanish OOS (#2's grave); adaptive machinery loses ablation to its
trivial version (#3's grave). The in-house precedent is two-for-two against this family.

## Honesty caveat
The only cost-resilient trend result cited is a cross-sectional factor (CTREND, basket); no
cited source proves a single-asset daily trend filter is net-positive OOS — and #2/#3 are
direct precedents against it.

## Status
**SHELVED (2026-06-07)** — Gate A + ablation FAIL, decisive. Combined PF 1.22 < 1.3; regime
gate **loses to always-on trend** (+122% vs +328%, value-destroying); short leg dead; OOS PF
0.89. The #2/#3 grave, confirmed a third time — single-asset regime filters don't generalize.
See `notes.md`.
