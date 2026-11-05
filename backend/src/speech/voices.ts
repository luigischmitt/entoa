/** Azure public identifiers clients may choose; each maps to a Chatterbox clone. Keep in sync with the frontend. */
export const defaultInterviewerVoice = "en-US-AndrewNeural";

export type SelectableVoiceInfo = { id: string; chatterboxVoiceId: string; gender: "male" | "female"; accent: "US" | "UK" };

// Voices cloned on the DeepInfra account; Andrew is Tuck.
export const selectableVoiceList: readonly SelectableVoiceInfo[] = [
  { id: "en-US-AndrewNeural", chatterboxVoiceId: "pxukbhrmd6in9omcerme", gender: "male", accent: "US" },
  { id: "en-US-BrianNeural", chatterboxVoiceId: "1di0faf2tnibx9ccbp08", gender: "male", accent: "US" },
  { id: "en-US-GuyNeural", chatterboxVoiceId: "7sy7qh963bdp4d61cbke", gender: "male", accent: "US" },
  { id: "en-GB-RyanNeural", chatterboxVoiceId: "u3o3sghrrgld77jxi368", gender: "male", accent: "UK" },
  { id: "en-US-AvaNeural", chatterboxVoiceId: "nkwdqjkpkb656sng0njk", gender: "female", accent: "US" },
  { id: "en-US-EmmaNeural", chatterboxVoiceId: "qhoy6haei50tv441nacf", gender: "female", accent: "US" },
  { id: "en-US-JennyNeural", chatterboxVoiceId: "hjaqgzxdrdyd2jkwsdsi", gender: "female", accent: "US" },
  { id: "en-GB-SoniaNeural", chatterboxVoiceId: "v3oq44tcx0dgkwlhis7f", gender: "female", accent: "UK" },
];

export const selectableVoices: readonly string[] = selectableVoiceList.map((voice) => voice.id);

/** Azure-only German voice for the German conversation (multilingual: speaks German and Portuguese). Never shown in the voice list. */
export const germanConversationVoice = "de-DE-FlorianMultilingualNeural";

/** Voices served only by Azure (no Chatterbox clone): no primary attempt, no hedge and never used for background prefetch. */
export function isAzureOnlyVoice(value: unknown): value is string {
  return value === germanConversationVoice;
}

export function isSelectableVoice(value: unknown): value is string {
  return typeof value === "string" && (selectableVoices.includes(value) || isAzureOnlyVoice(value));
}

/** The requested voice when it is selectable, otherwise `fallback` (the configured default). */
export function resolveVoice(requested: unknown, fallback: string): string {
  return isSelectableVoice(requested) ? requested : fallback;
}

/** The Chatterbox clone of a selectable voice id; anything unknown gets Andrew's clone. No untrusted client value reaches the provider. */
export function resolveChatterboxVoice(requested: unknown): string {
  const andrew = selectableVoiceList[0]!.chatterboxVoiceId;
  return selectableVoiceList.find((voice) => voice.id === requested)?.chatterboxVoiceId ?? andrew;
}
