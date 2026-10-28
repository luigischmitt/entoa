export const maxShortReplyWords = 25;

const actions = new Set(["ANSWER", "REPEAT", "REPHRASE", "DEFINE", "MOVE_ON"]);

export function isShortUtterance(text) {
  return typeof text === "string" && text.trim().length > 0 && text.trim().split(/\s+/u).length <= maxShortReplyWords;
}

export function parseShortReplyResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.enabled !== true || !actions.has(value.action)) return null;
  if (!(typeof value.say === "string" || value.say === null) || !(typeof value.question === "string" || value.question === null)) return null;
  if (value.action === "ANSWER") return { action: "ANSWER", say: null, question: null };
  return { action: value.action, say: value.say, question: value.question };
}

export function shortReplyDecision(reply, nextFixedQuestion) {
  if (!reply || typeof reply !== "object") return null;
  if (reply.action === "REPEAT") return { decision: "REPEAT", followUpQuestion: null, nextQuestion: null, acknowledgement: null, clarificationText: null, clarification: "model", leadIn: reply.say ?? null };
  if (reply.action === "REPHRASE") return typeof reply.question === "string" && reply.question.trim() ? { decision: "REPHRASE", followUpQuestion: null, nextQuestion: null, acknowledgement: null, clarificationText: reply.question, clarification: "model", leadIn: reply.say ?? null } : null;
  if (reply.action === "DEFINE") return typeof reply.say === "string" && reply.say.trim() ? { decision: "DEFINE", followUpQuestion: null, nextQuestion: null, acknowledgement: null, clarificationText: reply.say, clarification: "model", leadIn: null } : null;
  if (reply.action === "MOVE_ON") return typeof nextFixedQuestion === "string" && nextFixedQuestion && typeof reply.say === "string" && reply.say ? { decision: "NEXT", followUpQuestion: null, nextQuestion: nextFixedQuestion, acknowledgement: reply.say } : null;
  return null;
}
