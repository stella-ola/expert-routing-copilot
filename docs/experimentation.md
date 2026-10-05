# Experimentation Plan

## Learning agenda

The first experiments should reduce uncertainty about the problem and policy, not merely optimize clicks. The core questions are whether customers and specialists experience the proposed pain, whether the handoff has the right information, and which confidence policy balances safety with useful automation.

## Experiment sequence

### 1. Problem validation

**Hypothesis:** incorrect routing, late escalation, and repeated intake materially increase customer and specialist effort.

- Method: customer interviews, support-journey review, specialist observation, and transfer-reason analysis.
- Success signal: consistent evidence across qualitative and operational sources.
- Decision: refine the problem or stop if routing is not a meaningful cause of delay.

### 2. Handoff usability

**Hypothesis:** the proposed summary lets specialists begin without repeating core intake.

- Method: give specialists synthetic handoffs and ask them to start a case while thinking aloud.
- Primary measure: required-field completeness and time to identify next action.
- Guardrail: no unnecessary sensitive fields.
- Decision: revise schema before model or integration work.

### 3. Shadow routing

**Hypothesis:** the policy can match expert decisions on eligible cases without affecting customers.

- Method: run recommendations beside the current workflow; hide them from agents initially.
- Primary measure: adjudicated route agreement by intent and severity.
- Guardrails: P0 safety recall, high-confidence error, slice disparities.
- Decision: move only passing low-risk slices to assisted mode.

### 4. Specialist-assisted pilot

**Hypothesis:** visible recommendations and summaries reduce specialist intake effort without creating automation bias.

- Design: use contact-level randomization for handoff usability measures that do not materially change shared queues. Use a balanced switchback design by time block for queue time and end-to-end resolution, because treatment and control share specialist capacity and can interfere with each other.
- Primary outcome: time from assignment to first meaningful action.
- Secondary outcomes: correction rate, handoff completeness, repeat-intake rate.
- Guardrails: safety incidents, queue time, agent-reported trust, customer complaints.

### 5. Limited customer-facing automation

**Hypothesis:** high-confidence P2 support requests can be resolved faster without reducing safe resolution or satisfaction.

- Population: pre-approved, reversible P2 intents only.
- Treatment: AI self-service with clear human opt-out.
- Primary outcome: appropriate resolution time.
- Guardrails: reopen rate, human-request compliance, escalation delay, high-confidence errors.

## Analysis rules

- Define eligibility, sample size, duration, and stopping rules before launch.
- Randomize at a level that avoids cross-treatment contamination.
- Preserve a small long-term holdout after the main pilot to test whether gains persist and whether teams adapt around the product.
- Report intent, severity, channel, and customer slices rather than only an aggregate.
- Treat safety metrics as gates, not tradeable secondary outcomes.
- Do not claim causality from the current synthetic simulator.

## Threshold experiment

The simulator’s adjustable confidence bands show the expected tradeoff: lowering the auto threshold may increase automation coverage while increasing incorrect routes; raising it may reduce error while increasing clarification and human load. A real decision would use calibrated confidence, error costs, queue capacity, and confidence intervals.
