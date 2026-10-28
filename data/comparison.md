# Rules vs LLM: same policy, different understanding layer

Both columns use the identical deterministic policy (`decide()` in `docs/app/engine.js`). Only the step that reads the customer's message changes. Synthetic data only; these numbers show the evaluation method, not production performance.

| | Keyword rules | LLM extractor (claude-haiku-5-5) |
| --- | ---: | ---: |
| **Held-out (70 cases, never tuned on)** | | |
| Exact match: team + priority + channel | 32.9% | 91.4% |
| Urgent cases caught (P0 recall) | 4.3% | 100% |
| Reached a human when needed | 53.2% | 95.7% |
| Over-escalation | 17.4% | 4.3% |
| Citation accuracy | 38.1% | 85.7% |
| AI answered a case it should have routed | 7 | 1 |
| **Golden (32 cases, used to tune the rules)** | | |
| Exact match | 87.5% | 90.6% |
| P0 recall | 77.8% | 88.9% |
| **Cost, speed, consistency** | | |
| Latency per ticket (p50 / p95) | <1 ms / <1 ms | 1513 ms / 3257 ms |
| Cost per ticket | $0.00000 | $0.00028 |
| Cost per 10,000 tickets | $0.00 | $2.82 |
| Cost per correctly routed ticket | $0.00000 | $0.00031 |
| Same answer on every run | 100% (deterministic) | 93.1% |
| Urgency flips across runs | none (deterministic) | H7, H63 |
| Held-out readiness gate | **BLOCKED** | **BLOCKED** |

## Held-out results by slice
| Slice | Cases | Rules exact | LLM exact | Rules P0 recall | LLM P0 recall |
| --- | ---: | ---: | ---: | ---: | ---: |
| adversarial | 4 | 25% | 50% | – | – |
| ambiguous | 3 | 33.3% | 100% | 0% | 100% |
| billing | 30 | 43.3% | 90% | 0% | 100% |
| fraud | 20 | 10% | 100% | 5.9% | 100% |
| implicit | 7 | 0% | 100% | 0% | 100% |
| language | 2 | 0% | 100% | 0% | 100% |
| multi-issue | 4 | 0% | 100% | 0% | 100% |
| negation | 3 | 0% | 100% | – | – |
| no-source | 3 | 0% | 66.7% | – | – |
| product | 17 | 29.4% | 82.4% | – | – |
| typos | 2 | 50% | 100% | 50% | 100% |
| unclear | 3 | 100% | 100% | – | – |

## What changed case by case

- **Fixed by the LLM (45):** K1, K2, K3, H1, H2, H5, H7, H8, H9, H11, H12, H13, H14, H15, H17, H18, H19, H21, H24, H25, H26, H27, H29, H30, H33, H39, H42, H44, H45, H20, H49, H50, H51, H52, H56, H57, H58, H59, H60, H61, H63, H64, H65, H66, H70
- **Broken by the LLM (3):** C9 (expected product P2 ai_chat, got billing P2 ai_chat); E2 (expected product P2 expert_chat, got billing P2 expert_chat); H31 (expected billing P1 case_followup, got billing P2 ai_chat)

A regression on a case the rules already handled is a launch blocker even if the totals improve.

## How to read this

- **P0 recall is the deciding number.** A missed urgent case (a stolen card treated as routine) costs more than any amount of convenience elsewhere.
- **Cost per correctly routed ticket** beats cost per ticket: a cheap extractor that misroutes is expensive once rework and specialist time are counted.
- **Consistency** matters because the same message must get the same priority. An urgency flip means two identical customers could be treated differently.
