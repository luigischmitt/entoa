import test from "node:test";
import assert from "node:assert/strict";
import { buildVoiceTrainingPhrases } from "../src/lib/interview/voice-insights.mjs";
import { buildVoiceSession, focusedSessionSize, phrasePracticeState, quickSessionSize, rankTrainingPhrases, summarizeVoiceSession, voiceSessionCatalog } from "../src/lib/interview/voice-sessions.mjs";

const attempt = (accuracy, createdAt = "2026-04-01T10:00:00.000Z", id = undefined) => ({ ...(id ? { id } : {}), scores: { accuracy, fluency: null, prosody: null }, words: [], createdAt });
const phrase = (id, overrides = {}) => ({
  id, referenceText: `Phrase ${id} for the interview.`, source: "english", patternType: "GRAMMAR", wordCount: 8,
  recurrence: 1, time: Date.parse("2026-04-01T00:00:00.000Z"), beforeAccuracy: null, ...overrides,
});
const ids = (list) => list.map((item) => item.id);

test("derives practice state from the latest scored attempt", () => {
  assert.deepEqual(phrasePracticeState(undefined), { practiced: false, latestAccuracy: null, bestAccuracy: null, mastered: false });
  assert.deepEqual(phrasePracticeState([]), { practiced: false, latestAccuracy: null, bestAccuracy: null, mastered: false });
  assert.deepEqual(phrasePracticeState([attempt(90), attempt(60)]), { practiced: true, latestAccuracy: 60, bestAccuracy: 90, mastered: false });
  assert.deepEqual(phrasePracticeState([attempt(60), attempt(88)]), { practiced: true, latestAccuracy: 88, bestAccuracy: 88, mastered: true });
  assert.deepEqual(phrasePracticeState([attempt(90), attempt(null)]), { practiced: true, latestAccuracy: 90, bestAccuracy: 90, mastered: true });
  assert.equal(phrasePracticeState([attempt(84.9)]).mastered, false);
});

test("ranks unmastered phrases before mastered ones", () => {
  const phrases = [phrase("mastered"), phrase("open")];
  assert.deepEqual(ids(rankTrainingPhrases(phrases, { mastered: [attempt(95)] })), ["open", "mastered"]);
});

test("ranks unpracticed phrases before practiced ones", () => {
  const phrases = [phrase("practiced", { beforeAccuracy: 10 }), phrase("fresh", { beforeAccuracy: 90 })];
  assert.deepEqual(ids(rankTrainingPhrases(phrases, { practiced: [attempt(40)] })), ["fresh", "practiced"]);
});

test("ranks higher recurrence first", () => {
  const phrases = [phrase("single", { recurrence: 1 }), phrase("repeated", { recurrence: 3 })];
  assert.deepEqual(ids(rankTrainingPhrases(phrases)), ["repeated", "single"]);
});

test("ranks weaker phrases first using before accuracy, then 50 when unknown", () => {
  const phrases = [
    phrase("before-90", { beforeAccuracy: 90 }),
    phrase("unknown"),
    phrase("before-20", { beforeAccuracy: 20 }),
  ];
  assert.deepEqual(ids(rankTrainingPhrases(phrases)), ["before-20", "unknown", "before-90"]);
});

test("uses latest attempt accuracy over before accuracy for practiced phrases", () => {
  const phrases = [
    phrase("latest-strong", { beforeAccuracy: 10 }),
    phrase("latest-weak", { beforeAccuracy: 90 }),
  ];
  const attempts = { "latest-strong": [attempt(80)], "latest-weak": [attempt(30)] };
  assert.deepEqual(ids(rankTrainingPhrases(phrases, attempts)), ["latest-weak", "latest-strong"]);
});

test("ranks newer phrases first and keeps original order on full ties", () => {
  const phrases = [
    phrase("older", { time: 1 }),
    phrase("newer", { time: 2 }),
    phrase("tie-first", { time: 3 }),
    phrase("tie-second", { time: 3 }),
  ];
  assert.deepEqual(ids(rankTrainingPhrases(phrases)), ["tie-first", "tie-second", "newer", "older"]);
});

test("ranking returns a new array and leaves the input untouched", () => {
  const phrases = [phrase("a", { time: 1 }), phrase("b", { time: 2 })];
  const snapshot = [...phrases];
  const ranked = rankTrainingPhrases(phrases);
  assert.notEqual(ranked, phrases);
  assert.deepEqual(phrases, snapshot);
});

test("quick session interleaves english and pronunciation starting with the top-ranked source", () => {
  const phrases = [
    phrase("e1", { recurrence: 5 }),
    phrase("e2", { recurrence: 4 }),
    phrase("e3", { recurrence: 3 }),
    phrase("p1", { source: "pronunciation", patternType: null, recurrence: 2 }),
    phrase("p2", { source: "pronunciation", patternType: null, recurrence: 1 }),
    phrase("p3", { source: "pronunciation", patternType: null, recurrence: 0 }),
  ];
  assert.equal(quickSessionSize, 5);
  assert.deepEqual(ids(buildVoiceSession(phrases, {}, { kind: "quick" })), ["e1", "p1", "e2", "p2", "e3"]);
});

