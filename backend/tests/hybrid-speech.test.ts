import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadSpeechConfig, type SpeechConfig } from "../src/speech/config.js";
import { createSpeechProvider } from "../src/speech/create-speech-provider.js";
import { SpeechProviderUnavailableError } from "../src/speech/errors.js";
import { HybridSpeechProvider } from "../src/speech/hybrid-speech-provider.js";
import { InterviewerSpeechPrefetcher } from "../src/speech/interviewer-prefetcher.js";
import type { SpeechProvider, SpeechSynthesisRequest, SynthesizedSpeech } from "../src/speech/types.js";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const req: SpeechSynthesisRequest = { text: "Tell me about yourself.", voice: "en-US-AvaNeural", speed: 1, format: "mp3" };
const avaClone = "nkwdqjkpkb656sng0njk";

type Pending = { request: SpeechSynthesisRequest; signal?: AbortSignal; resolve: (s: SynthesizedSpeech) => void; reject: (e: unknown) => void };
function controllable(name: string) {
  const calls: Pending[] = [];
  const provider: SpeechProvider = {
    name,
    health: async () => ({ status: "ready" }),
    synthesize: (request, signal) => new Promise((resolve, reject) => {
      calls.push({ request, signal, resolve, reject });
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
  };
  return { provider, calls };
}
const audio = (text = "a") => ({ audio: Buffer.from(text), contentType: "audio/mpeg" });

function hybrid(overrides: { hedgeAfterMs?: number; timeoutMs?: number; pinnedFallbackAfterMs?: number } = {}) {
  const primary = controllable("chatterbox");
  const secondary = controllable("azure");
  const provider = new HybridSpeechProvider({
    primary: primary.provider, secondary: secondary.provider,
    secondaryVoice: "en-US-AndrewNeural",
    timeoutMs: overrides.timeoutMs ?? 15_000, hedgeAfterMs: overrides.hedgeAfterMs ?? 2_500,
    ...(overrides.pinnedFallbackAfterMs === undefined ? {} : { pinnedFallbackAfterMs: overrides.pinnedFallbackAfterMs }),
  });
  return { provider, primary, secondary };
}

describe("hybrid speech race", () => {
  it("sends the Chatterbox clone to the primary and the Azure id to the secondary", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize(req);
    expect(primary.calls[0].request.voice).toBe(avaClone);
    primary.calls[0].resolve(audio("p"));
    const result = await pending;
    expect(result.audio.toString()).toBe("p");
    expect(result.diagnostics).toEqual({ hedge: "not_needed", voiceSource: "chatterbox" });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(secondary.calls).toHaveLength(0);
  });

  it("starts the secondary after the hedge delay; secondary wins and the primary is aborted", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize(req);
    await vi.advanceTimersByTimeAsync(2_499);
    expect(secondary.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(secondary.calls).toHaveLength(1);
    expect(secondary.calls[0].request.voice).toBe("en-US-AvaNeural");
    secondary.calls[0].resolve(audio("s"));
    const result = await pending;
    expect(result.audio.toString()).toBe("s");
    expect(result.diagnostics).toEqual({ hedge: "hedge_won", voiceSource: "azure" });
    expect(primary.calls[0].signal?.aborted).toBe(true);
  });

  it("reports primary_won when the primary answers after the hedge started, and aborts the secondary", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize(req);
    await vi.advanceTimersByTimeAsync(2_500);
    primary.calls[0].resolve(audio("p"));
    expect((await pending).diagnostics).toEqual({ hedge: "primary_won", voiceSource: "chatterbox" });
    expect(secondary.calls[0].signal?.aborted).toBe(true);
  });

  it("starts the secondary immediately when the primary fails fast", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize(req);
    primary.calls[0].reject(new SpeechProviderUnavailableError("down"));
    await vi.advanceTimersByTimeAsync(0);
    expect(secondary.calls).toHaveLength(1);
    secondary.calls[0].resolve(audio("s"));
    expect((await pending).diagnostics).toMatchObject({ hedge: "hedge_won", voiceSource: "azure" });
  });

  it("treats empty primary audio as a failure", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize(req);
    primary.calls[0].resolve(audio(""));
    await vi.advanceTimersByTimeAsync(0);
    secondary.calls[0].resolve(audio("s"));
    expect((await pending).audio.toString()).toBe("s");
  });

  it("rejects with a status-only unavailable error when both fail", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize({ ...req, text: "SECRET-TEXT" });
    const assertion = pending.catch((e) => e);
    primary.calls[0].reject(new SpeechProviderUnavailableError("SECRET-TEXT"));
    await vi.advanceTimersByTimeAsync(0);
    secondary.calls[0].reject(new SpeechProviderUnavailableError("SECRET-TEXT"));
    const error = await assertion;
    expect(error).toBeInstanceOf(SpeechProviderUnavailableError);
    expect(error.message).not.toContain("SECRET");
    expect(error.diagnostics).toEqual({ hedge: "both_failed" });
  });

  it("does not time-hedge when disabled, but still falls back on failure", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid({ hedgeAfterMs: 0 });
    const pending = provider.synthesize(req);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(secondary.calls).toHaveLength(0);
    primary.calls[0].reject(new SpeechProviderUnavailableError("down"));
    await vi.advanceTimersByTimeAsync(0);
    expect(secondary.calls).toHaveLength(1);
    secondary.calls[0].resolve(audio("s"));
    await pending;
  });

  it("fails with both_failed at the overall timeout and aborts both", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid({ timeoutMs: 5_000 });
    const pending = provider.synthesize(req);
    const assertion = expect(pending).rejects.toMatchObject({ diagnostics: { hedge: "both_failed" } });
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    expect(primary.calls[0].signal?.aborted).toBe(true);
    expect(secondary.calls[0].signal?.aborted).toBe(true);
  });

  it("propagates a caller abort and aborts both providers", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const controller = new AbortController();
    const pending = provider.synthesize(req, controller.signal);
    await vi.advanceTimersByTimeAsync(2_500);
    const reason = new Error("client left");
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(primary.calls[0].signal?.aborted).toBe(true);
    expect(secondary.calls[0].signal?.aborted).toBe(true);
    const already = new AbortController(); already.abort(reason);
    await expect(provider.synthesize(req, already.signal)).rejects.toBe(reason);
    expect(primary.calls).toHaveLength(1);
  });
});

