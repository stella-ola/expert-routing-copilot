// Runs the golden and held-out sets, writes data/eval-results-<extractor>.{json,md}, and reports regression and readiness gates.
//   node evals/run-evals.mjs                 rules extractor (no API key needed; this is what CI runs)
//   node evals/run-evals.mjs --llm           LLM extractor, same policy (needs ANTHROPIC_API_KEY)
//   node evals/run-evals.mjs --llm --runs 3  repeat every case 3 times to measure consistency
// Then: node evals/compare.mjs  -> data/comparison.md (rules vs LLM side by side)

import { writeFileSync, mkdirSync } from 'node:fs';
import { evaluate, extractFeatures, DEFAULT_CONFIG } from '../docs/app/engine.js';
import { GOLDEN_SET, HELDOUT_SET } from '../docs/app/golden-set.js';

const args = process.argv.slice(2);
const useLLM = args.includes('--llm');
const argNum = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : dflt; };
const RUNS = Math.max(1, argNum('--runs', 1));
const CONCURRENCY = Math.max(1, argNum('--concurrency', 5));
const extractor = useLLM ? 'llm' : 'rules';

// The regression gate protects behavior already established on the tuned baseline.
// It is not a launch-readiness claim. Readiness is evaluated on held-out cases.
const REGRESSION_GATE = { p0RecallGated: 100, exactMatchGated: 90, citationAccuracyGated: 100 };
const READINESS_GATE = {
  p0Recall: { op: 'min', value: 100 },
  exactMatch: { op: 'min', value: 80 },
  reachedHumanWhenNeeded: { op: 'min', value: 98 },
  overEscalation: { op: 'max', value: 15 },
  citationAccuracy: { op: 'min', value: 90 },
  answeredWhenShouldNot: { op: 'max', value: 0, unit: '' },
};
const CONSISTENCY_GATE = { op: 'min', value: 95 }; // applies when --runs > 1

const ALL = [...GOLDEN_SET, ...HELDOUT_SET];

