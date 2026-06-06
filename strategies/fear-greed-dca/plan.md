# Fear Bottom Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Pine Script v6 indicator, "Fear Bottom Finder", that paints a composite 0–100 fear score on a US-equity/ETF chart and marks conservative once-per-month buy zones near market bottoms.

**Architecture:** A single Pine v6 indicator. The source of truth is a local file `pine/fear-bottom-finder.pine`, version-controlled in this repo. Each task edits that local file, commits it, then deploys it to TradingView via the `tradingview` MCP server (`pine_set_source` → `pine_smart_compile`) and verifies with `pine_get_errors` / `data_get_study_values` / `capture_screenshot`. The local file is ALWAYS saved and committed before deployment. The deployed script overwrites the existing custom indicator `USER;ab99b4e8c0ff405aaf0e3bafc0a8b31a` only in the final task.

**Tech Stack:** Pine Script v6; TradingView Desktop via CDP; `tradingview` MCP tools.

---

## Testing note

Pine Script has no local unit-test framework. "Tests" in this plan are
**MCP-driven verifications** against the live TradingView chart:

- `pine_smart_compile` → must return `has_errors: false`.
- `pine_get_errors` → must return an empty error list.
- `data_get_study_values` → confirms named plots/values appear with sane numbers.
- `capture_screenshot` → visual confirmation of background tiers and markers.

Before starting, ensure TradingView is reachable: run `tv_health_check` and
confirm `cdp_connected: true`. Keep a US equity/ETF symbol loaded (e.g.
`BATS:SPY`) on the `1D` timeframe — market factors request daily data and
the spec targets US instruments.

## File Structure

- **Create:** `pine/fear-bottom-finder.pine` — the complete indicator source.
  Single file; Pine indicators are deployed as one script. Built up section by
  section across tasks.
- **No other files.** The TradingView-side script is updated via MCP, not via
  a repo file.

---

### Task 1: Scaffold — indicator declaration, inputs, scale helper

**Files:**
- Create: `pine/fear-bottom-finder.pine`

- [ ] **Step 1: Write the file**

```pine
//@version=6
indicator(title='Fear Bottom Finder', shorttitle='FearBtm', overlay=true, max_labels_count=100)

// ============ INPUTS ============
// --- Symbol factors ---
ddMax      = input.float(20.0, 'Drawdown % for max score',           minval=1.0,  group='Symbol Factors')
rsiFloor   = input.int(25,     'RSI floor (max fear)',               minval=1, maxval=49, group='Symbol Factors')
stretchMax = input.float(15.0, 'Stretch % below 200MA for max score', minval=1.0, group='Symbol Factors')
volMult    = input.float(2.0,  'Capitulation volume x 20-bar avg',   minval=1.0,  group='Symbol Factors')

// --- Market factors ---
useMarketData = input.bool(true,  'Use S&P market factors',          group='Market Factors')
usePutCall    = input.bool(false, 'Use Put/Call ratio (USI:PCC)',    group='Market Factors')

// --- Weights ---
wDD      = input.float(1.0, 'Weight: Drawdown',          minval=0.0, group='Weights')
wRSI     = input.float(1.0, 'Weight: RSI',               minval=0.0, group='Weights')
wWVF     = input.float(1.0, 'Weight: Williams VIX Fix',  minval=0.0, group='Weights')
wStretch = input.float(1.0, 'Weight: Stretch 200MA',     minval=0.0, group='Weights')
wVIX     = input.float(1.0, 'Weight: VIX',               minval=0.0, group='Weights')
wJunk    = input.float(1.0, 'Weight: Junk bond demand',  minval=0.0, group='Weights')
wHaven   = input.float(1.0, 'Weight: Safe-haven demand', minval=0.0, group='Weights')
wPC      = input.float(1.0, 'Weight: Put/Call',          minval=0.0, group='Weights')

// --- Tiers ---
cautionT = input.int(40, 'Caution threshold', minval=1, maxval=98, group='Tiers')
fearT    = input.int(60, 'Fear threshold',    minval=2, maxval=99, group='Tiers')
extremeT = input.int(80, 'Extreme threshold', minval=3, maxval=99, group='Tiers')

// --- Display ---
verbose = input.bool(false, 'Verbose breakdown table', group='Display')

// ============ HELPERS ============
// Map val into 0-100, clamped. Works with loVal>hiVal (inverted) too.
scale(float val, float loVal, float hiVal) =>
    na(val) ? na : math.min(math.max((val - loVal) / (hiVal - loVal) * 100.0, 0.0), 100.0)

plot(close, title='_anchor', display=display.none)
```

