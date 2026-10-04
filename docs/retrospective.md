# Retrospective

## What is strong

- The project begins with a customer and operational problem rather than “use AI.”
- It separates owner, severity, confidence, and handling mode.
- Safety overrides and a human-request path are first-class product requirements.
- The handoff summary treats downstream specialist effectiveness as part of the experience.
- Synthetic data and assumptions are clearly labeled.
- The simulator connects product policy to executable logic and a visible evaluation set.

## What changed during the portfolio build

The original specification already covered the problem, customer journeys, severity, risk scoring, channels, handoffs, prototype scope, and initial metrics. The original simulator rendered four keyword-driven routes with fixed scores. The portfolio upgrade preserved that source and added calculated risk factors, a confidence policy, clarification and human-triage behavior, adjustable thresholds, safety and human overrides, a synthetic eval harness, automated tests, and a decision record.

## What remains unproven

- The problem’s frequency and business impact.
- The taxonomy’s coverage of real customer language.
- The risk weights, score bands, confidence thresholds, and service levels.
- The usefulness and safety of each handoff field.
- Real model quality, calibration, robustness, fairness, and drift.
- Queue impact, customer trust, specialist adoption, and causal business outcomes.

## What I would do next

1. Interview customers and observe specialists to validate the journey and handoff.
2. Build an annotation guide and adjudicate a small approved dataset.
3. Review safety and data policy with fraud, risk, privacy, compliance, security, and accessibility partners.
4. Establish current routing, transfer, repeat-intake, and resolution baselines.
5. Compare rules-only, model-only, and hybrid approaches offline.
6. Run shadow mode before exposing any recommendation to a specialist or customer.

## Product lessons

- A confidence number matters only when it changes behavior and has been calibrated.
- A correct intent does not guarantee a correct route; context determines severity and channel.
- Automation coverage is an output, not the goal.
- Human handoff is not a failure when it is timely, informed, and appropriate.
- Synthetic prototypes are valuable for clarifying policy, but they cannot substitute for representative data and real workflow validation.
- Showing known failures is more credible than optimizing a demo to appear perfect.

## Portfolio interview framing

“I treated routing as a product-policy problem, not just a classification problem. I separated intent, urgency, confidence, and handling mode; made safety and customer choice override automation; created an eval set with deliberate failure cases; and defined how I would validate the workflow before any production model or rollout.”

