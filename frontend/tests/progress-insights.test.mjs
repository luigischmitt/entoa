import assert from "node:assert/strict";
import test from "node:test";
import { buildProgressInsights, weeklySessions } from "../src/lib/interview/progress-insights.mjs";

const pattern = (type, sequenceNumber, evidence, extra = {}) => ({ type, sequenceNumber, evidence, suggestion: `Fix ${evidence}`, rephrasedExample: `Better ${evidence}`, ...extra });
const voice = (mean, totalDurationMs = 60_000) => ({ mean, sampleCount: 3, totalDurationMs });
function record(id, day, { patterns = [], answers = 4, status = "completed", evidenceStatus = "SUFFICIENT", priorities = [], gaps = [], azure = null, feedbackStatus = "ready", role = "Backend Engineer", noFeedback = false } = {}) {
  const started = new Date(2026, 8, day, 10, 0, 0);
  const completed = new Date(2026, 8, day, 10, 25, 0);
  return {
    id, status, targetRole: role, seniority: "Senior", startedAt: started.toISOString(), completedAt: completed.toISOString(), createdAt: started.toISOString(), answerCount: answers,
    feedback: noFeedback ? null : {
      status: feedbackStatus,
      azureSummary: azure,
      analysis: feedbackStatus === "ready" ? { technicalContent: { summary: "", strengths: [], gaps }, englishCommunication: { clarity: "CLEAR", evidenceStatus, patterns }, priorities } : null,
    },
  };
}

test("ignores sessions that are not completed and reports honest empties", () => {
  const empty = buildProgressInsights([record("a", 1, { status: "in_progress" })]);
  assert.equal(empty.sessionCount, 0);
  assert.equal(empty.practiceMs, null);
  assert.deepEqual(empty.dimensions, []);
  assert.deepEqual(empty.commonErrors, []);
});
test("sums practice time from known durations only", () => {
  const unknown = { ...record("b", 2), startedAt: null };
  const result = buildProgressInsights([record("a", 1), unknown]);
  assert.equal(result.sessionCount, 2);
  assert.equal(result.practiceMs, 25 * 60_000);
  assert.equal(buildProgressInsights([unknown]).practiceMs, null);
});

test("English dimensions report answers without a prioritized issue identified and need enough answers", () => {
  const few = buildProgressInsights([record("a", 1, { answers: 2, patterns: [pattern("GRAMMAR", 1, "he go")] })]);
  assert.equal(few.dimensions.filter((d) => d.kind === "pattern").length, 0);
  const result = buildProgressInsights([record("a", 1, { answers: 4, patterns: [pattern("GRAMMAR", 1, "he go"), pattern("GRAMMAR", 1, "she do"), pattern("GRAMMAR", 3, "we was")] })]);
  const grammar = result.dimensions.find((d) => d.key === "GRAMMAR");
  assert.equal(grammar.value, 50); // answers 1 and 3 are affected, counted once per answer
  assert.match(grammar.detail, /2 de 4 respostas sem erro prioritário de gramática identificado no relatório/);
  assert.equal(result.dimensions.find((d) => d.key === "FALSE_COGNATE").value, 100);
  assert.equal(result.attentionDimension.key, "GRAMMAR");
  const english = buildProgressInsights([record("en", 1, { patterns: [], answers: 3 })], { locale: "en" });
  assert.match(english.dimensions.find((dimension) => dimension.key === "GRAMMAR").detail, /3 of 3 answers without a prioritized grammar issue identified/);
});

test("rejected, insufficient or invalid evidence never counts as a candidate error", () => {
  const rejected = record("a", 1, { evidenceStatus: "CANDIDATES_REJECTED", patterns: [pattern("GRAMMAR", 1, "x y")] });
  const insufficient = record("b", 2, { evidenceStatus: "INSUFFICIENT", patterns: [pattern("GRAMMAR", 1, "x y")] });
  const invalid = record("c", 3, { patterns: [{ type: "OTHER", sequenceNumber: 1, evidence: "a", suggestion: "b", rephrasedExample: "c" }, pattern("GRAMMAR", 1, " ", {})] });
  const zeroAccepted = { ...record("d", 4, { patterns: [pattern("GRAMMAR", 1, "x y")] }) };
  zeroAccepted.feedback.analysis.evidenceReview = { englishPatterns: { candidates: 3, accepted: 0, rejected: 3 } };
  const result = buildProgressInsights([rejected, insufficient, invalid, zeroAccepted]);
  assert.deepEqual(result.commonErrors, []);
  assert.equal(result.series.patterns.length, 1); // only the invalid-but-usable session has a (zero) rate
  assert.equal(result.series.patterns[0].value, 0);
});