The trailing `plot(close, ...)` is a temporary anchor so the script compiles
as a valid indicator with no visible output yet; it is removed in Task 7.

- [ ] **Step 2: Commit the local file**

```bash
git add pine/fear-bottom-finder.pine
git commit -m "feat: scaffold Fear Bottom Finder indicator (inputs + scale helper)"
```

- [ ] **Step 3: Deploy to TradingView**

Read `pine/fear-bottom-finder.pine`, pass its full contents to the
`pine_set_source` MCP tool, then call `pine_smart_compile`.

- [ ] **Step 4: Verify it compiles**

Call `pine_get_errors`.
Expected: `pine_smart_compile` returns `has_errors: false`; `pine_get_errors`
returns an empty error list.

---

### Task 2: Symbol factors — drawdown, RSI, Williams VIX Fix, stretch

**Files:**
- Modify: `pine/fear-bottom-finder.pine`

- [ ] **Step 1: Append the SYMBOL FACTORS section**

Insert this block immediately before the `plot(close, title='_anchor', ...)` line:

```pine
// ============ SYMBOL FACTORS ============
hh252      = ta.highest(close, 252)
ddPct      = (hh252 - close) / hh252 * 100.0
ddScore    = scale(ddPct, 0.0, ddMax)

rsiVal     = ta.rsi(close, 14)
rsiScore   = scale(rsiVal, 50.0, rsiFloor)          // inverted bounds: RSI 50 -> 0, rsiFloor -> 100

sma200     = ta.sma(close, 200)
stretchPct = (sma200 - close) / sma200 * 100.0
stretchScore = scale(stretchPct, 0.0, stretchMax)

hh22close  = ta.highest(close, 22)
wvf        = (hh22close - low) / hh22close * 100.0
wvfScore   = ta.percentrank(wvf, 252)               // already 0-100
```

- [ ] **Step 2: Add temporary data-window plots for verification**

Insert immediately after the block from Step 1:

```pine
plot(ddScore,      title='ddScore',      display=display.data_window)
plot(rsiScore,     title='rsiScore',     display=display.data_window)
plot(wvfScore,     title='wvfScore',     display=display.data_window)
plot(stretchScore, title='stretchScore', display=display.data_window)
```

- [ ] **Step 3: Commit the local file**

```bash
git add pine/fear-bottom-finder.pine
git commit -m "feat: add symbol fear factors (drawdown, RSI, WVF, stretch)"
```

- [ ] **Step 4: Deploy to TradingView**

Read `pine/fear-bottom-finder.pine`, pass full contents to `pine_set_source`,
then call `pine_smart_compile`.

- [ ] **Step 5: Verify**

Call `pine_get_errors` (expect empty), then `data_get_study_values`.
Expected: the "Fear Bottom Finder" study lists `ddScore`, `rsiScore`,
`wvfScore`, `stretchScore`, each a number between 0 and 100.

---

### Task 3: Market factors — VIX, junk bonds, safe haven, put/call

**Files:**
- Modify: `pine/fear-bottom-finder.pine`

- [ ] **Step 1: Append the MARKET FACTORS section**

Insert immediately after the `wvfScore` line from Task 2 (before the Task 2
temporary plots):

```pine
// ============ MARKET FACTORS ============
// VIX vs its own 50-day SMA. Ratio > 1 = elevated fear.
vixClose = useMarketData ? request.security('CBOE:VIX', 'D', close)               : na
vixSma   = useMarketData ? request.security('CBOE:VIX', 'D', ta.sma(close, 50))   : na
vixRatio = na(vixClose) or na(vixSma) ? na : vixClose / vixSma
vixScore = scale(vixRatio, 1.0, 1.5)

// Junk bond demand: HYG/LQD ratio falling = credit stress = fear.
hygClose  = useMarketData ? request.security('AMEX:HYG', 'D', close) : na
lqdClose  = useMarketData ? request.security('AMEX:LQD', 'D', close) : na
junkRatio = na(hygClose) or na(lqdClose) ? na : hygClose / lqdClose
junkAvg   = ta.sma(junkRatio, 50)
junkScore = na(junkRatio) or na(junkAvg) ? na : scale(junkRatio, junkAvg * 1.02, junkAvg * 0.92)

// Safe-haven demand: SPX 20d return minus TLT 20d return. Negative = flight to bonds.
spxClose  = useMarketData ? request.security('SP:SPX',      'D', close) : na
tltClose  = useMarketData ? request.security('NASDAQ:TLT',  'D', close) : na
spxRet    = na(spxClose) or na(spxClose[20]) ? na : (spxClose - spxClose[20]) / spxClose[20] * 100.0
tltRet    = na(tltClose) or na(tltClose[20]) ? na : (tltClose - tltClose[20]) / tltClose[20] * 100.0
havenDiff = na(spxRet) or na(tltRet) ? na : spxRet - tltRet
havenScore = scale(havenDiff, 5.0, -10.0)           // inverted: +5% stocks lead -> 0, -10% -> 100

// Put/Call ratio. Behind its own sub-toggle: USI:PCC can be na on some plans.
pccClose = usePutCall ? request.security('USI:PCC', 'D', close)             : na
pccAvg   = usePutCall ? request.security('USI:PCC', 'D', ta.sma(close, 20)) : na
pccRatio = na(pccClose) or na(pccAvg) ? na : pccClose / pccAvg
pcScore  = scale(pccRatio, 0.95, 1.4)
```

