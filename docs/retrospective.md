# What v0 got wrong

The first prototype (kept in [`archive/original-simulator/`](../archive/original-simulator/)) looked finished. Reviewing it against its own spec showed it wasn't. Writing this down because the gaps taught more than the demo did.

## The gaps

| v0 behavior | Why it's a problem | v1 fix |
| --- | --- | --- |
| Risk scores were hardcoded per route (90, 82, 48, 18) | The spec defines a weighted formula. v0 displayed a score the formula would never produce: the P1 factors shown (2, 1, 1, 0) compute to 41.7, but the UI said 48; P2 factors compute to 8.3, UI said 18. A reviewer who checks the math stops trusting everything else. | Score computed from factors every time; the UI shows the points each factor contributes |
| Any mention of "unrecognized" was P0 | The spec's own test case (small unfamiliar charge from last month) should be P1. v0 would have failed it. | Timing is a separate signal; old unrecognized charges score P1 |
| No failed-attempts input, no "ask for a human" handling | Two of the spec's overrides couldn't be demonstrated | Attempts control, human-request detection, both shown in the trace |
| No confidence | The channel policy depends on "AI confident," but nothing measured it | Confidence from evidence strength minus ambiguity; low confidence brings in a human |
| No capacity input | "Priority callback when capacity is constrained" was unreachable | Capacity control; P0 switches to callback |
| Customer-typed card numbers passed straight through | Handoff and logs would contain sensitive data | Redaction before anything else |
| Six test scenarios, run by eye | No way to know if a change broke something | 32-case golden set, 10-case held-out set, CI gate |
| Same logic duplicated in React and in plain HTML | The two copies could drift | One engine module used by the page and the eval runner |

## Lessons

1. **Prototype the logic, not just the screen.** A convincing UI over hardcoded outputs proves the layout, not the product.
2. **Test the spec against itself.** Running the spec's own scenarios through v0 surfaced the gaps in an afternoon.
3. **A number that matches nothing is worse than no number.** Showing a precise-looking score that doesn't follow the published formula undermines the formula.
4. **Tuning is not evaluating.** v1's rules scored 100% on the cases used to build them and 40% on new ones. Without a held-out set I would have shipped a false sense of quality.

## What the combined version adds

The first portfolio upgrade corrected the hardcoded logic and added confidence bands, human-request handling, visible safety overrides, a structured handoff, a small synthetic evaluation set, and a full set of PM artifacts. The combined version keeps those strengths and adds:

- one shared engine for the simulator and eval runner;
- sensitive-number redaction before extraction or display;
- explicit authentication, failed-attempt, and capacity context;
- 32 golden cases plus 10 locked held-out cases;
- adversarial, language, negation, ambiguity, and implicit-fraud tests;
- a CI regression gate that is explicitly separated from readiness;
- a tradeoff lab for threshold, extraction-error, capacity, and override assumptions;
- an optional LLM extractor behind the same deterministic policy;
- a pre-mortem, operational economics, portfolio case study, and demo narrative.

## What remains unproven

- The frequency, severity, and business impact of the routing problem.
- Whether customers and specialists understand and trust the experience.
- Whether the taxonomy and labels match expert judgment.
- Whether the weights, thresholds, callback policy, and handoff fields improve real outcomes.
- Whether an LLM or another extractor clears readiness consistently across repeated runs and customer slices.
- Real calibration, robustness, fairness, drift, queue impact, adoption, and causal business outcomes.

## Recommendation

Do not tune the rules to the held-out cases. Keep them locked, run candidate extractors through the same policy, and advance only to shadow mode after the readiness criteria, governance reviews, monitoring, human fallback, and rollback controls are in place.