test("pending and unavailable reports contribute nothing but still count as sessions", () => {
  const result = buildProgressInsights([record("a", 1, { feedbackStatus: "pending" }), record("b", 2, { feedbackStatus: "unavailable" }), record("c", 3, { noFeedback: true })]);
  assert.equal(result.sessionCount, 3);
  assert.equal(result.reportReadyCount, 0);
  assert.deepEqual(result.sessions.map((s) => s.reportStatus), ["none", "unavailable", "pending"]);
  assert.deepEqual(result.studyTopics, []);
});

test("common errors are ranked, deduplicated and carry the latest real example", () => {
  const result = buildProgressInsights([
    record("a", 1, { patterns: [pattern("GRAMMAR", 1, "I have 5 years"), pattern("WORD_CHOICE", 2, "make a decision")] }),
    record("b", 2, { patterns: [pattern("GRAMMAR", 1, "I have 6 years"), pattern("GRAMMAR", 2, "I have 6 years")] }),
  ]);
  assert.equal(result.commonErrors[0].type, "GRAMMAR");
  assert.equal(result.commonErrors[0].count, 3);
  assert.equal(result.commonErrors[0].sessionCount, 2);
  assert.equal(result.commonErrors[0].examples[0].evidence, "I have 6 years");
  assert.equal(result.commonErrors[0].examples.length, 2); // duplicates of the same sentence collapse
  assert.equal(result.commonErrors[0].trend, "unknown"); // two sessions are not a trend
  assert.equal(result.commonErrors[0].examples[0].rephrasedExample, "Better I have 6 years");
});

test("trend compares older and recent halves only with enough sessions", () => {
  const sessions = [
    record("a", 1, { patterns: [pattern("GRAMMAR", 1, "e1"), pattern("GRAMMAR", 2, "e2")] }),
    record("b", 2, { patterns: [pattern("GRAMMAR", 1, "e3")] }),
    record("c", 3, { patterns: [] }),
    record("d", 4, { patterns: [] }),
  ];
  assert.equal(buildProgressInsights(sessions).commonErrors[0].trend, "down");
  const worse = [record("a", 1), record("b", 2), record("c", 3, { patterns: [pattern("GRAMMAR", 1, "e1"), pattern("GRAMMAR", 2, "e2")] }), record("d", 4, { patterns: [pattern("GRAMMAR", 1, "e3")] })];
  assert.equal(buildProgressInsights(worse).commonErrors[0].trend, "up");
  assert.equal(buildProgressInsights(sessions.slice(0, 2)).sessionsUntilTrends, 1);
});

test("voice metrics enter the profile and series only when reliable", () => {
  const reliable = { accuracy: voice(80, 30_000), fluency: voice(70, 30_000), prosody: voice(60, 3_000) };
  const old = { accuracy: { mean: 90, sampleCount: 3 }, fluency: { mean: null, sampleCount: 0 }, prosody: { mean: 50, sampleCount: 2, totalDurationMs: 8_000 } };
  const result = buildProgressInsights([record("a", 1, { azure: reliable }), record("b", 2, { azure: old })]);
  assert.equal(result.dimensions.find((d) => d.key === "accuracy").value, 80);
  assert.equal(result.dimensions.find((d) => d.key === "prosody"), undefined);
  assert.equal(result.series.accuracy.length, 1);
  assert.equal(result.series.prosody.length, 0);
});

test("copy and labels never suggest an overall level or percentile", () => {
  const result = buildProgressInsights([record("a", 1, { azure: { accuracy: voice(80), fluency: voice(70), prosody: voice(60) }, patterns: [pattern("GRAMMAR", 1, "x y")] })]);
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /CEFR|\bB1\b|\bB2\b|Top \d|percentil/i);
});

test("passes the interview title through to session rows, null when absent", () => {
  const named = { ...record("a", 1), title: "Mock Google, rodada 2" };
  const result = buildProgressInsights([named, record("b", 2)]);
  const byId = Object.fromEntries(result.sessions.map((s) => [s.id, s]));
  assert.equal(byId.a.title, "Mock Google, rodada 2");
  assert.equal(byId.b.title, null);
  assert.equal(byId.a.role, "Backend Engineer");
});

test("weekly sessions cover eight Monday-based weeks", () => {
  const now = new Date(2026, 8, 30, 12).getTime(); // Wed
  const sessions = [new Date(2026, 8, 28, 9), new Date(2026, 8, 27, 9), new Date(2026, 7, 1, 9)].map((d) => ({ time: d.getTime() }));
  const weeks = weeklySessions(sessions, now);
  assert.equal(weeks.length, 8);
  assert.equal(weeks[7].count, 1); // Mon 28 Sep
  assert.equal(weeks[6].count, 1); // Sun 27 Sep belongs to the previous week
  assert.equal(weeks.reduce((s, w) => s + w.count, 0), 3 - 1 + 0); // 1 Aug is outside the 8-week window
});

