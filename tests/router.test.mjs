import test from "node:test";
import assert from "node:assert/strict";
import { calculateRiskScore, classifyIntent, routeRequest } from "../docs/router.js";

test("weighted risk score matches the documented formula", () => {
  assert.equal(calculateRiskScore({ harm: 3, time: 3, blockage: 3, attempts: 0 }), 90);
  assert.equal(calculateRiskScore({ harm: 0, time: 0, blockage: 0, attempts: 0 }), 0);
});

test("active fraud receives a P0 human route", () => {
  const result = routeRequest("My card was stolen and I see new charges right now.");
  assert.equal(result.intent, "fraud");
  assert.equal(result.severity, "P0");
  assert.equal(result.mode, "human");
  assert.ok(result.overrides.safety.length > 0);
});

test("explicit human request overrides low-risk automation", () => {
  const result = routeRequest("I need a person to help me set up autopay.");
  assert.equal(result.mode, "human");
  assert.equal(result.overrides.humanRequested, true);
});

test("two failed attempts trigger a handoff", () => {
  const result = routeRequest("I tried the password reset twice and it still does not work.");
  assert.equal(result.overrides.repeatedFailure, true);
  assert.equal(result.mode, "human");
});

test("unknown intent defers to human triage", () => {
  const result = routeRequest("Something is wrong and I need help.");
  assert.equal(result.intent, "unknown");
  assert.equal(result.mode, "human");
});

test("routine support can be handled by AI at high confidence", () => {
  const result = routeRequest("How do I set up autopay in the mobile app?");
  assert.equal(result.intent, "support");
  assert.equal(result.severity, "P2");
  assert.equal(result.mode, "ai");
});

test("intent confidence is a bounded proxy", () => {
  const result = classifyIntent("How do I view rewards points in the mobile app?");
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});
