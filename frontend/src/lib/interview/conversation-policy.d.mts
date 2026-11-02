export type ConversationPhaseName = "warmup" | "explore" | "closing";
export type ConversationLine = { speaker: "tuck" | "person"; text: string };
export type ConversationMove = "FOLLOW" | "NEW_PATH" | "CLARIFY" | "WRAP" | "END";
export type ConversationPlanInput = { title: string; opening: string; paths: Array<{ id: string; line: string }> };
export type ConversationTurnReply = { say: string; move: ConversationMove; pathId: string | null };
export type ConversationTurnRequest = {
  topic: string;
  paths: Array<{ id: string; line: string }>;
  usedPathIds: string[];
  phase: ConversationPhaseName;
  remainingSeconds: number;
  history: ConversationLine[];
  transcript: string;
  silent?: true;
};

export const CONVERSATION_WARMUP_SECONDS: number;
export const CONVERSATION_CLOSING_SECONDS: number;
export const CONVERSATION_CLOSING_LINE: string;
export const CONVERSATION_FOLLOW_LINE: string;
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
}): ConversationTurnRequest;
export function nextUsedPathIds(usedPathIds: string[] | undefined, reply: Pick<ConversationTurnReply, "pathId"> | null | undefined): string[];
export function fallbackConversationTurn(input: { plan: ConversationPlanInput; usedPathIds?: string[]; phase: ConversationPhaseName }): ConversationTurnReply;
export function isConversationEnd(reply: Pick<ConversationTurnReply, "move"> | null | undefined): boolean;
export function shouldReact(transcript: string | null | undefined): boolean;
