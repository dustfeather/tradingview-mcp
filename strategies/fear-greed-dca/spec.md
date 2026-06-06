# Fear Bottom Finder — Design Spec

**Date:** 2026-05-20
**Type:** Pine Script v6 indicator (replaces the existing "SMA" custom indicator)
**Script ID:** `USER;ab99b4e8c0ff405aaf0e3bafc0a8b31a` (overwrite in place)

## Goal

A visual TradingView indicator that helps the user buy fear and sell greed.
Trading rules the indicator must *support* (it does not execute trades):

1. Buy when the market is fearful; sell/trim when greedy.
2. Buy at most once per calendar month; positions may be closed anytime.
3. Provide an early-warning but reliable read of when a drop is deep enough
   (near a bottom) to buy.

Deliverable: an **indicator** only — no alerts, no `strategy()`. Intended for
US equities and US index ETFs (SPY/QQQ/etc.). Crypto/forex/non-US are out of
scope.

## Why the old indicator failed

The old "SMA" script flagged a monthly buy when `close` came within 1% of the
lower Bollinger Band. Problems:

- Single weak condition — lower-BB touches happen constantly, even in healthy
  uptrends.
- No drawdown context — "near lower BB" carries no information about how far
  price has fallen.
- In a real decline the lower band falls *with* price, so the condition stays
  true through an entire 30% drop and never marks the actual bottom.
- The month-dedup logic (`monthChanged or lastSignalMonth != currentMonth`)
  was effectively dead code — the real gate was an unrelated edge-trigger.

## Approach

A composite **Fear Score (0–100)** built from two factor groups, painted on
the price chart as graded background tiers, with a conservative stacked
**buy-zone** marker.

### Factor group A — Symbol factors (the charted ticker, price-derived)

| Factor | Formula | Sub-score 0→100 |
|--------|---------|-----------------|
| Drawdown from 52wk high | `dd = (ta.highest(close,252) - close) / ta.highest(close,252) * 100` | `0` at 0% DD, `100` at `ddMax` (default 20%) |
| RSI oversold | `r = ta.rsi(close, 14)` | `0` at RSI ≥ 50, `100` at RSI ≤ `rsiFloor` (default 25) |
| Williams VIX Fix | `wvf = (ta.highest(close,22) - low) / ta.highest(close,22) * 100` | `ta.percentrank(wvf, 252)` (already 0–100) |
| Stretch below 200MA | `stretch = (ta.sma(close,200) - close) / ta.sma(close,200) * 100` | `0` at/above MA, `100` at `stretchMax` (default 15%) |

### Factor group B — Market factors (S&P-wide regime, `request.security`)

Gated by `useMarketData` input (default **on**). All requests use daily
timeframe (`"D"`), confirmed close, no lookahead.

| Factor | Source symbols | Sub-score 0→100 |
|--------|----------------|-----------------|
| Market volatility | `CBOE:VIX` vs its own 50-day SMA | rises as `vix / sma(vix,50)` exceeds 1 |
| Junk bond demand | `AMEX:HYG` / `AMEX:LQD` ratio | rises as the ratio falls below its own recent average (credit stress) |
| Safe-haven demand | `SP:SPX` 20-day return − `NASDAQ:TLT` 20-day return | rises as stocks underperform bonds |
| Put/Call ratio | `USI:PCC` | rises as put/call rises above its own average |

**Put/Call** is behind a sub-toggle `usePutCall` (default **off**) — `USI:PCC`
can return `na` on some TradingView plans/regions.

### na handling

Any `request.security` factor that returns `na` is excluded from the weighted
average. The final score is computed over whatever factors are live, so a
missing feed degrades gracefully instead of breaking the indicator.

### Composite

```
fearScore = Σ(subScore_i × weight_i) / Σ(weight_i)   over all live factors
```

Each factor has an input weight (default: all equal). Score clamped 0–100.

### Tiers — graded background

| Score | Tier | Background |
|-------|------|------------|
| `< cautionT` (40) | Neutral | none |
| `cautionT–fearT` (40–60) | Caution | yellow, faint |
| `fearT–extremeT` (60–80) | Fear | orange, faint |
| `≥ extremeT` (80) | Extreme fear | red, faint |

All three thresholds are inputs.

### Buy zone — conservative stacked trigger

```
extreme   = fearScore >= extremeT
capVol    = volume > ta.sma(volume, 20) * volMult        // volMult default 2.0
wvfRoll   = wvf < wvf[1] and wvf[1] >= wvf[2] and ta.percentrank(wvf,252)[1] > 80
buyZone   = extreme and (capVol or wvfRoll)
```

Extreme tier alone does **not** fire the buy zone — it requires an exhaustion
confirmation (capitulation volume spike OR Williams VIX Fix rolling down off an
elevated peak = selling pressure spent). This is the "early but reliable"
near-bottom read.

### Once-per-month markers

```
newMonth = ta.change(month(time)) != 0
var bool boughtThisMonth = false
if newMonth
    boughtThisMonth := false
primaryBuy = buyZone and not boughtThisMonth
if primaryBuy
    boughtThisMonth := true
secondaryBuy = buyZone and boughtThisMonth and not primaryBuy
```

- `primaryBuy` → large green triangle below bar — first qualifying bar of the
  calendar month (respects rule #2: one buy/month).
- `secondaryBuy` → small green dot below bar — later qualifying bars, shown for
  context only.

The indicator does not track positions; closing/trimming is the user's call.

### Display

- Graded background per tier.
- Primary/secondary buy markers via `plotshape`.
- Corner table: current `fearScore` (rounded) + tier name.
- `verbose` input (default off): expands the table to show each live factor's
  sub-score and whether market data is available.

### Non-repainting

- All logic evaluates on confirmed bar close.
- No `request.security` lookahead (`barmerge.lookahead_off`, default).
- `wvfRoll` references `[1]`/`[2]` only — confirmed bars.
- `request.security` calls return values aligned to confirmed daily closes.

## Inputs summary

| Input | Default | Purpose |
|-------|---------|---------|
| `ddMax` | 20 | Drawdown % mapped to sub-score 100 |
| `rsiFloor` | 25 | RSI value mapped to sub-score 100 |
| `stretchMax` | 15 | % below 200MA mapped to sub-score 100 |
| `volMult` | 2.0 | Capitulation volume multiple of 20-bar avg |
| `useMarketData` | true | Enable S&P-wide market factors |
| `usePutCall` | false | Enable `USI:PCC` put/call factor |
| `cautionT` / `fearT` / `extremeT` | 40 / 60 / 80 | Tier thresholds |
| per-factor `weight` inputs | equal | Composite weighting |
| `verbose` | false | Expanded breakdown table |

## Out of scope

- Trade execution, alerts, `strategy()` backtest.
- Position tracking / sell signals (only fear-tier coloring conveys "greed").
- Non-US instruments.
- 52-week-high/low breadth and McClellan breadth factors (TradingView symbol
  availability too unreliable).

## Acceptance

- Compiles clean in Pine v6 (`pine_smart_compile`, no errors).
- Replaces script `USER;ab99b4e8c0ff405aaf0e3bafc0a8b31a` and renders on the
  chart with no runtime errors.
- On a US equity/ETF chart, `data_get_study_values` returns a `fearScore` and
  sub-scores; background tiers and buy markers display.
- With `useMarketData` off, the indicator still produces a valid score from
  symbol factors alone.
