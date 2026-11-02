import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

import { createWebAudioTrack, resetPlaybackContext } from "../src/lib/interview/web-audio-playback.mjs";
import {
  clearRetainedSpeechBlobs, createRateDeadline, fetchSpeechBlob, playInterviewerSegments, prepareSessionVoice, prewarmInterviewerSpeech,
  resetSpeechFlights, setInterviewerPlaybackRate, warmUpInterviewerSpeech,
} from "../src/lib/interview/speech-playback.mjs";

const endpoint = "https://api.test/api/v1/speech";
const timers = { setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay), clearTimeout: (id) => globalThis.clearTimeout(id) };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
async function until(condition) {
  for (let i = 0; i < 500 && !condition(); i += 1) await tick();
  assert.ok(condition(), "condition reached");
}

beforeEach(() => {
  clearRetainedSpeechBlobs();
  resetSpeechFlights();
  resetPlaybackContext();
  setInterviewerPlaybackRate(1);
});

// An element that plays until the test ends it; `plays` records the rate each play() started at.
function controlledAudio(log) {
  const audio = {
    listeners: {}, paused: true, ended: false, currentTime: 0, duration: 10, preload: "none", playbackRate: 1, preservesPitch: false,
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; },
    removeAttribute() {}, load() {},
    pause() { this.paused = true; },
    play() {
      this.paused = false;
      log.plays.push({ rate: this.playbackRate });
      queueMicrotask(() => this.listeners.playing?.());
      return Promise.resolve();
    },
    end() { this.paused = true; this.ended = true; this.listeners.ended?.(); },
  };
  return audio;
}

function recorder() {
  const log = { fetches: 0, bodies: [], plays: [], audios: [] };
  const fetcher = async (_url, init) => {
    log.fetches += 1;
    log.bodies.push(JSON.parse(init.body));
    return new Response(new Blob([`mp3-${log.fetches}`]), { status: 200 });
  };
  const makeAudio = () => { const audio = controlledAudio(log); log.audios.push(audio); return audio; };
  return { log, fetcher, makeAudio };
}

const twoChunkLine = [
  "This is the first sentence of the answer, which is fairly long to force a split here.",
  "And this is the second sentence that should be a separate chunk later on, long enough.",
];

test("a speed change updates the playing element at once: no new request, no restart, pitch kept", async () => {
  const { log, fetcher, makeAudio } = recorder();
  setInterviewerPlaybackRate(0.9);
  const playback = playInterviewerSegments(["Only one line here, short."], { endpoint, fetcher, makeAudio, createObjectUrl: () => "blob:a", revokeObjectUrl: () => {}, ...timers });
  await until(() => log.plays.length === 1);
  const [audio] = log.audios;
  assert.equal(audio.playbackRate, 0.9);
  assert.equal(audio.preservesPitch, true);

  const fetchesBefore = log.fetches;
  setInterviewerPlaybackRate(1.2);
  assert.equal(audio.playbackRate, 1.2, "the element playing now follows at once");
  assert.equal(log.fetches, fetchesBefore, "no new speech request");
  assert.equal(log.audios.length, 1, "the line is not restarted on a new element");
  assert.equal(log.plays.length, 1, "play() is not called again");

  audio.end();
  assert.equal((await playback.promise).status, "completed");
});

test("a later chunk plays at the rate in force when it starts, even if it was prepared before the change", async () => {
  const { log, fetcher, makeAudio } = recorder();
  setInterviewerPlaybackRate(1);
  const playback = playInterviewerSegments(twoChunkLine, { endpoint, fetcher, makeAudio, createObjectUrl: () => "blob:b", revokeObjectUrl: () => {}, ...timers });
  await until(() => log.audios.length === 2 && log.plays.length === 1);
  setInterviewerPlaybackRate(0.75);
  assert.equal(log.audios[0].playbackRate, 0.75);
  // The next chunk is prepared (its audio exists) while chunk 1 plays, before the rate changes again.
  log.audios[0].end();
  await until(() => log.plays.length === 2 && log.audios.length === 3);
  assert.equal(log.plays[1].rate, 0.75, "the prepared chunk starts at the rate in force");
  setInterviewerPlaybackRate(1.1);
  log.audios[1].end();
  await until(() => log.plays.length === 3);
  assert.equal(log.plays[2].rate, 1.1, "the chunk prepared earlier starts at the new rate");
  log.audios[2].end();
  assert.equal((await playback.promise).status, "completed");
  setInterviewerPlaybackRate(1);
});

