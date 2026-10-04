import { DEFAULT_THRESHOLDS, DEMO_SCENARIOS, evaluateCases, routeRequest } from "./router.js";

const $ = selector => document.querySelector(selector);
const message = $("#message");
const clarify = $("#clarify-threshold");
const auto = $("#auto-threshold");
let cases = [];

const percent = value => `${Math.round(value * 100)}%`;
const label = value => value === "support" ? "Product support" : value === "ai" ? "AI" : value.charAt(0).toUpperCase() + value.slice(1);

function thresholds() {
  const clarifyValue = Number(clarify.value) / 100;
  const autoValue = Math.max(Number(auto.value) / 100, clarifyValue + 0.05);
  auto.value = String(Math.round(autoValue * 100));
  $("#clarify-value").value = percent(clarifyValue);
  $("#auto-value").value = percent(autoValue);
  return { clarify: clarifyValue, auto: autoValue };
}

function factorRow(name, value, weight) {
  const width = (value / 3) * 100;
  return `<div class="factor"><div><span>${name}</span><strong>${value}/3 · ${weight}%</strong></div><div class="factor-track"><i style="width:${width}%"></i></div></div>`;
}

function renderDecision() {
  const decision = routeRequest(message.value, thresholds());
  $("#decision-subtitle").textContent = `${decision.team} ownership · ${percent(decision.confidence)} confidence proxy`;
  $("#priority").textContent = decision.severity;
  $("#route").textContent = decision.route;
  $("#reason").textContent = decision.reason;
  $("#score").textContent = decision.riskScore;
  $("#score-ring").style.setProperty("--score", `${decision.riskScore * 3.6}deg`);
  $("#intent").textContent = label(decision.intent);
  $("#confidence").textContent = percent(decision.confidence);
  $("#mode").textContent = label(decision.mode);
  $("#decision-hero").dataset.priority = decision.severity;
  $("#signals").innerHTML = (decision.signals.length ? decision.signals : ["no reliable signal"]).map(item => `<span>${item}</span>`).join("");

  const overrideText = [
    ...decision.overrides.safety.map(item => `Safety: ${item}`),
    decision.overrides.humanRequested ? "Customer requested a human" : null,
    decision.overrides.repeatedFailure ? "Two-attempt limit reached" : null
  ].filter(Boolean);
  const override = $("#override");
  override.hidden = !overrideText.length;
  override.innerHTML = overrideText.length ? `<strong>Override applied</strong><p>${overrideText.join(" · ")}</p>` : "";

  $("#factor-list").innerHTML = [
    factorRow("Potential harm", decision.factors.harm, 35),
    factorRow("Time sensitivity", decision.factors.time, 30),
    factorRow("Customer blockage", decision.factors.blockage, 25),
    factorRow("Failed attempts", decision.factors.attempts, 10)
  ].join("");

  const handoffFields = [
    ["Issue", decision.handoff.issue],
    ["Assigned team", decision.handoff.assignedTeam],
    ["Severity", decision.handoff.severity],
    ["Facts gathered", decision.handoff.facts],
    ["Decision rationale", decision.handoff.rationale],
    ["Recommended next step", decision.handoff.nextStep]
  ];
  $("#handoff").innerHTML = handoffFields.map(([term, description]) => `<div><dt>${term}</dt><dd>${description}</dd></div>`).join("");
  renderEvaluation();
}

function renderEvaluation() {
  if (!cases.length) return;
  const evaluation = evaluateCases(cases, thresholds());
  const metricItems = [
    ["Exact match", percent(evaluation.metrics.exactMatch)],
    ["Intent accuracy", percent(evaluation.metrics.intentAccuracy)],
    ["Priority accuracy", percent(evaluation.metrics.priorityAccuracy)],
    ["Route accuracy", percent(evaluation.metrics.routeAccuracy)],
    ["Safety recall", percent(evaluation.metrics.safetyRecall)],
    ["Automation coverage", percent(evaluation.metrics.automationCoverage)]
  ];
  $("#metrics").innerHTML = metricItems.map(([name, value]) => `<div><span>${name}</span><strong>${value}</strong></div>`).join("");
  $("#eval-rows").innerHTML = evaluation.results.map(result => {
    const expected = `${result.expected.intent} · ${result.expected.priority} · ${result.expected.routeMode}`;
    const actual = `${result.actual.intent} · ${result.actual.severity} · ${result.actual.mode}`;
    return `<tr><td><strong>${result.id}</strong><small>${result.message}</small></td><td>${expected}</td><td>${actual}</td><td><span class="result ${result.pass ? "pass" : "fail"}">${result.pass ? "Pass" : "Review"}</span></td></tr>`;
  }).join("");
  const mismatchCount = evaluation.results.filter(result => !result.pass).length;
  $("#eval-note").textContent = `${evaluation.metrics.total} synthetic cases evaluated at the current thresholds. ${mismatchCount} case${mismatchCount === 1 ? "" : "s"} flagged for review; inspect these failures before increasing automation coverage.`;
}

function buildScenarios() {
  $("#scenario-list").innerHTML = DEMO_SCENARIOS.map((scenario, index) => `<button type="button" data-index="${index}">${scenario.label}</button>`).join("");
  $("#scenario-list").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    message.value = DEMO_SCENARIOS[Number(button.dataset.index)].message;
    document.querySelectorAll("#scenario-list button").forEach(item => item.classList.toggle("active", item === button));
    renderDecision();
  });
}

async function init() {
  buildScenarios();
  message.value = DEMO_SCENARIOS[0].message;
  document.querySelector("#scenario-list button").classList.add("active");
  try {
    const response = await fetch("data/synthetic-cases.json");
    cases = await response.json();
  } catch {
    $("#eval-note").textContent = "Serve the docs folder through a local web server to load the synthetic evaluation dataset.";
  }
  renderDecision();
}

$("#run").addEventListener("click", renderDecision);
[clarify, auto].forEach(input => input.addEventListener("input", renderDecision));
message.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") renderDecision();
});

init();
