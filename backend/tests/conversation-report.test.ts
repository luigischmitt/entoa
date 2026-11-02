import { describe, expect, it, vi } from "vitest";
import { parseConversationReport } from "../src/thinking/openrouter-interview-report-service.js";
import { createPersistedInterviewReportService, type ReportPersistence } from "../src/thinking/persisted-interview-report.js";
import type { InterviewReport, InterviewReportService } from "../src/thinking/types.js";

const turns = [
  { sequenceNumber: 2, question: "What did you do yesterday?", answer: "Yesterday I went to the gym and then I cooked pasta for my friends." },
  { sequenceNumber: 4, question: "How was the weather?", answer: "I think the weather was very nice, so I walked by the beach." },
];

const validPayload = {
  summary: "We talked about your Saturday plans. Your English was easy to follow, and you told the story in order.",
  clarity: "MOSTLY_CLEAR",
  worked: [{ sequenceNumber: 4, evidence: "so I walked by the beach", explanation: "Using so to connect two ideas made the story flow." }],
  patterns: [{
    type: "WORD_CHOICE",
    sequenceNumber: 2,
    evidence: "cooked pasta",
    suggestion: "Use a natural verb for making dinner.",
    rephrasedExample: "I made pasta for my friends.",
  }],
  keepPhrases: [{ sequenceNumber: 4, said: "I think the weather was very nice", natural: "The weather was really nice that day.", note: "Use this when you want a lighter opening." }],
  priorities: [{ sequenceNumber: 2, focus: "Practise past tense verbs when you tell stories." }],
};

const parse = (payload: unknown) => parseConversationReport(JSON.stringify(payload), { locale: "en", turns });

describe("parseConversationReport", () => {
  it("maps a valid payload to a conversation report", () => {
    const report = parse(validPayload);

    expect(report.reportKind).toBe("conversation");
    expect(report.locale).toBe("en");
    expect(report.technicalContent.summary).toBe(validPayload.summary);
    expect(report.technicalContent.strengths).toEqual([{ sequenceNumber: 4, evidence: "so I walked by the beach", explanation: "Using so to connect two ideas made the story flow." }]);
    expect(report.technicalContent.gaps).toEqual([]);
    expect(report.englishCommunication.clarity).toBe("MOSTLY_CLEAR");
    expect(report.englishCommunication.patterns).toHaveLength(1);
    expect(report.englishCommunication.patterns[0]).toMatchObject({ type: "WORD_CHOICE", sequenceNumber: 2, evidence: "cooked pasta" });
    expect(report.keepPhrases).toEqual([{ sequenceNumber: 4, said: "I think the weather was very nice", natural: "The weather was really nice that day.", note: "Use this when you want a lighter opening." }]);
    expect(report.priorities).toHaveLength(1);
    expect(report.priorities.every((priority) => priority.area === "ENGLISH_COMMUNICATION")).toBe(true);
    expect(report.priorities[0]).toMatchObject({ sequenceNumber: 2, focus: "Practise past tense verbs when you tell stories." });
  });

  it("drops a worked item whose evidence is not in that answer", () => {
    const report = parse({ ...validPayload, worked: [{ sequenceNumber: 4, evidence: "I walked to the mall", explanation: "Using so to connect two ideas made the story flow." }] });
    expect(report.technicalContent.strengths).toEqual([]);
  });

  it("drops a worked item whose sequence number has no answer", () => {
    const report = parse({ ...validPayload, worked: [{ sequenceNumber: 99, evidence: "so I walked by the beach", explanation: "Using so to connect two ideas made the story flow." }] });
    expect(report.technicalContent.strengths).toEqual([]);
  });

  it("drops a keepPhrases item whose said text is not in that answer", () => {
    const report = parse({ ...validPayload, keepPhrases: [{ sequenceNumber: 4, said: "The beach was crowded", natural: "The beach was really busy.", note: "Use this when you describe a place." }] });
    expect(report.keepPhrases).toEqual([]);
  });

  it("drops a keepPhrases item whose said text is already a pattern", () => {
    const report = parse({ ...validPayload, keepPhrases: [{ sequenceNumber: 2, said: "cooked pasta", natural: "made pasta", note: "Use this when you talk about dinner." }] });
    expect(report.keepPhrases).toEqual([]);
  });

  it("drops a priority whose sequence number is unknown", () => {
    const report = parse({ ...validPayload, priorities: [{ sequenceNumber: 99, focus: "Practise past tense verbs when you tell stories." }] });
    expect(report.priorities).toEqual([]);
  });

  it("throws on an empty summary", () => {
    expect(() => parse({ ...validPayload, summary: "" })).toThrow();
  });

  it("throws on an invalid clarity", () => {
    expect(() => parse({ ...validPayload, clarity: "VERY_CLEAR" })).toThrow();
  });
});

const savedFeedback = (analysis: InterviewReport | null, status: "pending" | "ready", model: string | null, analysisVersion: string) => ({
  status, analysis, model, analysis_version: analysisVersion, azure_summary: null, generated_at: null,
});

