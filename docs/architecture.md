# Architecture

## System

```mermaid
flowchart LR
    C[Customer message] --> R[Redaction<br/>card numbers, SSNs removed]
    R --> X{Feature extractor}
    X -->|v1| XR[Rules extractor]
    X -->|v1.1| XL[LLM extractor]
    XR --> F[Structured features<br/>category, confidence, flags, timing]
    XL --> F
    F --> S[Risk scoring<br/>harm, time, blockage, attempts]
    S --> P[Routing policy<br/>versioned, deterministic]
    P --> O1[AI resolves in chat]
    P --> O2[AI asks one question]
    P --> O3[Case + async follow-up]
    P --> O4[Expert chat]
    P --> O5[Live specialist]
    P --> O6[Priority callback]
    P --> H[Handoff card + decision trace]
    H --> L[(Decision log<br/>policy + extractor version)]
    L --> M[Metrics + eval dashboards]
```

The split between the extractor (understanding) and the policy (deciding) is the core design choice: the extractor can change (rules, an LLM, a future fine-tuned model) without changing what "urgent" means. Both extractors emit the same feature shape, which also makes the rules extractor the fallback if the LLM is slow or down.

## Routing decision

```mermaid
flowchart TD
    A[Features + context] --> B[Compute risk score 0-100]
    B --> C{Score band}
    C -->|70+| P0[P0]
    C -->|35-69| P1[P1]
    C -->|0-34| P2[P2]
    P1 --> SO{Safety override?<br/>takeover, stolen card,<br/>active fraud, payment failing<br/>against a deadline}
    P2 --> SO
    SO -->|yes| P0
    SO -->|no| HO{Human override?<br/>asked for a person,<br/>2+ failed attempts,<br/>low confidence,<br/>unsupported language}
    P0 --> CAP{Specialist capacity}
    CAP -->|available| LIVE[Live transfer]
    CAP -->|constrained| CB[Priority callback]
    HO -->|yes| EC[Expert chat]
    HO -->|no, P1| CASE[Case + async follow-up]
    HO -->|no, P2| CL{Key fact missing?}
    CL -->|yes| Q[AI asks one question]
    CL -->|no| AI[AI resolves in chat]
```

## Repository map

| Path | What it is |
| --- | --- |
| `docs/index.html` | The simulator (GitHub Pages) |
| `docs/app/engine.js` | Extraction, scoring, policy, evals, and population simulation. One module, used by the page and by Node. |
| `docs/app/golden-set.js` | Golden and held-out eval sets |
| `evals/run-evals.mjs` | Eval runner, regression gate, and held-out readiness assessment |
| `evals/llm-extractor.mjs` | Optional LLM extractor, same output shape |
| `data/` | Generated eval results |
| `archive/original-simulator/` | The original simulator prototype, kept for comparison |
| `archive/codex-v1/` | The first portfolio documentation and site iteration |
| [`retrospective.md`](retrospective.md) | What changed and what was learned |
