# Responsible AI and Safety

## Intended use

The intended use is decision support for routing customer-service requests. It is not intended to make credit decisions, authenticate customers, block accounts, move money, determine liability, or replace a trained specialist in high-risk cases.

## Risk controls

| Risk | Control in the prototype | Required production control |
| --- | --- | --- |
| Harmful automation | Safety and human-request overrides | Approved policy engine, audit log, incident response |
| Overconfidence | Confidence bands and clarification | Calibrated confidence and ongoing monitoring |
| Sensitive information | Synthetic data warning; client-only prototype | Data minimization, redaction, access control, retention policy |
| Unequal performance | Explicit slice-analysis requirement | Representative evaluation and disparity remediation |
| Automation bias | Visible rationale and editable handoff | Specialist training and independent review authority |
| Prompt injection or manipulation | Deterministic safety rules remain higher priority | Input isolation, tool permissions, adversarial testing |
| Policy drift | Versioned code and cases | Change approval, versioned policies, rollback |

## Data minimization

The intake should not request passwords, PINs, full card numbers, full Social Security numbers, bank routing numbers, or unrelated personal details. A production workflow should use authenticated identifiers and structured fields instead of copying unnecessary free text into downstream systems.

## Fairness and accessibility

Evaluation must examine performance across language variety, dialect, writing ability, disability-related communication needs, age-related needs, channel, and vulnerable-customer contexts where lawful and appropriate. A single global accuracy score can hide systematically poor service. Customers must have an accessible human route and should not be penalized for unclear language.

## Explainability

The system should provide two levels of explanation:

- **Customer explanation:** a concise next-step statement, expected timing, and how to reach a person.
- **Specialist and audit explanation:** signals, confidence, factor scores, overrides, route, policy version, and correction controls.

The product should not reveal detailed fraud-detection logic that could help malicious actors evade controls.

## Governance owners

Product owns the experience and decision policy. Operations owns queue readiness and service levels. Domain specialists define required facts and escalation rules. Data science owns model quality and calibration. Engineering owns reliability and security controls. Risk, legal, compliance, privacy, and accessibility approve relevant policies. No single function should unilaterally expand automation in a safety-critical slice.

## Go or no-go conditions

Do not launch live automation until required reviews are complete, the safety set passes, human fallback is operational, monitoring and rollback work, data handling is approved, and specialists can correct decisions. Any critical safety miss during a pilot pauses expansion for the affected slice.

