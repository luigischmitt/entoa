import { afterEach, describe, expect, it, vi } from "vitest";
import { AzureSpeechProvider, germanQuotedSsml } from "../src/speech/azure-speech-provider.js";
import { loadSpeechConfig } from "../src/speech/config.js";
import { createSpeechProvider } from "../src/speech/create-speech-provider.js";
import { SpeechProviderUnavailableError } from "../src/speech/errors.js";
import { HybridSpeechProvider } from "../src/speech/hybrid-speech-provider.js";
import type { SpeechProvider, SpeechSynthesisRequest, SynthesizedSpeech } from "../src/speech/types.js";

const req: SpeechSynthesisRequest = { text: `A & B < C > "D" 'E'`, voice: "en-US-BrianNeural", speed: 0.85, format: "mp3" };
const make = (fetchImplementation: typeof fetch, options: Partial<ConstructorParameters<typeof AzureSpeechProvider>[0]> = {}) => new AzureSpeechProvider({ key: "key", region: "brazilsouth", voice: "en-US-AndrewNeural", timeoutMs: 8_000, cooldownMs: 10_000, fetchImplementation, ...options });

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Azure TTS", () => {
  it("escapes SSML, maps rate and uses a selectable requested Azure voice", async () => {
    let init: RequestInit | undefined;
    const provider = make(async (_url, requestInit) => { init = requestInit; return new Response("mp3"); });
    await provider.synthesize(req);
    expect(init?.headers).toMatchObject({ "Content-Type": "application/ssml+xml", "Ocp-Apim-Subscription-Key": "key", "User-Agent": "entoa-backend" });
    expect(init?.body).toContain("voice name='en-US-BrianNeural'");
    expect(init?.body).toContain("rate='-15%'");
    expect(init?.body).toContain("A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;");
  });

  it("marks quoted phrases as German for the German voice only", async () => {
    let init: RequestInit | undefined;
    const provider = make(async (_url, requestInit) => { init = requestInit; return new Response("mp3"); });
    const text = 'Você pode responder: "Meine Schwester ist achtzehn."';
    await provider.synthesize({ ...req, text, voice: "de-DE-FlorianMultilingualNeural" });
    expect(init?.body).toContain("xml:lang='de-DE'><voice name='de-DE-FlorianMultilingualNeural'>");
    expect(init?.body).toContain("Você pode responder: &quot;<lang xml:lang='de-DE'>Meine Schwester ist achtzehn.</lang>&quot;");
    await provider.synthesize({ ...req, text });
    expect(init?.body).not.toContain("<lang");
  });

  it("finds German in quotes cut by the sentence split", () => {
    expect(germanQuotedSsml("Spielt Max gern im Wasser?")).toBe("Spielt Max gern im Wasser?");
    expect(germanQuotedSsml("Diga \u201eIch bin Tuck\u201c, por favor.")).toBe("Diga &quot;<lang xml:lang='de-DE'>Ich bin Tuck</lang>&quot;, por favor.");
    expect(germanQuotedSsml('Você diz: "Ich bin achtzehn.')).toBe("Você diz: &quot;<lang xml:lang='de-DE'>Ich bin achtzehn.</lang>");
    expect(germanQuotedSsml('Und du?"')).toBe("<lang xml:lang='de-DE'>Und du?</lang>&quot;");
    expect(germanQuotedSsml('Fale "Ja" ou "Nein & so" agora')).toBe("Fale &quot;<lang xml:lang='de-DE'>Ja</lang>&quot; ou &quot;<lang xml:lang='de-DE'>Nein &amp; so</lang>&quot; agora");
  });

  it("uses the configured Azure voice for an untrusted request voice", async () => {
    let init: RequestInit | undefined;
    const provider = make(async (_url, requestInit) => { init = requestInit; return new Response("mp3"); });
    await provider.synthesize({ ...req, voice: "am_michael" });
    expect(init?.body).toContain("voice name='en-US-AndrewNeural'");
  });

  it("retries 429 respecting Retry-After, then succeeds", async () => {
    let count = 0;
    const provider = make(async () => ++count < 3 ? new Response("private", { status: 429, headers: { "retry-after": "0" } }) : new Response("mp3"));
    expect((await provider.synthesize(req)).audio.toString()).toBe("mp3");
    expect(count).toBe(3);
  });

  it("opens on 403 and fails fast until cooldown expires", async () => {
    let now = 100;
    const log = vi.fn(); const fetchImplementation = vi.fn(async () => new Response("private", { status: 403 })) as unknown as typeof fetch;
    const provider = make(fetchImplementation, { now: () => now, cooldownMs: 1000, log });
    await expect(provider.synthesize(req)).rejects.toThrow();
    await expect(provider.synthesize(req)).rejects.toThrow(/cooling down/);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(JSON.stringify({ event: "speech_azure_breaker", status: "open", reason: "quota", cooldownMs: 1000 }));
    now += 1000;
    await expect(provider.synthesize(req)).rejects.toThrow();
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("logs only character count and duration after successful synthesis", async () => {
    const log = vi.fn();
    await make(async () => new Response("mp3"), { log }).synthesize(req);
    const entry = JSON.parse(log.mock.calls[0][0] as string);
    expect(entry).toMatchObject({ event: "speech_usage", provider: "azure", chars: req.text.length });
    expect(entry).not.toHaveProperty("text");
    expect(JSON.stringify(entry)).not.toContain(req.text);
  });

  it("serves the request from the real Azure provider when Chatterbox fails", async () => {
    const chatterbox: SpeechProvider = { name: "chatterbox", health: async () => ({ status: "ready" }), synthesize: async () => { throw new SpeechProviderUnavailableError("down"); } };
    const azure = make(async () => new Response("azure-mp3"));
    const hybrid = new HybridSpeechProvider({ primary: chatterbox, secondary: azure, secondaryVoice: "en-US-AndrewNeural", timeoutMs: 8_000, hedgeAfterMs: 5_000 });
    const result = await hybrid.synthesize({ ...req, voice: "en-GB-SoniaNeural" });
    expect(result.audio.toString()).toBe("azure-mp3");
    expect(result.diagnostics).toMatchObject({ voiceSource: "azure", hedge: "hedge_won" });
  });
});

