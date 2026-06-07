# Plan — volatility-adaptive-atr-trend (#3)

Status: **SHELVED 2026-06-07 — Gate A FAIL (PF 1.28<1.3) + ablation FAIL (adaptive
0.420% < fixed-% 0.565%) + short-leg collapse (PF 0.32 = bull artifact).** See notes.md.
Formulation A was locked & compiled; the vol-adaptation thesis is falsified — do not tune.

---

## The fork (RESOLVED → A) — pick A or B before Phase-1

Both are genuine ATR/vol-adaptive trend formulations (survey §5 #3). The difference is
where the volatility-adaptation lives and how many knobs it costs.

### Formulation A — Keltner breakout
```
midline = EMA(close, L)
upper   = midline + k·ATR(L)
lower   = midline − k·ATR(L)
enter long  on close > upper
enter short on close < lower
exit: ATR trailing stop  OR  close re-crosses midline
```
- **Knobs (3):** `L` (EMA + ATR length), `k` (band width), `s` (trail multiple).
- **Pros:** minimal and single-mechanism — the ATR breathing is intrinsic to the entry,
  so there's nothing extra to overfit. Cleanest possible map onto survey §5 #3's "ATR
  engine." Fewest moving parts ⇒ lowest classifier-overfit risk (the survey's #1 red flag).
- **Cons:** breakout entries are **taker-heavy** — you cross the spread on the break,
  worsening the fee bar (survey §3.2 explicitly warns breakouts are fee-fragile).
  No separate chop filter ⇒ whipsaw risk in range-bound tape (mitigated only by band
  width k and the trail).

### Formulation B — ATR-channel + MA-cross direction gate
```
dir = sign( EMA(close, Lf) − EMA(close, Ls) )          // trend direction
disp = (close − EMA(close, Ls)) / ATR(L)               // vol-scaled displacement
enter when dir flips into a side AND |disp| > m        // noise-gated entry
exit: ATR trailing stop  OR  MA re-cross (dir flips back)
```
- **Knobs (4, over budget unless Lf/Ls locked as a ratio):** `Lf`, `Ls`, `m`
  (vol threshold), `s` (trail). To stay ≤3 knobs, fix `Lf = Ls/4` (or similar) so the
  pair is one knob.
- **Pros:** the MA-cross gives an explicit, cheap trend-state filter; the `m·ATR`
  threshold suppresses noise-sized entries (this is literally the survey §6 wording —
  "only consider entries when |signal| exceeds a volatility-scaled threshold so
  noise-sized moves don't trigger"). Fewer, higher-conviction entries ⇒ better for the
  fee bar than A's every-break entries.
- **Cons:** two MAs + a threshold = more structure ⇒ more overfit surface, and the slow
  MA introduces **filter lag** — the survey-named #3 failure mode (filters mis-sign at
  reversals, [HMM intraday momentum](https://arxiv.org/abs/2006.08307)). Lag is worst
  exactly at trend changes, where #3 most needs to be right.

### Recommendation
Lean **A** for parsimony and the cleanest test of "does ATR-adaptation alone earn an
edge" — fewer knobs make Gate A-ablation (ATR vs fixed-width) a cleaner read. Choose **B**
only if you expect BTC-perp 4H chop to whipsaw a bare breakout badly enough that an
explicit noise gate is worth the extra knob and the lag risk. Deferred to your call.

---

## Locked (see spec.md for full detail)
- Multi-day regime-persistent hold; one round-trip per trend. 4H primary, daily anchor.
- Symmetric long & short, **legs reported separately at every gate** (long-bias is #3's
  prime suspect — short leg must earn its keep).
- ATR trailing stop = primary exit (s anchor 3.0, sweep {2.5,3.0,3.5}); 2.5×daily-ATR
  hard catastrophe backstop.
- Reused harness: TV-native tester, friction 0.085%/side, funding first-class signed,
  `BYBIT:BTCUSDT.P` 2023–25, IS 2023-01→2024-06 / OOS 2024-07→2025-12, look-ahead on
  closed bars only.

## Gate sequence
1. **Phase-1:** write `strategy.pine` for the chosen formulation, compile clean, sanity
   trade count on 4H IS window.
2. **Gate A** (IS fee bar) + **Gate A-ablation** (ATR-adaptive vs fixed-width envelope) —
   the ablation is what proves the namesake mechanism is real, not decoration.
3. **Gate B** (OOS, both legs contributing) — the bull-artifact kill test.
4. **Final / Phase-4** (per-trade >0.20% both windows, positive each year, both anchors,
   2×/5× liquidation survival) → promote or shelve.

## Anti-contamination note
Built from the survey backlog only. #1 and #2 logic deliberately excluded; the only thing
inherited from them is the **harness** (data/costs/look-ahead/gate scaffold), which is
process, not alpha.
