import type { VoiceTranscription } from "./transcription.js";

export const RETAINED_AUDIO_FAILURE_MESSAGE: string;
export function transcriptionFailureMessage(code: unknown): string;
export function finalVoiceTranscription(message: {
  status?: unknown;
  transcript?: unknown;
  provider?: unknown;
  code?: unknown;
} | null | undefined):
  | { status: "available"; value: VoiceTranscription }
  | { status: "failed"; message: string };
