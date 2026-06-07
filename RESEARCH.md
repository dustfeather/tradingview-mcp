# Research Notes

## Motivation

Agent-forward trading represents an emerging paradigm where LLM agents assist — but do not replace — human traders. This project is a practical exploration of the interface layer required to make that possible.

The Model Context Protocol (MCP) provides a standardized way for LLMs to interact with external tools. Financial desktop applications like TradingView are among the most complex, stateful, real-time interfaces that exist. Connecting the two raises genuine research questions about agent reliability, context management, and human-AI collaboration that have not been well-studied.

## Open Questions This Project Explores

### 1. Context Window Constraints

A full chart state with multiple indicators can easily exceed practical context limits. A single Pine Script source file can be 200KB+. OHLCV data for 500 bars is ~40KB.

How should agents prioritize what to read? This project's approach: compact-by-default output (`summary: true`, `study_filter`, deduplicated pine graphics), with verbose mode as opt-in. The tool design itself encodes a hypothesis about agent-friendly data granularity.

### 2. Temporal Consistency

Market data changes continuously. A quote fetched at the start of an agent's reasoning may be stale by the time it responds. Indicator values shift every tick.

How does an agent reason about data that may be stale by the time it responds? What's the practical latency budget for chart-reading workflows?

### 3. Tool Granularity

Should an agent have one `read_chart` tool or 78 granular tools? This project chose granularity — separate tools for quote, OHLCV, indicator values, pine lines, pine labels, pine tables, pine boxes, etc.

The tradeoff: granular tools give the agent precise control and small payloads, but require the agent to know which tool to call (solved via `CLAUDE.md` decision trees and MCP server instructions). A single coarse tool would be simpler but would waste context on unneeded data.

### 4. Failure Transparency

When an agent misreads a chart — interpreting a label incorrectly, reading stale data, or misunderstanding indicator values — how should it communicate uncertainty?

This project surfaces raw data and lets the agent reason about it, rather than pre-interpreting. This means failures are visible in the agent's reasoning trace rather than hidden behind an abstraction.

### 5. Human-in-the-Loop Design

What decisions should always require explicit human confirmation? Currently, all chart mutations (symbol changes, indicator additions, drawing) are executed immediately. Replay trading is simulated only.

The boundary between "agent acts autonomously" and "agent proposes, human confirms" is a design decision with implications for both usability and safety.

### 6. Multi-Asset Agent Reasoning

When an agent monitors multiple symbols simultaneously (via `pane_set_layout` + `stream all`), how does it reason about cross-asset relationships? Can it identify divergences, correlations, or relative strength from raw OHLCV across 4 panes?

### 7. Pine Script as Agent Output

Can an LLM agent write, debug, and iterate on Pine Script effectively? Pine Script is a domain-specific language with unusual constraints (series types, historical referencing, repainting). The compile-error-fix loop (`pine_set_source` → `pine_smart_compile` → `pine_get_errors`) tests whether agents can handle DSL-specific debugging.

## Findings So Far

### Context Management is the Primary Constraint

The most impactful design decision was making all tools return compact output by default. Without this, a single "analyze my chart" workflow would consume 80KB+ of context. With compact defaults and `study_filter`, it's 5-10KB.

### Tool Count Does Not Confuse the Agent

78 tools seems excessive, but with clear MCP server instructions and a `CLAUDE.md` decision tree, Claude consistently selects the right tools. The key is descriptive tool names and the instruction block — not reducing tool count.

### Pine Script Development is the Strongest Use Case

The compile → error → fix loop is where agent assistance provides the most value. Pine Script has unusual semantics that even experienced programmers struggle with. Having an agent that can read errors, understand the language, and propose fixes significantly accelerates development.

### Streaming Reveals Agent Latency Issues

When streaming data changes faster than the agent can respond, the agent's reasoning becomes stale. This is a fundamental limitation of request-response LLM architectures operating on real-time data. The practical solution is using streaming for human monitoring (piped to dashboards) rather than agent consumption.

## Limitations

- Depends on undocumented internal APIs subject to change without notice
- Not suitable for production automated trading
- Agent performance varies significantly by model and context length
- Real-time streaming introduces race conditions in agent reasoning
- TradingView Desktop updates can break any tool at any time
- No formal evaluation framework — findings are observational

## Strategy Pipeline — Lessons Learned (2026-06-07)

Three momentum strategies were prototyped from a literature survey
(`.claude/research/momentum-strategy-survey.md`) and run through a fixed kill-or-confirm
gate process on `BYBIT:BTCUSDT.P`. **All three were shelved.** The survey's own honesty
caveat — *no cited source proves a fee-positive, tradable BTC-perp intraday momentum edge*
— was upheld by the prototypes.

### Outcomes