- [ ] **Step 2: Replace the Task 2 temporary plots with the full factor set**

Replace the four `plot(...)` lines added in Task 2 Step 2 with:

```pine
plot(ddScore,      title='ddScore',      display=display.data_window)
plot(rsiScore,     title='rsiScore',     display=display.data_window)
plot(wvfScore,     title='wvfScore',     display=display.data_window)
plot(stretchScore, title='stretchScore', display=display.data_window)
plot(vixScore,     title='vixScore',     display=display.data_window)
plot(junkScore,    title='junkScore',    display=display.data_window)
plot(havenScore,   title='havenScore',   display=display.data_window)
plot(pcScore,      title='pcScore',      display=display.data_window)
```

- [ ] **Step 3: Commit the local file**

```bash
git add pine/fear-bottom-finder.pine
git commit -m "feat: add S&P market fear factors with na-safe handling"
```

- [ ] **Step 4: Deploy to TradingView**

Read `pine/fear-bottom-finder.pine`, pass full contents to `pine_set_source`,
then call `pine_smart_compile`.

- [ ] **Step 5: Verify**

Call `pine_get_errors` (expect empty), then `data_get_study_values`.
Expected: with `useMarketData` on, `vixScore`, `junkScore`, `havenScore` are
numbers 0–100. `pcScore` will be `na`/blank while `usePutCall` is off — that
is correct. If `vixScore`/`junkScore`/`havenScore` come back `na`, the
exchange prefix is wrong: try the symbol without the prefix (`HYG`, `LQD`,
`TLT`, `VIX`, `SPX`) and re-deploy — record which form worked.

---

### Task 4: Composite fear score

**Files:**
- Modify: `pine/fear-bottom-finder.pine`

- [ ] **Step 1: Append the COMPOSITE section**

Insert immediately after the `pcScore` line (before the data-window plots):

```pine
// ============ COMPOSITE ============
// Weighted average over factors that are not na. A na factor contributes
// nothing to either the weight sum or the weighted-value sum.
fW(float sc, float w)  => na(sc) ? 0.0 : w
fWV(float sc, float w) => na(sc) ? 0.0 : sc * w

totW = fW(ddScore, wDD) + fW(rsiScore, wRSI) + fW(wvfScore, wWVF) + fW(stretchScore, wStretch) + fW(vixScore, wVIX) + fW(junkScore, wJunk) + fW(havenScore, wHaven) + fW(pcScore, wPC)

totWV = fWV(ddScore, wDD) + fWV(rsiScore, wRSI) + fWV(wvfScore, wWVF) + fWV(stretchScore, wStretch) + fWV(vixScore, wVIX) + fWV(junkScore, wJunk) + fWV(havenScore, wHaven) + fWV(pcScore, wPC)

fearScore = totW > 0.0 ? totWV / totW : na
```

- [ ] **Step 2: Add the fearScore data-window plot**

Insert this line directly after the eight factor plots from Task 3 Step 2:

```pine
plot(fearScore, title='Fear Score', display=display.data_window)
```

- [ ] **Step 3: Commit the local file**

```bash
git add pine/fear-bottom-finder.pine
git commit -m "feat: add weighted composite fear score"
```

- [ ] **Step 4: Deploy to TradingView**

Read `pine/fear-bottom-finder.pine`, pass full contents to `pine_set_source`,
then call `pine_smart_compile`.

