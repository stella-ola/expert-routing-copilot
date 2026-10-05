# Two Minute Demo Script

## 0:00 to 0:15 Introduce the problem

“Expert Routing Copilot explores how a support system can decide who owns a customer issue, how urgent it is, and whether AI or a human should handle it. All data and results are synthetic.”

Show the **Route a message** tab.

## 0:15 to 0:40 Show routine automation

Choose **Payment within window** or a routine product-support scenario.

“The system extracts structured facts, calculates contextual risk, and selects AI guidance only when the case is low risk and sufficiently understood. The trace shows every decision.”

Point to the factor table and handoff prepared in case the customer escalates.

## 0:40 to 1:05 Show a safety override

Choose **Stolen card, new charges**.

“This customer reports a stolen card and active charges. The numeric score is visible, but the safety rule independently requires P0. With capacity available, the route is a live fraud specialist.”

Change specialist capacity to **Constrained**.

“Capacity changes the channel to the simulated priority-callback path, not the priority. A real urgent SLA would require operations approval.”

## 1:05 to 1:25 Show privacy and integrity controls

Choose **Card number typed**.

“Sensitive number patterns are removed before extraction, display, or any optional model call.”

Choose **Prompt injection**.

“Customer text cannot set its own priority. The attempted instruction is flagged, and the request is routed on the actual product question.”

## 1:25 to 1:45 Show evaluation

Open **Eval results**.

“The tuned baseline looks strong on its golden set and fails badly on the held-out set: 40% exact match and zero held-out urgent-case recall. The project keeps those failures visible. CI prevents regressions, but readiness remains blocked.”

Highlight a stolen-wallet or implicit-fraud miss.

## 1:45 to 2:00 Show the tradeoff and conclusion

Open **Tradeoff lab** and move the P0 threshold or turn safety overrides off.

“A lower threshold increases live load; a higher threshold misses urgent customers. The conclusion is not ‘automate more.’ It is to validate the policy, improve the understanding layer, and advance from shadow to assisted use only after held-out safety, capacity, customer, and governance gates pass.”

## Recording checklist

- Keep the recording between 90 and 120 seconds.
- Zoom so the decision trace and eval result remain readable.
- Do not enter real customer or financial information.
- State “synthetic” in the first and final sentence.
- Link the final video near the top of the README after reviewing it for accidental notifications or personal information.
