import test from "node:test";
import assert from "node:assert/strict";
import { decide, extractFeatures, route, evaluate } from "../docs/app/engine.js";
import { POLICIES, retrievePolicy } from "../docs/app/policies.js";
import { toFeatures, llmExtract } from "../evals/llm-extractor.mjs";

test("AI answers in chat cite an approved article", () => {
  const { decision } = route("How do I redeem my cash back points?");
  assert.equal(decision.channel, "ai_chat");
  assert.equal(decision.citation.id, "POL-REW-01");
  assert.match(decision.reply, /\[Source: POL-REW-01/);
});

test("no source, no answer: an uncovered question goes to a person", () => {
  const f = extractFeatures("How do I redeem my cash back points?");
  f.policyId = null; // an extractor that found no article
  const d = decide(f);
  assert.equal(d.channel, "expert_chat");
  assert.equal(d.citation, null);
  assert.equal(d.priority, "P2", "grounding changes the channel, never the severity");
});

test("an invented article ID from the model is treated as no source", () => {
  const f = toFeatures({ category: "product", confidence: 0.9, flags: {}, policyId: "POL-MADE-UP" }, { safeText: "x" });
  assert.equal(f.policyId, null);
  assert.equal(decide(f).channel, "expert_chat");
});

test("escalated cases never carry a citation", () => {
  const { decision } = route("My card was stolen an hour ago.");
  assert.equal(decision.priority, "P0");
  assert.equal(decision.citation, null);
});

test("every article has a unique ID and an answer", () => {
  const ids = POLICIES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of POLICIES) assert.ok(p.answer.length > 40, p.id);
  assert.equal(retrievePolicy("completely unrelated words"), null);
});

test("citation accuracy is scored separately from exact match", () => {
  const set = [{ id: "T1", tags: ["t"], message: "How can I set up autopay?", expect: { team: "product", priority: "P2", channel: "ai_chat", citation: "POL-REW-01" } }];
  const { summary, rows } = evaluate(set);
  assert.equal(rows[0].ok.all, true);
  assert.equal(rows[0].ok.citation, false);
  assert.equal(summary.citationAccuracy, 0);
  assert.equal(summary.wrongSourceAnswers, 1);
});

test("malformed model output fails safe and is counted", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: "sorry, here is my answer" }], usage: { input_tokens: 1000, output_tokens: 20 } }) });
  try {
    const f = await llmExtract("My card was stolen", { apiKey: "test", model: "claude-haiku-5-5" });
    assert.equal(f.meta.parseError, true);
    assert.equal(f.category, "unclear");
    assert.ok(f.meta.costUsd > 0);
    assert.notEqual(decide(f).channel, "ai_chat", "broken output must never produce a confident AI answer");
  } finally {
    globalThis.fetch = realFetch;
  }
});
