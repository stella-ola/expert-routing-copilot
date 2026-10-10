// Builds data/comparison.md: keyword rules vs LLM extractor, same deterministic policy, same 102 cases.
//   npm run evals                              -> data/eval-results-rules.json
//   ANTHROPIC_API_KEY=... npm run evals:llm    -> data/eval-results-llm.json (3 runs for consistency)
//   npm run compare                            -> data/comparison.md

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const load = (name) => (existsSync(`data/eval-results-${name}.json`) ? JSON.parse(readFileSync(`data/eval-results-${name}.json`, 'utf8')) : null);
const rules = load('rules');
const llm = load('llm');
if (!rules) { console.error('Run `npm run evals` first.'); process.exit(1); }

const pct = (x) => (x === null || x === undefined ? 'n/a' : `${x}%`);
const usd = (x, d = 5) => (x === null || x === undefined ? 'n/a' : `$${x.toFixed(d)}`);
const ms = (x) => (x === null || x === undefined ? 'n/a' : x < 1 ? '<1 ms' : `${Math.round(x)} ms`);
const pending = '_not run yet_';
const col = (r, fn) => (r ? fn(r) : pending);

const rows = [
  ['**Held-out (70 cases, never tuned on)**', '', ''],
  ['Exact match: team + priority + channel', (r) => pct(r.heldout.exactMatch)],
  ['Urgent cases caught (P0 recall)', (r) => `${pct(r.heldout.p0Recall)}`],
  ['Reached a human when needed', (r) => pct(r.heldout.reachedHumanWhenNeeded)],
  ['Over-escalation', (r) => pct(r.heldout.overEscalation)],
  ['Citation accuracy', (r) => pct(r.heldout.citationAccuracy)],
  ['AI answered a case it should have routed', (r) => String(r.heldout.answeredWhenShouldNot)],
  ['**Golden (32 cases, used to tune the rules)**', '', ''],
  ['Exact match', (r) => pct(r.golden.exactMatch)],
  ['P0 recall', (r) => pct(r.golden.p0Recall)],
  ['**Cost, speed, consistency**', '', ''],
  ['Latency per ticket (p50 / p95)', (r) => `${ms(r.performance.latencyMsP50)} / ${ms(r.performance.latencyMsP95)}`],
  ['Cost per ticket', (r) => usd(r.performance.costPerTicketUsd)],
  ['Cost per 10,000 tickets', (r) => usd(r.performance.costPer10kTicketsUsd, 2)],
  ['Cost per correctly routed ticket', (r) => usd(r.performance.costPerCorrectRouteUsd)],
  ['Same answer on every run', (r) => (r.consistency ? pct(r.consistency.agreementPct) : r.extractor === 'rules' ? '100% (deterministic)' : 'n/a (use --runs 3)')],
  ['Urgency flips across runs', (r) => (r.consistency ? (r.consistency.p0Flips.length ? r.consistency.p0Flips.join(', ') : 'none') : r.extractor === 'rules' ? 'none (deterministic)' : 'n/a')],
  ['Held-out readiness gate', (r) => (r.readinessGate.passed ? '**PASS**' : '**BLOCKED**')],
];

const table = [
  `| | Keyword rules | LLM extractor${llm ? ` (${llm.performance.model})` : ''} |`,
  '| --- | ---: | ---: |',
  ...rows.map(([label, fn]) => (typeof fn === 'string' ? `| ${label} | | |` : `| ${label} | ${col(rules, fn)} | ${col(llm, fn)} |`)),
].join('\n');

// Per-slice view: where does each extractor break?
const sliceTags = rules.heldoutSlices.filter((s) => s.tag !== 'heldout').map((s) => s.tag);
const sliceOf = (r, tag) => r?.heldoutSlices.find((s) => s.tag === tag);
const slices = [
  '| Slice | Cases | Rules exact | LLM exact | Rules P0 recall | LLM P0 recall |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...sliceTags.map((t) => {
    const a = sliceOf(rules, t), b = sliceOf(llm, t);
    const p0 = (s) => (!s ? pending : s.p0Cases ? pct(s.p0Recall) : '–');
    return `| ${t} | ${a.cases} | ${pct(a.exactMatch)} | ${b ? pct(b.exactMatch) : pending} | ${p0(a)} | ${b ? p0(b) : pending} |`;
  }),
].join('\n');

// Cases the LLM fixed and cases it broke, relative to rules (first run).
let diff = '';
if (llm) {
  const r = Object.fromEntries(rules.rows.map((x) => [x.id, x]));
  const fixed = llm.rows.filter((x) => x.ok.all && !r[x.id].ok.all).map((x) => x.id);
  const broke = llm.rows.filter((x) => !x.ok.all && r[x.id].ok.all);
  diff = `## What changed case by case

- **Fixed by the LLM (${fixed.length}):** ${fixed.join(', ') || 'none'}
- **Broken by the LLM (${broke.length}):** ${broke.map((x) => `${x.id} (expected ${x.expect.team} ${x.expect.priority} ${x.expect.channel}, got ${x.actual.team} ${x.actual.priority} ${x.actual.channel})`).join('; ') || 'none'}

A regression on a case the rules already handled is a launch blocker even if the totals improve.
`;
}

const md = `# Rules vs LLM: same policy, different understanding layer

Both columns use the identical deterministic policy (\`decide()\` in \`docs/app/engine.js\`). Only the step that reads the customer's message changes. Synthetic data only; these numbers show the evaluation method, not production performance.

${table}

## Held-out results by slice
${slices}

${diff}${llm ? '' : `## How to fill in the LLM column

\`\`\`bash
ANTHROPIC_API_KEY=your_key npm run evals:llm   # 102 cases x 3 runs
npm run compare
\`\`\`

The LLM run calls the API about 306 times. At the default model's listed price this is well under a dollar, but check the price table in \`evals/llm-extractor.mjs\` first.
`}
## How to read this

- **P0 recall is the deciding number.** A missed urgent case (a stolen card treated as routine) costs more than any amount of convenience elsewhere.
- **Cost per correctly routed ticket** beats cost per ticket: a cheap extractor that misroutes is expensive once rework and specialist time are counted.
- **Consistency** matters because the same message must get the same priority. An urgency flip means two identical customers could be treated differently.
`;
writeFileSync('data/comparison.md', md);
console.log(md);
