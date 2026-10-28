import test from "node:test";
import assert from "node:assert/strict";
import { isEndRequest, isShortUtterance, parseShortReplyResponse, shortReplyDecision } from "../src/lib/interview/short-reply-policy.mjs";

test("isShortUtterance accepts one through 25 words", () => {
  assert.equal(isShortUtterance("hello"), true);
  assert.equal(isShortUtterance(Array(25).fill("word").join(" ")), true);
  assert.equal(isShortUtterance(Array(26).fill("word").join(" ")), false);
  assert.equal(isShortUtterance("  \n "), false);
  assert.equal(isShortUtterance(null), false);
});

test("parseShortReplyResponse validates enabled response shapes", () => {
  for (const action of ["ANSWER", "REPEAT", "REPHRASE", "DEFINE", "MOVE_ON", "END", "ASIDE"]) {
    assert.deepEqual(parseShortReplyResponse({ enabled: true, action, say: "Lead in", question: "Simpler?" }), action === "ANSWER" ? { action: "ANSWER", say: null, question: null } : { action, say: "Lead in", question: "Simpler?" });
  }
  assert.equal(parseShortReplyResponse({ enabled: false, action: "ANSWER", say: null, question: null }), null);
  assert.equal(parseShortReplyResponse({ enabled: true, action: "BOGUS", say: null, question: null }), null);
  assert.equal(parseShortReplyResponse({ enabled: true, action: "REPEAT" }), null);
});

test("shortReplyDecision maps valid actions and rejects unusable ones", () => {
  const reply = (action, say = null, question = null) => ({ action, say, question });
  assert.deepEqual(shortReplyDecision(reply("REPEAT", "Again, please."), "Next?"), { decision: "REPEAT", followUpQuestion: null, nextQuestion: null, acknowledgement: null, clarificationText: null, clarification: "model", leadIn: "Again, please." });
  assert.deepEqual(shortReplyDecision(reply("REPHRASE", "Sure", "What did you build?"), "Next?"), { decision: "REPHRASE", followUpQuestion: null, nextQuestion: null, acknowledgement: null, clarificationText: "What did you build?", clarification: "model", leadIn: "Sure" });
  assert.deepEqual(shortReplyDecision(reply("DEFINE", "Latency means delay."), null), { decision: "DEFINE", followUpQuestion: null, nextQuestion: null, acknowledgement: null, clarificationText: "Latency means delay.", clarification: "model", leadIn: null });
  assert.deepEqual(shortReplyDecision(reply("MOVE_ON", "No problem."), "Next?"), { decision: "NEXT", followUpQuestion: null, nextQuestion: "Next?", acknowledgement: "No problem." });
  assert.deepEqual(shortReplyDecision(reply("ASIDE", "I am an AI assistant."), "Next?", "What did you build?"), { decision: "REPHRASE", followUpQuestion: null, nextQuestion: null, acknowledgement: null, clarificationText: "What did you build?", clarification: "model", leadIn: "I am an AI assistant." });
  assert.equal(shortReplyDecision(reply("ASIDE", "I am an AI assistant."), "Next?", "Tell me about your work."), null);
  assert.equal(shortReplyDecision(reply("END", "Thanks for the interview."), "Next?", "Question?"), null);
  assert.equal(isEndRequest(reply("END")), true);
  assert.equal(isEndRequest(reply("ASIDE")), false);
  assert.equal(shortReplyDecision(reply("ANSWER"), "Next?"), null);
  assert.equal(shortReplyDecision(reply("REPHRASE", null, null), "Next?"), null);
  assert.equal(shortReplyDecision(reply("DEFINE", null), "Next?"), null);
  assert.equal(shortReplyDecision(reply("MOVE_ON", "Next."), null), null);
  assert.equal(shortReplyDecision(null, "Next?"), null);
});
