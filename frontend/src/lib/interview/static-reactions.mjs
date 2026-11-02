// Static interviewer reactions: short MP3 files synthesized ahead of time (scripts/generate-reactions.mjs) and served from
// public/audio/reactions/<voice id>/ (Kokoro) or public/audio/reactions-azure/<voice id>/ (Azure), so the interviewer's
// instant acknowledgement needs no /speech request at speed 1 and plays in the same voice as the session.

import { resolveInterviewerVoice } from "./voices.mjs";

export const CONVERSATION_REACTIONS = ["Oh, really?", "Hm, interesting.", "I see.", "Oh, I see.", "Ah, okay.", "Mm-hm.", "Right.", "Huh, interesting."];

/** "Mm-hm, okay." -> "mm-hm-okay.mp3": lowercase, every other run of characters becomes "-", no leading or trailing "-". */
export function reactionFileName(phrase) {
  return `${String(phrase).toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "")}.mp3`;
}

/** The folder of a source's files: "azure" files live apart from the Kokoro ones; anything else is Kokoro. */
export function reactionDirectory(source = "kokoro") {
  return source === "azure" ? "/audio/reactions-azure" : "/audio/reactions";
}

export function reactionAudioPath(voice, phrase, source = "kokoro") {
  return `${reactionDirectory(source)}/${resolveInterviewerVoice(voice)}/${reactionFileName(phrase)}`;
}

/** Fetches the static reaction for a phrase of a voice source; rejects when the file is missing so the caller can skip it. */
export async function loadStaticReaction(voice, phrase, source = "kokoro", fetcher = fetch) {
  const response = await fetcher(reactionAudioPath(voice, phrase, source));
  if (!response.ok) throw new Error(`Static reaction unavailable: ${response.status}`);
  return response.blob();
}
