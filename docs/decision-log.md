# Product Decision Log

The log records the reasoning behind material choices. Dates below reflect the portfolio build date, not historical company decisions.

| Date | Decision | Alternatives | Rationale | Revisit when |
| --- | --- | --- | --- | --- |
| 2026-10-04 | Use a fictional credit-card support setting and synthetic data only. | Use real examples or employer data. | Demonstrates the workflow without privacy, confidentiality, or unsupported performance claims. | An approved partner and governed dataset exist. |
| 2026-10-04 | Preserve the uploaded four-branch demo as the original prototype. | Replace it silently. | Shows iteration and protects Stella’s existing work. | Never; archival record remains. |
| 2026-10-04 | Separate intent, severity, and handling mode. | Treat “route” as one label. | The same intent can require different urgency and channels; separation improves evaluation and policy clarity. | Evidence shows a different decision decomposition works better. |
| 2026-10-04 | Use a transparent heuristic instead of presenting it as trained AI. | Call keyword rules an AI model. | Avoids misleading claims and makes product policy auditable. | A real calibrated model is built and evaluated. |
| 2026-10-04 | Make confidence thresholds adjustable. | Hard-code one value. | Lets reviewers explore coverage-versus-error tradeoffs and see thresholds as product decisions. | Thresholds are approved and managed by policy service. |
| 2026-10-04 | Safety, human request, and two failed attempts override confidence. | Let the confidence score decide every case. | High-risk and customer-agency policies should not depend on a probabilistic output. | Domain, legal, and operations review changes the policy. |
| 2026-10-04 | Keep P1 cases asynchronous where appropriate. | Send every non-P2 case live. | Protects urgent queue capacity while preserving specialist investigation. | Queue data or customer outcomes show live handling is required. |
| 2026-10-04 | Include failing eval cases in the portfolio. | Tune the demo until every case passes. | Honest failure analysis demonstrates evaluation judgment and prevents a misleading showcase. | Failures are fixed; new challenge cases replace them. |
| 2026-10-04 | Define the North Star as appropriate resolution time. | Use raw automation rate or raw resolution time. | The product should not optimize speed or deflection at the expense of correctness and safety. | Research shows another outcome better represents value. |

## Open decisions

- Intent-specific rather than global confidence thresholds.
- Whether low-confidence P1 cases should clarify first or go directly to specialists.
- Which customer-vulnerability signals may be used and under what governance.
- How queue capacity should influence channel without disadvantaging urgent cases.
- What counts as a completed resolution for multi-day investigations.

