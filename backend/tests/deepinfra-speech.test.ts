import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSpeechConfig } from "../src/speech/config.js";
import { createSpeechProvider } from "../src/speech/create-speech-provider.js";
import { DeepInfraSpeechProvider } from "../src/speech/deepinfra-speech-provider.js";
import { SpeechProviderUnavailableError } from "../src/speech/errors.js";
import { HybridSpeechProvider } from "../src/speech/hybrid-speech-provider.js";
import type { SpeechSynthesisRequest } from "../src/speech/types.js";

const url = "https://api.deepinfra.test/v1/openai/audio/speech";
const req: SpeechSynthesisRequest = { text: "Tell me about yourself.", voice: "am_echo", speed: 1, format: "mp3" };
const secretText = "SECRET-INTERVIEW-TEXT";

const audio = (body = "mp3") => new Response(Buffer.from(body), { status: 200, headers: { "content-type": "audio/mpeg" } });
const fail = (status: number) => new Response(`echo ${secretText}`, { status });
const stall = (init: RequestInit) => new Promise<Response>((_, reject) => {
  // Mirrors fetch: an aborted request rejects with the abort reason.
  init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
});

function provider(fetchImplementation: typeof fetch, log = vi.fn(), timeoutMs = 1_000) {
  return new DeepInfraSpeechProvider({ apiKey: "test-key", url, model: "hexgrad/Kokoro-82M", timeoutMs, fetchImplementation, log });
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("DeepInfra speech provider", () => {
  it("posts the exact URL, headers and body, and omits speed at 1", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const speech = provider(async (input, init) => { calls.push({ url: String(input), init }); return audio("abc"); });
    const result = await speech.synthesize(req);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(url);
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.headers).toEqual({ "content-type": "application/json", authorization: "Bearer test-key" });
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ model: "hexgrad/Kokoro-82M", input: req.text, voice: "am_echo", response_format: "mp3" });
    expect(result).toMatchObject({ contentType: "audio/mpeg", diagnostics: { upstream: "DeepInfra" } });
    expect(result.audio.toString()).toBe("abc");
  });

  it("sends speed only when it is not 1", async () => {
    const bodies: unknown[] = [];
    const speech = provider(async (_input, init) => { bodies.push(JSON.parse(init?.body as string)); return audio(); });
    await speech.synthesize({ ...req, speed: 1.2 });
    expect(bodies[0]).toMatchObject({ speed: 1.2 });
    await speech.synthesize(req);
    expect(bodies[1]).not.toHaveProperty("speed");
  });

  it("reports only the status on HTTP errors and never logs the body text", async () => {
    const log = vi.fn();
    await expect(provider(async () => fail(503), log).synthesize(req)).rejects.toMatchObject({ status: 503 });
    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0][0] as string;
    expect(JSON.parse(line)).toMatchObject({ event: "speech_upstream_failure", provider: "deepinfra", upstream: "DeepInfra", status: 503 });
    expect(line).not.toContain(secretText);
    expect(line).not.toContain(req.text);
  });

  it("throws on empty audio", async () => {
    await expect(provider(async () => new Response(Buffer.alloc(0), { status: 200 })).synthesize(req)).rejects.toBeInstanceOf(SpeechProviderUnavailableError);
  });

  it("logs usage with characters and duration, never the text", async () => {
    const log = vi.fn();
    await provider(async () => audio(), log).synthesize(req);
    const line = log.mock.calls[0][0] as string;
    expect(JSON.parse(line)).toMatchObject({ event: "speech_usage", provider: "deepinfra", chars: req.text.length });
    expect(JSON.parse(line).durationMs).toBeGreaterThanOrEqual(0);
    expect(line).not.toContain(req.text);
  });

  it("makes no network call for health and warms the origin once within the throttle", async () => {
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 200 }));
    const speech = provider(fetchImplementation as unknown as typeof fetch);
    expect(await speech.health()).toEqual({ status: "ready" });
    expect(fetchImplementation).not.toHaveBeenCalled();
    speech.warmConnection();
    speech.warmConnection();
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(fetchImplementation.mock.calls[0]).toEqual(["https://api.deepinfra.test", expect.objectContaining({ method: "HEAD" })]);
  });
});

