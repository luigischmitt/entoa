import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeInsights } from "../src/lib/interview/home-insights.mjs";

const metric = (mean, totalDurationMs = 30_000) => ({ mean, sampleCount: 2, totalDurationMs });
const record = (id, completedAt, analysis = null, azureSummary = null) => ({
  id,
  status: "completed",
  targetRole: "Backend Engineer",
  focus: null,
  seniority: "Senior",
  startedAt: completedAt,
  completedAt,
  createdAt: completedAt,
  answerCount: 4,
  feedback: { status: "ready", analysis, azureSummary },
});

test("summarizes only persisted home information from the latest completed interview", () => {
  const older = record("older", "2026-01-10T10:00:00.000Z", { summary: "Resumo antigo." });
  const latest = record("latest", "2026-02-10T10:00:00.000Z", {
    interviewerTakeaway: { remember: "Você conectou a decisão técnica ao impacto." },
    englishCommunication: {
      clarity: "CLEAR",
      evidenceStatus: "SUFFICIENT",
      patterns: [{ type: "GRAMMAR", sequenceNumber: 1, evidence: "he go", suggestion: "Use goes", rephrasedExample: "He goes" }],
    },
  }, {
    accuracy: metric(82),
    fluency: metric(68),
    prosody: metric(74),
  });

  const result = buildHomeInsights([older, latest]);
  assert.equal(result.interviewCount, 2);
  assert.equal(result.lastInterviewAt, latest.completedAt);
  assert.equal(result.lastReportReady, true);
  assert.equal(result.lastTakeaway, "Você conectou a decisão técnica ao impacto.");
  assert.deepEqual(result.topPattern, { type: "Gramática", suggestion: "Use goes" });
  assert.equal(result.lastInterviewId, "latest");
  assert.equal(result.lastPriority, null);
  assert.equal("voiceFocus" in result, false);
});

test("uses the first non-empty priority focus of the latest interview", () => {
  const latest = record("latest", "2026-02-10T10:00:00.000Z", {
    priorities: [
      { focus: "   " },
      { focus: "  Responda primeiro com a decisão técnica.  " },
      { focus: "Use the present perfect." },
    ],
  });
  const result = buildHomeInsights([latest]);
  assert.equal(result.lastInterviewId, "latest");
  assert.equal(result.lastPriority, "Responda primeiro com a decisão técnica.");
});

test("keeps the first-practice state empty and does not manufacture voice data", () => {
  assert.deepEqual(buildHomeInsights([]), {
    interviewCount: 0,
    conversationCount: 0,
    practiceCount: 0,
    lastInterviewAt: null,
    lastReportReady: false,
    lastTakeaway: null,
    lastInterviewId: null,
    lastPriority: null,
    topPattern: null,
  });
});

const conversation = (id, completedAt, analysis = null) => ({ ...record(id, completedAt, analysis), mode: "conversation", targetRole: "Modo livre", conversationTopic: "Meu fim de semana" });

test("a conversation counts as practice but never supplies the last interview's takeaway, priority, or report link", () => {
  const interview = record("interview", "2026-02-01T10:00:00.000Z", {
    interviewerTakeaway: { remember: "Você explicou a decisão com clareza." },
    priorities: [{ area: "TECHNICAL_CONTENT", focus: "Dê um exemplo concreto." }],
  });
  const chat = conversation("chat", "2026-02-10T10:00:00.000Z", {
    summary: "Você falou do fim de semana.",
    technicalContent: { summary: "Conversa curta.", strengths: [], gaps: [] },
    englishCommunication: { clarity: "CLEAR", evidenceStatus: "SUFFICIENT", patterns: [{ type: "WORD_CHOICE", sequenceNumber: 1, evidence: "I was make", suggestion: "Use did", rephrasedExample: "I did" }] },
  });
  const result = buildHomeInsights([interview, chat]);
  assert.equal(result.practiceCount, 2);
  assert.equal(result.interviewCount, 1);
  assert.equal(result.conversationCount, 1);
  assert.equal(result.lastInterviewId, "interview");
  assert.equal(result.lastInterviewAt, interview.completedAt);
  assert.equal(result.lastTakeaway, "Você explicou a decisão com clareza.");
  assert.equal(result.lastPriority, "Dê um exemplo concreto.");
  assert.deepEqual(result.topPattern, { type: "Escolha de palavras", suggestion: "Use did" });
});

test("a conversation-only account has no interview card data", () => {
  const chat = conversation("chat", "2026-02-10T10:00:00.000Z", {
    summary: "Você falou do fim de semana.",
    technicalContent: { summary: "Conversa curta.", strengths: [], gaps: [] },
    priorities: [{ area: "ENGLISH_COMMUNICATION", sequenceNumber: 1, focus: "Use did." }],
  });
  const result = buildHomeInsights([chat]);
  assert.equal(result.interviewCount, 0);
  assert.equal(result.practiceCount, 1);
  assert.equal(result.lastInterviewId, null);
  assert.equal(result.lastInterviewAt, null);
  assert.equal(result.lastReportReady, false);
  assert.equal(result.lastTakeaway, null);
  assert.equal(result.lastPriority, null);
});

test("records without a mode are interviews", () => {
  const legacy = record("legacy", "2026-02-10T10:00:00.000Z", { summary: "Resumo." });
  const result = buildHomeInsights([legacy]);
  assert.equal(result.interviewCount, 1);
  assert.equal(result.conversationCount, 0);
  assert.equal(result.lastInterviewId, "legacy");
  assert.equal(result.lastTakeaway, "Resumo.");
});