- [ ] **Step 5: Verify**

Call `pine_get_errors` (expect empty), then `data_get_study_values`.
Expected: `Fear Score` is a number 0–100. Sanity check: it should sit between
the min and max of the live sub-scores shown in the data window.

---

### Task 5: Tier classification and graded background

**Files:**
- Modify: `pine/fear-bottom-finder.pine`

- [ ] **Step 1: Append the TIERS section**

Insert immediately after the `fearScore` line from Task 4:

```pine
// ============ TIERS ============
tier = na(fearScore) ? 0 : fearScore >= extremeT ? 3 : fearScore >= fearT ? 2 : fearScore >= cautionT ? 1 : 0

bgCol = tier == 3 ? color.new(color.red, 80) : tier == 2 ? color.new(color.orange, 85) : tier == 1 ? color.new(color.yellow, 88) : na
bgcolor(bgCol, title='Fear Tier Background')
```

- [ ] **Step 2: Commit the local file**

```bash
git add pine/fear-bottom-finder.pine
git commit -m "feat: add fear-tier classification and graded background"
```

- [ ] **Step 3: Deploy to TradingView**

Read `pine/fear-bottom-finder.pine`, pass full contents to `pine_set_source`,
then call `pine_smart_compile`.

- [ ] **Step 4: Verify**

Call `pine_get_errors` (expect empty), then `capture_screenshot` with
region `chart`.
Expected: no errors; where historical fear was elevated the chart background
shows faint yellow/orange/red bands. Neutral periods have no background tint.

---

### Task 6: Buy-zone trigger and once-per-month markers

**Files:**
- Modify: `pine/fear-bottom-finder.pine`

- [ ] **Step 1: Append the BUY ZONE section**

Insert immediately after the `bgcolor(...)` line from Task 5:

```pine
// ============ BUY ZONE ============
extreme = not na(fearScore) and fearScore >= extremeT
capVol  = volume > ta.sma(volume, 20) * volMult
wvfRoll = wvf < wvf[1] and wvf[1] >= wvf[2] and ta.percentrank(wvf, 252)[1] > 80
buyZone = extreme and (capVol or wvfRoll)

// One primary buy per calendar month; later qualifying bars are secondary.
newMonth = ta.change(month(time)) != 0
var bool boughtThisMonth = false
if newMonth
    boughtThisMonth := false
primaryBuy = buyZone and not boughtThisMonth
if primaryBuy
    boughtThisMonth := true
secondaryBuy = buyZone and boughtThisMonth and not primaryBuy

plotshape(primaryBuy,   title='Primary Buy',   location=location.belowbar, style=shape.triangleup, size=size.normal, color=color.new(color.green, 0),  text='BUY')
plotshape(secondaryBuy, title='Secondary Buy', location=location.belowbar, style=shape.circle,     size=size.tiny,   color=color.new(color.green, 40))
```

- [ ] **Step 2: Commit the local file**

```bash
git add pine/fear-bottom-finder.pine
git commit -m "feat: add conservative buy-zone trigger and monthly markers"
```

- [ ] **Step 3: Deploy to TradingView**

Read `pine/fear-bottom-finder.pine`, pass full contents to `pine_set_source`,
then call `pine_smart_compile`.

- [ ] **Step 4: Verify**

Call `pine_get_errors` (expect empty), then `capture_screenshot` with
region `chart`.
Expected: no errors; on past deep selloffs a green `BUY` triangle appears
below a bar, with at most one triangle per calendar month. Additional small
green dots may appear in the same month.

---

### Task 7: Display table and cleanup

**Files:**
- Modify: `pine/fear-bottom-finder.pine`

- [ ] **Step 1: Remove the temporary `_anchor` plot**

Delete this line (added in Task 1):

```pine
plot(close, title='_anchor', display=display.none)
```

- [ ] **Step 2: Append the DISPLAY TABLE section**

Add at the end of the file:

