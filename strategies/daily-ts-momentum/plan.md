# daily-ts-momentum — Plan

**Survey rank:** #2. Source: `.claude/research/swing-daily-survey.md` §5 #2.

## Premise
Trailing 1–4 week return predicts the next week on the crypto factor (Liu & Tsyvinski, NBER
w24877). A genuine **multi-day** momentum effect — distinct from #1's intraday session
continuation, which had no daily analogue.

## Why horizon-native (not a relifted #1–#3)
Formation/hold are measured in weeks, not the session. The signal is the sign (or z-score) of a
multi-week return — a different mechanism from intraday continuation, sourced from the family
with the most robust published cross-asset OOS evidence.

## Symmetry (per-leg, lesson #2)
Long on positive trailing momentum, short on negative. **Short leg reported alone.** This is
the candidate most exposed to the #3 trap (a combined positive that is pure long-leg bull-beta),
so per-leg honesty is the central discipline here.

## Gate it must clear
- **Gate A:** per-leg net edge over 0.17% RT friction + signed funding (funding is a *cost* here,
  subtracted per-hold).
- **Ablation:** TS-momentum timing must beat **buy-and-hold (always-long)**. If always-long
  matches the combined return, the "timing" is levered beta, not edge.
- **Gate B (OOS):** holds out-of-sample (2024→now).

## Biggest a-priori risk
Realistic-cost assessment shrinks crypto momentum to insignificance (Han, Kang & Ryu, SSRN
4675565) and replication finds it fragile (Grobys et al. 2025). High risk the entire combined
edge is the long leg riding 2023–24 BTC appreciation.

## Honesty caveat
The cost-resilient momentum evidence is cross-sectional (basket); no cited source proves a
fee-positive net edge for *single-asset* BTC TS-momentum at this horizon.

## Status
**SHELVED (2026-06-07)** — Gate A + ablation FAIL, decisive (bull-beta). FULL combined PF 1.76
is entirely the long leg (+395%, riding BTC appreciation); short leg dead (PF 0.80); loses to
buy-and-hold (+351% vs +738%); collapses OOS (PF 0.65). The exact lesson-#2 trap. See `notes.md`.
