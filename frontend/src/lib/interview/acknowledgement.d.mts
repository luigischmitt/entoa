import type { SpeechPlaybackOptions } from "./speech-playback.mjs";

export const ACKNOWLEDGEMENT_PHRASES: string[];
export const ACKNOWLEDGEMENT_LEAD_MS: number;
export const ACKNOWLEDGEMENT_GAP_MS: number;
export const ACKNOWLEDGEMENT_MIN_WORDS: number;
export function isAcknowledgeableAnswer(transcript: string | null | undefined): boolean;
export function pickAcknowledgement(input?: { phrases?: string[]; available?: string[]; recent?: string[]; lastPhrase?: string | null }): string | null;
export function stripLeadingAcknowledgement(text: string | null | undefined): string;

export type AcknowledgementHandle = { phrase: string; promise: Promise<void>; cancel: () => void };
export type AcknowledgementPlayer = {
  preload(): Promise<void>;
  readonly loadedCount: number;
  readonly lastPhrase: string | null;
  readonly playing: boolean;
  whenIdle(): Promise<void>;
  play(input?: { recent?: string[]; answerFinalAt?: number | null }): AcknowledgementHandle | null;
  schedule(input?: { recent?: string[]; shouldPlay?: () => boolean }): { promise: Promise<void>; cancel: () => void } | null;
  readonly busy: boolean;
  beforeQuestion(): Promise<void>;
  cancel(): void;
};
export function createAcknowledgementPlayer(options: {
  endpoint?: string;
  fetcher?: typeof fetch;
  phrases?: string[];
  /** Voice id sent with each phrase request. */
  voice?: string;
  loadBlob?: (phrase: string) => Promise<Blob>;
  /** Static audio for a phrase (no request); when it rejects the phrase falls back to `loadBlob`. */
  staticBlob?: (phrase: string) => Promise<Blob>;
  /** Azure copy of a phrase (no request); kept apart from the Chatterbox blobs and used only in Azure sessions. Never fails preload. */
  azureBlob?: (phrase: string) => Promise<Blob>;
  /** The session's voice source; "azure" plays the Azure copies only, anything else plays the Chatterbox blobs. */
  voiceSource?: () => string | null;
  makeAudio?: (url: string) => HTMLAudioElement;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  setTimeout?: (callback: () => void, delay: number) => number;
  clearTimeout?: (id: number) => void;
  maxPlayMs?: number;
  leadMs?: number;
  gapMs?: number;
  now?: () => number;
  onChunkAudio?: SpeechPlaybackOptions["onChunkAudio"];
  onDiagnostic?: (event: { kind: string; [field: string]: unknown }) => void;
}): AcknowledgementPlayer;
