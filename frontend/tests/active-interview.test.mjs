import assert from "node:assert/strict";
import test from "node:test";

import { createAuthorizedFetch } from "../src/lib/auth/access-token.mjs";
import { clearActiveInterviewId, getActiveInterviewId, setActiveInterviewId } from "../src/lib/interview/active-interview.mjs";

const id = "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

test("the active interview id is only cleared by the screen that set it", () => {
  setActiveInterviewId(id);
  assert.equal(getActiveInterviewId(), id);
  clearActiveInterviewId("another-id");
  assert.equal(getActiveInterviewId(), id);
  clearActiveInterviewId(id);
  assert.equal(getActiveInterviewId(), null);
  setActiveInterviewId("");
  assert.equal(getActiveInterviewId(), null);
});

test("authorized fetch tags the call with the open interview and omits the header without one", async () => {
  let seen;
  const fetcher = async (_input, init) => { seen = init.headers; return new Response("{}", { status: 200 }); };
  setActiveInterviewId(id);
  await createAuthorizedFetch(async () => "abc", fetcher, new EventTarget(), getActiveInterviewId)("http://backend/x");
  assert.equal(seen.get("x-interview-id"), id);
  clearActiveInterviewId(id);
  await createAuthorizedFetch(async () => "abc", fetcher, new EventTarget(), getActiveInterviewId)("http://backend/x");
  assert.equal(seen.get("x-interview-id"), null);
});
