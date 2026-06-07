export const meta = {
  name: 'btc-momentum-survey',
  description: 'Redo BTC-perp intraday momentum research via curl-fetched sources (no degoog)',
  whenToUse: 'Rebuild .claude/research/momentum-strategy-survey.md from real sources fetched with ctx_execute+curl',
  phases: [
    { title: 'Search', model: 'sonnet' },
    { title: 'Read', model: 'sonnet' },
    { title: 'Verify', model: 'haiku' },
    { title: 'Synthesize', model: 'opus' },
  ],
}

// ── shared tool directive: every agent fetches via ctx_execute + curl, NEVER degoog ──
const FETCH = [
  'WEB ACCESS RULE — read carefully:',
  '- Do NOT use any mcp__degoog__* tool. Do NOT use WebSearch/WebFetch. They are banned for this run.',
  '- Fetch everything with curl inside the context-mode sandbox.',
  "- First load the tool schema: ToolSearch({query:'select:mcp__plugin_context-mode_context-mode__ctx_execute', max_results:1}).",
  "- Then call mcp__plugin_context-mode_context-mode__ctx_execute({language:'shell', code:'<curl ...>'}).",
  '- Always: curl -sL --max-time 30 -A "Mozilla/5.0 (research-bot)" <url>. Only what you print/console.log returns to you.',
  'Reliable JSON source APIs (prefer these, they return real titles/abstracts/DOIs — no fabrication allowed):',
  '- Semantic Scholar: https://api.semanticscholar.org/graph/v1/paper/search?query=URLENC&limit=15&fields=title,abstract,year,citationCount,externalIds,url',
  '- arXiv Atom: http://export.arxiv.org/api/query?search_query=all:TERMS&max_results=15',
  '- Crossref: https://api.crossref.org/works?query=URLENC&rows=15&select=title,DOI,abstract,issued,is-referenced-by-count',
  'For landing pages (SSRN abstract page, doi.org redirect target, journal page) curl -sL the URL and strip tags to read the abstract/intro.',
  'NEVER invent a citation. If you cannot fetch a source, drop it. Every claim must trace to a fetched title+URL/DOI.',
].join('\n')

// research scope — anchors the whole run to the spec the report serves
const SCOPE = [
  'TARGET STRATEGY SPEC the research must serve:',
  '- Instrument: BTC perpetual futures (Bybit), single position, $100k account.',
  '- Style: INTRADAY MOMENTUM, few trades/day, flat by end-of-day.',
  '- Data scope: OHLCV + derivatives overlay (funding rate, open interest, liquidations). NO order-book depth (deferred to v2).',
  '- Fee bar: Bybit round-trip friction ~0.13-0.30% (taker ~0.055%/side, slippage, partial funding). A signal "survives" only if per-trade net edge > ~0.20%.',
  '- Guardrails: ATR stop, EOD flatten, daily kill-switch (+3R or 2 consecutive losses).',
  'Goal: survey momentum families, judge each on fee-defensibility NET of Bybit costs, rank a shortlist, recommend a #1 prototype.',
].join('\n')

const SEARCH_SCHEMA = {
  type: 'object',
  required: ['sources'],
  properties: {
    sources: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'url', 'year', 'relevance'],
        properties: {
          title: { type: 'string' },
          url: { type: 'string', description: 'canonical URL or doi.org link' },
          doi: { type: 'string' },
          year: { type: 'integer' },
          citationCount: { type: 'integer' },
          abstract: { type: 'string', description: 'abstract text as fetched, or empty' },
          family: { type: 'string', description: 'which momentum family / topic this informs' },
          relevance: { type: 'string', description: 'one line: why relevant to BTC-perp intraday momentum + fees' },
        },
      },
    },
  },
}

