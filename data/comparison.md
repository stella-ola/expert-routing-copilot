# Rules vs LLM: same policy, different understanding layer

Both columns use the identical deterministic policy (`decide()` in `docs/app/engine.js`). Only the step that reads the customer's message changes. Synthetic data only; these numbers show the evaluation method, not production performance.

| | Keyword rules | LLM extractor |
| --- | ---: | ---: |
| **Held-out (70 cases, never tuned on)** | | |
| Exact match: team + priority + channel | 32.9% | _not run yet_ |
| Urgent cases caught (P0 recall) | 4.3% | _not run yet_ |
| Reached a human when needed | 53.2% | _not run yet_ |
| Over-escalation | 17.4% | _not run yet_ |
| Citation accuracy | 38.1% | _not run yet_ |
| AI answered a case it should have routed | 7 | _not run yet_ |
| **Golden (32 cases, used to tune the rules)** | | |
| Exact match | 87.5% | _not run yet_ |
| P0 recall | 77.8% | _not run yet_ |
| **Cost, speed, consistency** | | |
| Latency per ticket (p50 / p95) | <1 ms / <1 ms | _not run yet_ |
| Cost per ticket | $0.00000 | _not run yet_ |
| Cost per 10,000 tickets | $0.00 | _not run yet_ |
| Cost per correctly routed ticket | $0.00000 | _not run yet_ |
| Same answer on every run | 100% (deterministic) | _not run yet_ |
| Urgency flips across runs | none (deterministic) | _not run yet_ |
| Held-out readiness gate | **BLOCKED** | _not run yet_ |

## Held-out results by slice
| Slice | Cases | Rules exact | LLM exact | Rules P0 recall | LLM P0 recall |
| --- | ---: | ---: | ---: | ---: | ---: |
| adversarial | 4 | 25% | _not run yet_ | – | _not run yet_ |
| ambiguous | 3 | 33.3% | _not run yet_ | 0% | _not run yet_ |
| billing | 30 | 43.3% | _not run yet_ | 0% | _not run yet_ |
| fraud | 20 | 10% | _not run yet_ | 5.9% | _not run yet_ |
| implicit | 7 | 0% | _not run yet_ | 0% | _not run yet_ |
| language | 2 | 0% | _not run yet_ | 0% | _not run yet_ |
| multi-issue | 4 | 0% | _not run yet_ | 0% | _not run yet_ |
| negation | 3 | 0% | _not run yet_ | – | _not run yet_ |
| no-source | 3 | 0% | _not run yet_ | – | _not run yet_ |
| product | 17 | 29.4% | _not run yet_ | – | _not run yet_ |
| typos | 2 | 50% | _not run yet_ | 50% | _not run yet_ |
| unclear | 3 | 100% | _not run yet_ | – | _not run yet_ |

## How to fill in the LLM column

```bash
ANTHROPIC_API_KEY=your_key npm run evals:llm   # 102 cases x 3 runs
npm run compare
```

The LLM run calls the API about 306 times. At the default model's listed price this is well under a dollar, but check the price table in `evals/llm-extractor.mjs` first.

## How to read this

- **P0 recall is the deciding number.** A missed urgent case (a stolen card treated as routine) costs more than any amount of convenience elsewhere.
- **Cost per correctly routed ticket** beats cost per ticket: a cheap extractor that misroutes is expensive once rework and specialist time are counted.
- **Consistency** matters because the same message must get the same priority. An urgency flip means two identical customers could be treated differently.
