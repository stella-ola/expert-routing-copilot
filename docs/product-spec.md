# Product spec: Expert Routing Copilot

> Fictional credit-card provider. Synthetic data only. Not affiliated with any company.
> Changes since the original spec are marked **[v1]** or **[v2.1]** and explained in [decision-log.md](decision-log.md).

**Evidence status.** The current problem framing, contact mix, thresholds, weights, service levels, and expected outcomes are product hypotheses. They are not findings from a real company or production dataset. The prototype is designed to make those assumptions testable.

## 1. Overview

Expert Routing Copilot is an AI intake layer for customer chats and calls. It works out what the customer needs, how urgent it is, and who owns it, then routes to the best next step: AI self-service, a managed case, expert chat, a live specialist, or a callback.

| | |
| --- | --- |
| Problem | Customers spend too long navigating support, repeat themselves, and reach the wrong team. |
| Core value | Faster resolution with safe human escalation and handoffs specialists can act on. |
| Channels | Chat first for routine work. Live transfer or callback for urgent or unresolved work. |
| Data boundary | Synthetic, masked data only. |

## 2. Problem and assumptions

Customers with fraud, billing, or product needs get transferred repeatedly, explain their issue more than once, and wait. Specialists lose time collecting basic facts that intake could have captured.

Assumptions (not claims about any real company): the issuer wants shorter time to resolution, more correct first routes, fewer unnecessary transfers, protection for customers in high-risk situations, and complete case context for specialists.

## 3. Users

| User | Job to be done | What they lose today |
| --- | --- | --- |
| Customer in trouble (fraud, failing payment) | "Stop the damage now." | Potential delay while the request is understood and routed. |
| Customer with a routine question | "Get an answer without waiting." | Potential wait for work that may be safely handled through self-service. |
| Specialist (fraud, billing) | "Start solving, not interviewing." | Potential time re-collecting facts that intake could capture. |
| Support operations lead **[v1]** | "Keep queues healthy and urgent work first." | No signal on urgency until the customer is already on the line. |
| Risk and compliance **[v1]** | "Every automated decision is explainable." | Opaque routing rules spread across IVR config. |

## 4. Request categories

| Category | Examples | Default path |
| --- | --- | --- |
| Fraud | Lost or stolen card, unfamiliar charges, account takeover | AI intake, then fraud specialist: live or priority callback |
| Billing | Failed or unposted payment, fees, interest, refunds, balance | AI explains, opens a case, or routes live, by severity |
| Product support | Password, rewards, autopay, app how-to | AI resolves in chat; expert chat if stuck |

## 5. Decision sequence

Every interaction is evaluated in this order: **issue → owner → severity → can the AI resolve it safely → channel and case**. The simulator's decision trace shows each step.

