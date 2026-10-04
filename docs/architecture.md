# Architecture and Decision Flow

## Prototype architecture

```mermaid
flowchart TD
    UI["Static client interface"] --> CL["Transparent intent heuristic"]
    UI --> RF["Risk factor extraction"]
    CL --> CP["Confidence policy"]
    RF --> RS["Weighted risk score"]
    UI --> OV["Safety and human overrides"]
    CP --> RE["Routing engine"]
    RS --> RE
    OV --> RE
    RE --> HC["Handoff card"]
    RE --> EV["Synthetic evaluation"]
    DS["Versioned synthetic cases"] --> EV
```

The entire prototype runs in the browser and sends no data to a server. The heuristic is intentionally readable so the portfolio focuses on product decisions. A production system would replace or supplement it with authenticated context, approved knowledge, monitored models, policy services, case management, and audit logging.

## Decision precedence

```mermaid
flowchart TD
    A["Request received"] --> B{"Safety override?"}
    B -- Yes --> C["P0 human route"]
    B -- No --> D{"Customer asked for human?"}
    D -- Yes --> E["Human support"]
    D -- No --> F{"Two failed attempts?"}
    F -- Yes --> G["Expert chat"]
    F -- No --> H{"Confidence below low threshold?"}
    H -- Yes --> I["Human triage"]
    H -- No --> J{"Confidence below auto threshold?"}
    J -- Yes --> K["Clarifying question"]
    J -- No --> L{"Severity"}
    L -- P0 --> C
    L -- P1 --> M["Managed specialist case"]
    L -- P2 --> N["AI self-service"]
```

## Production evolution

| Prototype component | Production evolution | Required control |
| --- | --- | --- |
| Keyword heuristic | Calibrated intent and risk models plus deterministic policies | Model registry, versioning, calibration, drift monitoring |
| Browser-only factors | Authenticated account and event context | Least-privilege access and data minimization |
| Static handoff | Case-management integration | Schema validation, audit log, specialist feedback |
| Synthetic eval set | Curated, de-identified, consented evaluation data | Governance, slice analysis, refresh cadence |
| Adjustable thresholds | Policy configuration service | Approval workflow, rollback, shadow evaluation |

## Audit record for a real system

Each decision should record a request ID, timestamp, policy and model versions, predicted intent, calibrated confidence, extracted risk factors, score, override, selected route, human corrections, and final outcome. Sensitive free text should be minimized or tokenized according to an approved retention policy.

