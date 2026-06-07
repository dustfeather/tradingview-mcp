# daily-mean-reversion — Plan

**Survey rank:** #4 (diversifier, not lead). Source: `.claude/research/swing-daily-survey.md` §5 #4.

## Premise
Multi-day overextension reverts. Reversal is documented gross on daily crypto and, in one study,
*dominates* the momentum effect ("clear and significant dominance of the short-term contrarian
effect over momentum", Dynamic TS momentum of cryptocurrencies).

## Why horizon-native (not a relifted #1–#3)
Opposite payoff shape to momentum — a distinct mechanism with distinct failure modes. Included
as a diversifier / hedge against the three trend-shaped candidates, not as the lead.

## Symmetry (per-leg, lesson #2)
Long on oversold overextension, short on overbought. Per-leg reporting still mandatory.

## Gate it must clear
- **Gate A:** per-leg net edge over 0.17% RT friction + signed funding. **This is the hard one**
  — reversion trades more often / holds briefly, so it partly re-imports the fee problem the
  swing thesis exists to escape. The per-trade move must still clear the bar.
- **Ablation:** threshold reversion must beat **unconditional reversion (always-fade)** — does
  the overextension *threshold* add over fading every pullback? And beat buy-and-hold.
- **Gate B (OOS):** holds out-of-sample (2024→now).

## Biggest a-priori risk
Turnover. Shorter holds = more friction paid = the 4H fee trap creeping back in. Plus reversion
pays for being wrong during strong trends (tail risk on the losing side).

## Honesty caveat
Reversal is documented only gross; no cited source proves a fee-positive net daily BTC-perp
reversion edge, and its turnover profile is the least aligned of the four with the
fee-amortization thesis.

## Status
**REOPENED — MARGINAL (2026-06-07).** Initial shelve was a FALSE NEGATIVE: the absolute-return /
per-leg gate measured beta, not alpha. On the corrected market-neutral lens this is the **only
survivor** of the four — OOS alpha **+5.9%/yr**, OOS Sharpe **0.43**, beta **0.12**, consistent
IS→OOS. It does NOT clear the keep bar (Sharpe ≥ 0.5), so it is reopened as a thin candidate for
improvement, not a keep. Low capital efficiency (~16% time-in-market). See `notes.md`.
