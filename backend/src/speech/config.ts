import { defaultInterviewerVoice } from "./voices.js";
import type { AudioFormat } from "./types.js";

export type SpeechConfig = {
  provider: "fake" | "chatterbox-azure";
  /** Azure public voice id: the Azure fallback voice, and the default for requests without a selectable voice. */
  interviewerVoice: string;
  defaultSpeed: number;
  format: AudioFormat;
  /** Chatterbox on DeepInfra, the main voice in 'chatterbox-azure'. */
  chatterbox?: { apiKey: string; url: string; timeoutMs: number };
  /** Hybrid hedge and pinned fallback delays. */
  hybrid?: { hedgeAfterMs: number; pinnedFallbackAfterMs: number };
  azure?: { key: string; region: string; voice: string; timeoutMs: number; cooldownMs: number };
  /** Server-side cache of finished audio, joined with in-flight syntheses and prefetched from next-turn decisions. Absent = off. */
  cache?: { ttlMs: number; staticTtlMs: number; prefetch: boolean; prefetchChunks: number };
};

const chatterboxSpeechUrl = "https://api.deepinfra.com/v1/inference/ResembleAI/chatterbox-turbo";

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Speech configuration values must be positive numbers.");
  }

  return parsed;
}

function parseHybridHedgeAfterMs(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 30_000) {
    throw new Error("HYBRID_SPEECH_HEDGE_AFTER_MS must be an integer between 0 and 30000.");
  }
  return parsed;
}

function parseIntegerInRange(name: string, value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function loadCacheConfig(environment: NodeJS.ProcessEnv): NonNullable<SpeechConfig["cache"]> {
  return {
    ttlMs: parseIntegerInRange("SPEECH_CACHE_TTL_MS", environment.SPEECH_CACHE_TTL_MS, 60_000, 0, 600_000),
    staticTtlMs: parseIntegerInRange("SPEECH_STATIC_CACHE_TTL_MS", environment.SPEECH_STATIC_CACHE_TTL_MS, 3_600_000, 0, 86_400_000),
    prefetch: (environment.SPEECH_PREFETCH?.trim() || "1") !== "0",
    prefetchChunks: parseIntegerInRange("SPEECH_PREFETCH_CHUNKS", environment.SPEECH_PREFETCH_CHUNKS, 1, 1, 4),
  };
}

export function loadSpeechConfig(environment = process.env): SpeechConfig {
  const provider = environment.SPEECH_PROVIDER ?? "fake";
  if (provider !== "fake" && provider !== "chatterbox-azure") {
    throw new Error("SPEECH_PROVIDER must be 'fake' or 'chatterbox-azure'.");
  }
  const interviewerVoice = environment.AZURE_TTS_VOICE?.trim() || defaultInterviewerVoice;

  let chatterbox: SpeechConfig["chatterbox"];
  let hybrid: SpeechConfig["hybrid"];
  let azure: SpeechConfig["azure"];
  if (provider === "chatterbox-azure") {
    const apiKey = environment.DEEPINFRA_API_KEY?.trim();
    if (!apiKey) throw new Error("DEEPINFRA_API_KEY is required when SPEECH_PROVIDER is 'chatterbox-azure'.");
    const key = environment.AZURE_SPEECH_KEY?.trim();
    const region = environment.AZURE_SPEECH_REGION?.trim();
    if (!key) throw new Error("AZURE_SPEECH_KEY is required when SPEECH_PROVIDER is 'chatterbox-azure'.");
    if (!region) throw new Error("AZURE_SPEECH_REGION is required when SPEECH_PROVIDER is 'chatterbox-azure'.");
    chatterbox = { apiKey, url: chatterboxSpeechUrl, timeoutMs: parsePositiveNumber(environment.CHATTERBOX_SPEECH_TIMEOUT_MS, 6_000) };
    // Azure joins after the hedge delay, or at once when Chatterbox fails; a pinned interview waits longer before Azure joins.
    hybrid = {
      hedgeAfterMs: parseHybridHedgeAfterMs(environment.HYBRID_SPEECH_HEDGE_AFTER_MS, 5_000),
      pinnedFallbackAfterMs: parseIntegerInRange("HYBRID_SPEECH_PINNED_FALLBACK_AFTER_MS", environment.HYBRID_SPEECH_PINNED_FALLBACK_AFTER_MS, 6_000, 0, 14_000),
    };
    azure = { key, region, voice: interviewerVoice, timeoutMs: parsePositiveNumber(environment.AZURE_TTS_TIMEOUT_MS, 8_000), cooldownMs: parsePositiveNumber(environment.AZURE_TTS_COOLDOWN_MS, 600_000) };
  }

  return {
    provider,
    interviewerVoice,
    defaultSpeed: parsePositiveNumber(environment.INTERVIEWER_SPEED, 1),
    format: "mp3",
    ...(chatterbox ? { chatterbox } : {}),
    ...(hybrid ? { hybrid } : {}),
    ...(azure ? { azure } : {}),
    cache: loadCacheConfig(environment),
  };
}
