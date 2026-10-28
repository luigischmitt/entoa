import { expect } from "vitest";

export function expectPrecisionRules(prompt: string) {
  expect(prompt).toContain("a proficient professional listener would notice as wrong");
  expect(prompt).toContain("valid technical terms or jargon and their normal usage (deploy, commit, merge, rollback, endpoint, payload)");
  expect(prompt).toContain("stylistic rewording or preferences; synonyms or near-synonyms; punctuation, commas, or capitalization; filler words");
  expect(prompt).toContain("anything that could be a transcription artifact");
  expect(prompt).toContain("Returning fewer items, or none, is correct");
  expect(prompt).toContain("never pad, and never repeat the same underlying error with different wording");
  expect(prompt).toContain("and keeps the candidate's own wording otherwise");
  expect(prompt).toContain("Choose each pattern type by its definition");
  expect(prompt).toContain("GRAMMAR: tense or aspect");
  expect(prompt).toContain("WORD_CHOICE: a real English word used with the wrong meaning");
  expect(prompt).toContain("FALSE_COGNATE: only when a word is used with the meaning of a similar Portuguese word");
  expect(prompt).toContain("never use it for grammar");
  expect(prompt).toContain("STRUCTURE: sentence or answer organization");
  expect(prompt).toContain("a transcription error must never become the candidate's error");
  expect(prompt).not.toContain("up to eight total, even if it occurs only once");
}

export function expectConciseTechnicalRules(prompt: string) {
  expect(prompt).toContain("report every material technical gap, at most 2 per answer");
  expect(prompt).toContain("as an experienced interviewer for that role and seniority scoring THAT answer");
  expect(prompt).toContain("If the answer fully covered the question, return no gaps");
  expect(prompt).toContain("an answer that never says against what reference or by what criterion it was judged is a material gap");
  expect(prompt).toContain("For every gap also write howToAnswer");
  expect(prompt).toContain("Never report as a gap:");
  expect(prompt).toContain("generic \"could have mentioned X\" items, nitpicks, or anything only natural in a written document");
  expect(prompt).toContain("process steps, checks, rollback steps or trade-offs the question did not ask for");
  expect(prompt).toContain("never \"mentioned technology X\"");
  expect(prompt).toContain("how something was integrated, implemented or built when the question did not ask");
  expect(prompt).toContain("at most 2 per answer and 5 in total, one per distinct point");
}

export function expectPortugueseQualityRules(prompt: string) {
  expect(prompt).toContain("correct, natural Brazilian Portuguese with proper accents, cedillas and spelling");
}

export function expectRealReportCalibrationRules(prompt: string) {
  expect(prompt).toContain("Address the candidate directly as \"você\"");
  expect(prompt).toContain("never write an English sentence in a Portuguese field");
  expect(prompt).toContain("\"super base\" or \"Superbase\" for Supabase");
  expect(prompt).toContain("Never treat a mis-transcribed product or technology name as an error");
  expect(prompt).toContain("Do NOT flag present versus past tense when describing a project or stack");
  expect(prompt).toContain("fully correct, natural English with no remaining error");
}

export function expectSpecificPriorityRules(prompt: string) {
  expect(prompt).toContain("a short exact answer excerpt of at least four words");
  expect(prompt).toContain("Focus must be one specific actionable sentence");
  expect(prompt).toContain("never generic homework");
}
