import type { AzureAssessmentSample } from "./report-metrics.mjs";

export function conversationAssessmentSamples(entries: Record<string, { state: { status: string } }> | undefined): AzureAssessmentSample[];
export function pendingConversationAssessments(entries: Record<string, { state: { status: string } }> | undefined): number;
export function hasCandidateSpeech(turns: Array<{ speaker: string; content: string | null }> | undefined): boolean;
