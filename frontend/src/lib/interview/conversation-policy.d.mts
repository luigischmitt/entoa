export type ConversationPhaseName = "warmup" | "explore" | "closing";
export type ConversationLine = { speaker: "tuck" | "person"; text: string };
export type ConversationMove = "FOLLOW" | "NEW_PATH" | "CLARIFY" | "WRAP" | "END";
export type ConversationLanguage = "de";
export type ConversationSuggestion = { de: string; pt: string };
export type ConversationPlanInput = { title: string; opening: string; openingTranslation?: string; paths: Array<{ id: string; line: string }> };
export type ConversationTurnReply = {
  say: string;
  move: ConversationMove;
  pathId: string | null;
  sayTranslation?: string | null;
  personTranslation?: string | null;
  suggestions?: ConversationSuggestion[];
};
export type ConversationTurnRequest = {
  topic: string;
  paths: Array<{ id: string; line: string }>;
  usedPathIds: string[];
  phase: ConversationPhaseName;
  remainingSeconds: number;
  history: ConversationLine[];
  transcript: string;
  silent?: true;
  language?: ConversationLanguage;
};

export const CONVERSATION_WARMUP_SECONDS: number;
export const CONVERSATION_CLOSING_SECONDS: number;
export const CONVERSATION_CLOSING_LINE: string;
export const CONVERSATION_FOLLOW_LINE: string;
export const GERMAN_CONVERSATION_VOICE: string;
export const MAX_SILENCE_NUDGES: number;

export function silenceWaitMs(tuckLine: string | null | undefined): number;

export function conversationPhase(elapsedSeconds: number, durationMinutes: number): ConversationPhaseName;
export function buildConversationTurnRequest(input: {
  plan: ConversationPlanInput;
  usedPathIds?: string[];
  elapsedSeconds: number;
  durationMinutes: number;
  lines?: ConversationLine[];
  transcript: string;
  silent?: boolean;
  language?: ConversationLanguage;
}): ConversationTurnRequest;
export function nextUsedPathIds(usedPathIds: string[] | undefined, reply: Pick<ConversationTurnReply, "pathId"> | null | undefined): string[];
export function isMeaningQuestion(text: string | null | undefined): boolean;
export function fallbackConversationTurn(input: { plan: ConversationPlanInput; usedPathIds?: string[]; phase: ConversationPhaseName; transcript?: string; language?: ConversationLanguage }): ConversationTurnReply;
export function isConversationEnd(reply: Pick<ConversationTurnReply, "move"> | null | undefined): boolean;
export function shouldReact(transcript: string | null | undefined): boolean;
