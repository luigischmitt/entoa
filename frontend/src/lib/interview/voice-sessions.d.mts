import type { VoicePracticeAttempt, VoiceTrainingPhrase } from "./voice-insights.mjs";

export type VoiceSessionKind = "quick" | "english" | "pronunciation";
export type VoicePhraseAttempts = Record<string, VoicePracticeAttempt[]>;
export type VoicePhrasePracticeState = { practiced: boolean; latestAccuracy: number | null; bestAccuracy: number | null; mastered: boolean };
export type VoiceSessionOptions = { kind: VoiceSessionKind; patternType?: string | null; excludeIds?: string[] };
export type VoiceSessionCatalog = {
  total: number;
  mastered: number;
  quick: { available: number };
  english: { available: number; types: Array<{ type: NonNullable<VoiceTrainingPhrase["patternType"]>; count: number }> };
  pronunciation: { available: number };
};
export type VoiceSessionSummaryRow = { id: string; text: string; before: number | null; after: number | null; practiced: boolean };
export type VoiceSessionSummary = { practiced: number; improved: number; rows: VoiceSessionSummaryRow[] };

export const quickSessionSize: 5;
export const focusedSessionSize: 8;
export const masteredAccuracy: 85;
export function phrasePracticeState(attempts: VoicePracticeAttempt[] | null | undefined): VoicePhrasePracticeState;
export function rankTrainingPhrases(phrases: VoiceTrainingPhrase[], attempts?: VoicePhraseAttempts): VoiceTrainingPhrase[];
export function buildVoiceSession(phrases: VoiceTrainingPhrase[], attempts: VoicePhraseAttempts | undefined, options: VoiceSessionOptions): VoiceTrainingPhrase[];
export function voiceSessionCatalog(phrases: VoiceTrainingPhrase[], attempts?: VoicePhraseAttempts): VoiceSessionCatalog;
export function summarizeVoiceSession(sessionPhrases: VoiceTrainingPhrase[], attemptsAtStart?: VoicePhraseAttempts, attemptsNow?: VoicePhraseAttempts): VoiceSessionSummary;
