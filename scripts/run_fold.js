#!/usr/bin/env node
// External-fold backtest runner. Loads a strategy's signal module, fetches Bybit klines +
// full funding history, runs the main signal and every ablation baseline through the shared
// engine, splits IS/OOS, and prints a per-LEG report + gate verdict.
//
// Usage:  node scripts/run_fold.js <strategy-folder> [--json]
//   e.g.  node scripts/run_fold.js funding-carry-tilt
//
// Net here is authoritative (TV strategy-tester read is broken). Funding is signed per-hold
// (revenue for the carry candidate, cost for the others) via funding_fold.js.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fetchKlines, atr, simulate, stats, gate, splitISOOS, runAblations } from './fold_engine.js';
import { fetchFundingHistory } from './funding_fold.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const pct = (x) => (x * 100).toFixed(4) + '%';
const pf = (x) => (x === Infinity ? '∞' : x.toFixed(2));

function legLine(label, l) {
  return `  ${label.padEnd(10)} n=${String(l.n).padStart(4)}  exp=${pct(l.expectancy).padStart(10)}  PF=${pf(l.pf).padStart(5)}  net=${pct(l.net).padStart(11)}  gross=${pct(l.gross).padStart(11)}  fund=${pct(l.funding).padStart(10)}  win=${(l.winRate * 100).toFixed(0)}%`;
}

function report(title, s, g) {
  console.log(`\n${title}`);
  console.log(legLine('LONG', s.long));
  console.log(legLine('SHORT', s.short));
  console.log(legLine('COMBINED', s.combined));
  if (g) console.log(`  GATE: long ${g.longPass ? 'PASS' : 'FAIL'} | short ${g.shortPass ? 'PASS' : 'FAIL'} | combined PF≥${g.minPF} ${g.pfPass ? 'PASS' : 'FAIL'}  ⇒  ${g.pass ? '✅ PASS' : '❌ FAIL'}`);
}

async function main() {
  const name = process.argv[2];
  const asJson = process.argv.includes('--json');
  if (!name) { console.error('usage: node scripts/run_fold.js <strategy-folder> [--json]'); process.exit(1); }

  const mod = (await import(resolve(ROOT, 'strategies', name, 'signal.js'))).default;
  const { meta, anchors } = mod;

  console.error(`[${name}] fetching klines + funding for ${meta.symbol} from ${new Date(meta.startTime).toISOString().slice(0, 10)} …`);
  const [bars, funding] = await Promise.all([
    fetchKlines({ symbol: meta.symbol, interval: meta.interval, startTime: meta.startTime }),
    fetchFundingHistory({ symbol: meta.symbol, startTime: meta.startTime }),
  ]);
  console.error(`[${name}] ${bars.length} bars, ${funding.length} funding stamps`);
  if (!bars.length) { console.error('no bars — check symbol/start (data may begin later than 2020-03)'); process.exit(1); }

  const atrArr = atr(bars, anchors.atrLen);
  const trades = simulate({ bars, target: mod.target(bars, funding, anchors), atrArr, atrMult: anchors.atrMult, funding, holdCapBars: anchors.holdCapBars ?? Infinity });

  const all = stats(trades);
  const { is, oos } = splitISOOS(trades, meta.isOOSBoundary);
  const sIS = stats(is), sOOS = stats(oos);
  const abl = runAblations(mod, bars, funding, atrArr);

  if (asJson) {
    console.log(JSON.stringify({ name, bars: bars.length, funding: funding.length, anchors, full: all, is: sIS, oos: sOOS, ablations: { beats: abl.beats, beatsAll: abl.beatsAll } }, null, 2));
    return;
  }

  console.log(`\n=== ${name} — external fold (BYBIT:${meta.symbol}.P, ${meta.interval}) ===`);
  console.log(`bars=${bars.length}  funding stamps=${funding.length}  trades=${trades.length}  friction=0.17% RT  funding=signed per-hold`);
  console.log(`IS/OOS boundary: ${new Date(meta.isOOSBoundary).toISOString().slice(0, 10)}`);
  report('FULL SAMPLE', all, gate(all));
  report('IN-SAMPLE (2020-03 → 2023-12)', sIS, gate(sIS));
  report('OUT-OF-SAMPLE (2024 → now)', sOOS, gate(sOOS));

  console.log('\nABLATION (main combined net must beat every baseline):');
  for (const [bn, bs] of Object.entries(abl.baselines)) {
    console.log(`  vs ${bn.padEnd(20)} baseline net=${pct(bs.combined.net).padStart(11)}  main=${pct(abl.main.combined.net).padStart(11)}  ⇒ ${abl.beats[bn] ? '✅ beats' : '❌ loses'}`);
  }
  console.log(`  ABLATION VERDICT: ${abl.beatsAll ? '✅ beats all baselines' : '❌ fails ablation — shelve regardless of PF (lesson #3)'}`);
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
