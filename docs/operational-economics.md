# Operational Economics

## Purpose

This model shows how routing quality could translate into specialist capacity and cost. Every number below is an adjustable synthetic assumption, not a forecast or claim about a real company.

## Base scenario

| Input | Synthetic assumption |
| --- | ---: |
| Monthly support contacts | 100,000 |
| Contacts with an unnecessary transfer | 25% |
| Additional specialist time per transfer | 6 minutes |
| Illustrative fully loaded specialist cost | $0.80 per minute |
| Unnecessary transfers prevented | 30% |
| Contacts receiving additional human review | 5% |
| Time per additional review | 3 minutes |

## Illustrative calculation

Current unnecessary-transfer workload:

`100,000 × 25% × 6 minutes = 150,000 specialist minutes per month`

Transfer minutes potentially avoided:

`150,000 × 30% = 45,000 minutes`

Illustrative gross efficiency:

`45,000 × $0.80 = $36,000 per month`

Additional review cost:

`100,000 × 5% × 3 minutes × $0.80 = $12,000 per month`

Illustrative net capacity value:

`$36,000 − $12,000 = $24,000 per month`, or `$288,000 annualized`

This result is a scenario output, not a business case approval. It excludes implementation cost, model cost, training, governance, queue effects, error remediation, customer harm, and changes in contact demand.

## Sensitivity model

The useful decision formula is:

`net value = avoided transfers × minutes saved × cost per minute − added reviews × review minutes × cost per minute − operating cost − expected error cost`

Review at least three scenarios:

| Scenario | Routing improvement | Added review | Interpretation |
| --- | ---: | ---: | --- |
| Conservative | 10% | 8% | Learning stage; may consume more capacity than it saves |
| Base | 30% | 5% | Illustrative portfolio calculation above |
| Optimistic | 50% | 3% | Requires strong real-world evidence before planning against it |

## Capacity matters more than deflection

An unnecessary escalation is not free: it adds specialist work and can lengthen urgent queues. But a missed P0 case may create much greater customer and business harm. The product should therefore optimize **appropriate resolution**, not maximize automation or minimize human contact.

The simulator’s tradeoff lab complements this model by showing how thresholds, extraction errors, safety overrides, and live capacity can change missed-urgent cases and queue utilization.

## Data required for a real business case

- Contact volume and mix by intent, severity, language, and channel.
- Transfer rate, transfer reason, and time added per transfer.
- Specialist handle time, occupancy, queue time, callback completion, and labor cost.
- Repeat contact, reopen, complaint, and customer-remediation rates.
- Model, infrastructure, review, training, governance, and incident costs.
- Expected cost of false escalation, delayed investigation, and missed urgent cases.

Finance, operations, risk, and domain owners should approve inputs before the model informs staffing or investment.

