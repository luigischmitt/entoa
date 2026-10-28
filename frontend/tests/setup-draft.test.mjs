import test from "node:test";
import assert from "node:assert/strict";
import { clearSetupDraft, readSetupDraft, setupDraftStorageKey, writeSetupDraft } from "../src/lib/interview/setup-draft.mjs";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const direction = {
  targetRole: "Software Engineer", suggestedSeniority: "senior", mainInterviewEmphasis: "System design decisions",
  priorityCompetencies: ["Distributed systems"], productTeamContext: "A product team", tailoredQuestions: Array.from({ length: 8 }, (_, index) =>
    `How would you design a resilient job processing system for case ${index + 1}?`),
};
const draft = { version: 1, savedAt: 1000, userId: "user-a", mode: "auto", job: { text: "Build and operate reliable software services.", direction, focus: "technical-depth" }, resume: null };

test("setup draft round trips for its user", () => {
  const storage = new MemoryStorage();
  writeSetupDraft(storage, draft);
  const restored = readSetupDraft(storage, "user-a");
  assert.equal(restored.userId, "user-a");
  assert.equal(restored.mode, "auto");
  assert.equal(restored.job.text, draft.job.text);
  assert.deepEqual(restored.job.direction, direction);
});

test("another user does not receive a draft", () => {
  const storage = new MemoryStorage();
  writeSetupDraft(storage, draft);
  assert.equal(readSetupDraft(storage, "user-b"), null);
});

test("expired drafts are removed", () => {
  const storage = new MemoryStorage();
  storage.setItem(setupDraftStorageKey, JSON.stringify({ ...draft, savedAt: 1 }));
  assert.equal(readSetupDraft(storage, "user-a", 14 * 24 * 60 * 60 * 1000 + 2), null);
  assert.equal(storage.getItem(setupDraftStorageKey), null);
});

test("corrupted JSON is removed", () => {
  const storage = new MemoryStorage();
  storage.setItem(setupDraftStorageKey, "{");
  assert.equal(readSetupDraft(storage, "user-a"), null);
  assert.equal(storage.getItem(setupDraftStorageKey), null);
});

test("throwing storage never escapes", () => {
  const storage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
  assert.doesNotThrow(() => readSetupDraft(storage, "user-a"));
  assert.doesNotThrow(() => writeSetupDraft(storage, draft));
  assert.doesNotThrow(() => clearSetupDraft(storage, "all"));
});

test("clearing one part preserves the other and clearing the last removes the key", () => {
  const storage = new MemoryStorage();
  writeSetupDraft(storage, { ...draft, resume: { fileName: "resume.pdf", direction, focus: "mixed" } });
  clearSetupDraft(storage, "job");
  assert.equal(readSetupDraft(storage, "user-a").job, null);
  assert.equal(readSetupDraft(storage, "user-a").resume.fileName, "resume.pdf");
  clearSetupDraft(storage, "resume");
  assert.equal(storage.getItem(setupDraftStorageKey), null);
});

test("invalid direction drops only its part", () => {
  const storage = new MemoryStorage();
  storage.setItem(setupDraftStorageKey, JSON.stringify({ ...draft, savedAt: Date.now(), resume: { fileName: "resume.pdf", direction: { targetRole: "" }, focus: "mixed" } }));
  const restored = readSetupDraft(storage, "user-a");
  assert.ok(restored);
  assert.deepEqual(restored.job.direction, direction);
  assert.equal(restored.resume, null);
});

test("pasted job text is kept before it is analyzed", () => {
  const storage = new MemoryStorage();
  writeSetupDraft(storage, { version: 1, savedAt: 0, userId: "u1", mode: "auto", job: { text: "Senior backend role at a fintech", direction: null, focus: "mixed" }, resume: null });
  assert.deepEqual(readSetupDraft(storage, "u1")?.job, { text: "Senior backend role at a fintech", direction: null, focus: "mixed" });
});
