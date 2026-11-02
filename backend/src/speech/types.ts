export type AudioFormat = "mp3";

export type SpeechSynthesisRequest = {
  text: string;
  voice: string;
  speed: number;
  format: AudioFormat;
  /** Preference for which provider answers; only the hybrid provider acts on it, others ignore it. */
  preferredSource?: "chatterbox" | "azure";
  /** Background work that must never reach the fallback voice: only the primary is tried, and a preferred secondary is ignored. Never forwarded to providers. */
  primaryOnly?: boolean;
};

export type HedgeOutcome = "not_needed" | "primary_won" | "hedge_won" | "both_failed";

// Content-free details a provider may report for logging.
export type SpeechDiagnostics = {
  hedge?: HedgeOutcome;
  voiceSource?: "chatterbox" | "azure";
  /** Upstream that produced the audio, when applicable. */
  upstream?: "Chatterbox";
};

export type SynthesizedSpeech = {
  audio: Buffer;
  contentType: string;
  diagnostics?: SpeechDiagnostics;
};

export type SpeechProviderHealth = {
  status: "ready" | "unavailable";
};

export interface SpeechProvider {
  readonly name: string;
  synthesize(request: SpeechSynthesisRequest, signal?: AbortSignal): Promise<SynthesizedSpeech>;
  health(): Promise<SpeechProviderHealth>;
}