// ---------------------------------------------------------------------------
// Extract features for every case, once per run, timing each call.
// ---------------------------------------------------------------------------
async function extractAll() {
  const out = new Map();
  if (!useLLM) {
    for (const c of ALL) {
      const t0 = performance.now();
      const f = extractFeatures(c.message, DEFAULT_CONFIG);
      f.meta = { latencyMs: performance.now() - t0, inputTokens: 0, outputTokens: 0, costUsd: 0, parseError: false };
      out.set(c.id, f);
    }
    return out;
  }
  const { llmExtract } = await import('./llm-extractor.mjs');
  let next = 0;
  async function worker() {
    while (next < ALL.length) {
      const c = ALL[next++];
      out.set(c.id, await llmExtract(c.message));
      process.stderr.write('.');
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stderr.write('\n');
  return out;
}

const runs = [];
for (let i = 0; i < RUNS; i++) {
  if (RUNS > 1) process.stderr.write(`Run ${i + 1}/${RUNS} `);
  const feats = await extractAll();
  const byId = (msg, c) => feats.get(c.id);
  runs.push({ golden: evaluate(GOLDEN_SET, DEFAULT_CONFIG, byId), heldout: evaluate(HELDOUT_SET, DEFAULT_CONFIG, byId), feats });
}
const { golden, heldout } = runs[0]; // headline metrics come from the first run

// ---------------------------------------------------------------------------
// Consistency: does the same message get the same decision every time?
// ---------------------------------------------------------------------------
let consistency = null;
if (RUNS > 1) {
  const sig = (r) => `${r.actual.team} / ${r.actual.priority} / ${r.actual.channel} / ${r.actual.citation ?? 'no source'}`;
  const perCase = ALL.map((c) => {
    const rows = runs.map((run) => [...run.golden.rows, ...run.heldout.rows].find((r) => r.id === c.id));
    const sigs = rows.map(sig);
    const priorities = new Set(rows.map((r) => r.actual.priority));
    return { id: c.id, stable: new Set(sigs).size === 1, p0Flip: priorities.has('P0') && priorities.size > 1, outcomes: [...new Set(sigs)] };
  });
  const stable = perCase.filter((x) => x.stable).length;
  consistency = {
    runs: RUNS,
    agreementPct: Math.round((stable / perCase.length) * 1000) / 10,
    unstableCases: perCase.filter((x) => !x.stable),
    p0Flips: perCase.filter((x) => x.p0Flip).map((x) => x.id),
  };
}

// ---------------------------------------------------------------------------
// Cost and speed per ticket (across every call in every run)
// ---------------------------------------------------------------------------
const metas = runs.flatMap((run) => [...run.feats.values()].map((f) => f.meta));
const lat = metas.map((m) => m.latencyMs).sort((a, b) => a - b);
const q = (p) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
const totalCost = metas.reduce((s, m) => s + (m.costUsd ?? 0), 0);
const costKnown = metas.every((m) => m.costUsd !== null && m.costUsd !== undefined);
const correctFirstRun = [...golden.rows, ...heldout.rows].filter((r) => r.ok.all).length;
const perTicketCost = costKnown ? totalCost / metas.length : null;
const performanceStats = {
  calls: metas.length,
  model: metas[0]?.model ?? 'rules (local)',
  latencyMsMean: Math.round((lat.reduce((s, x) => s + x, 0) / lat.length) * 1000) / 1000,
  latencyMsP50: Math.round(q(0.5) * 1000) / 1000,
  latencyMsP95: Math.round(q(0.95) * 1000) / 1000,
  inputTokensMean: Math.round(metas.reduce((s, m) => s + m.inputTokens, 0) / metas.length),
  outputTokensMean: Math.round(metas.reduce((s, m) => s + m.outputTokens, 0) / metas.length),
  costPerTicketUsd: perTicketCost,
  costPer10kTicketsUsd: perTicketCost === null ? null : perTicketCost * 10000,
  // Cost of one correctly routed ticket = what you pay per ticket / share routed exactly right.
  costPerCorrectRouteUsd: perTicketCost === null || !correctFirstRun ? null : perTicketCost / (correctFirstRun / ALL.length),
  parseErrors: metas.filter((m) => m.parseError).length,
};

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------
const regressionChecks = Object.entries(REGRESSION_GATE).map(([metric, min]) => ({ metric, operator: '>=', threshold: min, actual: golden.summary[metric], unit: '%', pass: golden.summary[metric] >= min }));
const readinessChecks = Object.entries(READINESS_GATE).map(([metric, rule]) => {
  const actual = heldout.summary[metric];
  const pass = rule.op === 'min' ? actual >= rule.value : actual <= rule.value;
  return { metric, operator: rule.op === 'min' ? '>=' : '<=', threshold: rule.value, actual, unit: rule.unit ?? '%', pass };
});
if (consistency) readinessChecks.push({ metric: 'consistency', operator: '>=', threshold: CONSISTENCY_GATE.value, actual: consistency.agreementPct, unit: '%', pass: consistency.agreementPct >= CONSISTENCY_GATE.value });
const regressionPassed = regressionChecks.every((c) => c.pass);
const readinessPassed = readinessChecks.every((c) => c.pass);

// ---------------------------------------------------------------------------
// Write results
// ---------------------------------------------------------------------------
mkdirSync('data', { recursive: true });
const out = {
  extractor,
  runs: RUNS,
  regressionGate: { passed: regressionPassed, checks: regressionChecks },
  readinessGate: { passed: readinessPassed, checks: readinessChecks },
  golden: golden.summary,
  heldout: heldout.summary,
  heldoutSlices: heldout.slices,
  performance: performanceStats,
  consistency,
  rows: [...golden.rows, ...heldout.rows].map(({ id, tags, message, expect, actual, ok, note }) => ({ id, tags, message, expect, actual, ok, note })),
};
writeFileSync(`data/eval-results-${extractor}.json`, JSON.stringify(out, null, 2) + '\n');

const v = (x, unit = '%') => (x === null || x === undefined ? 'n/a' : `${x}${unit}`);
const fmt = (s) => [
  `| Metric | Value |`, `| --- | --- |`,
  ...[
    ['Cases', s.cases],
    ['Exact match (team + priority + channel)', v(s.exactMatch)],
    ['Exact match, excluding known gaps', v(s.exactMatchGated)],
    ['Team accuracy', v(s.teamAccuracy)], ['Priority accuracy', v(s.priorityAccuracy)], ['Channel accuracy', v(s.channelAccuracy)],
    ['P0 recall (urgent cases caught)', v(s.p0Recall)],
    ['P0 precision', s.p0Precision === null ? 'n/a (no P0 predicted)' : v(s.p0Precision)],
    ['Reached a human when needed', v(s.reachedHumanWhenNeeded)], ['Over-escalation', v(s.overEscalation)],
    [`Citation accuracy (${s.citationCases} answerable questions)`, v(s.citationAccuracy)],
    ['AI answered from the wrong article', s.wrongSourceAnswers],
    ['AI answered a case it should have routed', s.answeredWhenShouldNot],
  ].map(([a, b]) => `| ${a} | ${b} |`),
].join('\n');

const slices = [`| Slice | Cases | Exact match | Urgent cases | P0 recall |`, `| --- | ---: | ---: | ---: | ---: |`,
  ...heldout.slices.filter((s) => s.tag !== 'heldout').map((s) => `| ${s.tag} | ${s.cases} | ${v(s.exactMatch)} | ${s.p0Cases} | ${s.p0Cases ? v(s.p0Recall) : '–'} |`)].join('\n');

const p = performanceStats;
const money = (x, d = 5) => (x === null ? 'n/a (price unknown; set PRICE_IN / PRICE_OUT)' : `$${x.toFixed(d)}`);
const perf = [`| Measure | Value |`, `| --- | --- |`,
  `| Extractor | ${extractor === 'llm' ? p.model : 'Keyword rules (runs locally)'} |`,
  `| Calls measured | ${p.calls} |`,
  `| Latency, mean / p50 / p95 | ${p.latencyMsMean} / ${p.latencyMsP50} / ${p.latencyMsP95} ms |`,
  `| Tokens per ticket, in / out | ${p.inputTokensMean} / ${p.outputTokensMean} |`,
  `| Cost per ticket | ${money(p.costPerTicketUsd)} |`,
  `| Cost per 10,000 tickets | ${money(p.costPer10kTicketsUsd, 2)} |`,
  `| Cost per correctly routed ticket | ${money(p.costPerCorrectRouteUsd)} |`,
  `| Malformed model outputs (failed safe) | ${p.parseErrors} |`].join('\n');

const cons = consistency
  ? `## Consistency (${consistency.runs} runs of every case)\n\n**${consistency.agreementPct}%** of cases got the identical team, priority, channel, and citation on every run.\n\n${consistency.p0Flips.length ? `**Urgency flips (most serious):** ${consistency.p0Flips.join(', ')}. These cases were P0 on some runs and not on others.` : 'No case flipped between P0 and a lower priority.'}\n\n${consistency.unstableCases.length ? `| Case | Outcomes seen (team / priority / channel / citation) |\n| --- | --- |\n${consistency.unstableCases.map((x) => `| ${x.id} | ${x.outcomes.join('<br>')} |`).join('\n')}` : ''}\n`
  : `## Consistency\n\nNot measured in this run. ${useLLM ? 'Use `--runs 3`.' : 'The rules extractor is deterministic, so every run gives the same answer by construction.'}\n`;

const misses = out.rows.filter((r) => !r.ok.all || r.ok.citation === false).map((r) =>
  `| ${r.id} | ${r.tags.join(', ')} | ${r.message.replace(/\|/g, '/')} | ${r.expect.team} / ${r.expect.priority} / ${r.expect.channel}${r.expect.citation ? ' / ' + r.expect.citation : ''} | ${r.actual.team} / ${r.actual.priority} / ${r.actual.channel}${r.actual.citation ? ' / ' + r.actual.citation : ''} | ${r.note || ''} |`);

const formatChecks = (checks) => checks.map((c) => `${c.metric} ${c.actual}${c.unit} vs ${c.operator}${c.threshold}${c.unit}`).join('; ');

const md = `# Eval results (${extractor} extractor)

Generated by \`node evals/run-evals.mjs${useLLM ? ' --llm' : ''}${RUNS > 1 ? ' --runs ' + RUNS : ''}\`. Synthetic data only. Headline metrics are from run 1.

**Regression gate: ${regressionPassed ? 'PASS' : 'FAIL'}** (${formatChecks(regressionChecks)})

**Held-out readiness: ${readinessPassed ? 'READY FOR THE NEXT CONTROLLED STAGE' : 'BLOCKED'}** (${formatChecks(readinessChecks)})

The regression gate prevents changes from breaking the tuned baseline. Held-out readiness determines whether the extractor can be considered for a controlled shadow or assisted stage; it does not authorize production automation.

## Golden set (used to tune the rules)
${fmt(golden.summary)}

## Held-out set (never used for tuning)
${fmt(heldout.summary)}

### Held-out results by slice
${slices}

## Cost and speed
${perf}

${cons}
## Every miss
Includes routing misses and wrong citations.

| ID | Tags | Message | Expected | Actual | Note |
| --- | --- | --- | --- | --- | --- |
${misses.join('\n')}
`;
writeFileSync(`data/eval-results-${extractor}.md`, md);

console.log(md);
if (!regressionPassed && !useLLM) { console.error('Regression gate failed.'); process.exit(1); }
if (useLLM && !readinessPassed) console.error('Candidate extractor did not clear held-out readiness. Results were still written.');
