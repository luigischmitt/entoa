import assert from "node:assert/strict";
import test from "node:test";
import { clearRetainedSpeechBlobs, fetchSpeechBlob, getInterviewVoiceSource, playInterviewerSegments, prepareSessionVoice, resetInterviewVoiceSource, resetSpeechFlights } from "../src/lib/interview/speech-playback.mjs";

const endpoint = "https://api.test/api/v1/speech";

function recordingFetcher(sources) {
  const bodies = [];
  const fetcher = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    const source = sources.shift();
    const headers = source ? { "x-voice-source": source } : {};
    return new Response(new Blob([init.body]), { status: 200, headers });
  };
  return { bodies, fetcher };
}

function reset() {
  clearRetainedSpeechBlobs();
  resetSpeechFlights();
  resetInterviewVoiceSource();
}

test("the first request of an interview sends no voice preference", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher([null]);
  await fetchSpeechBlob("First line.", { endpoint, fetcher });
  assert.equal(bodies[0].voiceSource, undefined);
  assert.equal(getInterviewVoiceSource(), null);
  reset();
});

test("the voice source of the first answer is kept for the rest of the interview", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["azure", null]);
  await fetchSpeechBlob("First line.", { endpoint, fetcher });
  assert.equal(getInterviewVoiceSource(), "azure");
  await fetchSpeechBlob("Second line, different text.", { endpoint, fetcher });
  assert.equal(bodies[1].voiceSource, "azure");
  assert.equal(bodies[1].text, "Second line, different text.");
  reset();
});

test("a retained blob from another voice source is fetched again once the interview source is known", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["openrouter", "azure", "azure"]);
  const options = { endpoint, fetcher, retainMs: 240_000 };
  await fetchSpeechBlob("Retained line.", options);
  assert.equal(getInterviewVoiceSource(), "openrouter");
  // A new interview starts, and its first line comes back from Azure while "Retained line." is still retained as openrouter.
  resetInterviewVoiceSource();
  await fetchSpeechBlob("Other line.", options);
  assert.equal(getInterviewVoiceSource(), "azure");
  await fetchSpeechBlob("Retained line.", options);
  assert.equal(bodies.length, 3, "the openrouter blob is not reused");
  assert.equal(bodies[2].voiceSource, "azure");
  assert.equal(bodies[2].text, "Retained line.");
  reset();
});

test("a retained blob with an unknown source is still reused", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher([null, "azure"]);
  const options = { endpoint, fetcher, retainMs: 240_000 };
  await fetchSpeechBlob("Unlabelled line.", options);
  await fetchSpeechBlob("Other line.", options);
  await fetchSpeechBlob("Unlabelled line.", options);
  assert.equal(bodies.length, 2);
  reset();
});

test("resetInterviewVoiceSource clears the interview voice source", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["kokoro", null]);
  await fetchSpeechBlob("A line.", { endpoint, fetcher });
  assert.equal(getInterviewVoiceSource(), "kokoro");
  resetInterviewVoiceSource();
  assert.equal(getInterviewVoiceSource(), null);
  await fetchSpeechBlob("Next interview line.", { endpoint, fetcher });
  assert.equal(bodies[1].voiceSource, undefined);
  reset();
});

test("an explicit requestBody is sent unchanged, without the interview voice source", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["azure", null]);
  await fetchSpeechBlob("A line.", { endpoint, fetcher });
  await fetchSpeechBlob("Chunk.", { endpoint, fetcher, requestBody: { text: "Chunk.", chunk: 1 } });
  assert.deepEqual(bodies[1], { text: "Chunk.", chunk: 1 });
  reset();
});

// Audio element that plays for one microtask and then ends, so playInterviewerSegments completes.
function endingAudio() {
  const listeners = {};
  return {
    paused: true, ended: false, currentTime: 0, duration: 1, preload: "none",
    addEventListener(type, listener) { listeners[type] = listener; },
    removeEventListener(type) { delete listeners[type]; },
    removeAttribute() {}, load() {},
    pause() { this.paused = true; },
    play() {
      this.paused = false;
      queueMicrotask(() => listeners.playing?.());
      queueMicrotask(() => listeners.ended?.());
      return Promise.resolve();
    },
  };
}

function playbackOptions(fetcher) {
  return {
    endpoint, fetcher, voice: "voice-a", speed: 1,
    makeAudio: () => endingAudio(),
    createObjectUrl: () => "blob:opening",
    revokeObjectUrl: () => {},
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: (id) => globalThis.clearTimeout(id),
  };
}

test("prepareSessionVoice pins the voice of the header, and the next chunk request carries it", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["azure", null]);
  const source = await prepareSessionVoice("Opening line. Second sentence here.", "voice-a", 1, { endpoint, fetcher, timeoutMs: 1000 });
  assert.equal(source, "azure");
  assert.equal(getInterviewVoiceSource(), "azure");
  assert.equal(bodies[0].voiceSource, undefined, "the opening itself is requested before any pin");
  await fetchSpeechBlob("Next chunk.", { endpoint, fetcher });
  assert.equal(bodies[1].voiceSource, "azure");
  reset();
});

test("prepareSessionVoice resolves without throwing when the first chunk is too slow, and playback can still join it", async () => {
  reset();
  let calls = 0;
  const fetcher = () => { calls += 1; return new Promise(() => {}); };
  const source = await prepareSessionVoice("Slow opening.", "voice-a", 1, { endpoint, fetcher, timeoutMs: 5 });
  assert.equal(source, null);
  assert.equal(getInterviewVoiceSource(), null);
  void fetchSpeechBlob("Slow opening.", { endpoint, fetcher, voice: "voice-a" });
  assert.equal(calls, 1, "the request in flight is joined, not sent again");
  reset();
});

test("the opening blob prepared for the session is reused by playback: one request for it", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["azure"]);
  await prepareSessionVoice("Opening line.", "voice-a", 1, { endpoint, fetcher });
  const { promise } = playInterviewerSegments(["Opening line."], playbackOptions(fetcher));
  assert.equal((await promise).status, "completed");
  assert.equal(bodies.length, 1, "playback did not synthesize the opening again");
  reset();
});

test("an Azure pin stays after a line ends, so the next line keeps Azure", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["azure", null]);
  await playInterviewerSegments(["First line."], playbackOptions(fetcher)).promise;
  assert.equal(getInterviewVoiceSource(), "azure");
  await playInterviewerSegments(["Second line."], playbackOptions(fetcher)).promise;
  assert.equal(getInterviewVoiceSource(), "azure");
  assert.equal(bodies[1].voiceSource, "azure");
  reset();
});

test("a blob retained before the session started still sets the voice pin", async () => {
  reset();
  const { bodies, fetcher } = recordingFetcher(["azure", "azure"]);
  await fetchSpeechBlob("Hello there.", { endpoint, fetcher, retainMs: 30_000 });
  resetInterviewVoiceSource();
  assert.equal(getInterviewVoiceSource(), null);
  await fetchSpeechBlob("Hello there.", { endpoint, fetcher, retainMs: 30_000 });
  assert.equal(getInterviewVoiceSource(), "azure");
  assert.equal(bodies.length, 1);
});
