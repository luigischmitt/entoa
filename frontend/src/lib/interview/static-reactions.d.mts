export const CONVERSATION_REACTIONS: string[];
export function reactionFileName(phrase: string): string;
export function reactionAudioPath(voice: unknown, phrase: string): string;
export function loadStaticReaction(voice: unknown, phrase: string, fetcher?: typeof fetch): Promise<Blob>;
