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

/** Used when the turn request fails: a closing line in the closing phase, otherwise the next unused path. */
export function fallbackConversationTurn({ plan, usedPathIds = [], phase }) {
  if (phase === "closing") return { say: CONVERSATION_CLOSING_LINE, move: "WRAP", pathId: null };
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