| # | Strategy | Premise | Killed at | Cause |
|---|----------|---------|-----------|-------|
| 1 | intraday-tsmom-deriv-confirmed | early→late intraday session continuation | Gate A | base effect falsified; no IS fee-bar edge |
| 2 | regime-filtered-momentum | Efficiency-Ratio regime gate on TS-momentum, multi-day hold | Gate B | Gate A passed (conditional) + ablation passed, but the regime edge **vanished out-of-sample** |
| 3 | volatility-adaptive-atr-trend | ATR/Keltner vol-adaptive trend (survey fallback) | Gate A + ablation | combined net PF 1.28<1.3; ATR-adaptation **strictly worse** than a fixed-% band; short leg dead |

These three were the survey's *entire* ranked shortlist (§5). The momentum backlog is now
exhausted — resuming requires a new survey axis (different instrument/horizon, the
excluded families §4, or v2 depth/liquidation data), not another shortlist candidate.

### Cross-cutting lessons

1. **The fee bar is the binding constraint — empirically, not just in theory.** Every
   candidate that produced a positive *gross* signal still had to clear ~0.20% net per
   trade after 0.17% round-trip friction + funding. None did so robustly. Abstract-level
   "net profit" claims in the literature (e.g. the ATR-systems paper behind #3) did **not**
   survive a real per-trade fee bar at intraday/4H resolution.

2. **Long-bias is a bull artifact, and combined metrics hide it.** #3's positive combined
   expectancy (+0.420%/tr) was *entirely* its long leg (PF 2.46) riding 2023–24 BTC
   appreciation; the short leg collapsed (PF 0.32). **Symmetric long/short with P&L
   reported per leg at every gate is mandatory** — a "trend edge" that only works long is
   levered beta. This failure mode recurred and is the single most important reporting
   discipline in the harness.

3. **Ablation must be a first-class kill gate, not an afterthought.** Each strategy's
   *namesake mechanism* was required to beat its own degenerate baseline: #2's ER gate vs
   ungated always-on momentum (passed); #3's ATR-adaptive band vs a fixed-% band (**failed
   — adaptation lost by 0.145%/tr at the anchor**). A strategy whose defining feature
   can't beat the trivial version of itself is dead regardless of headline PF, and no
   parameter sweep rescues it.

4. **Out-of-sample is where regime/classifier edges die.** #2 looked alive in-sample and
   passed its ablation, then failed Gate B when the regime gate didn't generalize — the
   exact red flag the survey flagged as #2's biggest risk. Treat any in-sample regime
   result as unproven until OOS.

5. **Anchors before backtest; sweeps are robustness fans, not optimizers.** Every
   strategy's parameter anchors were written into the spec *before* the first run, with
   sweep grids declared as fans. This is the structural defence against fitting a number to
   the IS window and calling it an edge.

6. **External fold is the authoritative harness (TV strategy-tester read is broken).**
   `data_get_strategy_results` / `data_get_trades` report "No strategy found" though the
   tester computes. Net is therefore reconstructed by replaying the exact Pine logic over
   Bybit klines (`/v5/market/kline`) + funding (`/v5/market/funding/history`) fetched via
   `ctx_execute`+fetch. This kept results reproducible and comparable across all three
   candidates. **Harness debt:** the funding pager only reliably returns the newest ~200
   rows of `/v5/market/funding/history`; for #1–#3 this was immaterial (funding ≈
   0.002%/tr, three orders below the edge, and it only subtracts), but a longer-hold
   strategy would need a correct full-history funding fold before its gate is trustworthy.

7. **The process/harness is the reusable asset, the alpha is disposable.** Separating
   data/costs/look-ahead/gate scaffold from strategy-specific signal logic made each new
   candidate cheap to scaffold → Pine → gate → shelve. Three full hypothesis tests cost
   little because only the alpha changed; the kill machinery was constant.

### What is NOT proven
No fee-positive BTC-perp momentum edge was found at intraday/4H resolution. This is a
**null result, honestly recorded** — consistent with the AMH/efficiency-decay literature
the survey cited. It does not bound swing/daily horizons, other instruments, or
non-momentum families, none of which were tested.

## Strategy Pipeline — Swing/Daily Axis Outcomes (2026-06-07)

The swing/daily survey (`.claude/research/swing-daily-survey.md`) produced a 4-candidate
shortlist on the thesis that the fixed 0.17% RT fee, binding at 4H, would relax over multi-day
holds. A reusable external-fold harness was built (`scripts/fold_engine.js` + per-strategy
`signal.js` + `scripts/run_fold.js`) — Pine retired for these (backtest-only; Pine cannot read
Bybit funding). All four ran on `BYBIT:BTCUSDT.P`, daily, 2020-03→2026-06 (2266 bars, 6794
funding stamps), IS 2020-03→2023-12 / OOS 2024→now.