describe("deepinfra-openrouter-azure fallback order", () => {
  const env = {
    SPEECH_PROVIDER: "deepinfra-openrouter-azure",
    DEEPINFRA_API_KEY: "deep-key",
    OPENROUTER_API_KEY: "open-key",
    AZURE_SPEECH_KEY: "azure-key",
    AZURE_SPEECH_REGION: "brazilsouth",
    DEEPINFRA_SPEECH_URL: url,
    DEEPINFRA_SPEECH_FALLBACK_AFTER_MS: "200",
    OPENROUTER_SPEECH_HEDGE_AFTER_MS: "0",
    HYBRID_SPEECH_HEDGE_AFTER_MS: "1000",
  };

  // Routes each upstream by host and records the order of calls.
  function routeFetch(routes: { deepinfra: (init: RequestInit) => Promise<Response> | Response; openrouter: (init: RequestInit) => Promise<Response> | Response; azure: (init: RequestInit) => Promise<Response> | Response }) {
    const calls: string[] = [];
    const fetchImplementation = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const target = String(input);
      const key = target.includes("api.deepinfra.test") ? "deepinfra" : target.includes("openrouter.ai") ? "openrouter" : "azure";
      calls.push(key);
      return routes[key](init ?? {});
    });
    vi.stubGlobal("fetch", fetchImplementation);
    return calls;
  }

  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("builds an outer hybrid around an inner hybrid", () => {
    const config = loadSpeechConfig(env);
    expect(createSpeechProvider(config)).toBeInstanceOf(HybridSpeechProvider);
  });

  it("uses DeepInfra alone when it answers first", async () => {
    const calls = routeFetch({ deepinfra: () => audio("deep"), openrouter: () => audio("open"), azure: () => audio("azure") });
    const result = await createSpeechProvider(loadSpeechConfig(env)).synthesize(req);
    expect(calls).toEqual(["deepinfra"]);
    expect(result.audio.toString()).toBe("deep");
    expect(result.diagnostics).toMatchObject({ voiceSource: "openrouter", upstream: "DeepInfra", hedge: "not_needed" });
  });

  it("falls back to OpenRouter immediately when DeepInfra fails fast", async () => {
    const calls = routeFetch({ deepinfra: () => fail(500), openrouter: () => audio("open"), azure: () => audio("azure") });
    const result = await createSpeechProvider(loadSpeechConfig(env)).synthesize(req);
    expect(calls).toEqual(["deepinfra", "openrouter"]);
    expect(result.audio.toString()).toBe("open");
    expect(result.diagnostics?.voiceSource).toBe("openrouter");
  });

  it("uses Azure as the last resort when both Kokoro upstreams fail", async () => {
    const calls = routeFetch({ deepinfra: () => fail(500), openrouter: () => fail(502), azure: () => audio("azure") });
    const result = await createSpeechProvider(loadSpeechConfig(env)).synthesize(req);
    expect(calls).toEqual(["deepinfra", "openrouter", "azure"]);
    expect(result.audio.toString()).toBe("azure");
    expect(result.diagnostics?.voiceSource).toBe("azure");
  });

  it("lets OpenRouter join after fallbackAfterMs when DeepInfra stalls", async () => {
    const calls = routeFetch({ deepinfra: stall, openrouter: () => audio("open"), azure: () => audio("azure") });
    const started = Date.now();
    const pending = createSpeechProvider(loadSpeechConfig(env)).synthesize(req);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toEqual(["deepinfra"]);
    const result = await pending;
    expect(calls).toEqual(["deepinfra", "openrouter"]);
    expect(Date.now() - started).toBeGreaterThanOrEqual(190);
    expect(result.audio.toString()).toBe("open");
    expect(result.diagnostics?.voiceSource).toBe("openrouter");
  });

  it("sends the same single voice to both Kokoro upstreams", async () => {
    const bodies: Record<string, unknown[]> = { deepinfra: [], openrouter: [] };
    routeFetch({
      deepinfra: (init) => { bodies.deepinfra.push(JSON.parse(init.body as string)); return fail(500); },
      openrouter: (init) => { bodies.openrouter.push(JSON.parse(init.body as string)); return audio(); },
      azure: () => audio(),
    });
    await createSpeechProvider(loadSpeechConfig(env)).synthesize({ ...req, voice: "en-US-EmmaNeural" });
    // Emma maps to the Kokoro voice af_bella, and both Kokoro upstreams must speak it.
    expect(bodies.deepinfra[0]).toMatchObject({ voice: "af_bella" });
    expect(bodies.openrouter[0]).toMatchObject({ voice: "af_bella" });
  });
});

