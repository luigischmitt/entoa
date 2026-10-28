import test from "node:test";
import assert from "node:assert/strict";
import { speculativeRequestPayload } from "../src/lib/interview/speculative-request-payload.mjs";

test("speculative request includes follow-up context only when non-empty", () => {
  const base = { currentQuestion: "Q?", threadQuestions: [], recentFollowUpKinds: [] };
  assert.deepEqual(speculativeRequestPayload(base), { currentQuestion: "Q?" });
  assert.deepEqual(speculativeRequestPayload({ ...base, threadQuestions: ["Why?"] }), { currentQuestion: "Q?", threadQuestions: ["Why?"] });
  assert.deepEqual(speculativeRequestPayload({ ...base, recentFollowUpKinds: ["why"] }), { currentQuestion: "Q?", recentFollowUpKinds: ["why"] });
});
