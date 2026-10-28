export type ClarificationKind = "repeat" | "rephrase" | "define";
export const maxClarificationWords: number;
export function detectClarificationRequest(transcript: string, question?: string | null): ClarificationKind | null;
