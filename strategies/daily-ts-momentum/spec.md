# daily-ts-momentum — Spec (pre-registered)

Instrument: `BYBIT:BTCUSDT.P` · Timeframe: `D` · Symmetric long/short, **P&L per leg**.
External fold authoritative — replay exact Pine over Bybit klines + full funding history.

## Pre-registered anchors (locked before first run)

| Anchor | Value | Rationale |
|---|---|---|
| Formation lookback | 28 days (4 wk) | Mid of Liu & Tsyvinski's 1–4 week TS-momentum band |
| Hold / rebalance | 7 days (weekly) | Weekly cadence ⇒ low trade count ⇒ fee amortizes |
| Signal | sign of trailing 28d return | Long if > 0, short if < 0 |
| Price stop | ATR(14) × 3 (daily) | Bound per-trade loss |
| Position | one at a time, 100% equity | Single-instrument v1 |

## Sweep grid (robustness fan — NOT an optimizer)
- Formation ∈ {14, 28, 56} days
- Hold ∈ {7, 14} days
- Signal ∈ {sign, z-score>0.5} (z over trailing 90d)
- Stop ∈ {ATR×2, ATR×3, none}
Survives at the anchor + neighbours = robust; survives at one cell only = fragile.

## Ablation baseline (must beat)
**Buy-and-hold (always-long)** over the same window. The momentum *timing* must add net return
over simply being long. (Secondary: timed long-leg vs timed short-leg reported separately — the
short leg must not be dead weight carried by the long.)

## Gates
- **Gate A:** per-leg net expectancy > ~0.20%/trade after 0.17% RT friction + funding (cost);
  each leg PF alone; combined net PF ≥ 1.3.
- **Ablation gate:** beats buy-and-hold net at the anchor.
- **Gate B (OOS):** Gate A + ablation hold OOS.

## Fee / funding model
- 0.17% round-trip friction per turn.
- Funding subtracted **per-hold, signed**, via `scripts/funding_fold.js` `fundingCostOverHold`
  (full-history fold). For a long-biased weekly hold this is the ~+12%/yr long drag — material,
  not negligible.

## IS / OOS
- **IS:** 2020-03-25 → 2023-12-31 (incl. 2021 bull + 2022 bear).
- **OOS:** 2024-01-01 → present.
- *Data caveat:* if Bybit `BTCUSDT.P` history starts later than 2020-03, IS floor shifts.

## Kill criteria (any ⇒ shelve)
- Either leg's net edge ≤ bar at the anchor.
- Fails to beat buy-and-hold (timing adds nothing).
- Combined positive is entirely the long leg (bull-beta — the #3 failure mode).
- Edge IS, gone OOS (the #2 failure mode).
