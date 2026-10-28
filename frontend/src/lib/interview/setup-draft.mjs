import { isValidJobDirection } from "./job-direction.mjs";
import { normalizeFocus, normalizeSeniority } from "./interview-normalization.mjs";

export const setupDraftStorageKey = "eia:setup-draft:v1";
const maxAgeMs = 14 * 24 * 60 * 60 * 1000;

function validDirection(value) {
  if (!isValidJobDirection(value)) return null;
  return { ...value, suggestedSeniority: normalizeSeniority(value.suggestedSeniority) };
}

function validPart(part, kind) {
  if (kind === "job") {
    if (typeof part?.text !== "string" || !part.text.trim()) return null;
  } else if (typeof part?.fileName !== "string" || !part.fileName.trim()) return null;
  const direction = validDirection(part?.direction);
  // Pasted job text is kept even before it is analyzed; a resume part only exists with its analysis.
  if (kind === "job" && !direction) return part?.direction == null ? { text: part.text, direction: null, focus: normalizeFocus(part.focus) } : null;
  if (!direction) return null;
  return kind === "job"
    ? { text: part.text, direction, focus: normalizeFocus(part.focus) }
    : { fileName: part.fileName, direction, focus: normalizeFocus(part.focus) };
}

export function readSetupDraft(storage, userId, now = Date.now()) {
  try {
    const raw = storage.getItem(setupDraftStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || value.userId !== userId
      || typeof value.savedAt !== "number" || !Number.isFinite(value.savedAt)
      || value.savedAt > now || now - value.savedAt > maxAgeMs
      || !["manual", "auto", "resume"].includes(value.mode)) {
      storage.removeItem(setupDraftStorageKey);
      return null;
    }
    const job = value.job ? validPart(value.job, "job") : null;
    const resume = value.resume ? validPart(value.resume, "resume") : null;
    if (!job && !resume) {
      storage.removeItem(setupDraftStorageKey);
      return null;
    }
    return { version: 1, savedAt: value.savedAt, userId, mode: value.mode, job, resume };
  } catch {
    try { storage.removeItem(setupDraftStorageKey); } catch { /* Storage is optional. */ }
    return null;
  }
}

export function writeSetupDraft(storage, draft) {
  try {
    const job = draft?.job ? validPart(draft.job, "job") : null;
    const resume = draft?.resume ? validPart(draft.resume, "resume") : null;
    if (!draft || typeof draft.userId !== "string" || !draft.userId || (!job && !resume)
      || !["manual", "auto", "resume"].includes(draft.mode)) {
      storage.removeItem(setupDraftStorageKey);
      return;
    }
    storage.setItem(setupDraftStorageKey, JSON.stringify({ version: 1, savedAt: Date.now(), userId: draft.userId, mode: draft.mode, job, resume }));
  } catch { /* Storage is optional. */ }
}

export function clearSetupDraft(storage, part = "all") {
  try {
    if (part === "all") { storage.removeItem(setupDraftStorageKey); return; }
    // Parse and validate the existing envelope while preserving its owner id and other part.
    const raw = storage.getItem(setupDraftStorageKey);
    if (!raw) return;
    const current = JSON.parse(raw);
    if (!current || current.version !== 1) { storage.removeItem(setupDraftStorageKey); return; }
    const job = part === "job" ? null : validPart(current.job, "job");
    const resume = part === "resume" ? null : validPart(current.resume, "resume");
    if (!job && !resume) storage.removeItem(setupDraftStorageKey);
    else storage.setItem(setupDraftStorageKey, JSON.stringify({ ...current, savedAt: Date.now(), job, resume }));
  } catch { /* Storage is optional. */ }
}
