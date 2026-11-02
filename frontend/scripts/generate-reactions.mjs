// Synthesizes the static interviewer reactions (one MP3 per phrase and voice) through OpenRouter's Kokoro speech endpoint into
// public/audio/reactions/<voice id>/. Existing files are kept, so a re-run only fills the gaps. Needs OPENROUTER_API_KEY.

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ACKNOWLEDGEMENT_PHRASES } from "../src/lib/interview/acknowledgement.mjs";
import { CONVERSATION_REACTIONS, reactionFileName } from "../src/lib/interview/static-reactions.mjs";
import { INTERVIEWER_VOICE_OPTIONS } from "../src/lib/interview/voices.mjs";

const outputRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio", "reactions");
const endpoint = "https://openrouter.ai/api/v1/audio/speech";
const concurrency = 4;
const attempts = 3;

const phrases = [...new Set([...ACKNOWLEDGEMENT_PHRASES, ...CONVERSATION_REACTIONS])];
const jobs = INTERVIEWER_VOICE_OPTIONS.flatMap((voice) => phrases.map((phrase) => ({ voice, phrase, file: join(outputRoot, voice.id, reactionFileName(phrase)) })));

const exists = (file) => access(file).then(() => true, () => false);

async function synthesize({ voice, phrase }, apiKey) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "hexgrad/kokoro-82m",
      input: phrase,
      voice: voice.kokoroVoice,
      response_format: "mp3",
      provider: { order: ["DeepInfra"], allow_fallbacks: true, data_collection: "deny" },
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function generate(job, apiKey) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const bytes = await synthesize(job, apiKey);
      await mkdir(dirname(job.file), { recursive: true });
      await writeFile(job.file, bytes);
      console.log(`ok ${job.voice.id} ${job.phrase}`);
      return;
    } catch (error) {
      console.error(`attempt ${attempt}/${attempts} failed for ${job.voice.id} "${job.phrase}": ${error.message}`);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

const pending = [];
for (const job of jobs) if (!(await exists(job.file))) pending.push(job);

if (pending.length === 0) {
  console.log(`All ${jobs.length} reaction files already exist.`);
} else {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set; cannot synthesize the missing reactions.");
    process.exit(1);
  }
  let next = 0;
  const worker = async () => {
    for (;;) {
      const job = pending[next++];
      if (!job) return;
      await generate(job, apiKey);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
}

const missing = [];
for (const job of jobs) if (!(await exists(job.file))) missing.push(job.file);
if (missing.length > 0) {
  console.error(`${missing.length} reaction file(s) still missing:\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`${jobs.length} reaction files ready in ${outputRoot}.`);