test("quick session starts with pronunciation when it is the top-ranked source and continues with the other list when one runs out", () => {
  const phrases = [
    phrase("p1", { source: "pronunciation", patternType: null, recurrence: 9 }),
    phrase("e1", { recurrence: 2 }),
    phrase("p2", { source: "pronunciation", patternType: null, recurrence: 1 }),
    phrase("p3", { source: "pronunciation", patternType: null, recurrence: 1 }),
    phrase("p4", { source: "pronunciation", patternType: null, recurrence: 1 }),
  ];
  assert.deepEqual(ids(buildVoiceSession(phrases, {}, { kind: "quick" })), ["p1", "e1", "p2", "p3", "p4"]);
});

test("quick session only uses short phrases when enough of them exist", () => {
  const short = [1, 2, 3, 4, 5].map((index) => phrase(`short-${index}`, { wordCount: 10 }));
  const long = phrase("long", { wordCount: 15, recurrence: 99 });
  const session = buildVoiceSession([long, ...short], {}, { kind: "quick" });
  assert.equal(session.length, 5);
  assert.equal(session.some((item) => item.id === "long"), false);
});

test("quick session falls back to all phrases when fewer than five are short", () => {
  const short = [phrase("short-1", { wordCount: 4, recurrence: 0 }), phrase("short-2", { wordCount: 4, recurrence: 0 })];
  const long = [phrase("long-1", { wordCount: 20, recurrence: 3 }), phrase("long-2", { wordCount: 20, recurrence: 2 }), phrase("long-3", { wordCount: 20, recurrence: 1 })];
  assert.deepEqual(ids(buildVoiceSession([...long, ...short], {}, { kind: "quick" })), ["long-1", "long-2", "long-3", "short-1", "short-2"]);
});

test("english session filters by pattern type and ranks up to the focused size", () => {
  const phrases = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => phrase(`g${index}`, { patternType: "GRAMMAR", recurrence: index })),
    phrase("wc", { patternType: "WORD_CHOICE", recurrence: 100 }),
    phrase("pron", { source: "pronunciation", patternType: null, recurrence: 100 }),
  ];
  assert.equal(focusedSessionSize, 8);
  const session = buildVoiceSession(phrases, {}, { kind: "english", patternType: "GRAMMAR" });
  assert.equal(session.length, focusedSessionSize);
  assert.ok(session.every((item) => item.source === "english" && item.patternType === "GRAMMAR"));
  assert.equal(session[0].id, "g9");
  const any = buildVoiceSession(phrases, {}, { kind: "english", patternType: null });
  assert.equal(any[0].id, "wc");
  assert.equal(any.some((item) => item.id === "pron"), false);
});

test("pronunciation session only uses pronunciation phrases", () => {
  const phrases = [
    phrase("e1", { recurrence: 9 }),
    phrase("p1", { source: "pronunciation", patternType: null, recurrence: 1 }),
    phrase("p2", { source: "pronunciation", patternType: null, recurrence: 2 }),
  ];
  assert.deepEqual(ids(buildVoiceSession(phrases, {}, { kind: "pronunciation" })), ["p2", "p1"]);
});

test("excludeIds removes phrases while candidates remain and is ignored when the kind would be empty", () => {
  const phrases = [
    phrase("e1", { recurrence: 2 }),
    phrase("e2", { recurrence: 1 }),
    phrase("p1", { source: "pronunciation", patternType: null }),
  ];
  assert.deepEqual(ids(buildVoiceSession(phrases, {}, { kind: "english", excludeIds: ["e1"] })), ["e2"]);
  assert.deepEqual(ids(buildVoiceSession(phrases, {}, { kind: "pronunciation", excludeIds: ["p1"] })), ["p1"]);
  assert.deepEqual(ids(buildVoiceSession(phrases, {}, { kind: "english", excludeIds: ["e1", "e2"] })), ["e1", "e2"]);
});

test("catalog counts unmastered phrases per kind and orders english types", () => {
  const phrases = [
    phrase("g1", { patternType: "GRAMMAR" }),
    phrase("g2", { patternType: "GRAMMAR" }),
    phrase("s1", { patternType: "STRUCTURE" }),
    phrase("w1", { patternType: "WORD_CHOICE" }),
    phrase("w2", { patternType: "WORD_CHOICE" }),
    phrase("f1", { patternType: "FALSE_COGNATE" }),
    phrase("f2", { patternType: "FALSE_COGNATE" }),
    phrase("mastered-g", { patternType: "GRAMMAR" }),
    phrase("p1", { source: "pronunciation", patternType: null }),
    phrase("p2", { source: "pronunciation", patternType: null }),
  ];
  const catalog = voiceSessionCatalog(phrases, { "mastered-g": [attempt(90)] });
  assert.deepEqual(catalog, {
    total: 10,
    mastered: 1,
    quick: { available: 9 },
    english: {
      available: 7,
      types: [
        { type: "GRAMMAR", count: 2 },
        { type: "WORD_CHOICE", count: 2 },
        { type: "FALSE_COGNATE", count: 2 },
        { type: "STRUCTURE", count: 1 },
      ],
    },
    pronunciation: { available: 2 },
  });
});

