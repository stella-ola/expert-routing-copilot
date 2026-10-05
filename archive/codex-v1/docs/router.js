export const DEFAULT_THRESHOLDS = Object.freeze({ clarify: 0.60, auto: 0.85 });

export const DEMO_SCENARIOS = Object.freeze([
  { id: "active-fraud", label: "Active fraud", message: "My card was stolen an hour ago and I see two new charges I did not make. Please help." },
  { id: "billing-delay", label: "Missing payment", message: "My payment still has not posted after the expected processing window." },
  { id: "routine-support", label: "Autopay setup", message: "How do I set up autopay in the mobile app?" },
  { id: "failed-support", label: "AI failed twice", message: "I tried the password reset twice and it still does not work. I need a person." },
  { id: "ambiguous", label: "Ambiguous request", message: "Something is wrong with my account and I need help." }
]);

const INTENT_SIGNALS = {
  fraud: [
    [/stolen|lost card|card.*missing/i, 6, "lost or stolen card"],
    [/unauthori[sz]ed|unrecognized|unfamiliar charge/i, 5, "unrecognized activity"],
    [/hacked|account takeover|compromis/i, 6, "account compromise"],
    [/fraud/i, 4, "fraud language"]
  ],
  billing: [
    [/payment/i, 2, "payment"],
    [/not posted|processing window/i, 5, "posting timeline"],
    [/refund/i, 4, "refund"],
    [/duplicate/i, 4, "duplicate charge"],
    [/incorrect fee|late fee|interest charge|statement|balance/i, 4, "billing detail"],
    [/declin|fail/i, 3, "payment failure"]
  ],
  support: [
    [/password|log.?in|sign.?in/i, 5, "account access help"],
    [/autopay/i, 5, "autopay"],
    [/rewards?|points/i, 4, "rewards"],
    [/mobile app|navigation|where (?:can|do) i/i, 3, "app navigation"],
    [/set up|how (?:can|do) i|card feature/i, 3, "how-to request"]
  ]
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = value => Math.round(value * 100) / 100;

export function classifyIntent(message) {
  const scores = { fraud: 0, billing: 0, support: 0 };
  const signals = [];
  for (const [intent, patterns] of Object.entries(INTENT_SIGNALS)) {
    for (const [pattern, weight, label] of patterns) {
      if (pattern.test(message)) {
        scores[intent] += weight;
        signals.push({ intent, label, weight });
      }
    }
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [intent, topScore] = ranked[0];
  const secondScore = ranked[1][1];
  if (topScore === 0) return { intent: "unknown", confidence: 0.35, scores, signals: [] };
  const ambiguityPenalty = secondScore >= topScore * 0.75 ? 0.16 : 0;
  const confidence = clamp(0.53 + topScore * 0.055 + (topScore - secondScore) * 0.012 - ambiguityPenalty, 0.35, 0.97);
  return { intent, confidence: round(confidence), scores, signals };
}

export function deriveRiskFactors(message) {
  const text = message.toLowerCase();
  let harm = 0;
  let time = 0;
  let blockage = 0;
  let attempts = 0;

  if (/stolen|account takeover|hacked|new charges|active unauthori[sz]ed/.test(text)) harm = 3;
  else if (/unrecognized|unfamiliar|penalty|late fee|hardship|duplicate/.test(text)) harm = 2;
  else if (/payment|refund|fee|interest|locked/.test(text)) harm = 1;

  if (/right now|immediately|today|hour ago|new charges|currently|asap/.test(text)) time = 3;
  else if (/soon|approaching|tomorrow|deadline/.test(text)) time = 2;
  else if (/after the expected|last month|still|waiting/.test(text)) time = 1;

  if (/cannot access|can't access|account takeover|stolen|payment.*(?:fail|declin)|locked out/.test(text)) blockage = 3;
  else if (/does not work|doesn't work|unable|blocked/.test(text)) blockage = 2;
  else if (/help|issue|problem|not posted|missing/.test(text)) blockage = 1;

  const attemptMatch = text.match(/(?:tried|failed|attempt(?:ed|s)?)\D{0,12}(\d|one|two|three)/);
  const wordNumber = { one: 1, two: 2, three: 3 };
  if (attemptMatch) attempts = clamp(Number(attemptMatch[1]) || wordNumber[attemptMatch[1]] || 0, 0, 3);
  if (/twice/.test(text)) attempts = Math.max(attempts, 2);

  return { harm, time, blockage, attempts };
}

export function calculateRiskScore(factors) {
  return Math.round((factors.harm / 3) * 35 + (factors.time / 3) * 30 + (factors.blockage / 3) * 25 + (factors.attempts / 3) * 10);
}

function findOverrides(message, factors) {
  const text = message.toLowerCase();
  const safety = [];
  if (/stolen|lost card/.test(text) && /charge|transaction|exposure/.test(text)) safety.push("lost card with possible exposure");
  if (/account takeover|hacked|compromis/.test(text)) safety.push("possible account takeover");
  if (/new charges|active unauthori[sz]ed|right now.*charge/.test(text)) safety.push("possible active unauthorized activity");
  if (/(payment.*(?:fail|declin)|due today).*(late fee|penalty)|(?:late fee|penalty).*(today|payment)/.test(text)) safety.push("imminent financial harm");
  const humanRequested = /human|person|agent|representative|someone|call me/.test(text);
  const repeatedFailure = factors.attempts >= 2;
  return { safety, humanRequested, repeatedFailure };
}

function severityFor(intent, score, message) {
  if (score >= 70) return "P0";
  if (score >= 35) return "P1";
  if (intent === "fraud") return "P1";
  if (intent === "billing" && /not posted|missing refund|incorrect fee|duplicate|interest charge/i.test(message)) return "P1";
  return "P2";
}

function routeFor({ intent, severity, confidence, overrides, thresholds }) {
  if (overrides.safety.length) return { route: "Live specialist", mode: "human", reason: "Safety override takes precedence over score and confidence." };
  if (overrides.humanRequested) return { route: "Human support", mode: "human", reason: "The customer explicitly requested a person." };
  if (overrides.repeatedFailure) return { route: "Expert chat", mode: "human", reason: "Two failed automation attempts triggered handoff." };
  if (confidence < thresholds.clarify) return { route: "Human triage", mode: "human", reason: "Confidence is below the clarify threshold." };
  if (confidence < thresholds.auto) return { route: "Ask a clarifying question", mode: "clarify", reason: "Confidence is not high enough to route automatically." };
  if (severity === "P0") return { route: "Live specialist", mode: "human", reason: "P0 urgency requires synchronous human handling." };
  if (severity === "P1") return { route: `${intent === "unknown" ? "Specialist" : title(intent)} case`, mode: "case", reason: "Investigation is needed, but immediate live handling is not required." };
  if (intent === "support" || intent === "billing") return { route: "AI self-service", mode: "ai", reason: "The request is low risk and confidence exceeds the auto-route threshold." };
  return { route: "Human triage", mode: "human", reason: "No safe automated path is available." };
}

const title = value => value.charAt(0).toUpperCase() + value.slice(1);

export function routeRequest(message, thresholds = DEFAULT_THRESHOLDS) {
  const clean = String(message || "").trim();
  const classification = classifyIntent(clean);
  const factors = deriveRiskFactors(clean);
  const score = calculateRiskScore(factors);
  const overrides = findOverrides(clean, factors);
  const severity = overrides.safety.length ? "P0" : severityFor(classification.intent, score, clean);
  const decision = routeFor({ intent: classification.intent, severity, confidence: classification.confidence, overrides, thresholds });
  const team = classification.intent === "unknown" ? "General support" : title(classification.intent);
  return {
    message: clean,
    intent: classification.intent,
    team,
    confidence: classification.confidence,
    intentScores: classification.scores,
    signals: classification.signals.map(signal => signal.label),
    factors,
    riskScore: score,
    severity,
    overrides,
    ...decision,
    thresholds,
    handoff: {
      issue: clean || "No message supplied",
      assignedTeam: team,
      severity: `${severity} · ${score}/100`,
      facts: classification.signals.map(signal => signal.label).join(", ") || "No reliable intent signals detected",
      rationale: decision.reason,
      nextStep: decision.route
    }
  };
}

export function evaluateCases(cases, thresholds = DEFAULT_THRESHOLDS) {
  const results = cases.map(testCase => {
    const actual = routeRequest(testCase.message, thresholds);
    const checks = {
      intent: actual.intent === testCase.expected.intent,
      priority: actual.severity === testCase.expected.priority,
      routeMode: actual.mode === testCase.expected.routeMode
    };
    return { ...testCase, actual, checks, pass: Object.values(checks).every(Boolean) };
  });
  const count = results.length || 1;
  const accuracy = key => results.filter(result => result.checks[key]).length / count;
  const safetyCases = results.filter(result => result.tags?.includes("safety-critical"));
  const safetyRecall = safetyCases.length ? safetyCases.filter(result => result.actual.mode === "human" && result.actual.severity === "P0").length / safetyCases.length : 1;
  const automationCoverage = results.filter(result => ["ai", "case"].includes(result.actual.mode)).length / count;
  return {
    results,
    metrics: {
      total: results.length,
      exactMatch: results.filter(result => result.pass).length / count,
      intentAccuracy: accuracy("intent"),
      priorityAccuracy: accuracy("priority"),
      routeAccuracy: accuracy("routeMode"),
      safetyRecall,
      automationCoverage
    }
  };
}
