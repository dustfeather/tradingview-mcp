# daily-mean-reversion — Notes (run log)

Scaffolded 2026-06-07. Locked design, signal fork open. No runs yet.

## Reminders before Gate A
- Turnover is the killer. Report TOTAL friction paid and trade count up front — this is the one
  candidate that can re-import the 4H fee trap on a daily chart.
- Ablation = beat always-fade. If fading every pullback matches, the RSI threshold is decoration.
- SMA(200) trend filter is doing a lot of work; the no-filter sweep cell tells you how much.

## Open fork
- Oscillator: RSI(2) (anchor) vs Bollinger(20,2) band-touch reversion.

## Log
- **2026-06-07 — Gate A: FAIL (decisive, no edge). SHELVED.**
  External fold, 2266 daily bars, 2020-03→2026-06, 101 trades. Anchors as pre-registered
  (RSI(2) <10/>90, SMA200 filter, SMA5 exit, ATR×3).
  - FULL combined PF 0.95, exp −0.116%/tr. **Both legs negative** (long −0.05%, short −0.20%).
    FAIL IS (PF 0.95) and OOS (PF 0.93).
  - **Ablation:** beats always-fade (−12% vs −187%) — but moot: the strategy itself loses money,
    the threshold just loses *less* than fading everything.
  - **Cause:** no fee-positive edge. Turnover/friction ate it exactly as the survey predicted —
    the worst fee profile of the four; reversion re-imported the per-trade fee problem the swing
    thesis exists to escape. Survey caveat upheld (reversal documented only gross).
