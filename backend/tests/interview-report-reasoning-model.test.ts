import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultInterviewReportModel, defaultReasoningInterviewTurnAnalysisTimeoutMs, defaultThinkingModel, loadThinkingConfig, defaultReasoningInterviewConsolidationTimeoutMs, isReasoningReportModel } from "../src/thinking/config.js";
import { createInterviewReportService, OpenRouterInterviewReportService } from "../src/thinking/openrouter-interview-report-service.js";
import type { InterviewReportConsolidationInput, InterviewTurnAnalysis } from "../src/thinking/types.js";
import { ThinkingServiceError } from "../src/thinking/errors.js";

const roleContext = { targetRole: "Backend Engineer", seniority: "mid-level", focus: "technical-depth" };
const turns = [
  { sequenceNumber: 2, question: "How would you improve reliability?", answer: "I would add timeouts and bounded retries. Yesterday I have deployed the service." },
  { sequenceNumber: 4, question: "How do you monitor it?", answer: "We monitor errors and latency in production." },
];
const emptyTurnAnalysis = { technicalStrengths: [], technicalGaps: [], englishPatterns: [] };
const pattern2 = { type: "GRAMMAR" as const, sequenceNumber: 2, evidence: "Yesterday I have deployed", suggestion: "Use o passado simples com marcadores de tempo passado.", rephrasedExample: "Yesterday I deployed the service." };
const analyses: InterviewTurnAnalysis[] = [
  { sequenceNumber: 2, technicalStrengths: [], technicalGaps: [], englishPatterns: [pattern2] },
  { sequenceNumber: 4, technicalStrengths: [], technicalGaps: [], englishPatterns: [] },
];
const consolidationInput: InterviewReportConsolidationInput = { roleContext, turns, turnAnalyses: analyses };
const focus = "Na próxima resposta, use o passado simples para narrar o deploy.";
const consolidationContent = { summary: "Resumo técnico completo e objetivo.", clarity: "MOSTLY_CLEAR", priorities: [] };

function providerResponse(content: unknown, finishReason = "stop"): Response {
  const message = { content: typeof content === "string" || content === null ? content : JSON.stringify(content) };
  return new Response(JSON.stringify({ choices: [{ message, finish_reason: finishReason }] }), { status: 200 });
}

/** Records every request body and answers with the given provider responses in call order. */
function scripted(responses: Response[] | Response) {
  const bodies: Array<Record<string, any>> = [];
  const queue = Array.isArray(responses) ? responses : [responses];
  const fetchImplementation = vi.fn<typeof fetch>(async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    const response = queue[bodies.length - 1];
    if (!response) throw new Error("unexpected extra provider call");
    return response;
  });
  return { bodies, fetchImplementation };
}

function serviceFor(model: string, fetchImplementation: typeof fetch) {
  return new OpenRouterInterviewReportService({ key: "test-key", model, timeoutMs: 1234, fetchImplementation });
}

/** Every object in a JSON schema must list all of its properties in `required`, recursively. */
function expectStrictObjects(node: unknown): void {
  if (Array.isArray(node)) { node.forEach(expectStrictObjects); return; }
  if (typeof node !== "object" || node === null) return;
  const schema = node as Record<string, unknown>;
  if (schema.properties && typeof schema.properties === "object") {
    expect(schema.required).toEqual(Object.keys(schema.properties as object));
  }
  Object.values(schema).forEach(expectStrictObjects);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reasoning report model requests", () => {
  it("omits temperature, sends reasoning effort and adds the reasoning token allowance for Claude Haiku", async () => {
    const { bodies, fetchImplementation } = scripted(providerResponse(emptyTurnAnalysis));
    await serviceFor(defaultInterviewReportModel, fetchImplementation).analyzeTurn({ roleContext, turn: turns[0]! });
    expect(bodies[0]).not.toHaveProperty("temperature");
    expect(bodies[0]!.reasoning).toEqual({ effort: "medium" });
    expect(bodies[0]!.max_tokens).toBe(1_000 + 6_000);
    expect(bodies[0]!.model).toBe("anthropic/claude-haiku-5.5");
  });

  it("keeps the non-reasoning body for mistral unchanged", async () => {
    const { bodies, fetchImplementation } = scripted(providerResponse(emptyTurnAnalysis));
    await serviceFor(defaultThinkingModel, fetchImplementation).analyzeTurn({ roleContext, turn: turns[0]! });
    expect(bodies[0]!.temperature).toBe(0);
    expect(bodies[0]!.max_tokens).toBe(1_000);
    expect(bodies[0]).not.toHaveProperty("reasoning");
  });

  it("honours INTERVIEW_REPORT_REASONING_EFFORT and rejects unknown values at config load", async () => {
    expect(loadThinkingConfig({} as NodeJS.ProcessEnv).reportReasoningEffort).toBe("medium");
    expect(loadThinkingConfig({ INTERVIEW_REPORT_REASONING_EFFORT: " LOW " } as NodeJS.ProcessEnv).reportReasoningEffort).toBe("low");
    expect(() => loadThinkingConfig({ INTERVIEW_REPORT_REASONING_EFFORT: "max" } as NodeJS.ProcessEnv))
      .toThrow("INTERVIEW_REPORT_REASONING_EFFORT must be minimal, low, medium or high.");

    const { bodies, fetchImplementation } = scripted(providerResponse(emptyTurnAnalysis));
    const config = loadThinkingConfig({ OPENROUTER_API_KEY: "k", INTERVIEW_REPORT_REASONING_EFFORT: "low" } as NodeJS.ProcessEnv);
    await createInterviewReportService(config, fetchImplementation)!.analyzeTurn({ roleContext, turn: turns[0]! });
    expect(bodies[0]!.reasoning).toEqual({ effort: "low" });
  });

  it("uses the reasoning timeouts for reasoning models and the original ones otherwise", () => {
    expect(isReasoningReportModel("anthropic/claude-haiku-5.5")).toBe(true);
    expect(isReasoningReportModel("openai/gpt-6-mini")).toBe(true);
    expect(isReasoningReportModel("openai/gpt-5")).toBe(true);
    expect(isReasoningReportModel(defaultThinkingModel)).toBe(false);
    expect(defaultReasoningInterviewTurnAnalysisTimeoutMs).toBe(45_000);
    expect(defaultReasoningInterviewConsolidationTimeoutMs).toBe(45_000);
  });

  it("pins the Parasail provider only for mistral models", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => providerResponse(emptyTurnAnalysis));
    vi.stubGlobal("fetch", fetchMock);
    await new OpenRouterInterviewReportService({ key: "k", model: defaultThinkingModel, timeoutMs: 1234 }).analyzeTurn({ roleContext, turn: turns[0]! });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)).provider).toMatchObject({ only: ["parasail"], allow_fallbacks: false });

    fetchMock.mockClear();
    await new OpenRouterInterviewReportService({ key: "k", model: defaultInterviewReportModel, timeoutMs: 1234 }).analyzeTurn({ roleContext, turn: turns[0]! });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)).provider).not.toHaveProperty("only");
  });
});