```pine
// ============ DISPLAY TABLE ============
tierName = tier == 3 ? 'EXTREME FEAR' : tier == 2 ? 'FEAR' : tier == 1 ? 'CAUTION' : 'NEUTRAL'
tierCol  = tier == 3 ? color.red : tier == 2 ? color.orange : tier == 1 ? color.yellow : color.gray

f_cellStr(float sc) => na(sc) ? 'n/a' : str.tostring(math.round(sc))

var table t = table.new(position.top_right, 2, 10, border_width=1)
if barstate.islast
    table.cell(t, 0, 0, 'Fear Score', text_color=color.white, bgcolor=color.new(color.gray, 0))
    table.cell(t, 1, 0, na(fearScore) ? 'n/a' : str.tostring(math.round(fearScore)), text_color=color.black, bgcolor=tierCol)
    table.cell(t, 0, 1, 'Tier', text_color=color.white, bgcolor=color.new(color.gray, 0))
    table.cell(t, 1, 1, tierName, text_color=color.black, bgcolor=tierCol)
    if verbose
        table.cell(t, 0, 2, 'Drawdown',  text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 2, f_cellStr(ddScore),      text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 0, 3, 'RSI',       text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 3, f_cellStr(rsiScore),     text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 0, 4, 'WVF',       text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 4, f_cellStr(wvfScore),     text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 0, 5, 'Stretch',   text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 5, f_cellStr(stretchScore), text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 0, 6, 'VIX',       text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 6, f_cellStr(vixScore),     text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 0, 7, 'Junk',      text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 7, f_cellStr(junkScore),    text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 0, 8, 'Haven',     text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 8, f_cellStr(havenScore),   text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 0, 9, 'Put/Call',  text_color=color.white, bgcolor=color.new(color.gray, 30))
        table.cell(t, 1, 9, f_cellStr(pcScore),      text_color=color.white, bgcolor=color.new(color.gray, 30))
```

- [ ] **Step 3: Commit the local file**

```bash
git add pine/fear-bottom-finder.pine
git commit -m "feat: add fear score corner table with verbose breakdown"
```

- [ ] **Step 4: Deploy to TradingView**

Read `pine/fear-bottom-finder.pine`, pass full contents to `pine_set_source`,
then call `pine_smart_compile`.

- [ ] **Step 5: Verify**

Call `pine_get_errors` (expect empty), then `capture_screenshot` with
region `chart`.
Expected: no errors; a top-right table shows `Fear Score` and `Tier` with the
tier-colored cells. The data-window factor plots from earlier tasks remain
available via `data_get_study_values`.

---

### Task 8: Replace the live "SMA" custom indicator and final verification

**Files:**
- No local file changes — `pine/fear-bottom-finder.pine` is already final.

- [ ] **Step 1: Confirm the local file is committed and clean**

Run: `git status --short pine/fear-bottom-finder.pine`
Expected: no output (file already committed in Task 7).

- [ ] **Step 2: Open the target script in the Pine editor**

Call the `pine_open` MCP tool with `name: "SMA"` to load the existing custom
indicator (`USER;ab99b4e8c0ff405aaf0e3bafc0a8b31a`) into the editor.

- [ ] **Step 3: Deploy the final source over it**

Read `pine/fear-bottom-finder.pine`, pass full contents to `pine_set_source`,
call `pine_smart_compile`, then call `pine_save` to persist the script to the
TradingView cloud (overwriting the old "SMA" indicator in place).

- [ ] **Step 4: Final verification**

Call `pine_get_errors` (expect empty), then `chart_get_state`,
`data_get_study_values`, and `capture_screenshot` with region `chart`.
Expected:
- `chart_get_state` lists a study now named `Fear Bottom Finder`.
- `data_get_study_values` returns `Fear Score` and the eight sub-scores.
- With `useMarketData` toggled off (via `indicator_set_inputs`), `Fear Score`
  still returns a valid number from symbol factors alone.
- Screenshot shows background tiers, any historical BUY markers, and the
  corner table.

- [ ] **Step 5: Commit the plan completion marker**

```bash
git add docs/superpowers/plans/2026-05-20-fear-bottom-finder.md
git commit -m "docs: mark Fear Bottom Finder plan complete"
```

---

## Notes for the implementer

- **Local-first rule:** every task commits `pine/fear-bottom-finder.pine`
  BEFORE calling `pine_set_source`. The local file is the source of truth; the
  TradingView script is a deployment target.
- **Do not push** to `origin` (upstream `tradesdontlie/tradingview-mcp`).
  Pushing is allowed only to the `fork` remote
  (`dustfeather/tradingview-mcp`), and only when the user asks.
- **Symbol prefixes:** if a `request.security` factor returns `na` in Task 3,
  the exchange prefix is the likely cause. Fallback: drop the prefix
  (`VIX`, `HYG`, `LQD`, `TLT`, `SPX`). Update the local file, re-commit,
  re-deploy.
- **Timeframe:** keep the chart on a US equity/ETF at `1D` during
  verification — market factors request `'D'` data and the spec is US-only.
