export type ShortReplyAction = "ANSWER" | "REPEAT" | "REPHRASE" | "DEFINE" | "MOVE_ON" | "END" | "ASIDE";
export type ShortReply = { action: ShortReplyAction; say: string | null; question: string | null };
export type ShortReplyTurnDecision =
  | { decision: "REPEAT" | "REPHRASE" | "DEFINE"; followUpQuestion: null; nextQuestion: null; acknowledgement: null; clarificationText: string | null; clarification: "model"; leadIn: string | null }
  | { decision: "NEXT"; followUpQuestion: null; nextQuestion: string; acknowledgement: string };
export const maxShortReplyWords: number;
export function isShortUtterance(text: string): boolean;
export function parseShortReplyResponse(value: unknown): ShortReply | null;
export function isEndRequest(reply: ShortReply | null): boolean;
export function shortReplyDecision(reply: ShortReply | null, nextFixedQuestion: string | null, currentQuestion: string | null): ShortReplyTurnDecision | null;
