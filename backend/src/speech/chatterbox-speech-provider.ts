import { SpeechProviderUnavailableError } from "./errors.js";
import { requestSpeechProvider } from "./provider-request.js";
import type {
  SpeechProvider,
  SpeechProviderHealth,
  SpeechSynthesisRequest,
  SynthesizedSpeech,
} from "./types.js";

type ChatterboxSpeechProviderOptions = {
  apiKey: string;
  url: string;
  timeoutMs: number;
  fetchImplementation?: typeof fetch;
  log?: (line: string) => void;
};

const dataUrlPrefix = /^data:[^,]*;base64,/u;

// Chatterbox Turbo on DeepInfra, with the Chatterbox clones of the selectable voices. The model has no speed parameter, so
// the request speed is ignored and the client controls speed. No internal hedge: the hybrid provider that wraps it decides when to fall back.
export class ChatterboxSpeechProvider implements SpeechProvider {
  readonly name = "chatterbox";

  private readonly apiKey: string;
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;
  private readonly log: (line: string) => void;

  constructor({ apiKey, url, timeoutMs, fetchImplementation = fetch, log = console.info }: ChatterboxSpeechProviderOptions) {
    this.apiKey = apiKey;
    this.url = url;
    this.timeoutMs = timeoutMs;
    this.fetchImplementation = fetchImplementation;
    this.log = log;
  }

  async synthesize(request: SpeechSynthesisRequest, signal?: AbortSignal): Promise<SynthesizedSpeech> {
    const startedAt = Date.now();
    try {
      const speech = await this.request(request, signal);
      this.log(JSON.stringify({ event: "speech_usage", provider: "chatterbox", chars: request.text.length, durationMs: Math.max(0, Date.now() - startedAt) }));
      return { ...speech, diagnostics: { upstream: "Chatterbox" } };
    } catch (error) {
      // A cancelled attempt is not an upstream failure: the other attempt won or the caller left. Content-free.
      if (!signal?.aborted) {
        const status = error instanceof SpeechProviderUnavailableError ? error.status : undefined;
        this.log(JSON.stringify({ event: "speech_upstream_failure", provider: "chatterbox", upstream: "DeepInfra", ...(status === undefined ? {} : { status }), durationMs: Math.max(0, Date.now() - startedAt) }));
      }
      throw error;
    }
  }

  private request(request: SpeechSynthesisRequest, signal: AbortSignal | undefined): Promise<Omit<SynthesizedSpeech, "diagnostics">> {
    return requestSpeechProvider({
      label: "Chatterbox speech",
      url: this.url,
      init: {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          text: request.text,
          voice_id: request.voice,
          exaggeration: 0.85,
          cfg: 0.4,
          response_format: "mp3",
        }),
      },
      timeoutMs: this.timeoutMs,
      fetchImplementation: this.fetchImplementation,
      parentSignal: signal,
      readResponse: async (response) => {
        if (!response.ok) {
          // The error body may echo the synthesized text, so only the status is kept.
          await response.body?.cancel().catch(() => undefined);
          throw new SpeechProviderUnavailableError(`Chatterbox speech returned HTTP ${response.status}.`, { status: response.status });
        }
        const body = (await response.json()) as { audio?: unknown } | null;
        const audio = typeof body?.audio === "string" ? Buffer.from(body.audio.replace(dataUrlPrefix, ""), "base64") : Buffer.alloc(0);
        if (audio.length === 0) throw new SpeechProviderUnavailableError("Chatterbox speech returned no audio.");
        return { audio, contentType: "audio/mpeg" };
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

  // No network call: a probe would spend paid requests, and failures already fall back to Azure.
  async health(): Promise<SpeechProviderHealth> {
    return { status: "ready" };
  }
}
