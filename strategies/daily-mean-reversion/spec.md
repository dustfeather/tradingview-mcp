# daily-mean-reversion — Spec (pre-registered)

Instrument: `BYBIT:BTCUSDT.P` · Timeframe: `D` · Symmetric long/short, **P&L per leg**.
External fold authoritative — `scripts/run_fold.js` replays `signal.js` over Bybit klines +
full funding history (no Pine; backtest-only).

## Pre-registered anchors (locked before first run)

| Anchor | Value | Rationale |
|---|---|---|
| Oscillator | RSI(2) | Classic short-horizon mean-reversion trigger |
| Long entry | RSI(2) < 10 **and** close > SMA(200) | Fade dips only inside an uptrend |
| Short entry | RSI(2) > 90 **and** close < SMA(200) | Fade rips only inside a downtrend |
| Exit | close crosses SMA(5) | Revert-to-mean exit |
| Trend filter | SMA(200) | Don't fade against the regime |
| Price stop | ATR(14) × 3 (daily) | Cap the loser side (trend tail risk) |

## Sweep grid (robustness fan — NOT an optimizer)
- RSI length ∈ {2, 3, 4}
- Entry thresholds ∈ {(5,95), (10,90), (15,85)}
- Trend filter ∈ {SMA(200), none}
- Exit ∈ {SMA(5), RSI>50}

## Ablation baselines (must beat)
1. **unconditional reversion (always-fade)** — fade every pullback with no threshold. If this
   matches, the overextension threshold adds nothing.
2. **buy-and-hold** — the diversifier must still earn its turnover.

## Gates
- **Gate A:** per-leg net expectancy > ~0.20%/trade after 0.17% RT friction + funding; each leg
  PF alone; combined net PF ≥ 1.3. **Watch trade count** — high turnover inflates total friction.
- **Ablation gate:** beats always-fade at the anchor.
- **Gate B (OOS):** Gate A + ablation hold OOS.

## Fee / funding model
- 0.17% round-trip friction per turn — **dominant cost here** given turnover; report total
  friction paid, not just per-trade.
- Funding subtracted per-hold, signed, via `scripts/funding_fold.js` `fundingCostOverHold`.
  (Brief holds ⇒ funding small per trade, but trade count is high.)

## IS / OOS
- **IS:** 2020-03-25 → 2023-12-31 (incl. 2021 bull + 2022 bear).
- **OOS:** 2024-01-01 → present.
- *Data caveat:* if Bybit `BTCUSDT.P` history starts later than 2020-03, IS floor shifts.

## Kill criteria (any ⇒ shelve)
- Per-trade net move can't clear friction (turnover eats the edge — the re-imported 4H problem).
- Fails to beat always-fade (threshold adds nothing).
- Either leg dead, or combined positive is one-sided.
- Edge IS, gone OOS.