describe("hybrid connection warming and health", () => {
  it("forwards connection warming to children that support it", () => {
    const primary = { ...controllable("chatterbox").provider, warmConnection: vi.fn() };
    const secondary = { ...controllable("azure").provider, warmConnection: vi.fn(() => { throw new Error("down"); }) };
    const provider = new HybridSpeechProvider({ ...hybrid().provider["options"], primary, secondary });
    expect(() => provider.warmConnection()).not.toThrow();
    expect(primary.warmConnection).toHaveBeenCalledTimes(1);
    expect(secondary.warmConnection).toHaveBeenCalledTimes(1);
  });

  it("makes no network call on health", async () => {
    await expect(hybrid().provider.health()).resolves.toEqual({ status: "ready" });
  });
});

describe("hybrid config and factory", () => {
  const env = { SPEECH_PROVIDER: "chatterbox-azure", DEEPINFRA_API_KEY: "key", AZURE_SPEECH_KEY: "azure-key", AZURE_SPEECH_REGION: "brazilsouth" };

  it("parses defaults and builds the hybrid chain", () => {
    const config = loadSpeechConfig(env);
    expect(config).toMatchObject({
      provider: "chatterbox-azure",
      interviewerVoice: "en-US-AndrewNeural",
      chatterbox: { apiKey: "key", url: "https://api.deepinfra.com/v1/inference/ResembleAI/chatterbox-turbo", timeoutMs: 6_000 },
      hybrid: { hedgeAfterMs: 5_000, pinnedFallbackAfterMs: 6_000 },
      azure: { key: "azure-key", region: "brazilsouth", voice: "en-US-AndrewNeural", timeoutMs: 8_000 },
    });
    expect(createSpeechProvider(config).name).toBe("hybrid");
    const custom = loadSpeechConfig({ ...env, CHATTERBOX_SPEECH_TIMEOUT_MS: "4000", HYBRID_SPEECH_HEDGE_AFTER_MS: "0", HYBRID_SPEECH_PINNED_FALLBACK_AFTER_MS: "0", AZURE_TTS_VOICE: "en-GB-RyanNeural" });
    expect(custom).toMatchObject({ chatterbox: { timeoutMs: 4_000 }, hybrid: { hedgeAfterMs: 0, pinnedFallbackAfterMs: 0 }, interviewerVoice: "en-GB-RyanNeural" });
  });

  it("defaults to the fake provider with no speech credentials", () => {
    const config = loadSpeechConfig({});
    expect(config.provider).toBe("fake");
    expect(config.chatterbox).toBeUndefined();
    expect(createSpeechProvider(config).name).toBe("fake");
  });

  it("validates requirements without leaking secrets", () => {
    expect(() => loadSpeechConfig({ ...env, DEEPINFRA_API_KEY: "" })).toThrow(/DEEPINFRA_API_KEY/);
    expect(() => loadSpeechConfig({ ...env, AZURE_SPEECH_KEY: "" })).toThrow(/AZURE_SPEECH_KEY/);
    expect(() => loadSpeechConfig({ ...env, AZURE_SPEECH_REGION: "" })).toThrow(/AZURE_SPEECH_REGION/);
    expect(() => loadSpeechConfig({ ...env, HYBRID_SPEECH_HEDGE_AFTER_MS: "-1" })).toThrow(/HYBRID_SPEECH_HEDGE_AFTER_MS/);
    expect(() => loadSpeechConfig({ ...env, HYBRID_SPEECH_PINNED_FALLBACK_AFTER_MS: "14001" })).toThrow(/HYBRID_SPEECH_PINNED_FALLBACK_AFTER_MS/);
    expect(() => loadSpeechConfig({ SPEECH_PROVIDER: "openrouter" })).toThrow(/chatterbox-azure/);
  });

  it("sends the Chatterbox clone to DeepInfra and the Azure voice to Azure", async () => {
    const bodies: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      const host = new URL(url).host;
      const body = String(init?.body);
      bodies[host] = body.startsWith("{") ? (JSON.parse(body) as { voice_id: string }).voice_id : body.match(/voice name='([^']+)'/)?.[1];
      if (host === "api.deepinfra.com") throw new Error("down");
      return new Response("audio");
    });
    try {
      const provider = createSpeechProvider(loadSpeechConfig(env));
      await provider.synthesize(req);
      expect(bodies).toEqual({ "api.deepinfra.com": avaClone, "brazilsouth.tts.speech.microsoft.com": "en-US-AvaNeural" });
    } finally { vi.unstubAllGlobals(); }
  });
});

