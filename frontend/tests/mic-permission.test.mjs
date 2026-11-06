import assert from "node:assert/strict";
import test from "node:test";

import { requestMicrophoneAccess } from "../src/lib/interview/mic-permission.mjs";

const stream = () => { const stops = []; return { stops, getTracks: () => [{ stop: () => stops.push(1) }, { stop: () => stops.push(1) }] }; };
const nav = ({ permission, getUserMedia }) => ({
  mediaDevices: { getUserMedia },
  ...(permission === undefined ? {} : { permissions: { query: async () => { if (permission instanceof Error) throw permission; return { state: permission }; } } }),
});
const error = (name) => Object.assign(new Error(name), { name });

test("a microphone already granted is not asked for again", async () => {
  let calls = 0;
  const result = await requestMicrophoneAccess({ nav: nav({ permission: "granted", getUserMedia: async () => { calls += 1; return stream(); } }) });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 0);
});

test("a blocked microphone reports denied without prompting", async () => {
  let calls = 0;
  const result = await requestMicrophoneAccess({ nav: nav({ permission: "denied", getUserMedia: async () => { calls += 1; return stream(); } }) });
  assert.deepEqual(result, { ok: false, reason: "denied" });
  assert.equal(calls, 0);
});

test("asks when the browser cannot say (Safari), and releases the stream at once", async () => {
  const opened = stream();
  const result = await requestMicrophoneAccess({ nav: nav({ permission: new Error("not supported"), getUserMedia: async () => opened }) });
  assert.deepEqual(result, { ok: true });
  assert.equal(opened.stops.length, 2);
  const noApi = stream();
  assert.deepEqual(await requestMicrophoneAccess({ nav: nav({ getUserMedia: async () => noApi }) }), { ok: true });
  assert.equal(noApi.stops.length, 2);
});

test("a refused prompt is denied; other failures are only unavailable", async () => {
  assert.deepEqual(await requestMicrophoneAccess({ nav: nav({ permission: "prompt", getUserMedia: async () => { throw error("NotAllowedError"); } }) }), { ok: false, reason: "denied" });
  assert.deepEqual(await requestMicrophoneAccess({ nav: nav({ permission: "prompt", getUserMedia: async () => { throw error("SecurityError"); } }) }), { ok: false, reason: "denied" });
  assert.deepEqual(await requestMicrophoneAccess({ nav: nav({ permission: "prompt", getUserMedia: async () => { throw error("NotFoundError"); } }) }), { ok: false, reason: "unavailable" });
  assert.deepEqual(await requestMicrophoneAccess({ nav: nav({ permission: "prompt", getUserMedia: async () => { throw error("NotReadableError"); } }) }), { ok: false, reason: "unavailable" });
  assert.deepEqual(await requestMicrophoneAccess({ nav: {} }), { ok: false, reason: "unsupported" });
});

test("a saved device that is gone falls back to the default microphone", async () => {
  const seen = [];
  const opened = stream();
  const result = await requestMicrophoneAccess({ deviceId: "gone", nav: nav({ permission: "prompt", getUserMedia: async (constraints) => {
    seen.push(constraints.audio.deviceId);
    if (seen.length === 1) throw error("OverconstrainedError");
    return opened;
  } }) });
  assert.deepEqual(result, { ok: true });
  assert.equal(seen.length, 2);
  assert.equal(seen[1], undefined);
  assert.equal(opened.stops.length, 2);
});
