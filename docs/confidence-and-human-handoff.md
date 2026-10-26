# Confidence Thresholds and Human Handoff

## Policy goal

Confidence should control product behavior, not decorate the interface. The system must distinguish “I know where this goes,” “I need one more fact,” and “a person should decide.”

## Default simulated bands

| Confidence proxy | Behavior | Rationale |
| --- | --- | --- |
| Below 0.60 | Human triage | Too little signal to ask the customer to trust an automated route. |
| 0.60–0.84 | Clarifying question | One targeted question may resolve ambiguity without creating a transfer. |
| 0.85 and above | Eligible for auto-routing | Eligibility still depends on severity, safety, and channel policy. |

These values are intentionally adjustable in the simulator. They are assumptions chosen to show the tradeoff between automation coverage and error risk.

## Overrides

The following decisions do not depend on confidence:

- active unauthorized activity, account takeover, exposed lost or stolen card, or imminent financial harm → P0 human path;
- explicit customer request for a person → human path;
- two failed automation attempts → human path;
- no approved article answers the question → human path (no source, no answer; severity unchanged);
- malformed or invalid model output → treated as unclear with low confidence, never as a confident answer;
- missing required authentication or policy constraint in a real system → approved safe fallback.

## Threshold selection

A real threshold review would plot expected cost rather than maximize raw accuracy:

`expected cost = false-negative harm + false-positive queue cost + clarification friction + delayed-resolution cost`

The cost should be estimated separately for each intent and severity. Fraud may require a higher automation threshold than routine product support. Thresholds also need capacity checks because a safe policy that overwhelms the fraud queue can still create harm.

## Human handoff contract

A handoff is successful only if the next person can act. The minimum handoff includes:

- customer reference and authentication state;
- predicted intent, owner, severity, and score;
- concise issue summary and safe facts gathered;
- actions and questions already attempted;
- confidence, overrides, and decision rationale;
- recommended next step and customer contact preference.

The specialist must be able to correct the intent, priority, and route. Corrections become labeled feedback after governance review; they are not automatically treated as ground truth.

## Experience requirements

- Tell the customer what will happen next and why, without exposing exploitable detection logic.
- Do not imply a live transfer when only a callback or case is available.
- Preserve conversation context across the handoff.
- Avoid repeatedly asking the customer to justify a human request.
- Provide a fallback when the customer cannot use the proposed channel.

## Monitoring

Track threshold version, automation coverage, clarification rate, human deferral rate, high-confidence error, safety recall, transfer rate, queue time, specialist correction rate, and repeat-intake rate by intent and customer slice.