function fakePersistence(mode: string | undefined, sessionTurns = turns.flatMap((turn) => [
  { sequence_number: turn.sequenceNumber - 1, speaker: "interviewer" as const, content: turn.question },
  { sequence_number: turn.sequenceNumber, speaker: "candidate" as const, content: turn.answer },
])) {
  const persistence = {
    loadInterview: vi.fn(async () => ({
      id: "2d9f3d8d-4347-4e2c-b8a2-3378782be2da",
      target_role: mode === "conversation" ? "Conversa" : "Backend Engineer",
      seniority: mode === "conversation" ? null : "senior",
      focus: mode === "conversation" ? null : "technical-depth",
      job_direction: null,
      status: "completed",
      ...(mode === undefined ? {} : { mode }),
      conversation_topic: mode === "conversation" ? "Meu fim de semana" : null,
    })),
    loadTurns: vi.fn(async () => sessionTurns),
    loadFeedback: vi.fn(async () => null),
    ensurePending: vi.fn(async () => savedFeedback(null, "pending", null, "c1")),
    saveReady: vi.fn(async (_token: string, _id: string, analysis: InterviewReport, model: string, analysisVersion: string) => savedFeedback(analysis, "ready", model, analysisVersion)),
    markUnavailable: vi.fn(async () => undefined),
    resetOutdated: vi.fn(async () => null),
  };
  return persistence;
}

const conversationReport: InterviewReport = { reportKind: "conversation", technicalContent: { summary: "A short chat about the weekend.", strengths: [], gaps: [] }, englishCommunication: { clarity: "CLEAR", evidenceStatus: "NO_PATTERN_FOUND", patterns: [] }, priorities: [] };
const interviewReport: InterviewReport = { technicalContent: { summary: "Explained the deployment.", strengths: [], gaps: [] }, englishCommunication: { clarity: "CLEAR", evidenceStatus: "NO_PATTERN_FOUND", patterns: [] }, priorities: [] };

function fakeReportService() {
  const generateConversation = vi.fn(async (_input: { locale?: "pt-BR" | "en"; topic: string; turns: Array<{ sequenceNumber: number; question: string; answer: string }> }) => ({ ...conversationReport, model: "conversation-model", analysisVersion: "c1" as const }));
  const generate = vi.fn(async () => ({ ...interviewReport, model: "interview-model", analysisVersion: "v3" as const }));
  const analyzeTurn = vi.fn(async () => { throw new Error("analyzeTurn should not run here"); });
  const consolidate = vi.fn(async () => ({ ...interviewReport, model: "consolidate-model", analysisVersion: "v3" as const }));
  return { service: { generate, analyzeTurn, consolidate, generateConversation } as unknown as InterviewReportService, generate, analyzeTurn, consolidate, generateConversation };
}

describe("createPersistedInterviewReportService", () => {
  it("routes mode conversation to generateConversation only and saves the c1 report", async () => {
    const persistence = fakePersistence("conversation");
    const fake = fakeReportService();
    const reports = createPersistedInterviewReportService(fake.service, persistence as unknown as ReportPersistence);

    const result = await reports.generate("token", "2d9f3d8d-4347-4e2c-b8a2-3378782be2da", { locale: "en" }, "owner");

    expect(fake.generateConversation).toHaveBeenCalledOnce();
    expect(fake.generate).not.toHaveBeenCalled();
    expect(fake.analyzeTurn).not.toHaveBeenCalled();
    expect(fake.consolidate).not.toHaveBeenCalled();
    expect(fake.generateConversation.mock.calls[0]?.[0]).toMatchObject({ locale: "en", topic: "Meu fim de semana" });
    expect(persistence.saveReady).toHaveBeenCalledWith("token", "2d9f3d8d-4347-4e2c-b8a2-3378782be2da", expect.objectContaining({ reportKind: "conversation" }), "conversation-model", "c1");
    expect(result.report.analysisVersion).toBe("c1");
    expect(result.report.model).toBe("conversation-model");
  });

  it.each([undefined, "interview"])("keeps the interview path for mode %s", async (mode) => {
    const persistence = fakePersistence(mode);
    const fake = fakeReportService();
    fake.analyzeTurn.mockRejectedValue(new Error("per-answer analysis unavailable"));
    const reports = createPersistedInterviewReportService(fake.service, persistence as unknown as ReportPersistence);

    await reports.generate("token", "2d9f3d8d-4347-4e2c-b8a2-3378782be2da", { locale: "pt-BR" }, "owner");

    expect(fake.generateConversation).not.toHaveBeenCalled();
    expect(fake.generate).toHaveBeenCalledOnce();
    expect(persistence.saveReady).toHaveBeenCalledWith("token", "2d9f3d8d-4347-4e2c-b8a2-3378782be2da", expect.any(Object), "interview-model", "v3");
  });

  it("accepts a conversation of 40 turns, which interviews would reject", async () => {
    const longTurns = Array.from({ length: 40 }, (_, index) => [
      { sequence_number: index * 2 + 1, speaker: "interviewer" as const, content: `Question number ${index} about your weekend?` },
      { sequence_number: index * 2 + 2, speaker: "candidate" as const, content: `I went to the park with my dog number ${index}.` },
    ]).flat();
    const persistence = fakePersistence("conversation", longTurns);
    const fake = fakeReportService();
    const reports = createPersistedInterviewReportService(fake.service, persistence as unknown as ReportPersistence);

    await reports.generate("token", "2d9f3d8d-4347-4e2c-b8a2-3378782be2da", { locale: "en" }, "owner");

    expect(fake.generateConversation).toHaveBeenCalledOnce();
    expect(fake.generateConversation.mock.calls[0]?.[0].turns).toHaveLength(40);
    expect(persistence.saveReady).toHaveBeenCalledOnce();
  });
});
