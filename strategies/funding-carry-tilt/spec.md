# funding-carry-tilt — Spec (pre-registered)

Instrument: `BYBIT:BTCUSDT.P` · Timeframe: `D` · Symmetric long/short, **P&L per leg**.
External fold authoritative (TV strategy-tester read is broken) — `scripts/run_fold.js` replays
`signal.js` over Bybit klines + full funding history (no Pine; funding is the signal, only
readable in the external fold).

## Pre-registered anchors (locked before first run)
Funding stamps on Bybit linear perps post every **8h** → 3/day, 21/week.

| Anchor | Value | Rationale |
|---|---|---|
| Funding lookback `K` | 21 stamps (≈7d) | Weekly persistence; smooths single-stamp noise |
| Funding signal | EMA of funding rate over `K` stamps | Persistence, not spot funding |
| Long-carry threshold | EMA ≤ −0.0033%/8h (≈ −3%/yr) | Get paid to be long |
| Short-carry threshold | EMA ≥ +0.0033%/8h (≈ +3%/yr) | Get paid to be short; ≈ verified 2024 +12%/yr is well above |
| Hold cap | 30 days | Bound a single regime hold |
| Price stop | ATR(14) × 3 (daily) | Guard the unhedged price leg (the #1 risk) |

Position rule: short while short-threshold met; long while long-threshold met; flat in the
dead-band between thresholds. One position at a time.

## Sweep grid (robustness fan — NOT an optimizer)
Declared as a fan to test stability around the anchor, not to pick a winner:
- `K` ∈ {9, 21, 45} stamps
- threshold ∈ {±0.0017%, ±0.0033%, ±0.0067%}/8h
- stop ∈ {ATR×2, ATR×3, none(hold-cap only)}
A result that only survives at one grid cell is fragile, not an edge.

## Ablation baselines (must beat all)
1. **always-short** over the same window (does the funding gate add over static short-beta?)
2. **always-long** (same, long side)
3. **funding-as-flat-constant** (replace the full-history fold with a single average funding) —
   if this matches, the fold/signal is doing nothing.

## Gates
- **Gate A:** per-leg net expectancy > ~0.20% / trade after 0.17% RT friction **+ signed
  funding revenue**; each leg PF reported alone; combined net PF ≥ 1.3 (inherited #3 bar).
- **Ablation gate:** beats all three baselines at the anchor (not just somewhere on the grid).
- **Gate B (OOS):** Gate A + ablation hold on OOS.

## Fee / funding model
- 0.17% round-trip friction per turn (taker + slippage).
- Funding booked **per-hold, signed**, via `scripts/funding_fold.js` `fundingCostOverHold`
  against the full-history fold (verified 1099 rows/yr). Here funding is *revenue* (negative
  cost) on the correctly-signed leg.

## IS / OOS
- **IS:** 2020-03-25 → 2023-12-31 (2021 bull + 2022 bear in-sample for short-leg honesty).
- **OOS:** 2024-01-01 → present.
- *Data caveat:* if Bybit `BTCUSDT.P` funding/kline history starts later than 2020-03, IS floor
  shifts to first available stamp.

## Kill criteria (any ⇒ shelve)
- Either leg's net edge ≤ friction+funding bar at the anchor.
- Fails ablation (static position or flat-constant funding matches).
- Edge present IS, gone OOS.
- Combined positive is entirely one leg (levered beta).
