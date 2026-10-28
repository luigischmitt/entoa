export type InterviewSeniority = "intern" | "junior" | "mid-level" | "senior";
export type InterviewFocus = "mixed" | "technical-depth";
export function normalizeSeniority(value: unknown): InterviewSeniority;
export function normalizeFocus(value: unknown): InterviewFocus;