> **METHODOLOGY CORRECTION (2026-06-07, same day).** The first pass shelved all four on a
> **trade-based, absolute per-leg gate** (per-trade expectancy, PF≥1.3, beat-buy-and-hold). On a
> single asset that ~4x'd over the window, that gate **measures directional beta, not edge**:
> "short leg must independently clear 0.20%/trade" is structurally unpassable, and "beat
> buy-and-hold on raw net" penalizes a market-neutral book for not out-returning a *leveraged*
> bull ride (buy-and-hold's own alpha is **negative** — it is beta + funding drag). This is why
> all four "failed the same way" — the common factor was the **gate**, not the signals. The fix:
> a **market-neutral alpha lens** (regress daily net return on BTC daily return; report OOS alpha,
> Sharpe, beta) is now the PRIMARY verdict (`alphaReport`/`alphaGate` in `fold_engine.js`); the
> trade-based per-leg stats are demoted to a secondary, beta-contaminated view. Keep bar: OOS
> alpha>0, OOS Sharpe≥0.5, |beta|<0.3, IS→OOS sign-consistent.

**Corrected verdicts (market-neutral lens, IS 2020-03→2023-12 / OOS 2024→now):**

| # | Strategy | IS α / Sharpe / β | OOS α / Sharpe / β | Verdict | Real cause |
|---|----------|-------------------|--------------------|---------|------------|
| 1 | funding-carry-tilt | +35.5% / −0.21 / −0.69 | +8.9% / −0.23 / −0.67 | **SHELVE** | alpha is real but β −0.68 (net short a rising asset) ⇒ negative Sharpe, unharvestable without the delta-neutral 2nd leg |
| 2 | daily-ts-momentum | +49.5% / 0.95 / 0.15 | **−2.9% / −0.09 / −0.06** | **SHELVE** | near market-neutral, but IS alpha **dies OOS** — in-sample fitting (lesson #4, OOS graveyard) |
| 3 | daily-trend-regime | +37.0% / 0.91 / 0.08 | **−3.0% / −0.11 / −0.03** | **SHELVE** | same — regime edge does not generalize OOS (consistent with #2's grave) |
| 4 | daily-mean-reversion | +4.7% / 0.32 / 0.05 | **+5.9% / 0.43 / 0.12** | 🟡 **MARGINAL — REOPENED** | only survivor: positive, OOS-stable, market-neutral alpha; but Sharpe 0.43 < 0.5 keep bar |

**Cross-cutting lessons (this axis):**
- **Gate the right quantity.** On a trending instrument, absolute per-leg P&L is dominated by
  beta. Always separate alpha from beta (regression) before declaring kill/keep — else you reject
  market-neutral alpha and "confirm" nulls that are just the asset's drift. This was a real
  harness flaw, caught only because all four failed identically.
- **The honest kills survive the correction — for better reasons.** #2/#3 die OOS (alpha flips
  negative; IS Sharpe ~0.9 was fitting). #1 dies risk-adjusted (negative Sharpe from unhedged
  beta — the delta-neutral point, now quantified: the funding alpha is real, ~+9%/yr OOS, just
  unharvestable on one leg).
- **The two axes did NOT fail the same way.** Intraday/4H momentum died on the *fee bar* (little
  per-trade drift, beta small → that null is sound). Swing/daily's first "null" was a *gate
  artifact*; corrected, 3 die OOS and 1 is a false-negative reopened.
- **mean-reversion was a false negative** — the absolute-return gate hid a thin (Sharpe 0.43),
  near-zero-beta, OOS-stable edge. Reopened for improvement (lift Sharpe ≥0.5 without fitting).

### What is NOT proven (swing/daily)
No candidate clears the keep bar (OOS Sharpe≥0.5). Three are genuine kills (2 die OOS, 1 needs a
delta-neutral 2nd leg). **daily-mean-reversion is a marginal survivor** with positive OOS alpha
but sub-threshold Sharpe — reopened, not shelved. This does **not** bound delta-neutral/2-leg
carry, cross-sectional baskets, other instruments, or v2 depth/liquidation. **Harness is the
asset, alpha is disposable** — and the harness itself was corrected mid-pipeline (alpha vs beta
gate), the most valuable lesson of the run.

## Related Work

- **Model Context Protocol** — Anthropic (2024). The protocol this project implements for LLM-tool communication.
- **ReAct: Synergizing Reasoning and Acting in Language Models** — Yao et al. (2022). The reasoning-action paradigm that underlies how agents use these tools.
- **FinAgent: A Multimodal Foundation Agent for Financial Trading** — Zhang et al. (2024). Explores LLM agents in financial contexts with multimodal inputs.
- **Toolformer: Language Models Can Teach Themselves to Use Tools** — Schick et al. (2023). Foundational work on LLMs learning to use external tools.
- **FinGPT: Open-Source Financial Large Language Models** — Yang et al. (2023). Open-source LLMs fine-tuned for financial applications.
- **Can Large Language Models Provide Useful Advice on How to Invest?** — Pelster & Val (2024). Studies LLM capability in financial reasoning.
