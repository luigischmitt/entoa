import assert from "node:assert/strict";
import test from "node:test";

import { ACKNOWLEDGEMENT_PHRASES, createAcknowledgementPlayer } from "../src/lib/interview/acknowledgement.mjs";
import { CONVERSATION_REACTIONS, loadStaticReaction, reactionAudioPath, reactionFileName } from "../src/lib/interview/static-reactions.mjs";
import { DEFAULT_INTERVIEWER_VOICE, INTERVIEWER_VOICE_OPTIONS } from "../src/lib/interview/voices.mjs";

test("reaction file names are lowercase, dash-separated and mp3", () => {
  assert.equal(reactionFileName("Mm-hm... okay, got it."), "mm-hm-okay-got-it.mp3");
  assert.equal(reactionFileName("  Oh, really?  "), "oh-really.mp3");
});

test("ellipses and punctuation runs give valid, unique reaction file names", () => {
  assert.equal(reactionFileName("Hmm... hmm... okay, let's see."), "hmm-hmm-okay-let-s-see.mp3");
  assert.equal(reactionFileName("Hmm... alright, let's go."), "hmm-alright-let-s-go.mp3");
  const phrases = [...new Set([...ACKNOWLEDGEMENT_PHRASES, ...CONVERSATION_REACTIONS])];
  const names = phrases.map((phrase) => reactionFileName(phrase));
  for (const name of names) assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*\.mp3$/u, name);
  assert.equal(new Set(names).size, phrases.length, "two phrases share a file");
});

test("the conversation reactions are the question-like ones plus the thinking sounds, with no quick words", () => {
  assert.deepEqual(CONVERSATION_REACTIONS.slice(0, 3), ["Oh, really?", "Hm, interesting.", "Oh, I see."]);
  for (const phrase of ACKNOWLEDGEMENT_PHRASES) assert.ok(CONVERSATION_REACTIONS.includes(phrase), phrase);
  for (const quick of ["I see.", "Ah, okay.", "Mm-hm.", "Right.", "Huh, interesting."]) assert.ok(!CONVERSATION_REACTIONS.includes(quick), quick);
});

test("the reaction path uses the default voice for an unknown voice", () => {
  assert.equal(reactionAudioPath("not-a-voice", "Okay."), `/audio/reactions/${DEFAULT_INTERVIEWER_VOICE}/okay.mp3`);
  assert.equal(reactionAudioPath("en-GB-SoniaNeural", "Got it."), "/audio/reactions/en-GB-SoniaNeural/got-it.mp3");
});

test("every phrase maps to its own file for each voice", () => {
  const phrases = [...new Set([...ACKNOWLEDGEMENT_PHRASES, ...CONVERSATION_REACTIONS])];
  for (const voice of INTERVIEWER_VOICE_OPTIONS) {
    const names = phrases.map((phrase) => reactionFileName(phrase));
    assert.equal(new Set(names).size, phrases.length, `${voice.id} has colliding file names`);
  }
});

test("the player takes the static audio without calling loadBlob", async () => {
  const loaded = [];
  const staticed = [];
  const player = createAcknowledgementPlayer({
    phrases: ["Okay.", "Got it."],
    staticBlob: async (phrase) => { staticed.push(phrase); return new Blob([phrase]); },
    loadBlob: async (phrase) => { loaded.push(phrase); return new Blob([phrase]); },
  });
  await player.preload();
  assert.deepEqual(staticed, ["Okay.", "Got it."]);
  assert.deepEqual(loaded, []);
  assert.equal(player.loadedCount, 2);
});

test("the player falls back to loadBlob when the static audio is missing", async () => {
  const loaded = [];
  const player = createAcknowledgementPlayer({
    phrases: ["Okay.", "Got it."],
    staticBlob: async () => { throw new Error("404"); },
    loadBlob: async (phrase) => { loaded.push(phrase); return new Blob([phrase]); },
  });
  await player.preload();
  assert.deepEqual(loaded, ["Okay.", "Got it."]);
  assert.equal(player.loadedCount, 2);
});

test("the azure reaction path lives apart from the Chatterbox one, per voice", () => {
  assert.equal(reactionAudioPath("en-US-AvaNeural", "Got it.", "azure"), "/audio/reactions-azure/en-US-AvaNeural/got-it.mp3");
  assert.equal(reactionAudioPath("en-US-AvaNeural", "Got it.", "chatterbox"), "/audio/reactions/en-US-AvaNeural/got-it.mp3");
  assert.equal(reactionAudioPath("en-US-AvaNeural", "Got it."), "/audio/reactions/en-US-AvaNeural/got-it.mp3", "chatterbox is the default source");
  assert.equal(reactionAudioPath("not-a-voice", "Okay.", "azure"), `/audio/reactions-azure/${DEFAULT_INTERVIEWER_VOICE}/okay.mp3`);
});

test("loadStaticReaction fetches the path of its source and rejects a missing file", async () => {
  const requested = [];
  const fetcher = async (url) => { requested.push(url); return { ok: url.includes("reactions-azure"), status: 404, blob: async () => new Blob(["x"]) }; };
  assert.ok(await loadStaticReaction("en-US-AvaNeural", "Okay.", "azure", fetcher) instanceof Blob);
  await assert.rejects(loadStaticReaction("en-US-AvaNeural", "Okay.", "chatterbox", fetcher), /Static reaction unavailable: 404/);
  assert.deepEqual(requested, ["/audio/reactions-azure/en-US-AvaNeural/okay.mp3", "/audio/reactions/en-US-AvaNeural/okay.mp3"]);
});
