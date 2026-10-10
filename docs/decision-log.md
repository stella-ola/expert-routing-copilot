# Decision log

Each entry: the decision, the options, what I chose, and what I gave up. Format adapted from architecture decision records.

---

### D1. The AI understands; the policy decides <a id="d1"></a>

**Context.** The fastest build is to ask an LLM "what priority and route is this?" and use the answer.

| Option | For | Against |
| --- | --- | --- |
| A. LLM decides priority and route end to end | Least code; handles nuance | Can't guarantee P0 behavior; hard to audit; a prompt change silently changes policy; vulnerable to prompt injection deciding queue position |
| B. LLM extracts facts; deterministic policy decides | Policy is versioned, testable, explainable to compliance; extractor can be swapped and evaluated independently | More moving parts; the policy can be wrong in rigid ways |
| C. Rules only | Fully transparent | Poor generalization (held-out: 0% P0 recall) |

**Chose B.** Rules extractor in v1 as a transparent baseline; LLM extractor in v1.1 behind the same policy.

**Gave up:** some nuance the LLM could apply directly. Accepted because "why was this customer P0?" must have an answer a regulator and a specialist can both read.

---

### D2. Safety overrides beat the weighted score

**Context.** The weighted score can land a stolen card at 60 (P1) if the extractor underestimates one factor.

**Chose:** a short, explicit list of conditions that are always P0, applied after scoring.

**Gave up:** elegance. Two mechanisms instead of one. The tradeoff lab shows why: at a P0 threshold of 80, missed urgent cases are about 3% with overrides and about 42% without.

---

### D3. Human overrides change the channel, not the severity

**Context.** The original spec sent "two failed attempts" and "asked for a human" to live transfer.

**Chose:** escalate to a human, but keep severity honest. A password question after two failed tries is still P2; it goes to expert chat, not a live phone queue.

**Gave up:** the simplicity of "any escalation = live." Accepted because routing P2 work into live queues raises wait times for P0 customers, the people overrides exist to protect.

---

### D4. Safety-first tie-break between fraud and billing

**Context.** "I don't recognize this $95 fee" has equal fraud and billing evidence.

**Chose:** when evidence ties, prefer fraud, and mark the contact low-confidence so a human reviews it.

**Gave up:** fraud team time. Known gap K2 in the evals documents the cost. Guardrail: non-fraud work must stay under 10% of the fraud queue; if it rises, revisit.

---

### D5. Ask one clarifying question instead of guessing

**Context.** "My payment hasn't posted" can't be scored without knowing when it was sent.

**Chose:** for P2-level ambiguity, the AI asks one targeted question ("When did you send it?").

**Gave up:** one conversational turn. Rejected the alternative (default to P1 case) because it would flood billing with payments that are simply still in flight. Never applied when there are fraud or deadline signals.

---

### D6. Gate launch on P0 recall = 100%, not on accuracy

**Context.** A single accuracy number hides the costly error.

**Chose:** two gates: P0 recall 100% and exact match ≥ 90% on the gated golden set, plus held-out results reported on every run. CI fails the build if a gate fails.

**Gave up:** speed. A change that improves 20 routine cases and breaks one urgent case does not ship.

---

### D7. Hold out a test set and never tune on it

**Context.** After tuning the rules, the golden set scored 100% (excluding known gaps).

**Chose:** write a separate held-out set after tuning, and report it without changing the rules. Result: 40% exact match, 0% P0 recall.

**Gave up:** a nicer number in the README. Kept the honest one, because it is the actual finding: keyword rules overfit, and the next investment (LLM extraction) is justified by evidence, not enthusiasm.

---

### D8. Redact before anything else sees the message

**Chose:** strip card numbers and SSNs from the message before extraction, before display, and before any model call.

**Gave up:** the specialist can't see the number the customer typed. Accepted; the specialist verifies identity through the normal secure flow.

---

### D9. Fail safe on unsupported language

**Chose:** if the AI can't read the message, route to a human rather than ask a clarifying question in English.

**Gave up:** severity. These contacts reach a human but aren't prioritized as P0 (known gap K3). Multilingual intake moves up the roadmap because of it.

---

