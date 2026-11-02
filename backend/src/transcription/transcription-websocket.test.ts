import { describe, expect, it } from "vitest";

import { answerEndGraceMs, canAutomaticallyCompleteAnswer, conversationGraceOptions } from "./transcription-websocket.js";

describe("automatic answer completion safeguards", () => {
  const options = { answerGraceMs: 3_500, incompleteGraceMs: 6_000, shortAnswerGraceMs: 10_000, minAnswerWords: 6 };

  it("keeps a short committed transcript open for the long grace and ignores semantic complete", () => {
    expect(answerEndGraceMs("So,", options)).toBe(10_000);
    expect(canAutomaticallyCompleteAnswer("So,", options.minAnswerWords)).toBe(false);
  });

  it("keeps the existing incomplete and complete grace behavior at six words", () => {
    expect(answerEndGraceMs("I would start with the data", options)).toBe(6_000);
    expect(answerEndGraceMs("I would start with the data.", options)).toBe(3_500);
    expect(canAutomaticallyCompleteAnswer("I would start with the data.", options.minAnswerWords)).toBe(true);
  });
});

describe("conversation pause grace", () => {
  const normal = { answerGraceMs: 3_500, incompleteGraceMs: 6_000, shortAnswerGraceMs: 10_000, minAnswerWords: 6, pauseMs: 800 };

  it("uses the shorter conversation graces for the three grace cases and leaves the other settings alone", () => {
    const conversation = conversationGraceOptions(normal as never);
    expect(answerEndGraceMs("So,", conversation)).toBe(2_500);
    expect(answerEndGraceMs("I would start with the data", conversation)).toBe(3_000);
    expect(answerEndGraceMs("I would start with the data.", conversation)).toBe(1_800);
    expect(conversation.pauseMs).toBe(800);
  });

  it("does not change the options of a session without the flag", () => {
    expect(answerEndGraceMs("So,", normal)).toBe(10_000);
    expect(answerEndGraceMs("I would start with the data", normal)).toBe(6_000);
    expect(answerEndGraceMs("I would start with the data.", normal)).toBe(3_500);
    expect(normal.answerGraceMs).toBe(3_500);
  });
});
