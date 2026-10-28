import test from "node:test";
import assert from "node:assert/strict";
import { canAskAnotherFollowUp } from "../src/lib/interview/follow-up-policy.mjs";

test("first follow-up is allowed", () => assert.equal(canAskAnotherFollowUp({ followUpsAsked: 0, lastFollowUpAnswer: "", hasTimeAfterNext: false }), true));
test("second follow-up requires at least 40 words", () => {
  assert.equal(canAskAnotherFollowUp({ followUpsAsked: 1, lastFollowUpAnswer: Array(39).fill("word").join(" "), hasTimeAfterNext: true }), false);
  assert.equal(canAskAnotherFollowUp({ followUpsAsked: 1, lastFollowUpAnswer: Array(40).fill("word").join(" "), hasTimeAfterNext: true }), true);
});
test("second follow-up requires enough time and two are the maximum", () => {
  assert.equal(canAskAnotherFollowUp({ followUpsAsked: 1, lastFollowUpAnswer: Array(40).fill("word").join(" "), hasTimeAfterNext: false }), false);
  assert.equal(canAskAnotherFollowUp({ followUpsAsked: 2, lastFollowUpAnswer: Array(100).fill("word").join(" "), hasTimeAfterNext: true }), false);
});
