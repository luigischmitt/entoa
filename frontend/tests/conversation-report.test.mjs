import assert from "node:assert/strict";
import test from "node:test";
import { conversationAssessmentSamples, hasCandidateSpeech, pendingConversationAssessments } from "../src/lib/interview/conversation-report.mjs";

test("every conversation recording counts toward the voice samples", () => {
  const entries = {
    "1:0": { sequenceNumber: 1, round: 0, state: { status: "available", durationMs: 1200, scores: { accuracy: 80 } } },
    "3:0": { sequenceNumber: 3, round: 0, state: { status: "pending" } },
    "5:0": { sequenceNumber: 5, round: 0, state: { status: "unavailable", reason: "socket_closed" } },
  };
  assert.deepEqual(conversationAssessmentSamples(entries), [
    { status: "available", durationMs: 1200, scores: { accuracy: 80 } },
    { status: "pending" },
    { status: "unavailable" },
  ]);
  assert.equal(pendingConversationAssessments(entries), 1);
});

test("empty assessments produce no samples", () => {
  assert.deepEqual(conversationAssessmentSamples({}), []);
  assert.equal(pendingConversationAssessments(undefined), 0);
});

test("speech is needed before a conversation report is requested", () => {
  assert.equal(hasCandidateSpeech([{ sequenceNumber: 1, speaker: "interviewer", content: "Hi there." }]), false);
  assert.equal(hasCandidateSpeech([{ sequenceNumber: 2, speaker: "candidate", content: "   " }]), false);
  assert.equal(hasCandidateSpeech([{ sequenceNumber: 2, speaker: "candidate", content: null }]), false);
  assert.equal(hasCandidateSpeech([{ sequenceNumber: 2, speaker: "candidate", content: "I went hiking." }]), true);
});
