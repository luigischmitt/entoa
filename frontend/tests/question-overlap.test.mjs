import assert from "node:assert/strict";
import test from "node:test";
import { repeatsTopic } from "../src/lib/interview/question-overlap.mjs";

test("detects the near-duplicate résumé question asked in a real interview", () => {
  assert.equal(
    repeatsTopic(
      "What specific computer vision techniques did you apply to ensure the texture and anatomical fidelity in the synthetic lung CT and mammography images?",
      "How do you ensure the texture and anatomical fidelity in the synthetic lung CT and mammography images in your validation framework?",
    ),
    true,
  );
});

test("different subjects do not repeat each other", () => {
  assert.equal(repeatsTopic("How did you design the payment API?", "How do you monitor production incidents?"), false);
});

test("identical questions repeat", () => {
  const question = "Tell me about a conflict with a teammate on the payments project.";
  assert.equal(repeatsTopic(question, question), true);
});

test("accents and case do not hide a repeat", () => {
  assert.equal(repeatsTopic("Como você otimizou a validação da API?", "COMO VOCE OTIMIZOU A VALIDACAO DA API"), true);
});

test("empty or stop-word-only text never repeats", () => {
  assert.equal(repeatsTopic("", "How did you do it?"), false);
  assert.equal(repeatsTopic("Could you tell me about it?", "How do you do this?"), false);
});

test("different angles on the same project are not repeats", () => {
  assert.equal(repeatsTopic("How did you design the database schema for the payments service?", "What trade-offs did you consider when designing the payments service API?"), false);
  assert.equal(repeatsTopic("How did you deploy the model to production?", "How did you monitor the model in production?"), false);
});