### D10. Priority callback when specialists are saturated

**Chose:** P0 goes to live transfer when capacity is available and priority callback when it isn't.

**Gave up:** immediacy for some urgent customers. The portfolio uses 10 minutes as a simulated operations assumption, not a promise. A real callback SLA must be validated against staffing, harm, and customer outcomes, and the prototype performs no protective account action.

---

### D11. A green regression check is not a launch approval

**Context.** The tuned golden cases pass while held-out P0 recall is 0%. Calling the golden-set check a launch gate could imply the baseline is safe.

**Chose:** separate the automated **regression gate** from the **held-out readiness gate**. CI stays green when established behavior is preserved, while the product recommendation remains explicitly blocked.

**Gave up:** a simpler “tests pass” story. Accepted because product readiness and software regression are different questions.

---

### D12. Keep failures visible

**Chose:** display every golden and held-out miss in the simulator, generated results, README, and failure analysis.

**Gave up:** a perfect-looking demo. Accepted because a strong AI PM portfolio should show how failures change investment and rollout decisions.

---

### D13. Preserve earlier prototypes

**Chose:** retain the original uploaded prototype and the first portfolio simulator under `archive/`.

**Gave up:** a smaller repository. Accepted because the before-and-after evidence demonstrates iteration, makes the retrospective verifiable, and protects Stella’s existing work.

---

### D14. Do not invent production outcomes

**Chose:** label all evaluation, population, queue, cost, SLA, and prioritization numbers as synthetic assumptions or proposed targets.

**Gave up:** stronger-looking business claims. Accepted because the project has not used real customers, specialists, operational data, or production systems.

---

### D15. No source, no answer <a id="d15"></a>

**Context.** In v1 the AI's chat replies were generic text. A support answer about payments, fees, or security is a policy statement; if it's wrong, the customer acts on it.

**Chose:** every answer the AI gives in chat comes from one of twelve approved articles and cites it. If no article answers the question, the case goes to a person (expert chat) at the same severity.

**Gave up:** coverage. Questions the help center doesn't cover (paperless statements, crypto purchases) now reach a person instead of getting a plausible-sounding reply. Accepted because a wrong policy answer is worse than a short wait, and the "no source" rate becomes a measured backlog for the help center.

**Evidence it earns its place.** On the held-out set, the keyword rules misread two urgent cases as routine questions: H30 (hardship, payment due today) and H65 (a charge the customer could not have made). Neither matched an article, so both reached a person instead of getting a guessed answer. The rule caught failures the classifier missed.

---

### D16. Score citations separately from routing

**Chose:** citation accuracy is its own metric, alongside two failure counts: *answered from the wrong article* and *answered in chat when the case needed a specialist or a case*.

**Gave up:** one headline number. Accepted because folding citations into exact match would make v2.1 routing numbers incomparable with v1, and because "confidently wrong" is a different failure from "misrouted." Example: the rules read "I don't remember **signing up** for a subscription" as a sign-in question and answered it with the password article (H13).

---

### D17. Grow the held-out set to 70, written after the rules and retriever were frozen

**Context.** A 10-case held-out set made the v1 finding (40% vs 100%) striking but fragile. One case was worth 10 points.

**Chose:** 60 new held-out cases, each tagged by risk type (implicit fraud, negation, multi-issue, adversarial, other languages, typos, questions with no source). The keyword retriever and the policy articles were written before these cases and were not adjusted after seeing results. Labels come from the written policy, not from what any extractor produced.

**Gave up:** a flattering trend. Held-out exact match for the rules fell from 40% to 32.9%, and P0 recall is 4.3% (1 of 23). Accepted because the larger set is the more honest estimate, and slice results show where the failures concentrate (implicit fraud 0%, multi-issue 0%).

---

### D18. Decide on cost per correct route, not cost per ticket

**Chose:** every eval reports latency, tokens, cost per ticket, and cost per *correctly routed* ticket, plus run-to-run consistency for the LLM.

**Gave up:** the simplest comparison ("rules are free"). Accepted because a free extractor that misses 22 of 23 urgent cases is not cheap once harm, rework, and specialist time are counted. Cost is a tradeoff to show, not a tiebreaker to hide.
