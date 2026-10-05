# Failure Analysis

## Failure taxonomy

| Failure | Customer or business impact | Detection | Primary response |
| --- | --- | --- | --- |
| Missed fraud intent | Financial or security harm; loss of trust | Safety recall, complaints, specialist corrections | Expand safety rules, retrain, lower threshold, incident review |
| False fraud route | Longer queue and unnecessary alarm | Confusion matrix, transfer rate | Add disambiguation and targeted clarification |
| Severity under-call | Urgent customer waits too long | P0 false-negative review | Policy override and cost-sensitive tuning |
| Severity over-call | Critical queue overload | P0 precision and queue time | Refine factors; add capacity-aware operations |
| Overconfident wrong route | Automation creates hidden errors | High-confidence error rate | Calibration, threshold increase, slice restriction |
| Excessive clarification | Customer frustration and abandonment | Clarification loops, drop-off | One-question limit and human fallback |
| Late human handoff | Longer resolution and repeated effort | Attempt count and time in automation | Two-attempt rule and customer opt-out |
| Incomplete summary | Customer repeats information | Specialist completeness rating | Required schema and validation |
| Sensitive-data capture | Privacy and compliance risk | Data-loss prevention and audits | Redaction, minimization, block and escalate |
| Queue overload | P0 waits despite correct route | Queue SLA and occupancy | Priority callback, staffing, circuit breaker |

## FMEA snapshot

Scores below are **illustrative assumptions** on a 1–5 scale. Risk priority number equals severity × occurrence × detectability.

| Failure | Severity | Occurrence | Detectability | RPN | Action |
| --- | ---: | ---: | ---: | ---: | --- |
| Missed active fraud | 5 | 2 | 4 | 40 | Deterministic override; 100% safety-set recall gate |
| Overconfident wrong owner | 4 | 3 | 3 | 36 | Calibration and high-confidence error guardrail |
| Incomplete handoff | 3 | 4 | 2 | 24 | Required fields and specialist feedback |
| Unnecessary P0 escalation | 3 | 3 | 2 | 18 | Tune thresholds by slice and monitor queue time |
| Clarification loop | 2 | 3 | 2 | 12 | One clarification, then human fallback |

## Prototype errors worth keeping visible

The synthetic evaluation intentionally includes phrases the simple heuristic may mishandle, such as unauthorized money movement without the word “fraud” and a statement fee that could be billing or fraud. These are not demo defects to hide; they show why language coverage, adjudication, calibrated confidence, and failure review are necessary.

## Incident response for a real deployment

1. Stop or narrow automation for the affected slice.
2. Preserve policy, model, input, and decision records.
3. Assess customer harm and route affected cases to trained reviewers.
4. Notify risk, security, privacy, legal, operations, and customer support as required.
5. Correct policy, data, model, or UX; validate on a holdout and red-team set.
6. Resume gradually with heightened monitoring and a documented postmortem.

