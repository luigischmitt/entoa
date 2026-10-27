import assert from "node:assert/strict";
import test from "node:test";
import { remainingPlannedQuestions, selectNextPlannedQuestion } from "../src/lib/interview/question-scheduling.mjs";

const askedPrompt = "How do you ensure the texture and anatomical fidelity in the synthetic lung CT and mammography images in your validation framework?";
const repeatedPrompt = "What specific computer vision techniques did you apply to ensure the texture and anatomical fidelity in the synthetic lung CT and mammography images?";

test("drops a résumé question that repeats an already asked planned question", () => {
  const questions = [
    { id: "introduction", prompt: "Could you introduce yourself?", cue: "" },
    { id: "resume-1", prompt: askedPrompt, cue: "" },
    { id: "resume-2", prompt: repeatedPrompt, cue: "" },
    { id: "ownership", prompt: "Tell me about a time you took ownership.", cue: "" },
  ];
  const remaining = remainingPlannedQuestions(questions, ["introduction", "resume-1"]);
  assert.deepEqual(remaining.map((question) => question.id), ["ownership"]);
  const plan = selectNextPlannedQuestion({ questions, askedQuestionIds: ["introduction", "resume-1"], elapsedSeconds: 120, durationMinutes: 10 });
  assert.equal(plan.question?.id, "ownership");
});

test("keeps a job question even when it repeats an already asked planned question", () => {
  const questions = [
    { id: "resume-1", prompt: askedPrompt, cue: "" },
    { id: "job-1", prompt: repeatedPrompt, cue: "" },
    { id: "ownership", prompt: "Tell me about a time you took ownership.", cue: "" },
  ];
  assert.deepEqual(remainingPlannedQuestions(questions, ["resume-1"]).map((question) => question.id), ["job-1", "ownership"]);
});

test("ignores asked ids that are not planned questions", () => {
  const questions = [
    { id: "resume-1", prompt: askedPrompt, cue: "" },
    { id: "resume-2", prompt: repeatedPrompt, cue: "" },
  ];
  assert.deepEqual(remainingPlannedQuestions(questions, ["unknown-id"]).map((question) => question.id), ["resume-1", "resume-2"]);
});
