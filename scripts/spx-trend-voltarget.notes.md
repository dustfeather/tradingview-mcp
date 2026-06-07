# SPX Trend + VolTarget — investigation notes

Branch: `feat/markov-regime-signal`. Chart engine: TradingView Desktop via CDP.

## Origin
Started from `scripts/markov-regime.pine` (Roan/@RohOnChain "Markov Hedge Fund Method" dashboard
indicator). Question: turn the regime model into a buy/sell signal.

## What we tried, in order

1. **Markov forecaster as standalone signal** (`markov-regime-strategy.pine`, now deleted).
   Causal running 3x3 transition matrix, 1-step forecast, argmax(next state)=Bull → long.
   - BTCUSDT daily: +639% — but that is **beta on a fat-trend asset**, not alpha.
   - SPX (SPCFD 1871-2026): long-only ~flat (CAGR 0.29-1.6%, Sharpe ~0), shorts catastrophic (-91%).
   - Verified against Roan's PRIMARY article (not the 3rd-party repo): math is faithful
     (state def, MLE matrix, causal estimation, 1-step forecast). The lag is **inherent to the
     framework's own simplest signal** — the 20-day-return state is a trailing label (describes
     past), and the diagonal-dominant matrix makes "forecast" = "trend continues". The high
     persistence probability is an **autocorrelation tautology** (overlapping 19/20-bar windows),
     not predictive skill.
   - **Theory deviation found + fixed:** original used an EXPANDING all-history matrix; theory
     mandates ROLLING re-estimation (transition probs not time-homogeneous). Added EWMA decay.
     Result: lifted absolute PnL (exposure) but **Sharpe stayed pinned ~0.009 across all
     half-lives 40-252**. Estimation window changes turnover, not edge. → forecaster shelved.

2. **Markov gate + vol-target** (`spx-markov-voltarget.pine`, now deleted). Same risk engine as
   the winner, only the gate is the Markov Bull-forecast. SPX: CAGR 0.57%, Sharpe -0.102. Strictly
   worse than a plain MA trend gate → confirms the regime model adds nothing over trend.

3. **Trend + vol-target** (`spx-trend-voltarget.pine`, THE WINNER). Gate = close>200d MA;
   size ∝ target_vol/realized_vol, leverage-capped, rebalanced to target via `strategy.order`.

## Winner results (TV tester; Sharpe is TV's non-standard metric, relative only)

SPX SPCFD 1871-2026, max_lev 1.5:  CAGR 5.12% / maxDD 38.7% / Sharpe 0.117 / PF 2.63
  vs buy-hold ~4.88% / 41.8% (beats on all three on this dataset).

SPY 1993-2026 (real data), buy-hold (realized): CAGR 10.85% / maxDD 56.0% / Sharpe 0.183
  A @1.5x: 9.38% / 18.2% / 0.179   (ties Sharpe, 1/3 DD, slightly under CAGR)
  A @2.0x: 10.65% / 19.1% / 0.147  (matches CAGR, 1/3 DD, lower Sharpe via drag)

## Robustness
Param surface smooth/robust (not overfit): ma_len 150-250, target_vol 0.10-0.20, SMA/EMA all
beat or match buy-hold with Sharpe 0.10-0.12 on SPCFD.

## Honest verdict
- **The robust, every-period edge is DRAWDOWN REDUCTION (~1/3 of buy-hold), not alpha/Sharpe.**
- Sharpe-beat is period-dependent (full history yes, modern bull tie).
- It works by managing EXPOSURE (cash below trend, de-risk on vol spikes), not predicting returns.

## Caveats / TODO before any real use
- In-sample over full history; no walk-forward train/test split yet.
- SPCFD early data understates the 1929 tail (buy-hold maxDD shows only ~42% there).
- TV Sharpe non-standard; TV buy-hold maxDD is computed on CLOSED-trade equity → bogus for a
  held position (must realize daily / close+reopen, commission 0, to measure it).
- Leverage assumes borrow at ~risk-free; real cost trims the edge.
- Next: walk-forward on SPY, transaction-cost sensitivity, test on QQQ/other indices.
