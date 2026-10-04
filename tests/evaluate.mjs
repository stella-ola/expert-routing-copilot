import { readFile } from "node:fs/promises";
import { evaluateCases } from "../docs/router.js";

const cases = JSON.parse(await readFile(new URL("../docs/data/synthetic-cases.json", import.meta.url), "utf8"));
const evaluation = evaluateCases(cases);
const pct = value => `${Math.round(value * 100)}%`;

console.log("Synthetic evaluation — heuristic prototype only\n");
for (const [key, value] of Object.entries(evaluation.metrics)) {
  console.log(`${key}: ${key === "total" ? value : pct(value)}`);
}
console.log("\nCases flagged for review:");
for (const result of evaluation.results.filter(item => !item.pass)) {
  console.log(`- ${result.id}: expected ${result.expected.intent}/${result.expected.priority}/${result.expected.routeMode}; received ${result.actual.intent}/${result.actual.severity}/${result.actual.mode}`);
}