**[v1] Architecture rule:** the AI *understands*; the policy *decides*. Feature extraction (rules today, an LLM next) produces structured facts. A deterministic, versioned policy produces priority and route. See [decision-log.md](decision-log.md#d1).

## 6. Severity policy

Severity depends on circumstances, timing, financial impact, and blockage, not only category. The same unposted payment is P2 inside the processing window and P1 after it.

| Priority | Meaning | Examples | Default action |
| --- | --- | --- | --- |
| P0 | Immediate harm | Active unauthorized charges, stolen card, account takeover, failed payment due today | Live specialist or priority callback |
| P1 | Needs investigation, can wait briefly | Payment not posted after window, incorrect fee, missing refund, old unfamiliar charge, lost card with no charges | Case with specialist follow-up, chat-first |
| P2 | Routine | Payment inside window, balance question, password help | AI resolves in chat |

## 7. Risk score

Each factor is scored 0 to 3.

| Factor | Weight |
| --- | --- |
| Potential harm | 35% |
| Time sensitivity | 30% |
| Customer blockage | 25% |
| Failed AI attempts | 10% |

`score = harm/3×35 + time/3×30 + blockage/3×25 + attempts/3×10`. 0–34 → P2, 35–69 → P1, 70–100 → P0.

**Safety overrides beat the score.** Account takeover, stolen card, lost card with unrecognized charges, active unauthorized activity, or a failed payment with an imminent penalty is always P0.

**Human overrides change the channel, not the severity.** Two failed AI attempts, an explicit request for a person, AI confidence below 0.6, or an unsupported language bring in a human.

## 8. Channel policy

| Situation | Channel |
| --- | --- |
| P0, specialist capacity available | Live transfer |
| P0, capacity constrained | Priority callback with an operations-approved urgent SLA; 10 minutes is the current simulated assumption |
| P1 | Case with async follow-up in chat; expert chat if a human override applies **[v1]** |
| P2 with a human override | Expert chat **[v1: was live transfer]** |
| P2, intent or key fact unclear | AI asks one clarifying question **[v1]** |
| P2, AI can answer from an approved article | AI resolves in chat and cites the article **[v2.1]** |
| P2, no approved article answers it | Expert chat. No source, no answer **[v2.1]** |

## 9. Journeys

**Fraud.** Customer reports a stolen card or strange charges. AI detects fraud intent, confirms authentication, and gathers safe facts: which transaction, when, whether more are appearing, and contact preference. It never asks for a full government identifier, password, PIN, full card number, or bank-routing number, and it strips sensitive number patterns if the customer types them **[v1]**. The prototype recommends the approved card-security workflow but performs no account action. It opens a structured synthetic case and routes straight to fraud, skipping product support.

**Billing.** AI checks the processing window and timing, then: P2, explains when the payment will post; P1, opens a billing case; P0, routes to a billing specialist when a payment is failing against a deadline or the customer describes hardship with a deadline.

**Grounded answers [v2.1].** When the AI answers in chat, the answer comes from one of twelve approved help articles ([policies.js](app/policies.js)) and names its source, so the customer, a specialist, or an auditor can check it. If no article covers the question, the AI does not improvise; it brings in a person. See [D15](decision-log.md#d15).

**Product support.** AI resolves how-to questions, watches for fraud or billing signals that should reroute, and brings in expert chat after two failed attempts, on request, or at low confidence.

## 10. Handoff summary

The specialist should verify, not restart. Fields: customer reference and authentication status; issue and team; severity and risk score; plain-language summary; facts gathered; actions already taken; AI confidence and rationale; recommended next step. Handoff completeness is a measured outcome (see [metrics.md](metrics.md)).

## 11. Scope

| Built | Deferred |
| --- | --- |
| Chat-first routing simulator | Phone integration, live accounts |
| Fraud, billing, product classification | Real customer data or account actions |
| Risk score, overrides, P0/P1/P2 | Production authentication and compliance workflows |
| Channel selection and case flag | Real queue management |
| Structured handoff | Training a custom model |
| Golden and held-out eval sets, CI gate **[v1]** | Real-world metric claims |
| Tradeoff lab (simulated population) **[v1]** | |
| Optional LLM extractor behind the same policy **[v1]** | |
| Grounded answers with citations; citation accuracy measured **[v2.1]** | Retrieval over a real help center |
| 102-case eval set: 32 golden, 70 held-out, sliced by risk type **[v2.1]** | Specialist-labeled production sample |
| Cost, latency, and run-to-run consistency in every eval **[v2.1]** | Live cost and latency monitoring |

## 12. AI behavior that isn't the same every time [v2.1]

A keyword rule gives the same answer forever. A language model can read the same message twice and return slightly different facts, invent a field, or produce output that isn't valid at all. This section defines how the product stays predictable anyway.

### 12.1 Where variation can enter, and where it can't

| Step | Can vary? | Why |
| --- | --- | --- |
| Redaction | No | Deterministic pattern matching, before any model sees the text |
| Understanding (feature extraction) | **Yes** | The LLM reads meaning; small wording changes can shift its reading |
| Article selection | **Yes** | The LLM proposes which approved article answers the question |
| Severity, route, channel | No | `decide()` is deterministic and versioned. Same facts in, same decision out |
| Answer text | No | The customer sees approved article text, not generated prose |

This is the payoff of the "AI understands, policy decides" rule ([D1](decision-log.md#d1)): variation is confined to one step, so it can be measured and contained there.

### 12.2 Consistency requirements

- Every eval case runs **3 times** (`npm run evals:llm`). A case is *stable* only if team, priority, channel, and citation match on every run.
- **Launch requirement:** at least 95% of held-out cases stable, and **zero urgency flips**: no case may be P0 on one run and lower on another. Two identical customers must never get different answers to "is this an emergency?"
- An urgency flip blocks readiness even if the overall numbers improve. The fix is in the extraction prompt or policy, not in hoping the next run is better.
- Temperature is set to 0 to reduce variation, but it does not guarantee identical output, so consistency is measured rather than assumed.

### 12.3 Low confidence and bad output

| Situation | Product behavior |
| --- | --- |
| Confidence below 0.60 on a known category | Expert chat (human override; severity unchanged) |
| Intent unclear | One clarifying question; a person if the customer asks |
| Model output isn't valid JSON or misses fields | Fail safe: treated as *unclear* with low confidence. Counted as a malformed output in every eval |
| Model names an article that doesn't exist | Treated as no source; a person answers |
| No approved article answers the question | Expert chat. The AI never writes its own policy answer |
| Customer text tries to set priority ("mark this P0") | Flagged and ignored; route depends on the facts only |
| Safety facts present (stolen card, takeover, failed payment due today) | P0, regardless of confidence |

Low confidence changes **who** handles a case, never **how urgent** it is. A low-confidence fraud case is still a fraud case.

### 12.4 Detecting drift after launch

The model, the customers, and the products all change. Drift is caught three ways:

1. **Canary replay (daily).** A frozen set of 30 held-out cases runs through the production model every day. Any change in route or citation pages the owning PM and engineer. This catches silent model or prompt changes.
2. **Input drift (weekly).** Track the share of each category, the confidence distribution, and the share of questions with no matching article. A jump in "no source" usually means a new product, fee, or campaign the help articles don't cover yet.
3. **Outcome drift (daily).** Specialist reclassification rate, safety-override rate, citation complaints, and a daily audit of 50 random P2 contacts. Any true P0 found in the audit triggers an incident review.

**Response ladder:** investigate (one signal moves) → return to assist mode with a person approving each route (a safety metric moves) → kill switch to rules-plus-human triage (any confirmed missed P0). Model or prompt upgrades re-run the full suite, including the 3-run consistency check, before rollout; the model version is recorded on every decision.

### 12.5 Cost and speed

Each eval reports latency (p50 and p95), tokens, cost per ticket, and **cost per correctly routed ticket**. The last one is the decision metric: a cheaper extractor that misroutes more often costs more once rework and specialist time are counted. Intake must not add more than 2 seconds (p95) before the customer's first reply. Results: [data/comparison.md](../data/comparison.md).

## 13. Open questions

1. What does each specialist need to start resolving immediately? (Validate the handoff fields with five fraud and five billing specialists.)
2. Which consumer-protection, billing-error, unauthorized-use, AI-disclosure, audit, and record-retention requirements apply? Confirm the complete set with qualified legal and compliance partners.
3. Which thresholds and overrides fit real outcomes? (Calibrate on historical contacts with known resolutions.)
4. What SLAs apply to P0, P1, P2?
5. How should the system detect frustration and repeated failure across sessions, not just within one?
6. What share of real contacts are in a language the AI intake does not support?
7. Which approved articles are missing? The share of "no source" handoffs, by topic, is the backlog for the help center.