const conversation = (id, day, { patterns = [], answers = 4, azure = null, topic = "Meu fim de semana" } = {}) => {
  const base = record(id, day, { patterns, answers, azure, gaps: [] });
  return {
    ...base,
    mode: "conversation",
    targetRole: "Modo livre",
    seniority: null,
    conversationTopic: topic,
    feedback: { ...base.feedback, analysisVersion: "c1", analysis: { ...base.feedback.analysis, reportKind: "conversation", technicalContent: { summary: "Conversa curta.", strengths: [{ sequenceNumber: 1, evidence: "a story", explanation: "Clear story." }], gaps: [] } } },
  };
};

test("conversations add to English errors and voice but never to technical gaps, gap series or study topics", () => {
  const interview = record("interview", 1, { answers: 4, patterns: [pattern("GRAMMAR", 1, "he go")], gaps: [{ sequenceNumber: 2, explanation: "Give a concrete example." }], priorities: [{ area: "TECHNICAL_CONTENT", sequenceNumber: 2, focus: "Give a concrete example.", exercise: "Practice one example." }], azure: { accuracy: voice(80, 60_000), fluency: voice(70, 60_000), prosody: voice(60, 60_000) } });
  const chat = conversation("chat", 2, { answers: 4, patterns: [pattern("GRAMMAR", 2, "she do")], azure: { accuracy: voice(60, 60_000), fluency: voice(50, 60_000), prosody: voice(40, 60_000) } });
  const alone = buildProgressInsights([interview]);
  const mixed = buildProgressInsights([interview, chat]);

  assert.equal(mixed.commonErrors[0].count, 2);
  assert.equal(mixed.commonErrors[0].sessionCount, 2);
  assert.equal(mixed.dimensions.find((d) => d.key === "GRAMMAR").value, 75);
  assert.equal(mixed.dimensions.find((d) => d.key === "accuracy").value, 70);
  assert.equal(mixed.series.accuracy.length, 2);

  assert.deepEqual(mixed.series.gaps, alone.series.gaps);
  assert.equal(mixed.series.gaps.length, 1);
  assert.equal(mixed.dimensions.filter((d) => d.kind === "technical").length, 0);
  // The technical topic comes from the interview's own report only; the conversation adds no technical topic.
  const technicalTopics = (result) => result.studyTopics.filter((topic) => topic.kind === "technical").map(({ title, sessionCount }) => [title, sessionCount]);
  assert.deepEqual(technicalTopics(mixed), [["Give a concrete example.", 1]]);
  assert.deepEqual(technicalTopics(mixed), technicalTopics(alone));
});

test("a conversation is practice in totals, weekly rhythm and session rows, with mode and display name", () => {
  const interview = record("interview", 1, { answers: 4 });
  const chat = conversation("chat", 2, { answers: 3, topic: "Viagens de trem" });
  const result = buildProgressInsights([interview, chat], { now: new Date(2026, 8, 2, 12).getTime() });
  assert.equal(result.sessionCount, 2);
  assert.equal(result.answerCount, 7);
  assert.equal(result.practiceMs, 50 * 60_000);
  assert.equal(result.weekly.reduce((sum, week) => sum + week.count, 0), 2);
  const byId = Object.fromEntries(result.sessions.map((s) => [s.id, s]));
  assert.equal(byId.chat.mode, "conversation");
  assert.equal(byId.chat.conversationTopic, "Viagens de trem");
  assert.equal(byId.chat.displayName, "Viagens de trem");
  assert.equal(byId.chat.seniority, null);
  assert.equal(byId.interview.mode, "interview");
  assert.equal(byId.interview.displayName, "Backend Engineer");
  assert.equal(byId.interview.seniority, "Senior");
});

test("latest role and seniority come from the latest interview, not a conversation", () => {
  const interview = record("interview", 1);
  const chat = conversation("chat", 5);
  const result = buildProgressInsights([interview, chat]);
  assert.equal(result.latestRole, "Backend Engineer");
  assert.equal(result.latestSeniority, "Senior");
  assert.equal(result.lastPracticeAt, chat.completedAt);
});

test("records without a mode behave as interviews", () => {
  const legacy = record("legacy", 1, { answers: 4, patterns: [pattern("GRAMMAR", 1, "he go")], gaps: [{ sequenceNumber: 2, explanation: "Give an example." }] });
  const result = buildProgressInsights([legacy]);
  assert.equal(result.sessions[0].mode, "interview");
  assert.equal(result.sessions[0].conversationTopic, null);
  assert.equal(result.series.gaps.length, 1);
  assert.equal(result.commonErrors[0].count, 1);
});
