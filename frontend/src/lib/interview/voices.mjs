// Azure identifiers are sent to the backend; the Chatterbox reaction files use their own voice ids (scripts/generate-reactions.mjs).
export const DEFAULT_INTERVIEWER_VOICE = "en-US-AndrewNeural";

/** One entry per selectable voice: id, gender ("male" | "female") and accent ("US" | "UK"); the setup screen renders this list. */
export const INTERVIEWER_VOICE_OPTIONS = [
  { id: "en-US-AndrewNeural", gender: "male", accent: "US" },
  { id: "en-US-BrianNeural", gender: "male", accent: "US" },
  { id: "en-US-GuyNeural", gender: "male", accent: "US" },
  { id: "en-GB-RyanNeural", gender: "male", accent: "UK" },
  { id: "en-US-AvaNeural", gender: "female", accent: "US" },
  { id: "en-US-EmmaNeural", gender: "female", accent: "US" },
  { id: "en-US-JennyNeural", gender: "female", accent: "US" },
  { id: "en-GB-SoniaNeural", gender: "female", accent: "UK" },
];

export const INTERVIEWER_VOICES = INTERVIEWER_VOICE_OPTIONS.map((voice) => voice.id);

/** The chosen voice when it is a known one, otherwise the default. */
export function resolveInterviewerVoice(voice) {
  return INTERVIEWER_VOICES.includes(voice) ? voice : DEFAULT_INTERVIEWER_VOICE;
}