const CLAIMS_SCHEMA = {
  type: 'object',
  required: ['claims'],
  properties: {
    fetched: { type: 'boolean', description: 'true if the page/abstract was actually fetched via curl' },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        required: ['text', 'family', 'source_title', 'source_url'],
        properties: {
          text: { type: 'string', description: 'a specific finding, stated as the abstract states it' },
          family: { type: 'string' },
          magnitude: { type: 'string', description: 'effect size/number if given, else "abstract-level"' },
          gross_or_net: { type: 'string', enum: ['gross', 'net', 'unstated'] },
          source_title: { type: 'string' },
          source_url: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'confidence', 'reason'],
  properties: {
    refuted: { type: 'boolean', description: 'true if claim is unsupported, overstated, or mis-cited' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    reason: { type: 'string' },
    corrected_text: { type: 'string', description: 'tightened claim if salvageable' },
  },
}

const REPORT_SCHEMA = {
  type: 'object',
  required: ['markdown'],
  properties: { markdown: { type: 'string', description: 'full report markdown, sections 1-7' } },
}

// ── Phase 1: Search — one agent per family/topic, fan out cheap-ish ──
phase('Search')
const TOPICS = [
  'Bitcoin cryptocurrency intraday return predictability momentum reversal',
  'crypto opening range breakout intraday trading strategy',
  'cryptocurrency momentum regime volatility filter trend ADX trading',
  'crypto perpetual futures funding rate open interest predict returns',
  'bitcoin liquidation cascade squeeze price momentum perpetual',
  'cryptocurrency transaction costs fees net profitability trading strategy backtest',
  'bitcoin intraday seasonality volatility patterns monetary policy FOMC',
  'cryptocurrency adaptive market hypothesis predictability high frequency',
  'crypto carry funding basis time series factor momentum',
  'momentum effect after abnormal returns one-day cryptocurrency stock',
]

const searchHits = await parallel(TOPICS.map((t, i) => () =>
  agent(
    `${FETCH}\n\n${SCOPE}\n\nTASK: Find the strongest scholarly sources for this sub-topic: "${t}".\n` +
    'Run curl against Semantic Scholar AND arXiv AND Crossref for this topic (URL-encode the query). ' +
    'Parse the JSON/Atom, keep papers genuinely about crypto/BTC trading, momentum, predictability, fees, or microstructure. ' +
    'Return up to 8 real sources with title, url (doi.org/<DOI> if a DOI exists, else the api url), year, citationCount, abstract text as returned, the family it informs, and one-line relevance. ' +
    'Do not invent anything — only papers the API actually returned.',
    { label: `search:${i}`, phase: 'Search', model: 'sonnet', schema: SEARCH_SCHEMA }
  )))

// barrier dedup: need ALL search results together to dedup by title/DOI before the expensive read stage
const seen = new Set()
const sources = searchHits.filter(Boolean).flatMap(h => h.sources || []).filter(s => {
  const key = (s.doi || s.url || s.title || '').toLowerCase().replace(/\s+/g, '')
  if (!key || seen.has(key)) return false
  seen.add(key)
  return true
})
log(`Search done: ${sources.length} unique sources from ${TOPICS.length} topics`)

// keep the run bounded: prioritise higher-cited + abstract-bearing, cap at 28
const ranked = sources
  .map(s => ({ ...s, _score: (s.citationCount || 0) + (s.abstract ? 50 : 0) }))
  .sort((a, b) => b._score - a._score)
  .slice(0, 28)
log(`Reading top ${ranked.length} sources (capped from ${sources.length})`)

// ── Phase 2+3: Read each source (curl the page) → Verify its claims, pipelined ──
const readVerified = await pipeline(
  ranked,
  (s) => agent(
    `${FETCH}\n\n${SCOPE}\n\nTASK: Read this source and extract claims relevant to the spec.\n` +
    `Title: ${s.title}\nURL: ${s.url}\nDOI: ${s.doi || 'n/a'}\nKnown abstract: ${s.abstract || '(none — fetch it)'}\n\n` +
    'curl -sL the URL (and/or the Semantic Scholar paper detail endpoint for its abstract). Strip HTML to read the abstract/intro. ' +
    'Extract 1-5 concrete findings that bear on BTC-perp intraday momentum, regime-dependence, derivatives signals, intraday seasonality, predictability, or fees/net-profitability. ' +
    'For each: state it as the source states it, note magnitude (or "abstract-level"), and whether the result is gross or net of fees. ' +
    'Set fetched=true only if curl actually returned the content. If you cannot fetch, return fetched=false and an empty claims array.',
    { label: `read:${(s.title || '').slice(0, 40)}`, phase: 'Read', model: 'sonnet', schema: CLAIMS_SCHEMA }
  ),
  (c, s) => parallel((c?.claims || []).map(cl => () =>
    agent(
      `${SCOPE}\n\nADVERSARIALLY VERIFY this extracted claim. Default refuted=true unless the claim is clearly supported and not overstated.\n` +
      `Claim: "${cl.text}"\nFamily: ${cl.family}\nMagnitude: ${cl.magnitude}\nGross/net: ${cl.gross_or_net}\n` +
      `Source: ${cl.source_title} (${cl.source_url})\n\n` +
      'Refute if: the claim asserts a NET-of-fees tradable edge that the source does not actually prove; the magnitude is fabricated; ' +
      'the citation does not match the topic; or it generalizes beyond what an abstract can support. Otherwise pass it (refuted=false). ' +
      'If salvageable but overstated, give corrected_text.',
      { label: `verify:${(cl.family || '').slice(0, 24)}`, phase: 'Verify', model: 'haiku', schema: VERDICT_SCHEMA }
    ).then(v => ({ claim: cl, verdict: v, source: { title: s.title, url: s.url, doi: s.doi } }))
  ))
)

const verifiedClaims = readVerified
  .flat()
  .filter(Boolean)
  .filter(x => x.verdict && !x.verdict.refuted)
  .map(x => ({
    text: x.verdict.corrected_text || x.claim.text,
    family: x.claim.family,
    magnitude: x.claim.magnitude,
    gross_or_net: x.claim.gross_or_net,
    source_title: x.claim.source_title,
    source_url: x.claim.source_url,
  }))
log(`Verified ${verifiedClaims.length} claims survived adversarial check`)

// ── Phase 4: Synthesize the cited survey ──
phase('Synthesize')
const report = await agent(
  `${SCOPE}\n\n` +
  'You are writing the final survey: "BTC-Perp Intraday Momentum — Survey + Ranked Shortlist (cited)".\n' +
  'Use ONLY the verified claims below — every citation must trace to one of these (title + url/DOI). Do not add sources not present here. ' +
  'If evidence is abstract-level, say so. Be honest that no source proves a fee-positive tradable BTC-perp edge; the fee math is first-principles.\n\n' +
  'Required markdown structure:\n' +
  '1. Executive Summary (what the evidence bounds; the recommendation).\n' +
  '2. Methodology + a Bybit net-of-fees edge-bar table (taker ~0.055%/side, slippage, funding → ~0.13-0.30% RT; edge must clear ~0.20% net).\n' +
  '3. Momentum Family Survey — one subsection each: (3.1) intraday time-series momentum, (3.2) opening-range breakout, (3.3) regime/volatility-filtered momentum, (3.4) derivatives-confirmed momentum (funding/OI/liquidations), (3.5) liquidation-cascade/squeeze. Each: how it works, cited evidence, pros, cons, Difficulty 1-5 / Reliability 1-5, net-of-fees verdict.\n' +
  '4. Excluded Families table (mean-reversion, grid, carry-arb, stat-arb, market-making, event/sentiment) with why out of scope.\n' +
  '5. Ranked Shortlist (#1, #2, #3) by fee-defensibility — each with fit, failure modes, what-must-be-true.\n' +
  '6. #1 Recommendation — prototype plan (entry logic, regime+derivative confirmation, exit/guardrail wiring, fee/funding backtest model, validation kill-criteria).\n' +
  '7. Open Questions / Risks.\n' +
  'Add a top provenance note: sources fetched via ctx_execute+curl against Semantic Scholar/arXiv/Crossref (degoog bypassed); citations real; depth abstract-level where noted. ' +
  'Inline-cite as [title-short](url-or-doi). Output the COMPLETE markdown.\n\n' +
  `VERIFIED CLAIMS (JSON):\n${JSON.stringify(verifiedClaims)}`,
  { label: 'synthesize', phase: 'Synthesize', model: 'opus', schema: REPORT_SCHEMA }
)

return { markdown: report.markdown, sourceCount: ranked.length, claimCount: verifiedClaims.length }
