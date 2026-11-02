// Free conversation with Tuck: pure rules shared by the setup, the room and the tests.

export const CONVERSATION_WARMUP_SECONDS = 60;
export const CONVERSATION_CLOSING_SECONDS = 45;
const HISTORY_LINES = 40;
const HISTORY_TEXT_LENGTH = 2000;
const TRANSCRIPT_LENGTH = 4000;
export const CONVERSATION_CLOSING_LINE = "This was a really nice chat. Thanks for talking with me!";
export const CONVERSATION_FOLLOW_LINE = "Tell me a little more about that?";
/** Silence after Tuck's line: a question gets longer to think; after this many nudges in a row Tuck stops prompting. */
export const MAX_SILENCE_NUDGES = 2;
const SILENCE_QUESTION_WAIT_MS = 12_000;
const SILENCE_STATEMENT_WAIT_MS = 7_000;

const clip = (text, length) => String(text ?? "").trim().slice(0, length);

/** warmup for the first minute, closing once 45 s or less remain, explore otherwise. */
export function conversationPhase(elapsedSeconds, durationMinutes) {
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  const remaining = remainingConversationSeconds(elapsed, durationMinutes);
  if (elapsed < CONVERSATION_WARMUP_SECONDS) return "warmup";
  if (remaining <= CONVERSATION_CLOSING_SECONDS) return "closing";
  return "explore";
}

function remainingConversationSeconds(elapsedSeconds, durationMinutes) {
  const total = Math.max(0, Number(durationMinutes) || 0) * 60;
  return Math.max(0, total - Math.max(0, Number(elapsedSeconds) || 0));
}

/** How long the person may stay silent after Tuck's line before Tuck nudges them: longer after a question. */
export function silenceWaitMs(tuckLine) {
  return String(tuckLine ?? "").includes("?") ? SILENCE_QUESTION_WAIT_MS : SILENCE_STATEMENT_WAIT_MS;
}

/** The body of POST /api/v1/thinking/conversation-turn (the backend validates every field). A silent turn has no answer: `silent: true`. */
export function buildConversationTurnRequest({ plan, usedPathIds = [], elapsedSeconds, durationMinutes, lines = [], transcript, silent = false }) {
  const history = lines
    .filter((line) => (line?.speaker === "tuck" || line?.speaker === "person") && clip(line.text, HISTORY_TEXT_LENGTH) !== "")
    .slice(-HISTORY_LINES)
    .map((line) => ({ speaker: line.speaker, text: clip(line.text, HISTORY_TEXT_LENGTH) }));
  return {
    topic: plan.title,
    paths: plan.paths.map((path) => ({ id: path.id, line: path.line })),
    usedPathIds: [...usedPathIds],
    phase: conversationPhase(elapsedSeconds, durationMinutes),
    remainingSeconds: remainingConversationSeconds(elapsedSeconds, durationMinutes),
    history,
    transcript: silent ? "(silence)" : clip(transcript, TRANSCRIPT_LENGTH),
    ...(silent ? { silent: true } : {}),
  };
}

/** Adds the path Tuck just used, once. */
export function nextUsedPathIds(usedPathIds, reply) {
  const used = Array.isArray(usedPathIds) ? [...usedPathIds] : [];
  const pathId = reply?.pathId;
  if (typeof pathId !== "string" || pathId === "" || used.includes(pathId)) return used;
  return [...used, pathId];
}

const MISSED_WORD_LINE = "Sorry, I missed that word. Can you say it one more time?";
const MEANING_MAX_WORDS = 8;
// Keep in sync with isMeaningQuestion in backend/src/thinking/conversation-turn-service.ts (same patterns, same tests).
const MEANING_PATTERNS = [
  /^what does (.+) mean$/u,
  /^what do you mean(?: by)? (.+)$/u,
  /^what(?:'s| is) the meaning of (.+)$/u,
  /^what(?:'s| is) (.+)$/u,
  /^how do (?:you|i) (?:say|use) (.+)$/u,
  /^can you explain (?:what )?(.+?)(?: means?)?$/u,
  /^i (?:don't|do not) know what (.+?) means?$/u,
  /^i (?:don't|do not) understand (?:what )?(.+)$/u,
];
const NOT_A_WORD_TO_EXPLAIN = /^(?:your|yours|you|you're|my|mine|our|their|his|her|the best|the most|the first|the last|a good|a great)\b/u;
const LEADING_FILLER = /^(?:(?:yes|yeah|oh|sorry|so|well|um|uh|hmm|ok|okay|and|but)\s+)+/u;

/** A short question about the meaning, translation or use of a word or phrase, as speech recognition writes it (often without a question mark). */
export function isMeaningQuestion(text) {
  const normalized = String(text ?? "").toLowerCase().replace(/[’]/gu, "'").replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/gu, " ").trim().replace(LEADING_FILLER, "");
  if (!normalized || normalized.split(" ").length > MEANING_MAX_WORDS) return false;
  return MEANING_PATTERNS.some((pattern) => {
    const subject = pattern.exec(normalized)?.[1]?.trim();
    return Boolean(subject) && !NOT_A_WORD_TO_EXPLAIN.test(subject);
  });
}

/** Used when the turn request fails: a closing line in the closing phase, a missed-word line for a meaning question, otherwise the next unused path. */
export function fallbackConversationTurn({ plan, usedPathIds = [], phase, transcript = "" }) {
  if (phase === "closing") return { say: CONVERSATION_CLOSING_LINE, move: "WRAP", pathId: null };
  if (isMeaningQuestion(transcript)) return { say: MISSED_WORD_LINE, move: "FOLLOW", pathId: null };
  const used = new Set(usedPathIds);
  const next = plan.paths.find((path) => !used.has(path.id));
  if (next) return { say: next.line, move: "NEW_PATH", pathId: next.id };
  return { say: CONVERSATION_FOLLOW_LINE, move: "FOLLOW", pathId: null };
}

export function isConversationEnd(reply) {
  return reply?.move === "WRAP" || reply?.move === "END";
}

/** Short replies are normal in conversation: anything of two words or more gets a reaction. */
export function shouldReact(transcript) {
  return String(transcript ?? "").trim().split(/\s+/u).filter(Boolean).length >= 2;
}
