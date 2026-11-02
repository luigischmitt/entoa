export const CONVERSATION_REACTIONS: string[];
export function reactionFileName(phrase: string): string;
/** Folder of a voice source's reaction files: "azure" or Kokoro (any other source). */
export function reactionDirectory(source?: string | null): string;
export function reactionAudioPath(voice: unknown, phrase: string, source?: string | null): string;
export function loadStaticReaction(voice: unknown, phrase: string, source?: string | null, fetcher?: typeof fetch): Promise<Blob>;
