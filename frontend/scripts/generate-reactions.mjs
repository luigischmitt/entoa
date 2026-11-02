// Synthesizes the static interviewer reactions (one MP3 per phrase and voice and source) into
// public/audio/reactions/<voice id>/ (Chatterbox, through DeepInfra) and public/audio/reactions-azure/<voice id>/ (Azure Speech).
// Existing files are kept, so a re-run only fills the gaps; `--force-primary` regenerates the Chatterbox files in reactions/.
// Chatterbox needs DEEPINFRA_API_KEY; Azure needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION. Each env var is required only
// when a file of that source is actually missing (or regenerated).

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ACKNOWLEDGEMENT_PHRASES } from "../src/lib/interview/acknowledgement.mjs";
import { CONVERSATION_REACTIONS, reactionFileName } from "../src/lib/interview/static-reactions.mjs";
import { INTERVIEWER_VOICE_OPTIONS } from "../src/lib/interview/voices.mjs";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");
const chatterboxEndpoint = "https://api.deepinfra.com/v1/inference/ResembleAI/chatterbox-turbo";
const attempts = 3;
const forcePrimary = process.argv.includes("--force-primary");

// Chatterbox voice ids (DeepInfra), by the interviewer voice id the app selects.
const chatterboxVoiceIds = {
  "en-US-AndrewNeural": "pxukbhrmd6in9omcerme",
  "en-US-BrianNeural": "1di0faf2tnibx9ccbp08",
  "en-US-GuyNeural": "7sy7qh963bdp4d61cbke",
  "en-GB-RyanNeural": "u3o3sghrrgld77jxi368",
  "en-US-AvaNeural": "nkwdqjkpkb656sng0njk",
  "en-US-EmmaNeural": "qhoy6haei50tv441nacf",
  "en-US-JennyNeural": "hjaqgzxdrdyd2jkwsdsi",
  "en-GB-SoniaNeural": "v3oq44tcx0dgkwlhis7f",
};

const phrases = [...new Set([...ACKNOWLEDGEMENT_PHRASES, ...CONVERSATION_REACTIONS])];
const sources = {
  chatterbox: { folder: "reactions", concurrency: 3 },
  azure: { folder: "reactions-azure", concurrency: 2 },
};
const jobs = Object.entries(sources).flatMap(([source, { folder }]) =>
  INTERVIEWER_VOICE_OPTIONS.flatMap((voice) => phrases.map((phrase) => ({ source, voice, phrase, file: join(publicRoot, folder, voice.id, reactionFileName(phrase)) }))));

const exists = (file) => access(file).then(() => true, () => false);

// Chatterbox (DeepInfra): one request per phrase; the MP3 comes back as a base64 data URL in `audio`.
async function synthesizeChatterbox({ voice, phrase }, env) {
  const response = await fetch(chatterboxEndpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.DEEPINFRA_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: phrase, voice_id: chatterboxVoiceIds[voice.id], exaggeration: 0.85, cfg: 0.4, response_format: "mp3" }),
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const { audio } = await response.json();
  const encoded = String(audio ?? "").replace(/^data:audio\/mp3;base64,/u, "");
  if (!encoded) throw new Error("No audio in the Chatterbox response");
  return Buffer.from(encoded, "base64");
}

// Azure: the same REST call as backend/src/speech/azure-speech-provider.ts (SSML, 24 kHz MP3, rate +0%).
const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
async function synthesizeAzure({ voice, phrase }, env) {
  const response = await fetch(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "entoa-backend",
    },
    body: `<speak version='1.0' xml:lang='en-US'><voice name='${escapeXml(voice.id)}'><prosody rate='+0%'>${escapeXml(phrase)}</prosody></voice></speak>`,
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

const synthesizers = { chatterbox: synthesizeChatterbox, azure: synthesizeAzure };

async function generate(job, env) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const bytes = await synthesizers[job.source](job, env);
      await mkdir(dirname(job.file), { recursive: true });
      await writeFile(job.file, bytes);
      console.log(`ok ${job.source} ${job.voice.id} ${job.phrase}`);
      return;
    } catch (error) {
      console.error(`attempt ${attempt}/${attempts} failed for ${job.source} ${job.voice.id} "${job.phrase}": ${error.message}`);
      // Azure throttles with 429: back off longer before retrying.
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, (error.status === 429 ? 2_000 : 500) * attempt));
    }
  }
}

const pending = [];
for (const job of jobs) if ((forcePrimary && job.source === "chatterbox") || !(await exists(job.file))) pending.push(job);

if (pending.length === 0) {
  console.log(`All ${jobs.length} reaction files already exist.`);
} else {
  const env = process.env;
  const missingEnv = [];
  for (const source of Object.keys(sources)) {
    if (!pending.some((job) => job.source === source)) continue;
    const required = source === "chatterbox" ? ["DEEPINFRA_API_KEY"] : ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"];
    for (const name of required) if (!env[name]) missingEnv.push(`${name} (for ${source} files)`);
  }
  if (missingEnv.length > 0) {
    console.error(`Missing environment variable(s) to synthesize the missing reactions: ${missingEnv.join(", ")}.`);
    process.exit(1);
  }
  await Promise.all(Object.entries(sources).map(async ([source, { concurrency }]) => {
    const queue = pending.filter((job) => job.source === source);
    let next = 0;
    const worker = async () => {
      for (;;) {
        const job = queue[next++];
        if (!job) return;
        await generate(job, env);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  }));
}

const missing = [];
for (const job of jobs) if (!(await exists(job.file))) missing.push(job.file);
if (missing.length > 0) {
  console.error(`${missing.length} reaction file(s) still missing:\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`${jobs.length} reaction files ready in ${publicRoot}.`);
