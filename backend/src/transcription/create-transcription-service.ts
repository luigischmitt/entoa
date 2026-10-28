import type { TranscriptionConfig } from "./config.js";
import { AzureSpeechTranscriptionService } from "./azure-speech-transcription-service.js";
import { TranscriptionUnavailableError } from "./errors.js";
import { OpenRouterWhisperTranscriptionService } from "./openrouter-whisper-transcription-service.js";
import type { AudioFormat, TranscribeContext, TranscriptionProvider, TranscriptionResult, TranscriptionService } from "./types.js";

type WhisperProvider = "whisper-large-v3" | "whisper-large-v3-turbo";

/** Injectable collaborators for tests; each defaults to the real service built from config. */
export type ExperimentalTranscriptionDeps = {
  openRouter?: Pick<OpenRouterWhisperTranscriptionService, "transcribe" | "availableProviders">;
  azure?: Pick<AzureSpeechTranscriptionService, "transcribe" | "availableProviders">;
};

const otherWhisperProvider: Record<WhisperProvider, WhisperProvider> = {
  "whisper-large-v3": "whisper-large-v3-turbo",
  "whisper-large-v3-turbo": "whisper-large-v3",
};

class UnconfiguredTranscriptionService implements TranscriptionService {
  availableProviders(): TranscriptionProvider[] {
    return [];
  }

  async transcribe(_audio: Buffer, _provider: TranscriptionProvider): Promise<TranscriptionResult> {
    throw new TranscriptionUnavailableError("Speech transcription is not configured on this server.");
  }
}

function isWhisperProvider(provider: TranscriptionProvider): provider is WhisperProvider {
  return provider === "whisper-large-v3" || provider === "whisper-large-v3-turbo";
}

/** A caller abort (or the abort category) must never trigger a fallback request. */
function isAbortFailure(error: unknown, signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted) || (error instanceof TranscriptionUnavailableError && error.providerStatus === "aborted");
}

/** Logs the fallback decision only: no transcript, prompt or audio. */
function logFallback(from: TranscriptionProvider, to: TranscriptionProvider, error: unknown): void {
  const httpStatus = error instanceof TranscriptionUnavailableError ? error.httpStatus : undefined;
  const reason = error instanceof TranscriptionUnavailableError ? (error.providerStatus ?? "unknown") : "unknown";
  console.info(JSON.stringify({ event: "transcription_fallback", from, to, reason, ...(httpStatus ? { httpStatus } : {}) }));
}

class ExperimentalTranscriptionService implements TranscriptionService {
  private readonly azure: Pick<AzureSpeechTranscriptionService, "transcribe" | "availableProviders"> | null;
  private readonly openRouter: Pick<OpenRouterWhisperTranscriptionService, "transcribe" | "availableProviders"> | null;

  constructor(config: TranscriptionConfig, deps: ExperimentalTranscriptionDeps = {}) {
    this.azure = deps.azure ?? (config.azureSpeechKey && config.azureSpeechRegion
      ? new AzureSpeechTranscriptionService({ key: config.azureSpeechKey, region: config.azureSpeechRegion, timeoutMs: config.timeoutMs })
      : null);
    this.openRouter = deps.openRouter ?? (config.openRouterApiKey
      ? new OpenRouterWhisperTranscriptionService({ key: config.openRouterApiKey, timeoutMs: config.openRouterTimeoutMs, promptEnabled: config.whisperPromptEnabled })
      : null);
  }

  availableProviders(): TranscriptionProvider[] {
    return [...(this.azure?.availableProviders() ?? []), ...(this.openRouter?.availableProviders() ?? [])];
  }

  async transcribe(audio: Buffer, provider: TranscriptionProvider, format?: AudioFormat, signal?: AbortSignal, context?: TranscribeContext): Promise<TranscriptionResult> {
    if (provider === "azure" && this.azure) return this.azure.transcribe(audio, provider);
    if (isWhisperProvider(provider) && this.openRouter) return this.transcribeWhisperWithFallback(this.openRouter, audio, provider, format, signal, context);
    throw new TranscriptionUnavailableError("This transcription provider is not configured on this server.");
  }

  /**
   * Chain: primary Whisper model, then the other Whisper model (no prompt), then Azure for WAV audio.
   * When every step fails, the first error is thrown so the caller's failure category reflects the primary attempt.
   */
  private async transcribeWhisperWithFallback(
    openRouter: Pick<OpenRouterWhisperTranscriptionService, "transcribe">,
    audio: Buffer,
    provider: WhisperProvider,
    format: AudioFormat | undefined,
    signal: AbortSignal | undefined,
    context: TranscribeContext | undefined,
  ): Promise<TranscriptionResult> {
    let primaryError: unknown;
    try {
      return await openRouter.transcribe(audio, provider, format, signal, context);
    } catch (error) {
      if (isAbortFailure(error, signal)) throw error;
      primaryError = error;
    }

    const other = otherWhisperProvider[provider];
    logFallback(provider, other, primaryError);
    let secondError: unknown;
    try {
      return await openRouter.transcribe(audio, other, format, signal, undefined);
    } catch (error) {
      if (isAbortFailure(error, signal)) throw error;
      secondError = error;
    }

    if (this.azure && (format === undefined || format === "wav")) {
      logFallback(other, "azure", secondError);
      try {
        return await this.azure.transcribe(audio, "azure");
      } catch {
        // Fall through: the primary error is the one reported.
      }
    }

    throw primaryError;
  }
}

export function createTranscriptionService(config: TranscriptionConfig, deps?: ExperimentalTranscriptionDeps): TranscriptionService {
  if (!config.azureSpeechKey && !config.openRouterApiKey) return new UnconfiguredTranscriptionService();
  return new ExperimentalTranscriptionService(config, deps);
}