describe("deepinfra-openrouter-azure config", () => {
  const env = { SPEECH_PROVIDER: "deepinfra-openrouter-azure", DEEPINFRA_API_KEY: "deep-key", OPENROUTER_API_KEY: "open-key", AZURE_SPEECH_KEY: "azure-key", AZURE_SPEECH_REGION: "brazilsouth" };

  it("requires DEEPINFRA_API_KEY without leaking other keys", () => {
    const { DEEPINFRA_API_KEY: _omit, ...withoutDeepInfra } = env;
    expect(() => loadSpeechConfig(withoutDeepInfra)).toThrow(/DEEPINFRA_API_KEY/);
    expect(() => loadSpeechConfig({ ...env, DEEPINFRA_API_KEY: "  " })).toThrow(/DEEPINFRA_API_KEY/);
  });

  it("still requires the OpenRouter and Azure configuration", () => {
    const { OPENROUTER_API_KEY: _omit, ...withoutOpenRouter } = env;
    expect(() => loadSpeechConfig(withoutOpenRouter)).toThrow(/OPENROUTER_API_KEY/);
    const { AZURE_SPEECH_KEY: _omitAzure, ...withoutAzure } = env;
    expect(() => loadSpeechConfig(withoutAzure)).toThrow(/AZURE_SPEECH_KEY/);
  });

  it("uses the documented defaults", () => {
    const config = loadSpeechConfig(env);
    expect(config).toMatchObject({
      provider: "deepinfra-openrouter-azure",
      interviewerVoice: "en-US-AndrewNeural",
      hybrid: { hedgeAfterMs: 4_000, openRouterVoice: "am_echo" },
      deepInfra: { apiKey: "deep-key", url: "https://api.deepinfra.com/v1/openai/audio/speech", model: "hexgrad/Kokoro-82M", timeoutMs: 6_000, fallbackAfterMs: 1_500 },
    });
    expect(config.openRouter?.hedgeAfterMs).toBe(2_000);
  });

  it("lets the hybrid hedge and DeepInfra timings be overridden and validated", () => {
    const config = loadSpeechConfig({ ...env, HYBRID_SPEECH_HEDGE_AFTER_MS: "2500", DEEPINFRA_SPEECH_TIMEOUT_MS: "4000", DEEPINFRA_SPEECH_FALLBACK_AFTER_MS: "0" });
    expect(config.hybrid?.hedgeAfterMs).toBe(2_500);
    expect(config.deepInfra).toMatchObject({ timeoutMs: 4_000, fallbackAfterMs: 0 });
    expect(() => loadSpeechConfig({ ...env, DEEPINFRA_SPEECH_FALLBACK_AFTER_MS: "10001" })).toThrow(/DEEPINFRA_SPEECH_FALLBACK_AFTER_MS/);
    expect(() => loadSpeechConfig({ ...env, DEEPINFRA_SPEECH_FALLBACK_AFTER_MS: "1.5" })).toThrow(/DEEPINFRA_SPEECH_FALLBACK_AFTER_MS/);
  });
});
