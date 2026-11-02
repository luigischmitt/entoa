import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatterboxSpeechProvider } from "../src/speech/chatterbox-speech-provider.js";
import { SpeechProviderUnavailableError } from "../src/speech/errors.js";
import { resolveChatterboxVoice } from "../src/speech/voices.js";
import type { SpeechSynthesisRequest } from "../src/speech/types.js";

const url = "https://api.deepinfra.com/v1/inference/ResembleAI/chatterbox-turbo";
const andrewClone = "pxukbhrmd6in9omcerme";
const soniaClone = "v3oq44tcx0dgkwlhis7f";
const req: SpeechSynthesisRequest = { text: "Tell me about yourself.", voice: andrewClone, speed: 1, format: "mp3" };

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function recording(response: () => Response | Promise<Response> = () => Response.json({ audio: `data:audio/mp3;base64,${Buffer.from("mp3").toString("base64")}` })) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImplementation = (async (input: unknown, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return response();
  }) as typeof fetch;
  const log = vi.fn();
  const provider = new ChatterboxSpeechProvider({ apiKey: "key", url, timeoutMs: 1_000, fetchImplementation, log });
  return { provider, calls, log };
}

describe("Chatterbox speech provider", () => {
  it("posts the exact URL and body for two cloned voices", async () => {
    const { provider, calls } = recording();
    await provider.synthesize({ ...req, voice: andrewClone });
    await provider.synthesize({ ...req, voice: soniaClone, text: "Second." });
    expect(calls.map((call) => call.url)).toEqual([url, url]);
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.headers).toEqual({ "content-type": "application/json", authorization: "Bearer key" });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ text: "Tell me about yourself.", voice_id: andrewClone, exaggeration: 0.85, cfg: 0.4, response_format: "mp3" });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ text: "Second.", voice_id: soniaClone, exaggeration: 0.85, cfg: 0.4, response_format: "mp3" });
  });

  it("maps an unknown or legacy voice to Andrew's clone", () => {
    expect(resolveChatterboxVoice("en-US-AndrewNeural")).toBe(andrewClone);
    expect(resolveChatterboxVoice("en-GB-SoniaNeural")).toBe(soniaClone);
    expect(resolveChatterboxVoice("am_echo")).toBe(andrewClone);
    expect(resolveChatterboxVoice("nope")).toBe(andrewClone);
    expect(resolveChatterboxVoice(undefined)).toBe(andrewClone);
  });

  it("ignores the requested speed, which the model cannot apply", async () => {
    const { provider, calls } = recording();
    await provider.synthesize({ ...req, speed: 0.5 });
    await provider.synthesize({ ...req, speed: 1.6 });
    expect(calls[0].init?.body).toBe(calls[1].init?.body);
    expect(JSON.parse(String(calls[0].init?.body))).not.toHaveProperty("speed");
  });

  it("decodes the base64 data URL into audio and reports its upstream", async () => {
    const { provider } = recording();
    const speech = await provider.synthesize(req);
    expect(speech.audio.toString()).toBe("mp3");
    expect(speech.contentType).toBe("audio/mpeg");
    expect(speech.diagnostics).toEqual({ upstream: "Chatterbox" });
  });

  it("fails with a status-only error and never logs the response body", async () => {
    const { provider, log } = recording(() => new Response("SECRET-ECHOED-TEXT", { status: 500 }));
    const error = await provider.synthesize(req).catch((caught) => caught);
    expect(error).toBeInstanceOf(SpeechProviderUnavailableError);
    expect(error.status).toBe(500);
    expect(JSON.stringify([error.message, log.mock.calls])).not.toContain("SECRET");
    expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({ event: "speech_upstream_failure", provider: "chatterbox", upstream: "DeepInfra", status: 500, durationMs: expect.any(Number) });
  });

  it("treats a missing or empty audio field as a failure", async () => {
    for (const body of [{}, { audio: "" }, { audio: "data:audio/mp3;base64," }]) {
      const { provider } = recording(() => Response.json(body));
      await expect(provider.synthesize(req)).rejects.toBeInstanceOf(SpeechProviderUnavailableError);
    }
  });

  it("logs only the character count and duration after success", async () => {
    const { provider, log } = recording();
    await provider.synthesize(req);
    const entry = JSON.parse(log.mock.calls[0][0] as string);
    expect(entry).toMatchObject({ event: "speech_usage", provider: "chatterbox", chars: req.text.length });
    expect(JSON.stringify(entry)).not.toContain(req.text);
  });

  it("aborts the request at its provider timeout", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const provider = new ChatterboxSpeechProvider({
      apiKey: "key", url, timeoutMs: 1_000,
      fetchImplementation: (async (_input, init) => new Promise<Response>((_resolve, reject) => {
        requestSignal = init?.signal as AbortSignal;
        requestSignal.addEventListener("abort", () => reject(requestSignal?.reason), { once: true });
      })) as typeof fetch,
      log: () => undefined,
    });
    const pending = provider.synthesize(req);
    const rejection = expect(pending).rejects.toBeInstanceOf(SpeechProviderUnavailableError);
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    expect(requestSignal?.aborted).toBe(true);
  });

  it("forwards request cancellation to the fetch and does not log it as an upstream failure", async () => {
    let requestSignal: AbortSignal | undefined;
    const log = vi.fn();
    const provider = new ChatterboxSpeechProvider({
      apiKey: "key", url, timeoutMs: 1_000,
      fetchImplementation: (async (_input, init) => new Promise<Response>((_resolve, reject) => {
        requestSignal = init?.signal as AbortSignal;
        requestSignal.addEventListener("abort", () => reject(requestSignal?.reason), { once: true });
      })) as typeof fetch,
      log,
    });
    const requestAbort = new AbortController();
    const pending = provider.synthesize(req, requestAbort.signal);
    const rejection = expect(pending).rejects.toThrow();
    requestAbort.abort(new DOMException("Client disconnected", "AbortError"));
    await rejection;
    expect(requestSignal?.aborted).toBe(true);
    expect(log).not.toHaveBeenCalled();
  });

  it("converts transport errors to the provider fallback error", async () => {
    const provider = new ChatterboxSpeechProvider({
      apiKey: "key", url, timeoutMs: 1_000,
      fetchImplementation: async () => { throw new Error("connection refused"); },
      log: () => undefined,
    });
    await expect(provider.synthesize(req)).rejects.toBeInstanceOf(SpeechProviderUnavailableError);
  });

  it("makes no network call for health and throttles the connection warm-up", async () => {
    vi.useFakeTimers();
    const { provider, calls } = recording();
    await expect(provider.health()).resolves.toEqual({ status: "ready" });
    expect(calls).toHaveLength(0);
    provider.warmConnection();
    provider.warmConnection();
    expect(calls.map((call) => [call.url, call.init?.method])).toEqual([["https://api.deepinfra.com", "HEAD"]]);
  });
});