describe("warmup route and logging", () => {
  const speechConfig: SpeechConfig = { provider: "fake", interviewerVoice: "en-US-AndrewNeural", defaultSpeed: 1, format: "mp3" };

  it("answers 204 when there is no cache or prefetcher to warm", async () => {
    const provider: SpeechProvider = { name: "fake", health: async () => ({ status: "ready" }), synthesize: async () => audio() };
    const app = createApp({ speechConfig, speechProvider: provider, accessTokenVerifier: null, thinkingService: null, reportService: null });
    expect((await request(app).post("/api/v1/speech/warmup")).status).toBe(204);
  });

  it("serves warmup-status as always ready, no-store", async () => {
    const provider: SpeechProvider = { name: "hybrid", health: async () => ({ status: "ready" }), synthesize: async () => audio() };
    const app = createApp({ speechConfig, speechProvider: provider, accessTokenVerifier: null, thinkingService: null, reportService: null });
    const response = await request(app).get("/api/v1/speech/warmup-status");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ voice: "ready" });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("logs hybrid provider, voiceSource and hedge without content", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const provider: SpeechProvider = { name: "hybrid", health: async () => ({ status: "ready" }), synthesize: async () => ({ ...audio(), diagnostics: { hedge: "hedge_won", voiceSource: "azure" } }) };
    const app = createApp({ speechConfig, speechProvider: provider, accessTokenVerifier: null, thinkingService: null, reportService: null });
    await request(app).post("/api/v1/speech").send({ text: "SECRET-TEXT" });
    const entry = info.mock.calls.map((c) => String(c[0])).find((l) => l.includes("speech_synthesis_timing"))!;
    expect(JSON.parse(entry)).toMatchObject({ provider: "hybrid", voiceSource: "azure", hedge: "hedge_won", status: "ok" });
    expect(entry).not.toContain("SECRET");
  });
});

