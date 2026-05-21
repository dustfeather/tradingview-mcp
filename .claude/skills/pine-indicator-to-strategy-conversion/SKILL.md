---
name: pine-indicator-to-strategy-conversion
description: |
  Convert a Pine Script indicator to a strategy for backtesting and automated trading. Use when: 
  (1) You have a working indicator with clear buy/sell signals (plotshape, bgcolor, etc.), 
  (2) You want to test the signals' profitability or automate trading based on them, 
  (3) The indicator logic can be directly translated to strategy entries/exits.
author: Claude Code
version: 1.0.0
date: 2026-05-21
---

# Pine Script Indicator to Strategy Conversion

## Problem
Simply changing `indicator()` to `strategy()` in a Pine Script does not create a working strategy. 
Indicator plotting functions (plotshape, bgcolor, etc.) do not generate actual trades, and 
strategy-specific functions (strategy.entry, strategy.close) are needed for backtesting. 
Additionally, strategies require position sizing and order management considerations that 
indicators do not.

## Context / Trigger Conditions
- You have a Pine Script indicator with visual buy/sell signals (e.g., plotshape entries)
- You want to backtest the indicator's signals using Strategy Tester
- You plan to use the signals for automated trading via alerts or webhooks
- The indicator does not already contain strategy-like logic (e.g., no strategy.* functions)
- You get compilation errors or no trades when naively changing indicator() to strategy()

## Solution
Follow these steps to properly convert an indicator to a strategy:

### 1. Change Declaration
Replace `indicator()` with `strategy()` and add essential parameters:
```pine
// Before
indicator(title='My Indicator', overlay=true)

// After
strategy(
     title='My Strategy',
     overlay=true,
     default_qty_type=strategy.percent_of_equity, // or strategy.fixed
     default_qty_value=10,                        // 10% of equity or fixed contracts
     pyramiding=0,                                // 0 = no pyramiding, >0 = allow multiple entries
     calc_on_order_fills=true,                    // Recalculate on order fills (usually true)
     calc_on_every_tick=true                      // Recalculate on every tick (recommended for strategies)
)
```

### 2. Convert Plotshapes to Strategy Orders
Replace visual signals with actual order commands:
```pine
// Indicator version (visual only)
plotshape(buySignal,  title='Buy',  location=location.belowbar, style=shape.triangleup,  color=color.green)
plotshape(sellSignal, title='Sell', location=location.abovebar, style=shape.triangledown, color=color.red)

// Strategy version (actual orders)
if (buySignal)
    strategy.entry('LongEntry', strategy.long)  // Enter long position
if (sellSignal)
    strategy.close('LongEntry')                 // Close long position
// For short strategies:
// if (sellSignal) strategy.entry('ShortEntry', strategy.short)
// if (buySignal)  strategy.close('ShortEntry')
```

### 3. Handle Position Management
Add logic to prevent multiple entries per signal if desired:
```pine
// One entry per signal (prevent pyramiding on same signal)
var bool entered = false
if (buySignal and not entered)
    strategy.entry('Long', strategy.long)
    entered := true
if (sellSignal)
    strategy.close('Long')
    entered := false
```

### 4. Adapt Visualizations (Optional)
Keep or modify visual elements for reference:
```pine
// Keep background color for visual reference (does not affect strategy)
bgcolor(buySignal  ? color.new(color.green, 90) : sellSignal  ? color.new(color.red, 90) : na, title='Signal BG')

// Or remove table/plots not needed for strategy testing to reduce clutter
// var table t = table.new(...)  // Consider removing if not used in strategy context
```

### 5. Verify and Test
1. Add the script to chart (should show "Strategy" not "Indicator" in title)
2. Open Strategy Tester tab to see performance metrics
3. Check the List of Trades to verify entries/exits match original signals
4. Adjust parameters (qty_type, pyramiding, etc.) as needed for your testing goals

## Verification
- Strategy compiles without errors
- Strategy Tester shows trades corresponding to original indicator signals
- Visual signals (if retained) align with strategy entry/exit markers
- No unexpected order behavior (e.g., multiple entries per bar when not intended)

## Example
Converting a simple RSI-based indicator:
```pine
// Original indicator
indicator('RSI Signals', overlay=true)
rsi = ta.rsi(close, 14)
buy  = rsi < 30
sell = rsi > 70
plotshape(buy,  location=location.belowbar, color=color.green, style=shape.triangleup)
plotshape(sell, location=location.abovebar, color=color.red,   style=shape.triangledown)

// Converted strategy
strategy('RSI Strategy', overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10)
rsi = ta.rsi(close, 14)
buy  = rsi < 30
sell = rsi > 70
if (buy)
    strategy.entry('RSI_Buy', strategy.long)
if (sell)
    strategy.close('RSI_Buy')
```

## Notes
- Strategies execute on close of bar by default (unlike indicators which calculate intraday)
- Use `calc_on_every_tick=true` for intraday signal sensitivity
- Consider commission and slippage in Strategy Tester settings for realistic results
- Alerts from strategies work differently than indicator alerts (use `strategy.order.action`)
- Some indicator-specific functions (like `label.new`) may still work but are optional in strategies

## References
- [TradingView Pine Script Strategy Tutorial](https://www.tradingview.com/pine-script-docs/en/v6/concepts/Strategies.html)
- [strategy.entry() Reference](https://www.tradingview.com/pine-script-docs/en/v6/concepts/Entries.html)