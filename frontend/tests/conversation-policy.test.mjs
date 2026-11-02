import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_CLOSING_LINE,
  buildConversationTurnRequest,
  conversationPhase,
  fallbackConversationTurn,
  isConversationEnd,
  isMeaningQuestion,
  nextUsedPathIds,
  shouldReact,
  MAX_SILENCE_NUDGES,
  silenceWaitMs,
} from "../src/lib/interview/conversation-policy.mjs";

const plan = {
  title: "Rotina da manhã",
  opening: "Good morning! How does your morning start?",
  paths: [
    { id: "p1", line: "What did you do first today?" },
    { id: "p2", line: "Which morning helps you feel ready?" },
    { id: "p3", line: "How do you feel when you wake up early?" },
  ],
};

test("warmup for the first minute, closing when 45 seconds or less remain, explore otherwise", () => {
  assert.equal(conversationPhase(0, 10), "warmup");
  assert.equal(conversationPhase(59, 10), "warmup");
  assert.equal(conversationPhase(60, 10), "explore");
  assert.equal(conversationPhase(600 - 46, 10), "explore");
  assert.equal(conversationPhase(600 - 45, 10), "closing");
  assert.equal(conversationPhase(900, 10), "closing");
  assert.equal(conversationPhase(10_000, 5), "closing");
});

test("the turn request carries the plan, phase, remaining time and clipped history", () => {
  const lines = Array.from({ length: 45 }, (_, index) => ({ speaker: index % 2 ? "person" : "tuck", text: `line ${index} ${"x".repeat(2100)}` }));
  const request = buildConversationTurnRequest({
    plan, usedPathIds: ["p1"], elapsedSeconds: 200, durationMinutes: 5, lines, transcript: `  ${"y".repeat(4500)}  `,
  });
  assert.equal(request.topic, "Rotina da manhã");
  assert.deepEqual(request.paths, plan.paths);
  assert.deepEqual(request.usedPathIds, ["p1"]);
  assert.equal(request.phase, "explore");
  assert.equal(request.remainingSeconds, 100);
  assert.equal(request.history.length, 40);
  assert.equal(request.history[0].text.length, 2000);
  assert.equal(request.history[0].text, lines[5].text.slice(0, 2000));
  assert.equal(request.transcript.length, 4000);
});

test("remaining time never goes below zero and the history keeps only valid lines", () => {
  const request = buildConversationTurnRequest({
    plan, usedPathIds: [], elapsedSeconds: 400, durationMinutes: 5,
    lines: [{ speaker: "tuck", text: "Hi" }, { speaker: "person", text: "   " }, { speaker: "robot", text: "no" }, { speaker: "person", text: "Hello there" }],
    transcript: "Hello there",
  });
  assert.equal(request.remainingSeconds, 0);
  assert.equal(request.phase, "closing");
  assert.deepEqual(request.history, [{ speaker: "tuck", text: "Hi" }, { speaker: "person", text: "Hello there" }]);
});

test("a used path is added once, and only when present", () => {
  assert.deepEqual(nextUsedPathIds([], { pathId: "p2" }), ["p2"]);
  assert.deepEqual(nextUsedPathIds(["p2"], { pathId: "p2" }), ["p2"]);
  assert.deepEqual(nextUsedPathIds(["p1"], { pathId: null }), ["p1"]);
  assert.deepEqual(nextUsedPathIds(undefined, undefined), []);
});

test("the fallback closes in the closing phase", () => {
  assert.deepEqual(fallbackConversationTurn({ plan, usedPathIds: [], phase: "closing" }), { say: CONVERSATION_CLOSING_LINE, move: "WRAP", pathId: null });
  assert.equal(CONVERSATION_CLOSING_LINE, "This was a really nice chat. Thanks for talking with me!");
});

test("the fallback uses the first unused path, then a follow-up line", () => {
  assert.deepEqual(fallbackConversationTurn({ plan, usedPathIds: ["p1"], phase: "explore" }), { say: plan.paths[1].line, move: "NEW_PATH", pathId: "p2" });
  assert.deepEqual(fallbackConversationTurn({ plan, usedPathIds: ["p1", "p2", "p3"], phase: "warmup" }), { say: "Tell me a little more about that?", move: "FOLLOW", pathId: null });
});

test("only WRAP and END end the conversation", () => {
  assert.equal(isConversationEnd({ move: "WRAP" }), true);
  assert.equal(isConversationEnd({ move: "END" }), true);
  for (const move of ["FOLLOW", "NEW_PATH", "CLARIFY"]) assert.equal(isConversationEnd({ move }), false);
  assert.equal(isConversationEnd(null), false);
});

test("any transcript with at least two words gets a reaction", () => {
  assert.equal(shouldReact("Yes sure"), true);
  assert.equal(shouldReact("  I  like it  "), true);
  assert.equal(shouldReact("Yes"), false);
  assert.equal(shouldReact("   "), false);
  assert.equal(shouldReact(null), false);
});

test("silence waits longer after a question than after a statement", () => {
  assert.equal(silenceWaitMs("What did you do first?"), 12_000);
  assert.equal(silenceWaitMs("Tell me about your morning."), 7_000);
  assert.equal(silenceWaitMs(""), 7_000);
  assert.equal(silenceWaitMs(null), 7_000);
  assert.equal(MAX_SILENCE_NUDGES, 2);
});

test("a silent turn asks the backend with silent true and the silence marker instead of an answer", () => {
  const plan = { title: "Music", opening: "Hi?", paths: [{ id: "p1", line: "What song?" }] };
  const silent = buildConversationTurnRequest({ plan, elapsedSeconds: 30, durationMinutes: 5, lines: [{ speaker: "tuck", text: "Hi?" }], transcript: "ignored", silent: true });
  assert.equal(silent.silent, true);
  assert.equal(silent.transcript, "(silence)");
  assert.deepEqual(silent.history, [{ speaker: "tuck", text: "Hi?" }]);
  const spoken = buildConversationTurnRequest({ plan, elapsedSeconds: 30, durationMinutes: 5, transcript: "I like jazz" });
  assert.equal("silent" in spoken, false);
  assert.equal(spoken.transcript, "I like jazz");
});

test("meaning questions are recognised the same way as on the backend, with or without a question mark", () => {
  for (const text of ["What does cheers mean?", "what does cheers mean", "What do you mean by cheers", "What's the meaning of cheers?", "What is cheers", "How do you say saudade in English?", "How do you use cheers?", "Can you explain cheers?", "I don't know what cheers means", "I don't understand cheers", "Yes, what does cheers mean?"]) {
    assert.equal(isMeaningQuestion(text), true, text);
  }
  for (const text of ["What do you do on weekends?", "What is your favorite food?", "What is the best part of your day?", "I don't understand you", "What is a very long question about many different things that goes on and on forever?", "Yes, on Sunday.", "", null]) {
    assert.equal(isMeaningQuestion(text), false, String(text));
  }
});

test("a failed turn for a meaning question asks the person to repeat the word, not a path line", () => {
  assert.deepEqual(fallbackConversationTurn({ plan, usedPathIds: [], phase: "explore", transcript: "What does cheers mean?" }), { say: "Sorry, I missed that word. Can you say it one more time?", move: "FOLLOW", pathId: null });
  assert.deepEqual(fallbackConversationTurn({ plan, usedPathIds: [], phase: "explore", transcript: "Yes, on Sunday." }), { say: plan.paths[0].line, move: "NEW_PATH", pathId: "p1" });
});
