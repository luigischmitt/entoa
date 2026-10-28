import type { JobDirection } from "./job-direction.mjs";
import type { SetupMode } from "./job-direction.mjs";

export type SetupDraftPart = { direction: JobDirection; focus: string };
export type SetupDraft = {
  version: 1;
  savedAt: number;
  userId: string;
  mode: SetupMode;
  job: { direction: JobDirection | null; focus: string; text: string } | null;
  resume: (SetupDraftPart & { fileName: string }) | null;
};
export const setupDraftStorageKey: "eia:setup-draft:v1";
export function readSetupDraft(storage: Pick<Storage, "getItem" | "removeItem">, userId: string | null, now?: number): SetupDraft | null;
export function writeSetupDraft(storage: Pick<Storage, "setItem" | "removeItem">, draft: SetupDraft): void;
export function clearSetupDraft(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, part?: "job" | "resume" | "all"): void;
