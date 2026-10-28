export type QuestionKind = "technical" | "behavioral" | "background";
export type QuestionCoverage = "broad-project";
export type QuestionTemplate = { id: string; prompt: string; cue: string; kind: QuestionKind; coverage?: QuestionCoverage };
export const genericQuestionBank: QuestionTemplate[];
export const genericJuniorQuestionBank: QuestionTemplate[];
export const questionBankRoles: string[];
export const technicalQuestionTopicIds: Set<string>;
export const technicalQuestionAlternates: Record<string, never>;
export function getQuestionBankForRole(role: string | null | undefined, seniority?: string | null, focus?: string | null): QuestionTemplate[];