test("requests never carry a speed: the rate is applied on playback only", async () => {
  const { log, fetcher } = recorder();
  setInterviewerPlaybackRate(0.8);
  await fetchSpeechBlob("A line.", { endpoint, fetcher, voice: "en-US-AvaNeural" });
  await prewarmInterviewerSpeech(["Sure. Tell me about your last project."], { endpoint, fetcher, retainMs: 0 }).promise;
  await prepareSessionVoice("Opening line. Second sentence here.", "en-US-AvaNeural", { endpoint, fetcher, timeoutMs: 1000 });
  const warm = [];
  warmUpInterviewerSpeech("https://api.test/api/v1/speech", async (_url, init) => { warm.push(JSON.parse(init.body)); }, { voice: "en-US-AvaNeural" });
  await tick();
  assert.ok(log.bodies.length >= 3);
  for (const body of log.bodies) assert.equal("speed" in body, false, JSON.stringify(body));
  assert.deepEqual(warm, [{ voice: "en-US-AvaNeural" }]);
});

test("a rate change rescales the time left before a playback deadline", () => {
  let now = 0;
  const scheduled = [];
  const cleared = [];
  const schedule = (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length; };
  const unschedule = (id) => cleared.push(id);
  setInterviewerPlaybackRate(1);
  let expired = 0;
  const deadline = createRateDeadline({ budgetMs: 1_000, schedule, unschedule, now: () => now, onExpire: () => { expired += 1; } });
  assert.equal(scheduled.at(-1).delay, 1_000);
  now = 500;
  setInterviewerPlaybackRate(0.5);
  deadline.rescale(1, 0.5);
  assert.deepEqual(cleared, [1]);
  assert.equal(scheduled.at(-1).delay, 1_000, "500 ms of audio left, heard at half speed");
  scheduled.at(-1).callback();
  assert.equal(expired, 1);
  deadline.rescale(0.5, 2);
  assert.equal(scheduled.length, 2, "an expired deadline is not rearmed");
  setInterviewerPlaybackRate(1);
});

test("the final-chunk handoff counts the remaining audio at the live rate", async () => {
  const { log, fetcher, makeAudio } = recorder();
  const finalStarts = [];
  const playback = playInterviewerSegments(["Only one line here, short."], {
    endpoint, fetcher, makeAudio, createObjectUrl: () => "blob:c", revokeObjectUrl: () => {}, ...timers,
    onFinalChunkStarted: () => finalStarts.push(true),
  });
  await until(() => log.plays.length === 1);
  const [audio] = log.audios;
  audio.currentTime = 6.5; // 3.5 s of audio left: more than the 3 s lead at 1x...
  audio.listeners.timeupdate();
  assert.deepEqual(finalStarts, []);
  setInterviewerPlaybackRate(1.25); // ...but 2.8 s of wall time at 1.25x.
  audio.listeners.timeupdate();
  assert.deepEqual(finalStarts, [true]);
  audio.end();
  await playback.promise;
  setInterviewerPlaybackRate(1);
});

test("a Web Audio track changes its source rate live and keeps its position", async () => {
  const sources = [];
  const context = {
    state: "running", currentTime: 0, destination: {},
    addEventListener() {}, removeEventListener() {}, resume: () => Promise.resolve(),
    createBufferSource() {
      const source = { buffer: null, playbackRate: { value: 1 }, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null };
      sources.push(source);
      return source;
    },
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    decodeAudioData: () => Promise.resolve({ duration: 10 }),
  };
  const track = createWebAudioTrack("blob:track", { context, fetchArrayBuffer: async () => new ArrayBuffer(8), setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {} });
  await track.play();
  assert.equal(sources[0].playbackRate.value, 1);
  context.currentTime = 1;
  assert.equal(track.currentTime, 1);
  track.playbackRate = 2;
  assert.equal(sources[0].playbackRate.value, 2, "the playing source follows at once");
  context.currentTime = 2;
  assert.equal(track.currentTime, 3, "1 s played at 1x, then 1 s at 2x");
  track.dispose();
});
