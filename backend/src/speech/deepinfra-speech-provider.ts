import { SpeechProviderUnavailableError } from "./errors.js";
import { readAudioBody, requestSpeechProvider } from "./provider-request.js";
import type {
  SpeechProvider,
  SpeechProviderHealth,
  SpeechSynthesisRequest,
  SynthesizedSpeech,
} from "./types.js";

type DeepInfraSpeechProviderOptions = {
  apiKey: string;
  url: string;
  model: string;
  timeoutMs: number;
  fetchImplementation?: typeof fetch;
  log?: (line: string) => void;
};

// Kokoro served directly by DeepInfra. No internal hedge: the hybrid provider that wraps it decides when to fall back.
export class DeepInfraSpeechProvider implements SpeechProvider {
  readonly name = "deepinfra";

  private readonly apiKey: string;
  private readonly url: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;
  private readonly log: (line: string) => void;

  constructor({ apiKey, url, model, timeoutMs, fetchImplementation = fetch, log = console.info }: DeepInfraSpeechProviderOptions) {
    this.apiKey = apiKey;
    this.url = url;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetchImplementation = fetchImplementation;
    this.log = log;
  }

  async synthesize(request: SpeechSynthesisRequest, signal?: AbortSignal): Promise<SynthesizedSpeech> {
    const startedAt = Date.now();
    try {
      const speech = await this.request(request, signal);
      this.log(JSON.stringify({ event: "speech_usage", provider: "deepinfra", chars: request.text.length, durationMs: Math.max(0, Date.now() - startedAt) }));
      return { ...speech, diagnostics: { upstream: "DeepInfra" } };
    } catch (error) {
      // A cancelled attempt is not an upstream failure: the other attempt won or the caller left. Content-free.
      if (!signal?.aborted) {
        const status = error instanceof SpeechProviderUnavailableError ? error.status : undefined;
        this.log(JSON.stringify({ event: "speech_upstream_failure", provider: "deepinfra", upstream: "DeepInfra", ...(status === undefined ? {} : { status }), durationMs: Math.max(0, Date.now() - startedAt) }));
      }
      throw error;
    }
  }

  private request(request: SpeechSynthesisRequest, signal: AbortSignal | undefined): Promise<Omit<SynthesizedSpeech, "diagnostics">> {
    return requestSpeechProvider({
      label: "DeepInfra speech",
      url: this.url,
      init: {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          input: request.text,
          voice: request.voice,
          response_format: request.format,
          // Only sent when changed, so the default request stays minimal.
          ...(request.speed !== 1 ? { speed: request.speed } : {}),
        }),
      },
      timeoutMs: this.timeoutMs,
      fetchImplementation: this.fetchImplementation,
      parentSignal: signal,
      readResponse: async (response, requestSignal) => {
        if (!response.ok) {
          // The error body may echo the synthesized text, so only the status is kept.
          await response.body?.cancel().catch(() => undefined);
          throw new SpeechProviderUnavailableError(`DeepInfra speech returned HTTP ${response.status}.`, { status: response.status });
        }
        const audio = await readAudioBody(response, requestSignal);
        if (audio.length === 0) throw new SpeechProviderUnavailableError("DeepInfra speech returned no audio.");
        return { audio, contentType: response.headers.get("content-type") ?? "audio/mpeg" };
      },
    });
  }

  private lastWarmAt = Number.NEGATIVE_INFINITY;

  /**
   * Opens a connection to the speech host ahead of the first synthesis (free HEAD request, no audio). Fire and forget; throttled.
   */
  warmConnection(): void {
    const now = Date.now();
    if (now - this.lastWarmAt < 1_500) return;
    this.lastWarmAt = now;
    let origin: string;
    try { origin = new URL(this.url).origin; } catch { return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_000);
    timer.unref?.();
    void this.fetchImplementation(origin, { method: "HEAD", signal: controller.signal })
      .then((response) => response.body?.cancel().catch(() => undefined))
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));
  }

  // No network call: probing would spend paid requests, and failures already fall back to other voices.
  async health(): Promise<SpeechProviderHealth> {
    return { status: "ready" };
  }
}