describe("hybrid voice source preference", () => {
  it("starts a preferred secondary at once and never calls the primary while it answers", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize({ ...req, preferredSource: "azure" });
    expect(secondary.calls).toHaveLength(1);
    expect(secondary.calls[0].request.voice).toBe("en-US-AvaNeural");
    expect(secondary.calls[0].request).not.toHaveProperty("preferredSource");
    secondary.calls[0].resolve(audio("s"));
    expect((await pending).diagnostics).toMatchObject({ voiceSource: "azure" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(primary.calls).toHaveLength(0);
  });

  it("falls back to the primary when the preferred secondary fails, and the primary wins", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize({ ...req, preferredSource: "azure" });
    secondary.calls[0].reject(new SpeechProviderUnavailableError("down"));
    await vi.advanceTimersByTimeAsync(0);
    expect(primary.calls).toHaveLength(1);
    expect(primary.calls[0].request).not.toHaveProperty("preferredSource");
    primary.calls[0].resolve(audio("p"));
    expect((await pending).diagnostics).toMatchObject({ voiceSource: "chatterbox" });
  });

  it("rejects with both_failed when the preferred secondary and the fallback primary both fail", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize({ ...req, preferredSource: "azure" });
    const assertion = expect(pending).rejects.toMatchObject({ diagnostics: { hedge: "both_failed" } });
    secondary.calls[0].reject(new SpeechProviderUnavailableError("down"));
    await vi.advanceTimersByTimeAsync(0);
    primary.calls[0].reject(new SpeechProviderUnavailableError("down"));
    await assertion;
  });

  it("never races Azure when the interview is pinned to Chatterbox", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize({ ...req, preferredSource: "chatterbox" });
    expect(primary.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_500);
    expect(secondary.calls).toHaveLength(0);
    primary.calls[0].resolve(audio("p"));
    expect((await pending).diagnostics).toMatchObject({ hedge: "not_needed", voiceSource: "chatterbox" });
  });

  it("brings in Azure when the pinned primary stalls past the pinned limit", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid({ hedgeAfterMs: 5_000, pinnedFallbackAfterMs: 7_000 });
    const pending = provider.synthesize({ ...req, preferredSource: "chatterbox" });
    await vi.advanceTimersByTimeAsync(6_999);
    expect(secondary.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(secondary.calls).toHaveLength(1);
    expect(primary.calls[0].signal?.aborted).toBe(false);
    secondary.calls[0].resolve(audio("s"));
    expect((await pending).diagnostics).toMatchObject({ hedge: "hedge_won", voiceSource: "azure" });
    expect(primary.calls[0].signal?.aborted).toBe(true);
  });

  it("still falls back to Azure when the pinned primary fails", async () => {
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize({ ...req, preferredSource: "chatterbox" });
    primary.calls[0].reject(new Error("down"));
    await vi.waitFor(() => expect(secondary.calls).toHaveLength(1));
    secondary.calls[0].resolve(audio("s"));
    expect((await pending).diagnostics).toMatchObject({ voiceSource: "azure" });
  });
});

describe("hybrid primary only", () => {
  it("rejects when the primary fails and never calls the secondary", async () => {
    const { provider, primary, secondary } = hybrid();
    const pending = provider.synthesize({ ...req, primaryOnly: true });
    const assertion = expect(pending).rejects.toBeInstanceOf(SpeechProviderUnavailableError);
    primary.calls[0].reject(new SpeechProviderUnavailableError("down"));
    await assertion;
    expect(secondary.calls).toHaveLength(0);
    expect(primary.calls[0].request).not.toHaveProperty("primaryOnly");
  });

  it("never starts the secondary on a stall past the hedge time, even when it is preferred", async () => {
    vi.useFakeTimers();
    const { provider, primary, secondary } = hybrid({ hedgeAfterMs: 2_500, pinnedFallbackAfterMs: 1_000 });
    const pending = provider.synthesize({ ...req, primaryOnly: true, preferredSource: "azure" });
    expect(primary.calls).toHaveLength(1);
    expect(secondary.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(secondary.calls).toHaveLength(0);
    primary.calls[0].resolve(audio("p"));
    expect((await pending).diagnostics).toMatchObject({ hedge: "not_needed", voiceSource: "chatterbox" });
    expect(secondary.calls).toHaveLength(0);
  });
});

describe("static warmup is background work", () => {
  it("sends primaryOnly on every static phrase synthesis", async () => {
    const seen: SpeechSynthesisRequest[] = [];
    const cache = {
      synthesize: vi.fn(async (request: SpeechSynthesisRequest) => { seen.push(request); return { audio: Buffer.from([1]), contentType: "audio/mpeg" }; }),
    };
    await new InterviewerSpeechPrefetcher({ cache, chunks: 1, voice: "en-US-AvaNeural", speed: 1, format: "mp3" } as never).prefetchStaticFor(undefined, 1.1, { concurrency: 2 });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((request) => request.primaryOnly === true)).toBe(true);
  });
});
