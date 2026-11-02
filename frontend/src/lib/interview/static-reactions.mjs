// Static interviewer reactions: short MP3 files synthesized ahead of time (scripts/generate-reactions.mjs) and served from
// public/audio/reactions/<voice id>/, so the interviewer's instant acknowledgement needs no /speech request at speed 1.

import { resolveInterviewerVoice } from "./voices.mjs";

export const CONVERSATION_REACTIONS = ["Oh, really?", "Hm, interesting.", "I see.", "Oh, I see.", "Ah, okay.", "Mm-hm.", "Right.", "Huh, interesting."];

/** "Mm-hm, okay." -> "mm-hm-okay.mp3": lowercase, every other run of characters becomes "-", no leading or trailing "-". */
export function reactionFileName(phrase) {
  return `${String(phrase).toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "")}.mp3`;
}

export function reactionAudioPath(voice, phrase) {
  return `/audio/reactions/${resolveInterviewerVoice(voice)}/${reactionFileName(phrase)}`;
}

/** Fetches the static reaction for a phrase; rejects when the file is missing so the caller can synthesize it instead. */
export async function loadStaticReaction(voice, phrase, fetcher = fetch) {
  const response = await fetcher(reactionAudioPath(voice, phrase));
  if (!response.ok) throw new Error(`Static reaction unavailable: ${response.status}`);
  return response.blob();
}