describe("chatterbox-azure configuration", () => {
  it("requires DeepInfra and Azure credentials and builds the Chatterbox-first chain", () => {
    const env = { SPEECH_PROVIDER: "chatterbox-azure", DEEPINFRA_API_KEY: "key", AZURE_SPEECH_KEY: "x", AZURE_SPEECH_REGION: "brazilsouth" };
    expect(() => loadSpeechConfig({ ...env, AZURE_SPEECH_KEY: undefined })).toThrow(/AZURE_SPEECH_KEY/);
    expect(() => loadSpeechConfig({ ...env, AZURE_SPEECH_REGION: undefined })).toThrow(/AZURE_SPEECH_REGION/);
    expect(() => loadSpeechConfig({ ...env, DEEPINFRA_API_KEY: undefined })).toThrow(/DEEPINFRA_API_KEY/);
    expect(createSpeechProvider(loadSpeechConfig(env)).name).toBe("hybrid");
  });

  it("uses Chatterbox first and only starts Azure after the hedge delay", async () => {
    const calls: { source: string; request: SpeechSynthesisRequest }[] = [];
    const primary: SpeechProvider = { name: "chatterbox", health: async () => ({ status: "ready" }), synthesize: async (request) => { calls.push({ source: "chatterbox", request }); return { audio: Buffer.from("primary"), contentType: "audio/mpeg" }; } };
    const secondary: SpeechProvider = { name: "azure", health: async () => ({ status: "ready" }), synthesize: async (request) => { calls.push({ source: "azure", request }); return { audio: Buffer.from("secondary"), contentType: "audio/mpeg" }; } };
    const hybrid = new HybridSpeechProvider({ primary, secondary, secondaryVoice: "en-US-AndrewNeural", timeoutMs: 1_000, hedgeAfterMs: 50 });
    const result = await hybrid.synthesize(req);
    expect(result.diagnostics).toMatchObject({ voiceSource: "chatterbox", hedge: "not_needed" });
    expect(calls).toEqual([{ source: "chatterbox", request: { ...req, voice: "1di0faf2tnibx9ccbp08" } }]);
  });

  it("lets Azure win the hedge and keeps its public voice id", async () => {
    vi.useFakeTimers();
    const primary: SpeechProvider = { name: "chatterbox", health: async () => ({ status: "ready" }), synthesize: async (_request, signal) => new Promise((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason), { once: true })) };
    const calls: SpeechSynthesisRequest[] = [];
    const secondary: SpeechProvider = { name: "azure", health: async () => ({ status: "ready" }), synthesize: async (request) => { calls.push(request); return { audio: Buffer.from("azure"), contentType: "audio/mpeg" }; } };
    const hybrid = new HybridSpeechProvider({ primary, secondary, secondaryVoice: "en-US-AndrewNeural", timeoutMs: 1_000, hedgeAfterMs: 50 });
    const pending = hybrid.synthesize(req);
    await vi.advanceTimersByTimeAsync(50);
    await expect(pending).resolves.toMatchObject({ diagnostics: { voiceSource: "azure", hedge: "hedge_won" } });
    expect(calls).toEqual([{ ...req, voice: "en-US-BrianNeural" }]);
  });

  it("uses Azure immediately after Chatterbox fails and reports both failures", async () => {
    const primary: SpeechProvider = { name: "chatterbox", health: async () => ({ status: "ready" }), synthesize: async () => { throw new Error("down"); } };
    const azure: SpeechProvider = { name: "azure", health: async () => ({ status: "ready" }), synthesize: async () => ({ audio: Buffer.from("azure"), contentType: "audio/mpeg" }) };
    const options = { primary, secondary: azure, secondaryVoice: "en-US-AndrewNeural", timeoutMs: 1_000, hedgeAfterMs: 2_500 };
    await expect(new HybridSpeechProvider(options).synthesize(req)).resolves.toMatchObject({ diagnostics: { voiceSource: "azure", hedge: "hedge_won" } });
    const unavailable: SpeechProvider = { ...azure, synthesize: async () => { throw new Error("down"); } };
    await expect(new HybridSpeechProvider({ ...options, secondary: unavailable }).synthesize(req)).rejects.toBeInstanceOf(SpeechProviderUnavailableError);
  });
});

describe("Azure SSML language follows the voice", () => {
  const ssmlFor = async (voice: string) => {
    let init: RequestInit | undefined;
    const provider = new AzureSpeechProvider({ key: "key", region: "brazilsouth", voice: "en-US-AndrewNeural", timeoutMs: 8_000, cooldownMs: 10_000, fetchImplementation: async (_url, requestInit) => { init = requestInit; return new Response("mp3"); } });
    await provider.synthesize({ ...req, voice, speed: 1 });
    return String(init?.body);
  };

  it("uses de-DE for the German voice and the matching locale for English voices", async () => {
    expect(await ssmlFor("de-DE-FlorianMultilingualNeural")).toContain("<speak version='1.0' xml:lang='de-DE'><voice name='de-DE-FlorianMultilingualNeural'>");
    expect(await ssmlFor("en-US-BrianNeural")).toContain("xml:lang='en-US'");
    expect(await ssmlFor("en-GB-RyanNeural")).toContain("xml:lang='en-GB'");
    expect(await ssmlFor("de-DE-FlorianMultilingualNeural")).toContain("<prosody rate='+0%'>");
    expect(await ssmlFor("en-US-BrianNeural")).toContain("<prosody rate='+0%'>");
  });
});
