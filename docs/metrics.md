# Metrics

The test for every metric here: if it moved, would we make a different decision? If not, it isn't on the list.

## North Star

**Time to resolution (TTR) for contacts resolved without a repeat contact within 7 days.**

Plain TTR rewards closing things fast and wrong. Requiring "no repeat contact in 7 days" means a fast answer only counts if it actually solved the problem.

## Metric tree

```
Time to resolution (no repeat within 7 days)
├── Time to the right owner
│   ├── Correct first route (%)                ← routing quality
│   └── Transfers per contact                   ← friction
├── Time with the owner
│   ├── Specialist handle time                  ← handoff quality
│   └── Handoff completeness (%)                ← "could start without re-asking"
└── Time waiting
    ├── P0 time to specialist (p50, p90)        ← urgency handling
    └── Queue utilization                       ← capacity
```

## Input metrics (the levers)

| Metric | Definition | Why it matters |
| --- | --- | --- |
| Correct first route | Share of contacts whose first route matched the team that resolved it | The core promise. Every miss costs a transfer. |
| Resolved by AI, no repeat | Share of AI-handled contacts with no repeat contact in 7 days | "Containment" that counts only if it worked. |
| Handoff completeness | Specialist marks "I could start without re-asking intake questions" (one click on case close) | Measures whether intake actually saves specialist time. |
| P0 time to specialist | Minutes from first message to a fraud or billing specialist, for P0 | Urgent customers are the reason this exists. |

## Guardrails (must not get worse)

| Guardrail | Threshold | Why |
| --- | --- | --- |
| **Missed urgent rate** | 0 on the synthetic readiness set; proposed production tolerance must be approved and every miss reviewed | A missed stolen-card case may be far more harmful than an unnecessary escalation. |
| Repeat contact within 7 days | No increase vs control | Catches "closed but not solved." |
| Escalation after AI resolution | No increase vs control | Customers forced to come back. |
| Fraud team load from non-fraud work | Under 10% of fraud queue | False fraud classification has a real cost. |
| CSAT for escalated contacts | No decrease | Escalation should feel like a rescue, not a punishment. |
| Resolution rate by language and channel | No segment more than 5 points below average | Fairness: the AI shouldn't work only for some customers. |

## AI quality metrics (offline and online)

| Metric | Why this one |
| --- | --- |
| P0 recall | The safety metric. Gated at 100% on the evaluation set. |
| P0 precision | Low precision floods live queues (see the tradeoff lab). |
| Per-team precision and recall | Fraud recall matters most; billing-vs-fraud confusion is the expensive error. |
| Confidence calibration | When the AI says 90%, is it right 90% of the time? Uncalibrated confidence makes the low-confidence override meaningless. |
| Override rate | How often safety and human overrides fire. A sudden change means the extractor or the traffic changed. |

**Why not just "accuracy"?** Errors are asymmetric. Calling a billing question fraud costs a few specialist minutes. Calling a stolen card a billing question can cost the customer money and the company trust. A single accuracy number hides exactly the error that matters.

## Cost of errors

Rough cost matrix used to reason about thresholds (illustrative relative units, to be replaced with approved handle-time, queue, harm, and loss data):

| True priority ↓ / Routed as → | P0 | P1 | P2 |
| --- | --- | --- | --- |
| **P0** | 0 | 30 (harm delayed) | 100 (potential harm, loss, and trust impact) |
| **P1** | 10 (queue cost) | 0 | 10 (investigation delayed) |
| **P2** | 1 (specialist time) | 1 (unnecessary case) | 0 |

Read the top-right: in this illustrative model, routing a true P0 as P2 is two orders of magnitude worse than routing routine P2 work to P0. This asymmetry motivates safety overrides and the proposed 100% P0-recall readiness gate.

## Instrumentation

Events the product would emit (names are proposals):

| Event | Key properties |
| --- | --- |
| `intake_started` | channel, authenticated |
| `intake_classified` | category, confidence, extractor_version, signals |
| `route_decided` | priority, score, factors, overrides, channel, policy_version |
| `handoff_viewed` | specialist_id (hashed), seconds_to_first_action |
| `handoff_rated` | complete: yes/no, missing_field |
| `contact_resolved` | resolution_code, resolving_team, transfers |
| `contact_repeated` | days_since_previous, same_issue |

`policy_version` and `extractor_version` on every decision make it possible to attribute any regression to a specific change.

## Experiment design

**Unit of randomization: not the individual contact.** Treatment and control share the same specialist queues. If treatment sends more contacts to live specialists, control customers wait longer too, and the comparison is contaminated (interference).

Options considered:

| Design | Pro | Con | Use for |
| --- | --- | --- | --- |
| Contact-level A/B | Fast, large sample | Shared-queue interference biases wait-time metrics | Pure AI-resolution metrics (no queue effect) |
| Switchback by time block (for example alternating 2-hour blocks) | Removes queue interference | Needs more weeks; time-of-day effects need balancing | Wait time, TTR, queue metrics |
| Region or line-of-business holdout | Clean, simple to explain | Fewer units, slower | Executive readout on TTR |

Plan: shadow mode first (no customer impact, compare AI route to the human route), then switchback for TTR and queue metrics, with a 5% long-term holdout to measure whether gains persist.

**Sample size planning.** The final sample size must be calculated from observed baseline distributions, the chosen minimum detectable effect, clustering or switchback design, power, and significance level. Fraud-specific outcomes will generally require longer observation because urgent fraud is expected to be a smaller slice of total volume. No portfolio assumption should be used as the production calculation.

## Proposed targets

Targets are hypotheses to validate, not promises:

| Metric | Hypothesis |
| --- | --- |
| Correct first route | Up 15 points vs menu-based routing |
| P0 time to specialist (p90) | Under 5 minutes |
| Handoff completeness | Over 80% |
| AI resolved, no repeat | 35–45% of contacts, mostly product and routine billing |

## Tradeoff lab assumptions

The lab in the simulator uses a simulated population. Contact mix: 38% product, 22% routine billing, 20% billing cases, 6% old fraud, 5% active fraud, 5% urgent billing, 4% lost card. AI extraction error: each factor is off by one point with the probability you set. Safety overrides fire on 92% of true safety cases. Queue wait: `3 × u / (1 − u)` minutes, where `u` is live load over capacity, capped at 60. All illustrative.
