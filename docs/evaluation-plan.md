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
| Held-out | 10 | Written after tuning; never used to tune | Readiness gate for any candidate extractor |

Run: `node evals/run-evals.mjs` (rules) or `node evals/run-evals.mjs --llm` (LLM extractor, same policy). CI runs the rules evals on every push and fails if the tuned baseline regresses. A green CI check does not mean the product is ready to launch. Results: [data/eval-results-rules.md](../data/eval-results-rules.md).

## Current results (rules extractor)

| | Golden (gated cases) | Held-out |
| --- | --- | --- |
| Exact match | 100% | 40% |
| P0 recall | 100% | **0%** |
| Reached a human when needed | — | 42.9% |

**Interpretation.** The rules are overfit to the phrasing they were built on. "My wallet got taken on the train," "wasn't me," and "the bank keeps rejecting my payment" all slip through. This is the strongest argument in the project for an LLM extractor, and also the reason it must be evaluated on held-out data before it ships, not on the set it was prompt-tuned against.

## Regression and readiness gates

| Gate | Threshold | Applies to |
| --- | --- | --- |
| P0 recall | 100% | Golden regression set and held-out readiness set |
| Exact match | ≥ 90% | Golden regression set |
| Exact match | ≥ 80% | Held-out readiness set |
| Reached a human when needed | ≥ 98% | Held-out readiness set |
| Over-escalation | ≤ 15% | Held-out readiness set |
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

- **Determinism.** Temperature 0; run each held-out case 3 times; flag any case whose route changes between runs.
- **Schema validity.** Invalid or missing fields fail safe (category "unclear", which routes to a human if anything else looks wrong).
- **Injection.** The customer message is wrapped and treated as data; injection attempts are an eval category.
- **Cost and latency.** Track p95 extraction latency; intake must not add more than 2 seconds before the first AI reply.
- **Version pinning.** Model version recorded on every decision; model upgrades re-run the full eval suite before rollout.
