import assert from "node:assert/strict";
import test from "node:test";
import { clearRetainedSpeechBlobs, fetchSpeechBlob, getInterviewVoiceSource, resetInterviewVoiceSource, resetSpeechFlights } from "../src/lib/interview/speech-playback.mjs";

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
