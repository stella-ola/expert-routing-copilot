# Expert Routing Copilot Portfolio Case Study

## Executive summary

Expert Routing Copilot is a synthetic AI product case study that explores how a financial-support organization could route customer requests by intent, urgency, confidence, customer choice, and specialist capacity. The project demonstrates product policy, evaluation discipline, human-in-the-loop design, and controlled rollout rather than claiming production performance.

## Problem

Customers seeking fraud, billing, or product help may reach the wrong team, repeat information, wait in the wrong queue, or remain with automation after a human would be more effective. Specialists may receive incomplete context and reconstruct the interaction. The product hypothesis is that earlier understanding and safer routing can reduce appropriate resolution time without increasing harm or queue overload.

This problem and its magnitude remain assumptions until validated through customer research, specialist observation, and operational baselines.

## Product approach

The system separates four decisions:

1. **Intent:** what is the customer trying to resolve?
2. **Severity:** what harm, deadline, or blockage exists?
3. **Resolution ability:** is the understanding layer confident enough, and is automation safe?
4. **Channel:** should the next step be AI guidance, one clarification, a managed case, expert chat, a live transfer, or a priority callback?

The central architecture principle is: **the understanding layer extracts facts; the deterministic policy decides the route.** Rules provide the transparent baseline. An LLM is an optional candidate extractor that must emit the same structured feature contract and pass the same held-out evaluation.

## What was built

- An interactive routing simulator with visible intent signals, factor scoring, overrides, channel selection, and decision trace.
- Sensitive-number redaction before extraction or display.
- A structured specialist handoff containing safe facts, prior actions, confidence, and next step.
- A 32-case golden set covering specification, core, edge, and adversarial behavior.
- Four declared golden-set gaps and a 10-case held-out set written after tuning.
- An automated regression check and a separate readiness decision.
- A tradeoff lab modeling thresholds, extraction error, overrides, specialist capacity, and queue wait.
- Product artifacts covering discovery, prioritization, metrics, safety, research, experiments, rollout, economics, and retrospective learning.

## Evaluation finding

The rules baseline reaches 100% exact match on gated tuned cases but only 40% exact match on held-out cases and catches 0% of held-out P0 cases. It misses unfamiliar phrasing such as a stolen wallet, implicit unauthorized spending, a rejected payment close to its deadline, and unsolicited password-reset activity.

The correct conclusion is not that the system is mostly accurate. The conclusion is that keyword rules overfit and are not ready to control customer routing. The next investment should test a stronger extractor while retaining deterministic safety policy and a rules-based backstop.

## Product decisions

- Safety overrides take precedence over the weighted score.
- Human requests and repeated automation failure change the channel without falsely increasing severity.
- Low-confidence or unsupported-language cases defer to humans.
- A single clarifying question is preferred to guessing when a safe key fact is missing.
- Specialist capacity changes a P0 live transfer into a simulated priority callback.
- Every failure remains visible; known gaps are not removed from reported results.
- CI protects against regression, while held-out readiness determines whether to recommend the next controlled stage.

## Metrics

The North Star is **time to appropriate resolution without a repeat contact within seven days**. Input metrics include correct first route, transfers, handoff completeness, and time to a P0 specialist. Guardrails include P0 recall, high-confidence error, repeat contact, non-fraud work in the fraud queue, customer-request compliance, language and channel disparities, and queue utilization.

## Rollout recommendation

1. Validate the problem and handoff with customers and specialists.
2. Build an adjudicated, de-identified evaluation dataset.
3. Run candidate extractors in replay and shadow modes.
4. Introduce specialist-assisted recommendations with correction capture.
5. Automate only pre-approved, high-confidence P2 slices.
6. Expand by intent only after safety, experience, fairness, capacity, monitoring, and rollback gates remain healthy.

## What I would validate next

- Interview customers who recently experienced transfers or late escalation.
- Observe fraud, billing, and product-support specialists completing intake.
- Have two specialists independently label owner, priority, route, and handoff requirements; adjudicate disagreements.
- Establish current correct-first-route, transfer, repeat-contact, resolution, and queue-time baselines.
- Run the optional candidate extractor three times on the locked held-out set and measure consistency.
- Test whether the handoff reduces time to first meaningful specialist action without increasing automation bias.

## What this demonstrates

The project demonstrates problem framing, scope control, hybrid AI-policy architecture, asymmetric-error thinking, evaluation design, confidence policy, human handoff, responsible AI, operational capacity, experimentation, rollout, failure analysis, and honest communication of uncertainty.