describe("OpenAI strict report schemas", () => {
  it("lists every property as required and makes optional fields nullable only for openai models", async () => {
    const { bodies, fetchImplementation } = scripted(providerResponse(consolidationContent));
    await serviceFor("openai/gpt-6-mini", fetchImplementation).consolidate(consolidationInput);
    const schema = bodies[0]!.response_format.json_schema.schema;
    expectStrictObjects(schema);
    expect(schema.properties.overview.type).toEqual(["object", "null"]);
    expect(schema.properties.priorities.items.properties.exercise.type).toEqual(["string", "null"]);
    expect(bodies[0]!.reasoning).toEqual({ effort: "medium" });
  });

  it("keeps the schema for other models unchanged", async () => {
    const { bodies, fetchImplementation } = scripted(providerResponse(consolidationContent));
    await serviceFor(defaultThinkingModel, fetchImplementation).consolidate(consolidationInput);
    const priorityItem = bodies[0]!.response_format.json_schema.schema.properties.priorities.items;
    expect(priorityItem.required).toEqual(["area", "sequenceNumber", "evidence", "focus", "vacancyCompetency"]);
    expect(priorityItem.properties.exercise.type).toBe("string");
  });

  it("accepts exercise: null and overview: null as absent optional fields", async () => {
    const { fetchImplementation } = scripted(providerResponse({
      ...consolidationContent,
      overview: null,
      priorities: [{ area: "ENGLISH_COMMUNICATION", sequenceNumber: 2, evidence: "Yesterday I have deployed", focus, exercise: null, vacancyCompetency: null }],
    }));
    const result = await serviceFor("openai/gpt-6-mini", fetchImplementation).consolidate(consolidationInput);
    expect(result.priorities).toHaveLength(1);
    expect(result.priorities[0]).not.toHaveProperty("exercise");
    expect(result.overview).toBeUndefined();
  });
});

describe("single retry on provider length cut-offs and invalid JSON", () => {
  it("retries once after a length cut-off with null content and succeeds on the second call", async () => {
    const { bodies, fetchImplementation } = scripted([providerResponse(null, "length"), providerResponse(consolidationContent)]);
    const result = await serviceFor(defaultThinkingModel, fetchImplementation).consolidate(consolidationInput);
    expect(bodies).toHaveLength(2);
    expect(result.technicalContent.summary).toBe(consolidationContent.summary);
  });

  it("retries once after unparseable JSON", async () => {
    const { bodies, fetchImplementation } = scripted([providerResponse("{\"summary\": \"cut"), providerResponse(consolidationContent)]);
    await serviceFor(defaultThinkingModel, fetchImplementation).consolidate(consolidationInput);
    expect(bodies).toHaveLength(2);
  });

  it("throws after two failed attempts without a third call", async () => {
    const { bodies, fetchImplementation } = scripted([providerResponse(null, "length"), providerResponse(null, "length")]);
    const error = await serviceFor(defaultThinkingModel, fetchImplementation).consolidate(consolidationInput).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ThinkingServiceError);
    expect((error as ThinkingServiceError).code).toBe("THINKING_INVALID_PROVIDER_RESPONSE");
    expect(bodies).toHaveLength(2);
  });
});

describe("consolidation summary repair", () => {
  it("cuts an over-long summary back to its last complete sentence instead of rejecting the report", async () => {
    const first = "Você explicou com detalhes o uso de timeouts curtos e de tentativas limitadas para proteger o serviço.";
    const second = "Você também mostrou preocupação com monitoramento e com os limites de alerta usados em produção.";
    const tail = " Essa parte final continua sem fechar a frase e ultrapassa o limite do campo ".repeat(4).trimEnd();
    const summary = `${first} ${second}${tail}`;
    expect(summary.length).toBeGreaterThan(420);
    const { fetchImplementation } = scripted(providerResponse({ ...consolidationContent, summary }));
    const result = await serviceFor(defaultThinkingModel, fetchImplementation).consolidate(consolidationInput);
    expect(result.technicalContent.summary).toBe(`${first} ${second}`);
  });

  it("uses an empty summary when no sentence can be kept", async () => {
    const summary = "a".repeat(500);
    const { fetchImplementation } = scripted(providerResponse({ ...consolidationContent, summary }));
    const result = await serviceFor(defaultThinkingModel, fetchImplementation).consolidate(consolidationInput);
    expect(result.technicalContent.summary).toBe("");
  });
});
