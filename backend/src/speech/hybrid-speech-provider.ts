import { SpeechProviderUnavailableError } from "./errors.js";
import { isAzureOnlyVoice, resolveChatterboxVoice, resolveVoice } from "./voices.js";
import type {
  HedgeOutcome,
  SpeechProvider,
  SpeechProviderHealth,
  SpeechSynthesisRequest,
  SynthesizedSpeech,
} from "./types.js";

type Source = "chatterbox" | "azure";

const primarySource: Source = "chatterbox";
const secondarySource: Source = "azure";

// Routing hints are for this hybrid only: children never see them.
function withoutRoutingHints(request: SpeechSynthesisRequest): SpeechSynthesisRequest {
  const copy = { ...request };
  delete copy.preferredSource;
  delete copy.primaryOnly;
  return copy;
}

type HybridSpeechProviderOptions = {
  /** Chatterbox: the main voice. */
  primary: SpeechProvider;
  /** Azure Neural TTS: the emergency fallback, in its own voice. */
  secondary: SpeechProvider;
  /** The configured Azure voice, used when a request voice is not selectable. */
  secondaryVoice: string;
  timeoutMs: number;
  /** Start the secondary after this delay without primary audio; 0 disables the timed hedge (fast failures still fall back). */
  hedgeAfterMs: number;
  /** A pinned primary keeps its voice but gets this long before the other voice joins; 0 waits for its failure. Keep it well under timeoutMs. */
  pinnedFallbackAfterMs?: number;
};

export class HybridSpeechProvider implements SpeechProvider {
  readonly name = "hybrid";

  private readonly options: HybridSpeechProviderOptions;

  constructor(options: HybridSpeechProviderOptions) {
    this.options = options;
  }

  async synthesize(request: SpeechSynthesisRequest, signal?: AbortSignal): Promise<SynthesizedSpeech> {
    if (isAzureOnlyVoice(request.voice)) return this.synthesizeAzureOnly(request, signal);
    const { primary, secondary, secondaryVoice, timeoutMs, hedgeAfterMs } = this.options;
    const primaryVoiceForRequest = resolveChatterboxVoice(request.voice);
    const secondaryVoiceForRequest = resolveVoice(request.voice, secondaryVoice);
    const controllers = { primary: new AbortController(), secondary: new AbortController() };
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    let overallTimer: ReturnType<typeof setTimeout> | undefined;
    let primaryStarted = false;
    let secondaryStarted = false;
    let settled = false;
    let primaryFailed = false;
    let secondaryFailed = false;
    // Background work never reaches the secondary, so it has no hedge, no pinned timer and no preferred start.
    const primaryOnly = request.primaryOnly === true;
    // A preferred secondary starts at once and the primary only as its fallback.
    const preferSecondary = !primaryOnly && request.preferredSource === secondarySource;

    return new Promise<SynthesizedSpeech>((resolve, reject) => {
      const finish = (action: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(hedgeTimer);
        clearTimeout(overallTimer);
        signal?.removeEventListener("abort", onCallerAbort);
        action();
      };
      const abortBoth = (reason: unknown) => {
        controllers.primary.abort(reason);
        controllers.secondary.abort(reason);
      };
      function onCallerAbort() {
        abortBoth(signal?.reason);
        finish(() => reject(signal?.reason ?? new DOMException("Aborted", "AbortError")));
      }
      const fail = () => {
        abortBoth(new Error("Speech synthesis failed."));
        finish(() => reject(new SpeechProviderUnavailableError("Speech providers are unavailable.", { diagnostics: { hedge: "both_failed" } })));
      };
      const win = (source: Source, speech: SynthesizedSpeech) => {
        if (settled) return;
        controllers[source === primarySource ? "secondary" : "primary"].abort(new Error("Another speech request answered first."));
        const hedge: HedgeOutcome = source === secondarySource ? "hedge_won" : secondaryStarted ? "primary_won" : "not_needed";
        finish(() => resolve({ ...speech, diagnostics: { ...speech.diagnostics, hedge, voiceSource: source } }));
      };
      const run = (provider: SpeechProvider, voice: string, source: Source, attemptSignal: AbortSignal) =>
        provider.synthesize({ ...withoutRoutingHints(request), voice }, attemptSignal).then((speech) => {
          if (speech.audio.length === 0) throw new SpeechProviderUnavailableError("Speech provider returned no audio.");
          return speech;
        }).then((speech) => win(source, speech));

      const startSecondary = () => {
        if (settled || secondaryStarted) return;
        secondaryStarted = true;
        clearTimeout(hedgeTimer);
        run(secondary, secondaryVoiceForRequest, secondarySource, controllers.secondary.signal).catch(() => {
          secondaryFailed = true;
          if (settled) return;
          if (!primaryStarted) startPrimary();
          else if (primaryFailed) fail();
        });
      };
      const startPrimary = () => {
        if (settled || primaryStarted) return;
        primaryStarted = true;
        run(primary, primaryVoiceForRequest, primarySource, controllers.primary.signal).catch(() => {
          primaryFailed = true;
          if (settled) return;
          if (primaryOnly) { fail(); return; }
          if (!secondaryStarted) startSecondary();
          else if (secondaryFailed) fail();
        });
      };

      signal?.addEventListener("abort", onCallerAbort, { once: true });
      if (signal?.aborted) { onCallerAbort(); return; }

      overallTimer = setTimeout(fail, timeoutMs);
      if (primaryOnly) startPrimary();
      else if (preferSecondary) startSecondary();
      else {
        startPrimary();
        // An interview pinned to the primary voice does not race the other voice early: only a failure or a real stall brings it in.
        const fallbackAfterMs = request.preferredSource === primarySource ? this.options.pinnedFallbackAfterMs ?? 0 : hedgeAfterMs;
        if (fallbackAfterMs > 0) hedgeTimer = setTimeout(startSecondary, fallbackAfterMs);
      }
    });
  }

  /** Azure-only voice: one request to the secondary, no primary attempt and no hedge. Background work never spends it. */
  private async synthesizeAzureOnly(request: SpeechSynthesisRequest, signal?: AbortSignal): Promise<SynthesizedSpeech> {
    if (request.primaryOnly === true) throw new SpeechProviderUnavailableError("Azure-only voices are not used for background work.");
    const timeout = AbortSignal.timeout(this.options.timeoutMs);
    try {
      const speech = await this.options.secondary.synthesize(withoutRoutingHints(request), signal ? AbortSignal.any([signal, timeout]) : timeout);
      if (speech.audio.length === 0) throw new SpeechProviderUnavailableError("Speech provider returned no audio.");
      return { ...speech, diagnostics: { ...speech.diagnostics, hedge: "not_needed", voiceSource: secondarySource } };
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      if (error instanceof SpeechProviderUnavailableError) throw error;
      throw new SpeechProviderUnavailableError("Speech providers are unavailable.", { cause: error, diagnostics: { hedge: "both_failed" } });
    }
  }

  // No network call: health must not spend paid requests.
  async health(): Promise<SpeechProviderHealth> {
    return { status: "ready" };
  }

  warmConnection(): void {
    for (const provider of [this.options.primary, this.options.secondary]) {
      try { (provider as SpeechProvider & { warmConnection?: () => void }).warmConnection?.(); } catch { /* Best effort. */ }
    }
  }
}