test("summary compares attempts by id and by createdAt against the session start", () => {
  const session = [phrase("by-id"), phrase("by-date"), phrase("untouched")];
  const atStart = {
    "by-id": [attempt(50, "2026-04-01T10:00:00.000Z", "a1")],
    "by-date": [attempt(70, "2026-04-01T10:00:00.000Z")],
  };
  const now = {
    "by-id": [attempt(50, "2026-04-01T10:00:00.000Z", "a1"), attempt(81.4, "2026-04-02T10:00:00.000Z", "a2"), attempt(60, "2026-04-02T11:00:00.000Z", "a3")],
    "by-date": [attempt(70, "2026-04-01T10:00:00.000Z"), attempt(64.6, "2026-04-02T10:00:00.000Z")],
  };
  const summary = summarizeVoiceSession(session, atStart, now);
  assert.deepEqual(summary, {
    practiced: 2,
    improved: 1,
    rows: [
      { id: "by-id", text: "Phrase by-id for the interview.", before: 50, after: 81, practiced: true },
      { id: "by-date", text: "Phrase by-date for the interview.", before: 70, after: 65, practiced: true },
      { id: "untouched", text: "Phrase untouched for the interview.", before: null, after: null, practiced: false },
    ],
  });
});

test("summary falls back to beforeAccuracy when the phrase had no attempts at start", () => {
  const session = [phrase("reported", { beforeAccuracy: 62.4 }), phrase("fresh")];
  const now = { reported: [attempt(75, "2026-04-02T10:00:00.000Z", "x")], fresh: [attempt(70, "2026-04-02T10:00:00.000Z", "y")] };
  const summary = summarizeVoiceSession(session, {}, now);
  assert.deepEqual(summary.rows.map(({ id, before, after }) => [id, before, after]), [["reported", 62, 75], ["fresh", null, 70]]);
  assert.equal(summary.practiced, 2);
  assert.equal(summary.improved, 1);
});

test("buildVoiceTrainingPhrases adds session fields for english and pronunciation phrases", () => {
  const record = {
    id: "interview",
    completedAt: "2026-09-01T12:00:00.000Z",
    createdAt: "2026-09-01T12:00:00.000Z",
    feedback: {
      status: "ready",
      azureSummary: {
        accuracy: { mean: 82, sampleCount: 1, totalDurationMs: 25_000 },
        fluency: { mean: 76, sampleCount: 1, totalDurationMs: 25_000 },
        prosody: { mean: 80, sampleCount: 1, totalDurationMs: 25_000 },
        answers: [{
          sequenceNumber: 2,
          phrases: [{
            phraseIndex: 0,
            text: "We improved latency for our global customers.",
            issue: "pronunciation",
            score: 60,
            problemWords: [
              { word: "latency", score: 50, errorType: "Mispronunciation", prosodyErrors: [], worstPhoneme: "t" },
              { word: "Latency", score: 52, errorType: "Mispronunciation", prosodyErrors: [], worstPhoneme: "s" },
              { word: "global", score: 60, errorType: "Mispronunciation", prosodyErrors: [], worstPhoneme: "" },
            ],
          }],
        }],
      },
      analysis: {
        englishCommunication: {
          patterns: [{
            sequenceNumber: 4,
            type: "GRAMMAR",
            evidence: "I leaded the migration for our global customers.",
            rephrasedExample: "I led the migration for our global customers.",
            why: "  Past tense of lead is led.  ",
            suggestion: "Use led.",
          }],
        },
      },
    },
  };
  const phrases = buildVoiceTrainingPhrases([record]);
  const english = phrases.find((item) => item.source === "english");
  const pronunciation = phrases.find((item) => item.source === "pronunciation");
  assert.equal(english.wordCount, 8);
  assert.equal(english.patternType, "GRAMMAR");
  assert.equal(english.explanation, "Past tense of lead is led.");
  assert.equal(english.issue, null);
  assert.deepEqual(english.soundTips, []);
  assert.equal(pronunciation.wordCount, 7);
  assert.equal(pronunciation.patternType, null);
  assert.equal(pronunciation.explanation, null);
  assert.equal(pronunciation.issue, "pronunciation");
  assert.deepEqual(pronunciation.soundTips, [{ word: "latency", phoneme: "t" }]);
});
