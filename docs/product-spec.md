# Expert Routing Copilot Product Specification

## Purpose and status

This portfolio project defines and demonstrates a triage layer for a fictional credit-card provider. It classifies a customer request, assesses urgency and risk, and selects the safest next step: AI self-service, a clarifying question, a managed case, expert chat, or live human support.

**Status:** interactive prototype. **Data:** synthetic only. **Evidence boundary:** the problem and target outcomes are hypotheses informed by common support patterns, not findings from a real company or production dataset.

## Problem

Customers can be transferred repeatedly, explain their issue more than once, or remain in automation after it is clear that a person is needed. Specialists can also lose time rebuilding context that intake should have captured. The product hypothesis is that better intent, severity, confidence, and handoff decisions can reduce time to resolution without increasing customer harm.

## Users

| User | Need | Evidence status |
| --- | --- | --- |
| Customer | Reach the right resolution path quickly and avoid repetition. | Assumption to validate through interviews and journey analysis. |
| Support specialist | Receive complete, trustworthy context and a clear priority. | Assumption to validate through workflow observation. |
| Support operations | Balance resolution quality, queue capacity, service levels, and cost. | Assumption to validate with operational data. |
| Risk and compliance | Prevent unsafe automation and protect sensitive information. | Must be validated before any real deployment. |

## Product principles

1. **Safety overrides efficiency.** Active fraud, account compromise, and imminent harm bypass normal automation.
2. **Confidence changes behavior.** Uncertainty should produce clarification or deferral, not an overconfident route.
3. **Customers can opt out.** A direct request for a person is honored.
4. **Two failed attempts are enough.** Repeated automation failure triggers a human path.
5. **The handoff is part of the product.** A transfer without usable context is not a successful route.
6. **Severity is contextual.** The issue category alone does not determine urgency.

## Request taxonomy

| Category | Examples | Default owner |
| --- | --- | --- |
| Fraud | Lost or stolen card, unrecognized activity, account takeover | Fraud specialist |
| Billing | Payment failure, posting delay, fee, interest, refund, statement issue | Billing team |
| Product support | Password, rewards, app navigation, autopay, card features | AI or product-support expert |
| Unknown or mixed | Insufficient or contradictory information | Human triage or clarification |

## Decision sequence

1. Detect candidate intent and safe-to-use signals.
2. Estimate a confidence proxy and identify ambiguity.
3. Score potential harm, time sensitivity, customer blockage, and failed attempts.
4. Apply safety, repeated-failure, and customer-request overrides.
5. Select the owner, priority, channel, and case requirement.
6. Create an auditable decision rationale and handoff summary.

## Severity policy

| Priority | Meaning | Default action |
| --- | --- | --- |
| P0 | Immediate or rapidly increasing harm | Live specialist or priority callback |
| P1 | Investigation is required but can wait briefly | Managed case or expert chat |
| P2 | Routine, informational, or safe self-service | AI guidance or guided chat |

The prototype uses a 0–3 factor scale and the formula:

`(harm ÷ 3 × 35) + (time ÷ 3 × 30) + (blockage ÷ 3 × 25) + (failed attempts ÷ 3 × 10)`

Score bands are P2 from 0–34, P1 from 35–69, and P0 from 70–100. Business rules can set a minimum P1 for issues that require investigation. Safety overrides can force P0.

## Confidence and handling policy

The default simulated thresholds are:

- below 0.60: human triage;
- 0.60–0.84: ask a clarifying question;
- 0.85 and above: eligible for automated routing;
- any safety override, explicit human request, or two failed attempts: human handling regardless of confidence.

These thresholds are assumptions. They must be tuned by error cost, issue type, calibration quality, queue capacity, and customer outcomes.

## Functional requirements

- Accept a synthetic support message.
- Return intent, team, confidence proxy, severity, factor scores, route, and rationale.
- Make every override visible.
- Allow a reviewer to adjust confidence thresholds.
- Display a structured handoff summary.
- Evaluate the policy against a versioned synthetic scenario set.
- Flag mismatches instead of hiding them.

## Non-functional and safety requirements

- Do not request or store full card numbers, passwords, PINs, Social Security numbers, or bank routing numbers.
- Keep the prototype client-side with no real account integration.
- Provide keyboard access, readable contrast, and responsive layouts.
- Log policy version, model or heuristic version, thresholds, inputs, and overrides in a real implementation.
- Maintain an immediate fallback when upstream classification or routing is unavailable.

## Out of scope

- Real phone integration, authentication, customer accounts, transactions, or account actions.
- A trained custom model or claims of production accuracy.
- Real specialist queue management or service-level guarantees.
- Final legal, compliance, fairness, accessibility, or security approval.

## Success criteria for the portfolio prototype

- The routing policy is understandable without reading code.
- Safety and uncertainty visibly change the route.
- The evaluation set contains both passing and failing cases.
- Metrics distinguish customer outcome, model quality, operational load, and safety.
- Every simulated result and unvalidated assumption is clearly labeled.

## Open questions

- Which fields let each specialist begin work without repeating intake?
- Which issues require deterministic rules rather than model judgment?
- What error costs and thresholds apply by intent and severity?
- How do customers describe mixed fraud and billing issues in their own words?
- What is the operational capacity for clarification, triage, and priority callbacks?
- Which protected or vulnerable groups could experience systematically worse routing?

