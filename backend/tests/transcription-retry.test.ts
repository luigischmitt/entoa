import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import type { AccessTokenVerifier } from "../src/auth/access-token-verifier.js";
import type { SpeechConfig } from "../src/speech/config.js";
import { defaultRetainedAnswerAudio } from "../src/transcription/retained-answer-audio.js";
import type { TranscriptionService } from "../src/transcription/types.js";

const speechConfig: SpeechConfig = {
  provider: "fake",
  kokoroBaseUrl: "http://localhost:8880",
  kokoroTimeoutMs: 15_000,
  interviewerVoice: "af_bella+af_heart",
  defaultSpeed: 1,
  format: "mp3",
};

const verifier: AccessTokenVerifier = { verify: async () => ({ userId: "user-1" }) };

function transcriptionService(transcribe: TranscriptionService["transcribe"]): TranscriptionService {
  return { availableProviders: () => ["whisper-large-v3-turbo"], transcribe };
}

const tokens: string[] = [];
function retain(userId: string, text = "answer audio") {
  const token = defaultRetainedAnswerAudio.put(userId, { wav: Buffer.from(text), question: "Why this role?", durationMs: 62_000 });
  tokens.push(token);
  return token;
}

afterEach(() => {
  for (const token of tokens.splice(0)) defaultRetainedAnswerAudio.delete(token);
  vi.restoreAllMocks();
});

describe("POST /api/v1/transcriptions/retry", () => {
  it("rejects a token that is not a UUID", async () => {
    const transcribe = vi.fn();
    const testApp = createApp({ speechConfig, accessTokenVerifier: verifier, transcriptionService: transcriptionService(transcribe) });

    const response = await request(testApp).post("/api/v1/transcriptions/retry").set("authorization", "Bearer t").send({ retryToken: "not-a-token" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_RETRY_REQUEST");
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("returns 410 for an unknown token", async () => {
    const transcribe = vi.fn();
    const testApp = createApp({ speechConfig, accessTokenVerifier: verifier, transcriptionService: transcriptionService(transcribe) });

    const response = await request(testApp).post("/api/v1/transcriptions/retry").set("authorization", "Bearer t").send({ retryToken: "00000000-0000-4000-8000-000000000000" });

    expect(response.status).toBe(410);
    expect(response.body.error).toEqual({ code: "RETRY_EXPIRED", message: "O áudio desta resposta expirou. Grave novamente." });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("returns 410 when the audio belongs to another user", async () => {
    const transcribe = vi.fn();
    const token = retain("user-2");
    const testApp = createApp({ speechConfig, accessTokenVerifier: verifier, transcriptionService: transcriptionService(transcribe) });

    const response = await request(testApp).post("/api/v1/transcriptions/retry").set("authorization", "Bearer t").send({ retryToken: token });

    expect(response.status).toBe(410);
    expect(transcribe).not.toHaveBeenCalled();
    expect(defaultRetainedAnswerAudio.take("user-2", token)).not.toBeNull();
  });

  it("transcribes the retained audio, returns it and deletes the entry on success", async () => {
    // The store zero-fills the audio on delete, so the copy the service received is captured at call time.
    const received: Buffer[] = [];
    const transcribe = vi.fn(async (audio: Buffer) => {
      received.push(Buffer.from(audio));
      return { provider: "whisper-large-v3-turbo" as const, transcript: "I led the migration." };
    });
    const token = retain("user-1", "wav bytes");
    const testApp = createApp({ speechConfig, accessTokenVerifier: verifier, transcriptionService: transcriptionService(transcribe) });

    const response = await request(testApp).post("/api/v1/transcriptions/retry").set("authorization", "Bearer t").send({ retryToken: token });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "complete", provider: "whisper-large-v3-turbo", durationMs: 62_000, transcript: "I led the migration." });
    expect(received).toEqual([Buffer.from("wav bytes")]);
    expect(transcribe).toHaveBeenCalledWith(expect.any(Buffer), "whisper-large-v3-turbo", "wav", expect.anything(), { question: "Why this role?" });
    expect(defaultRetainedAnswerAudio.take("user-1", token)).toBeNull();
  });

  it("keeps the entry and returns 502 when transcription fails", async () => {
    const transcribe = vi.fn(async () => { throw new Error("upstream 503 secret"); });
    const token = retain("user-1");
    const testApp = createApp({ speechConfig, accessTokenVerifier: verifier, transcriptionService: transcriptionService(transcribe) });

    const response = await request(testApp).post("/api/v1/transcriptions/retry").set("authorization", "Bearer t").send({ retryToken: token });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("TRANSCRIPTION_FAILED");
    expect(JSON.stringify(response.body)).not.toContain("secret");
    expect(defaultRetainedAnswerAudio.take("user-1", token)).not.toBeNull();
  });

  it("deletes the entry and returns 422 when no speech is recognized", async () => {
    const transcribe = vi.fn(async () => ({ provider: "whisper-large-v3-turbo" as const, transcript: "   " }));
    const token = retain("user-1");
    const testApp = createApp({ speechConfig, accessTokenVerifier: verifier, transcriptionService: transcriptionService(transcribe) });

    const response = await request(testApp).post("/api/v1/transcriptions/retry").set("authorization", "Bearer t").send({ retryToken: token });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("NO_SPEECH_RECOGNIZED");
    expect(defaultRetainedAnswerAudio.take("user-1", token)).toBeNull();
  });
});
