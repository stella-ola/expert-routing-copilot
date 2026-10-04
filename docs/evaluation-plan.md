# AI Evaluation Plan

## Evaluation question

Can the routing system choose the correct owner, priority, and handling mode while reliably escalating high-risk, low-confidence, repeated-failure, and human-request cases?

The portfolio uses a deterministic heuristic as a model stand-in. The same framework would apply to a trained classifier or LLM-based workflow after adding calibrated probabilities, adjudicated data, and model-specific tests.

## Evaluation layers

| Layer | Question | Method |
| --- | --- | --- |
| Component | Did intent, factors, score, and overrides behave as specified? | Unit tests and policy fixtures |
| End-to-end | Did the final team, priority, and handling mode match the expected decision? | Versioned scenario evaluation |
| Safety | Did every critical case receive the required human path? | Safety-recall set and red-team cases |
| Calibration | Does a stated confidence correspond to observed correctness? | Reliability diagram and expected calibration error in a future model |
| Operations | Does the route improve resolution without overwhelming queues? | Shadow mode and controlled pilot |
| Experience | Do customers understand and trust the next step? | Moderated usability and post-resolution feedback |

## Synthetic dataset design

The checked-in dataset contains fictional cases across fraud, billing, product support, ambiguity, mixed intent, human requests, repeated failures, and prompt pressure. Each record contains:

- a stable case ID;
- synthetic customer message;
- expected intent, priority, and handling mode;
- tags for slice analysis.

Cases are authored to include paraphrases, weak signals, strong signals, contradictory signals, and known heuristic blind spots. Synthetic data avoids privacy risk but cannot establish real-world performance.

## Ground truth process for a real pilot

1. Create an annotation guide with definitions and counterexamples.
2. Have at least two trained reviewers label owner, severity, handling mode, and required handoff fields.
3. Route disagreements to a domain adjudicator.
4. Measure inter-rater agreement and revise ambiguous labels.
5. Freeze an evaluation set that is separate from prompt and policy tuning.
6. Refresh a rolling set when customer language, products, or policies change.

## Metrics

- Macro and per-class intent precision, recall, and F1.
- Severity confusion matrix with higher weight on P0 false negatives.
- Final-route exact match.
- Safety recall and override compliance.
- High-confidence error rate.
- Automation coverage and clarification rate.
- Calibration by intent and risk tier.
- Handoff completeness and repeat-intake rate.

## Cost-sensitive acceptance gates

Illustrative gates below are **proposed hypotheses**, not approved targets:

| Gate | Proposed requirement | Why |
| --- | --- | --- |
| P0 safety recall | 100% on a reviewed safety set before live automation | A missed critical case is high harm. |
| Human-request compliance | 100% | Customer agency is a product rule. |
| High-confidence route error | Below an agreed low limit by intent | Automation should earn trust. |
| Calibration | No material overconfidence in critical slices | Threshold policy depends on calibrated confidence. |
| Handoff completeness | Meets specialist-defined field standard | Routing alone does not create resolution. |

## Error review

Every mismatch receives an error code: intent confusion, severity under-call, severity over-call, safety miss, confidence miscalibration, inappropriate automation, unnecessary escalation, incomplete handoff, or policy conflict. The review records impact, likely cause, immediate mitigation, and whether the fix belongs in data, model, product policy, UX, or operations.

## Online evaluation sequence

1. **Replay:** historical, de-identified cases if approved.
2. **Shadow:** generate decisions without affecting customers or queues.
3. **Assisted:** specialists see a recommendation and approve or correct it.
4. **Limited automation:** enable only low-risk, high-confidence slices.
5. **Expansion:** add slices only after guardrails remain healthy.

## Known limitations

The current confidence is a heuristic score, not a calibrated probability. The sample is small and authored, not representative. There is no demographic or language distribution. Outcomes such as resolution time and CSAT are not simulated because invented business results could mislead.

