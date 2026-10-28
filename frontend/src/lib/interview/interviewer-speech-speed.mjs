export const DEFAULT_INTERVIEWER_SPEECH_SPEED = 1;
export const interviewerSpeechSpeedStorageKey = "eia:interviewer-speech-speed";
/** Any speed in this range is allowed, in steps of `INTERVIEWER_SPEECH_SPEED_STEP`. */
export const MIN_INTERVIEWER_SPEECH_SPEED = 0.7;
export const MAX_INTERVIEWER_SPEECH_SPEED = 1.3;
export const INTERVIEWER_SPEECH_SPEED_STEP = 0.05;

/** A finite speed is clamped to the range and rounded to the step; anything else is the default. */
export function resolveInterviewerSpeechSpeed(speed) {
  if (typeof speed !== "number" || !Number.isFinite(speed) || speed <= 0) return DEFAULT_INTERVIEWER_SPEECH_SPEED;
  const clamped = Math.min(MAX_INTERVIEWER_SPEECH_SPEED, Math.max(MIN_INTERVIEWER_SPEECH_SPEED, speed));
  return Number((Math.round(clamped / INTERVIEWER_SPEECH_SPEED_STEP) * INTERVIEWER_SPEECH_SPEED_STEP).toFixed(2));
}

/** One step slower (-1) or faster (+1), kept inside the range. */
export function stepInterviewerSpeechSpeed(speed, direction) {
  return resolveInterviewerSpeechSpeed(resolveInterviewerSpeechSpeed(speed) + Math.sign(direction) * INTERVIEWER_SPEECH_SPEED_STEP);
}

/** "0,85×" in Portuguese, "0.85×" in English. */
export function formatInterviewerSpeechSpeed(speed, locale = "pt-BR") {
  const text = String(resolveInterviewerSpeechSpeed(speed));
  return `${locale === "en" ? text : text.replace(".", ",")}×`;
}

export function readStoredInterviewerSpeechSpeed(storage) {
  try {
    const raw = storage.getItem(interviewerSpeechSpeedStorageKey);
    return raw === null ? DEFAULT_INTERVIEWER_SPEECH_SPEED : resolveInterviewerSpeechSpeed(Number(raw));
  } catch { return DEFAULT_INTERVIEWER_SPEECH_SPEED; }
}

export function storeInterviewerSpeechSpeed(storage, speed) {
  try {
    const value = resolveInterviewerSpeechSpeed(speed);
    if (value === DEFAULT_INTERVIEWER_SPEECH_SPEED) storage.removeItem(interviewerSpeechSpeedStorageKey); else storage.setItem(interviewerSpeechSpeedStorageKey, String(value));
    return true;
  } catch { return false; }
}
