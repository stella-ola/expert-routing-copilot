# Prioritization

## Objective

Prioritize the smallest set of capabilities that can test the core product hypothesis: a transparent routing policy can improve the first resolution path while protecting customers from unsafe automation.

## Method

Two filters are applied in order. Safety, privacy, customer agency, and evaluation controls are entry requirements and are not traded away because of a low score. RICE is used only after those requirements are met. Reach, impact, confidence, and effort are **synthetic planning estimates**, not measured forecasts. The scores make tradeoffs discussable; they do not imply false precision.

`Priority score = reach × impact × confidence ÷ effort`

| Capability | Reach | Impact | Confidence | Effort | Score | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Sensitive-number redaction | 10 | 3.0 | 0.90 | 1 | — | Required |
| Safety and human-request overrides | 7 | 3.0 | 0.90 | 2 | 9.45 | Build first |
| Intent plus owning-team classification | 10 | 2.5 | 0.80 | 3 | 6.67 | Build first |
| Weighted severity and visible rationale | 9 | 2.5 | 0.80 | 3 | 6.00 | Build first |
| Confidence bands and clarification | 8 | 2.5 | 0.70 | 3 | 4.67 | Build first |
| Structured specialist handoff | 6 | 2.5 | 0.75 | 3 | 3.75 | Build first |
| Synthetic eval harness | 5 | 3.0 | 0.85 | 4 | 3.19 | Build first |
| Specialist feedback capture | 5 | 2.0 | 0.65 | 4 | 1.63 | Pilot next |
| Priority callback when live capacity is constrained | 1.4 | 3.0 | 0.60 | 2 | 1.26 | Validate operations next |
| Multilingual intake, starting with highest-need language | 1.0 | 3.0 | 0.50 | 4 | 0.38 | Elevate for fairness and safety |
| Queue-aware routing beyond priority callback | 6 | 2.0 | 0.50 | 5 | 1.20 | Validate before build |
| Voice and telephony integration | 7 | 1.5 | 0.40 | 8 | 0.53 | Defer |
| Custom model training | 8 | 2.0 | 0.35 | 10 | 0.56 | Defer until data exists |

## Why the order matters

Safety overrides and redaction come before optimization because harmful misses and sensitive-data exposure are entry risks. The eval harness is part of the MVP because confidence and thresholds are not meaningful without a way to compare decisions against expected outcomes. Multilingual intake is elevated despite a lower RICE score because reach-based scoring can undervalue fairness and safety for smaller groups. Broad queue-aware routing and model training are deferred because they require operational data and governance the portfolio prototype does not have.

## Now, next, later

- **Now:** transparent simulator, safety policy, confidence bands, handoff, synthetic evals, documentation.
- **Next:** customer and specialist research, annotation guide, shadow-mode prototype, feedback capture, slice-level analysis.
- **Later:** calibrated models, authenticated context, case-management integration, queue capacity, controlled rollout.
