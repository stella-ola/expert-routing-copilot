# Rollout GTM and Adoption

## Launch thesis

This is an internal workflow product with a customer-facing effect. Adoption depends on specialist trust, operational readiness, and safe behavior more than on a traditional marketing launch. The rollout should begin with decision support and earn the right to automate.

## Phased rollout

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0 Prototype | Synthetic simulator and eval framework | Policy is reviewable; known failures documented |
| 1 Replay | Approved historical, de-identified cases | Labels reliable; safety set passes |
| 2 Shadow | Live inputs, no customer or queue impact | Stable quality, monitoring, and capacity model |
| 3 Assisted | Specialists approve or correct recommendations | Useful handoffs, low harmful error, agent trust |
| 4 Limited automation | Selected high-confidence P2 intents | Guardrails healthy; rollback tested |
| 5 Controlled expansion | Additional intents and channels | Each slice independently meets gates |

## Internal GTM

- Recruit fraud, billing, support, operations, risk, privacy, compliance, accessibility, security, engineering, and data-science partners before pilot design.
- Identify specialist champions and skeptical reviewers; both improve the product.
- Train users on intended use, confidence, corrections, escalation, and incident reporting.
- Publish a one-page policy, quick-reference guide, and known-limitations list.
- Hold weekly pilot reviews covering errors, corrections, queue impact, customer feedback, and rollout decisions.

## Customer communication

Use plain language: explain whether the system can help now, needs one more detail, is creating a case, or is connecting a person. Provide realistic wait expectations and a visible human option. Do not market the experience as “AI-powered” unless that information helps the customer make an informed choice.

## Adoption metrics

- Specialist recommendation view and use rate.
- Correction rate and correction reason.
- Handoff completeness rating.
- Time to first meaningful action.
- Human-request honor rate.
- Training completion and confidence survey.
- Opt-out, complaint, and reopen rates.

## Rollback

The team must be able to disable automation by intent, risk tier, model version, or channel; restore the prior queue path; preserve in-flight cases; and notify specialists. A critical safety miss, monitoring failure, unexpected queue overload, or material disparity pauses the affected slice.

