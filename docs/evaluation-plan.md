# Eval plan

How we know the routing is good enough to put in front of customers, and how we know it stays that way.

## What's in the repo today

| Set | Size | Purpose | How it is used |
| --- | --- | --- | --- |
| Golden: spec | 6 | The test plan from the product spec | Regression gate |
| Golden: core | 11 | One or more per major intent and severity | Regression gate |
| Golden: edge | 8 | Severity depends on circumstances (capacity, timing, hardship, human request) | Regression gate |
| Golden: adversarial | 3 | Prompt injection, urgency without facts, sensitive data typed in | Regression gate |
| Golden: known gaps | 4 | Documented failures (negation, ambiguity, language, implicit fraud) | Reported, never hidden |
| Held-out v1 (H1–H10) | 10 | Written after tuning; never used to tune | Readiness gate |
| Held-out v2.1 (H11–H70) **[v2.1]** | 60 | Written after the rules *and* the article retriever were frozen | Readiness gate, reported by slice |
| **Total** | **102** | 21 held-out cases also carry an expected article citation | |

Held-out slices: fraud 20, billing 30, product 17, unclear 3; cross-cutting tags for implicit fraud, negation, ambiguity, multi-issue, adversarial, other languages, typos, and questions with no approved source. Slice results show where a model fails instead of averaging it away.

**Labeling rule.** Each label is what the written policy says should happen if the message were read correctly. Labels are never copied from an extractor's output. Questions with no matching article are labeled *expert chat* (no source, no answer).

Run:

```bash
npm run evals                              # rules; what CI runs
ANTHROPIC_API_KEY=... npm run evals:llm    # LLM extractor, same policy, every case 3 times
npm run compare                            # data/comparison.md, side by side
```

CI runs the rules evals on every push and fails if the tuned baseline regresses. A green CI check does not mean the product is ready to launch. Results: [rules](../data/eval-results-rules.md) · [comparison](../data/comparison.md).

## Current results (rules extractor)

| | Golden (gated cases) | Held-out (70) |
| --- | --- | --- |
| Exact match | 100% | 32.9% |
| P0 recall | 100% | **4.3%** (1 of 23) |
| Reached a human when needed | — | 53.2% |
| Citation accuracy | 100% | 38.1% |
| AI answered a case it should have routed | 0 | 7 |

**Interpretation.** The rules are overfit to the phrasing they were built on. "My purse was snatched," "wasn't me," "my autopay didn't go through" all slip past them, and they caught 0% of implicit-fraud and multi-issue urgent cases. Citations fail the same way: "signing up" triggers the sign-in article. This is the strongest argument for an LLM extractor, and the reason it must clear this same held-out set, three runs per case, before it ships.

## Regression and readiness gates

| Gate | Threshold | Applies to |
| --- | --- | --- |
| P0 recall | 100% | Golden regression set and held-out readiness set |
| Exact match | ≥ 90% | Golden regression set |
| Exact match | ≥ 80% | Held-out readiness set |
| Reached a human when needed | ≥ 98% | Held-out readiness set |
| Over-escalation | ≤ 15% | Held-out readiness set |
| Citation accuracy | 100% / ≥ 90% | Golden regression set / held-out readiness set **[v2.1]** |
| AI answered a case it should have routed | 0 | Held-out readiness set **[v2.1]** |
| Same decision on all 3 runs | ≥ 95%, and zero urgency flips | Held-out readiness set, LLM only **[v2.1]** |
| No new red-team failures | 0 | Adversarial regression set |

The rules extractor passes the tuned regression gate and fails held-out readiness. It remains a transparent learning baseline and must not control customer-facing routing.

These thresholds are proposed safety hypotheses for the portfolio. Domain, risk, operations, data-science, legal, privacy, compliance, accessibility, and customer evidence must determine real launch criteria.

## Scaling the eval set for a real launch

1. **Source.** Sample 2,000 historical contacts, stratified by team and resolution, with oversampling of fraud and disputes. Mask all identifiers before labeling.
2. **Labelers.** Fraud and billing specialists, not the PM. Each contact labeled by two people.
3. **Guidelines.** A one-page rubric: what makes P0 (harm is happening or a deadline is within 24 hours), what counts as "owner" (the team that resolved it, not the first team that touched it), how to label ambiguous cases.
4. **Agreement.** Measure inter-rater agreement (Cohen's kappa). Below 0.7 on priority means the policy itself is ambiguous, and that's a product problem to fix before a model problem.
5. **Splits.** 60% development, 20% validation, 20% locked test. The locked test set is opened only for launch decisions.
6. **Refresh.** Add 50 new cases a month from production misses and audit samples. Every escalation where the specialist reclassified the case is a candidate.

## Online monitoring

| Signal | Cadence | Action if it moves |
| --- | --- | --- |
| Daily audit: 50 random P2 contacts reviewed by a specialist | Daily | Any true P0 found triggers incident review |
| Specialist reclassification rate | Daily | Over 10% for a team: investigate extractor and policy |
| Category and confidence distribution | Weekly | Shift beyond control limits: check for new products or campaigns |
| Override rates | Weekly | Sudden change: extractor or traffic changed |
| Segment metrics (language, channel, new vs tenured customer) | Weekly | Gap over 5 points: fairness review |

## LLM-specific checks

All of these are implemented in `evals/run-evals.mjs` and `evals/llm-extractor.mjs` **[v2.1]**:

- **Consistency.** Every case runs 3 times. Unstable cases and any P0 flips are listed by ID. See [product spec §12](product-spec.md#12-ai-behavior-that-isnt-the-same-every-time-v21).
- **Schema validity.** Invalid output fails safe (category *unclear*, low confidence) and is counted as a malformed output. An invented article ID is treated as no source.
- **Injection.** The customer message is wrapped and treated as data; injection attempts are an eval slice.
- **Cost and latency.** Every call records latency and tokens; the report gives p50/p95 latency, cost per ticket, and cost per correctly routed ticket. Intake must not add more than 2 seconds at p95.
- **Version pinning.** Model name recorded on every result; model upgrades re-run the full suite, including the 3-run consistency check, before rollout.
