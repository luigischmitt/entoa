import { describe, expect, it, vi } from "vitest";

import { defaultThinkingModel } from "../src/thinking/config.js";
import { OpenRouterInterviewReportService, parseTurnAnalysis } from "../src/thinking/openrouter-interview-report-service.js";
import { repairTruncatedText } from "../src/thinking/report-guards.js";

const roleContext = { targetRole: "Backend Engineer", seniority: "mid-level", focus: "technical-depth" };
const answer = "We put a queue between the API and the notification workers so a slow provider does not block the request path.";
const evidence = "We put a queue between the API and the notification workers";
const turn = { sequenceNumber: 1, question: "How would you design the notification flow?", answer };
const sentence = "Você explicou bem a decisão de usar fila para desacoplar o envio das notificações.";

describe("repairTruncatedText", () => {
  it("returns text shorter than the cap unchanged", () => {
    const text = "Você explicou bem a fila.";
    expect(repairTruncatedText(text, 220)).toBe(text);
  });

  it("cuts a text presumed truncated at the cap back to the last complete sentence", () => {
    const text = `${sentence} Isso ajuda a equipe a entender a aplic.`;
    expect(repairTruncatedText(text, text.length)).toBe(sentence);
  });

  it("falls back to the last clause when no sentence boundary leaves enough text", () => {
    const text = "Isso reduz a latência nas consultas, porque evita leituras repetidas do banco e melhora a fidelil.";
    expect(repairTruncatedText(text, text.length)).toBe("Isso reduz a latência nas consultas.");
  });

  it("returns null when the surviving text would be too short", () => {
    const text = "Ok, ajuda a entender a aplic.";
    expect(repairTruncatedText(text, text.length)).toBeNull();
  });

  it("returns null when a presumed cut has no sentence or clause boundary", () => {
    const text = "Você explicou a fila e o motivo de desacoplar o envio das notificações sem mencionar aplic";
    expect(repairTruncatedText(text, text.length)).toBeNull();
  });
});

describe("per-answer explanation at the schema cap", () => {
  it("repairs a 220-character explanation that ends mid-word instead of passing it through", () => {
    const cut = " Esse cuidado mostra preocupação real com a fidelidade dos dados, com a forma de entender a aplicação em produção e com a manutenção do fluxo de retries ao longo do tempo";
    const explanation = `${sentence}${cut}`.slice(0, 219) + ".";
    expect(explanation).toHaveLength(220);
    const { analysis, evidenceReview } = parseTurnAnalysis(JSON.stringify({ technicalStrengths: [{ sequenceNumber: 1, evidence, explanation, vacancyCompetency: null }], technicalGaps: [], englishPatterns: [] }), { roleContext, turn });
    expect(analysis.technicalStrengths).toEqual([{ sequenceNumber: 1, evidence, explanation: sentence }]);
    expect(evidenceReview.technicalStrengths.accepted).toBe(1);
  });

  it("rejects an explanation at the cap that cannot be repaired", () => {
    const explanation = "a ".repeat(110).trim();
    expect(explanation.length).toBeLessThanOrEqual(220);
    const { analysis, evidenceReview } = parseTurnAnalysis(JSON.stringify({ technicalStrengths: [{ sequenceNumber: 1, evidence, explanation, vacancyCompetency: null }], technicalGaps: [], englishPatterns: [] }), { roleContext, turn });
    expect(analysis.technicalStrengths).toEqual([]);
    expect(evidenceReview.technicalStrengths).toMatchObject({ rejectionReasons: { invalidFormat: 1 } });
  });
});

describe("report field caps", () => {
  it("sends the raised per-answer caps and keeps the evidence and rephrase caps", async () => {
    const bodies: Array<Record<string, any>> = [];
    const fetchImplementation = vi.fn<typeof fetch>(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ technicalStrengths: [], technicalGaps: [], englishPatterns: [] }) } }] }), { status: 200 });
    });
    const service = new OpenRouterInterviewReportService({ key: "test-key", model: defaultThinkingModel, timeoutMs: 1234, fetchImplementation });
    await service.analyzeTurn({ roleContext, turn });
    const properties = bodies[0]!.response_format.json_schema.schema.properties;
    const strengthItem = properties.technicalStrengths.items.properties;
    const patternItem = properties.englishPatterns.items.properties;
    expect(strengthItem.explanation.maxLength).toBe(220);
    expect(strengthItem.evidence.maxLength).toBe(120);
    expect(patternItem.suggestion.maxLength).toBe(220);
    expect(patternItem.why.maxLength).toBe(240);
    expect(patternItem.rephrasedExample.maxLength).toBe(160);
    expect(patternItem.evidence.maxLength).toBe(120);
  });
});
