import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mic = readFileSync(new URL("../src/components/interview/microphone-capture.tsx", import.meta.url), "utf8");
const room = readFileSync(new URL("../src/app/components/interview-room.tsx", import.meta.url), "utf8");

test("microphone capture re-sends kept audio to the retry endpoint with its retry token", () => {
  assert.match(mic, /authorizedFetch\(`\$\{backendBaseUrl\}\/api\/v1\/transcriptions\/retry`/u);
  assert.match(mic, /JSON\.stringify\(\{ retryToken \}\)/u);
  assert.match(mic, /typeof message\.retryToken === "string"/u);
  assert.match(mic, /RETAINED_AUDIO_FAILURE_MESSAGE/u);
  assert.match(mic, /canRetryTranscription,\s*\n\s*retryTranscription,/u);
});

test("the room's mic error toast retries the kept audio before offering a new recording", () => {
  assert.match(room, /mic\.canRetryTranscription \? \(\) => \{ void mic\.retryTranscription\(\); \} : mic\.start/u);
  assert.match(room, /\{mic\.canRetryTranscription && <button[^>]*onClick=\{mic\.start\}[^>]*>\{t\("Gravar de novo"\)\}<\/button>\}/u);
});
