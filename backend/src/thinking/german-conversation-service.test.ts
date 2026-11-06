import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import type { AccessTokenVerifier } from "../auth/access-token-verifier.js";
import type { SpeechConfig } from "../speech/config.js";
import type { ConversationTurnInput, ConversationTurnService } from "./conversation-turn-service.js";
import { createGermanConversationPlanService, createGermanConversationTurnService, genericGermanConversationPlan, GermanConversationPlanService, GermanConversationTurnService, germanConversationFallback, isGermanConversationUser } from "./german-conversation-service.js";

const speechConfig: SpeechConfig = { provider: "fake", interviewerVoice: "en-US-AndrewNeural", defaultSpeed: 1, format: "mp3" };
const paths = [
  { id: "g1", line: "Was machst du gern am Wochenende?" },
  { id: "g2", line: "Was isst du gern?" },
  { id: "g3", line: "Wo wohnst du?" },
];

const turnInput = (overrides: Partial<ConversationTurnInput> = {}): ConversationTurnInput => ({
  topic: "meu fim de semana",
  paths,
  usedPathIds: [],
  phase: "explore",
  remainingSeconds: 240,
  history: [],
  transcript: "Ich spiele Fußball.",
  ...overrides,
});

const openRouterReply = (content: unknown) => new Response(JSON.stringify({
  choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
  usage: { prompt_tokens: 100, completion_tokens: 40, cost: 0.0002 },
}));
const fakeFetch = (content: unknown, capture?: (init: RequestInit) => void): typeof fetch => async (_url, init) => { if (init) capture?.(init); return openRouterReply(content); };
const failingFetch = (status: number): typeof fetch => async () => new Response("provider failure", { status });
const turnService = (fetchImplementation: typeof fetch) => new GermanConversationTurnService({ apiKey: "test-key", model: "anthropic/claude-test" }, fetchImplementation);
const planService = (fetchImplementation: typeof fetch) => new GermanConversationPlanService({ apiKey: "test-key", model: "anthropic/claude-test" }, fetchImplementation);

const validPlan = {
  suitable: true,
  title: "Mein Wochenende",
  opening: "Hallo, ich bin Tuck! Wir sprechen über dein Wochenende. Was machst du am Samstag?",
  openingTranslation: "Oi, eu sou o Tuck! Vamos falar sobre o seu fim de semana. O que você faz no sábado?",
  paths: [
    { id: "p1", line: "Was machst du gern am Wochenende?" },
    { id: "p2", line: "Gehst du oft ins Kino?" },
    { id: "p3", line: "Wo isst du am Sonntag?" },
    { id: "p4", line: "Mit wem bist du gern zusammen?" },
  ],
};

const validTurn = { say: "Fußball ist toll. Was spielst du gern?", sayTranslation: "Futebol é ótimo. O que você gosta de jogar?", personTranslation: "Eu jogo futebol.", suggestions: [{ de: "Ich spiele gern Fußball.", pt: "Eu gosto de jogar futebol." }], move: "FOLLOW", pathId: null };

beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("isGermanConversationUser", () => {
  it("parses a comma-separated allow-list like isAdmin", () => {
    expect(isGermanConversationUser("user-a", "user-a, user-b ,,")).toBe(true);
    expect(isGermanConversationUser("user-b", "user-a, user-b ,,")).toBe(true);
    expect(isGermanConversationUser("user-c", "user-a, user-b")).toBe(false);
  });

  it("denies a missing user or an empty list", () => {
    expect(isGermanConversationUser(undefined, "user-a")).toBe(false);
    expect(isGermanConversationUser("", "")).toBe(false);
    expect(isGermanConversationUser("user-a", undefined)).toBe(false);
  });

  it("reads GERMAN_CONVERSATION_USER_IDS by default", () => {
    vi.stubEnv("GERMAN_CONVERSATION_USER_IDS", "user-env");
    expect(isGermanConversationUser("user-env")).toBe(true);
    expect(isGermanConversationUser("user-other")).toBe(false);
  });
});

describe("German conversation plan service", () => {
  it("returns a valid plan with the Portuguese opening translation", async () => {
    const result = await planService(fakeFetch(validPlan)).plan({ topic: "meu fim de semana" });
    expect(result).toEqual({ title: validPlan.title, opening: validPlan.opening, openingTranslation: validPlan.openingTranslation, paths: validPlan.paths, outcome: "generated" });
  });

  it("sends a strict schema and the A1 system prompt", async () => {
    const capture = vi.fn();
    await planService(fakeFetch(validPlan, capture)).plan({ topic: "futebol" });
    const body = JSON.parse(String(capture.mock.calls[0][0].body));
    expect(body.max_tokens).toBe(1200);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0].content).toContain("level A1");
    expect(body.messages[1].content).toBe(JSON.stringify({ topic: "futebol" }));
  });

  it("marks an unsuitable topic without losing the plan", async () => {
    const result = await planService(fakeFetch({ ...validPlan, suitable: false })).plan({ topic: "política" });
    expect(result.outcome).toBe("unsuitable");
    expect(result.paths).toHaveLength(4);
  });

  it.each([
    ["a path line without final punctuation", { ...validPlan, paths: [{ id: "p1", line: "Was machst du gern am Wochenende" }, ...validPlan.paths.slice(1)] }],
    ["three paths", { ...validPlan, paths: validPlan.paths.slice(0, 3) }],
    ["seven paths", { ...validPlan, paths: [...validPlan.paths, { id: "p5", line: "Ok?" }, { id: "p6", line: "Ok?" }, { id: "p7", line: "Ok?" }] }],
    ["duplicate path ids", { ...validPlan, paths: [{ id: "p1", line: "Ok?" }, { id: "p1", line: "Ok?" }, { id: "p3", line: "Ok?" }, { id: "p4", line: "Ok?" }] }],
    ["braces in the opening", { ...validPlan, opening: "Hallo {Tuck}!" }],
    ["a missing openingTranslation", { ...validPlan, openingTranslation: undefined }],
    ["non-JSON content", "not json"],
  ])("falls back to the generic German plan for %s", async (_label, content) => {
    const result = await planService(fakeFetch(content)).plan({ topic: "futebol" });
    expect(result).toEqual({ ...genericGermanConversationPlan(), outcome: "invalid" });
  });

  it("gives the generic German plan on HTTP 500", async () => {
    const result = await planService(failingFetch(500)).plan({ topic: "futebol" });
    expect(result).toEqual({ ...genericGermanConversationPlan(), outcome: "error" });
  });

  it("keeps the generic German plan as specified", () => {
    expect(genericGermanConversationPlan()).toEqual({
      title: "Conversa em alemão",
      opening: "Hallo, ich bin Tuck! Wie geht es dir heute?",
      openingTranslation: "Oi, eu sou o Tuck! Como você está hoje?",
      paths: [
        { id: "g1", line: "Was machst du gern am Wochenende?" },
        { id: "g2", line: "Was isst du gern?" },
        { id: "g3", line: "Wo wohnst du?" },
        { id: "g4", line: "Was ist deine Arbeit?" },
        { id: "g5", line: "Hast du ein Haustier?" },
      ],
    });
  });
});

describe("German conversation turn service", () => {
  it("passes a valid FOLLOW reply with its translations and suggestions", async () => {
    expect(await turnService(fakeFetch(validTurn)).reply(turnInput())).toEqual({ ...validTurn, outcome: "decided" });
  });

  it("sends the German prompt, strict schema and never the transcript in logs", async () => {
    const capture = vi.fn();
    await turnService(fakeFetch(validTurn, capture)).reply(turnInput({ transcript: "Ich spiele Fußball." }));
    const body = JSON.parse(String(capture.mock.calls[0][0].body));
    expect(body.temperature).toBeUndefined();
    expect(body.max_tokens).toBe(900);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0].content).toContain("Tuck");
    const logged = vi.mocked(console.info).mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).toContain("german_conversation_turn");
    expect(logged).not.toContain("Fußball");
  });

  it("refuses END without a stop request and carries on with a path", async () => {
    const result = await turnService(fakeFetch({ ...validTurn, say: "Tschüss!", move: "END", pathId: null })).reply(turnInput({ transcript: "Ich spiele Fußball." }));
    expect(result).toEqual({ ...germanConversationFallback(turnInput(), "invalid"), outcome: "invalid" });
    expect(result.move).toBe("NEW_PATH");
    expect(result.pathId).toBe("g1");
  });

  it("keeps END when the person clearly wants to stop, in German or in English", async () => {
    const german = await turnService(fakeFetch({ say: "Das war schön. Tschüss!", sayTranslation: null, personTranslation: null, suggestions: [], move: "END", pathId: null })).reply(turnInput({ transcript: "Ich muss gehen, tschüss." }));
    expect(german).toMatchObject({ say: "Das war schön. Tschüss!", move: "END", suggestions: [], outcome: "decided" });
    const english = await turnService(fakeFetch({ say: "Tschüss, bis bald!", sayTranslation: null, personTranslation: null, suggestions: [], move: "END", pathId: null })).reply(turnInput({ transcript: "Let's stop here." }));
    expect(english).toMatchObject({ move: "END", outcome: "decided" });
  });

  it("strips the question and the suggestions from a WRAP", async () => {
    const result = await turnService(fakeFetch({ say: "Das war schön. Was machst du morgen?", sayTranslation: "Foi legal. O que você faz amanhã?", personTranslation: "Eu jogo futebol.", suggestions: [{ de: "Ich weiß nicht.", pt: "Eu não sei." }], move: "WRAP", pathId: null })).reply(turnInput());
    expect(result).toEqual({ say: "Das war schön.", sayTranslation: null, move: "WRAP", pathId: null, personTranslation: "Eu jogo futebol.", suggestions: [], outcome: "decided" });
  });

  it("turns any move except END into WRAP in the closing phase", async () => {
    const result = await turnService(fakeFetch({ ...validTurn, say: "Das war schön.", move: "FOLLOW", pathId: null })).reply(turnInput({ phase: "closing" }));
    expect(result).toMatchObject({ say: "Das war schön.", move: "WRAP", suggestions: [], outcome: "decided" });
  });

  it("turns an unknown or used path into FOLLOW", async () => {
    const unknown = await turnService(fakeFetch({ say: "Okay. Wo wohnst du?", sayTranslation: null, personTranslation: null, suggestions: [], move: "NEW_PATH", pathId: "zz" })).reply(turnInput());
    expect(unknown).toMatchObject({ move: "FOLLOW", pathId: null });
    const used = await turnService(fakeFetch({ say: "Okay. Wo wohnst du?", sayTranslation: null, personTranslation: null, suggestions: [], move: "NEW_PATH", pathId: "g3" })).reply(turnInput({ usedPathIds: ["g3"] }));
    expect(used).toMatchObject({ move: "FOLLOW", pathId: null });
  });

  it("keeps a NEW_PATH whose pathId is unused", async () => {
    const result = await turnService(fakeFetch({ say: "Okay. Wo wohnst du?", sayTranslation: null, personTranslation: null, suggestions: [], move: "NEW_PATH", pathId: "g3" })).reply(turnInput({ usedPathIds: ["g1"] }));
    expect(result).toMatchObject({ say: "Okay. Wo wohnst du?", move: "NEW_PATH", pathId: "g3", outcome: "decided" });
  });

  it("rejects text with braces or links and falls back", async () => {
    const result = await turnService(fakeFetch({ ...validTurn, say: "Schau hier {x} www.example.com" })).reply(turnInput());
    expect(result).toMatchObject({ move: "NEW_PATH", pathId: "g1", outcome: "invalid" });
  });

  it("returns the first unused path after invalid JSON", async () => {
    const result = await turnService(fakeFetch("not json")).reply(turnInput({ usedPathIds: ["g1"] }));
    expect(result).toEqual({ say: "Was isst du gern?", sayTranslation: null, move: "NEW_PATH", pathId: "g2", personTranslation: null, suggestions: [], outcome: "invalid" });
  });

  it("keeps the neutral German line when no path is left", async () => {
    const result = await turnService(failingFetch(502)).reply(turnInput({ usedPathIds: ["g1", "g2", "g3"] }));
    expect(result).toEqual({ say: "Erzähl mir ein bisschen mehr, bitte.", sayTranslation: "Me conta um pouco mais, por favor.", move: "FOLLOW", pathId: null, personTranslation: null, suggestions: [], outcome: "error" });
  });

  it("trims suggestions to three and drops empty ones", async () => {
    const suggestions = [{ de: "Eins.", pt: "Um." }, { de: " ", pt: "Vazio." }, { de: "Zwei.", pt: "Dois." }, { de: "Drei.", pt: "Três." }, { de: "Vier.", pt: "Quatro." }];
    const result = await turnService(fakeFetch({ ...validTurn, suggestions })).reply(turnInput());
    expect(result.suggestions).toEqual([{ de: "Eins.", pt: "Um." }, { de: "Zwei.", pt: "Dois." }, { de: "Drei.", pt: "Três." }]);
  });

  it("drops the person translation on a silence", async () => {
    const result = await turnService(fakeFetch({ ...validTurn, personTranslation: "Algo." })).reply(turnInput({ silent: true, transcript: "" }));
    expect(result.personTranslation).toBeNull();
  });

  it("asks again once when the reply comes without translation or suggestions, and keeps the complete one", async () => {
    const replies = [{ ...validTurn, sayTranslation: null, suggestions: [] }, validTurn];
    const calls = vi.fn();
    const sequence: typeof fetch = async () => { calls(); return openRouterReply(replies.shift()); };
    expect(await turnService(sequence).reply(turnInput())).toEqual({ ...validTurn, outcome: "decided" });
    expect(calls).toHaveBeenCalledTimes(2);
    const logged = vi.mocked(console.info).mock.calls.map((call) => String(call[0])).find((line) => line.includes("german_conversation_turn"));
    expect(JSON.parse(logged!)).toMatchObject({ attempts: 2, translated: true, suggestions: 1, completionTokens: 80 });
  });

  it("asks only once for a complete reply and keeps the first reply when the second is no better", async () => {
    const complete = vi.fn();
    await turnService(fakeFetch(validTurn, complete)).reply(turnInput());
    expect(complete).toHaveBeenCalledTimes(1);
    const incomplete = vi.fn();
    const result = await turnService(fakeFetch({ ...validTurn, suggestions: [] }, incomplete)).reply(turnInput());
    expect(incomplete).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ say: validTurn.say, sayTranslation: validTurn.sayTranslation, suggestions: [], outcome: "decided" });
  });

  it("keeps the first reply when the second request times out", async () => {
    let call = 0;
    const slowSecond: typeof fetch = async (_url, init) => {
      call += 1;
      if (call === 1) return openRouterReply({ ...validTurn, suggestions: [] });
      return new Promise<Response>((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))); });
    };
    const service = new GermanConversationTurnService({ apiKey: "test-key", model: "m", timeoutMs: 30 }, slowSecond);
    expect(await service.reply(turnInput())).toMatchObject({ say: validTurn.say, suggestions: [], outcome: "decided" });
  });

  it("translates the German question even when it sits inside a Portuguese answer", async () => {
    const reply = { personLanguage: "pt", answer: "Você pode dizer: \"Meine Schwester ist achtzehn.\" Wie alt bist du?", question: "Wie alt bist du?", questionTranslation: "Quantos anos você tem?", sayTranslation: null, personTranslation: null, suggestions: validTurn.suggestions, move: "CLARIFY", pathId: null };
    const result = await turnService(fakeFetch(reply)).reply(turnInput({ transcript: "Minha irmã tem dezoito anos, como fala isso?" }));
    expect(result).toMatchObject({ say: reply.answer, sayTranslation: "Quantos anos você tem?", outcome: "decided" });
  });

  it("falls back on the timeout", async () => {
    const hanging: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))); });
    const service = new GermanConversationTurnService({ apiKey: "test-key", model: "m", timeoutMs: 5 }, hanging);
    expect(await service.reply(turnInput())).toMatchObject({ move: "NEW_PATH", pathId: "g1", outcome: "timeout" });
  });
});

describe("German conversation HTTP routes", () => {
  const germanUser = { verify: async () => ({ userId: "user-de" }) } as unknown as AccessTokenVerifier;
  const otherUser = { verify: async () => ({ userId: "user-en" }) } as unknown as AccessTokenVerifier;
  const turnBody = {
    topic: "meu fim de semana",
    paths,
    usedPathIds: [],
    phase: "explore",
    remainingSeconds: 180,
    history: [{ speaker: "tuck", text: "Hallo!" }],
    transcript: "Ich spiele Fußball.",
  };
  const appWith = (options: { verifier?: AccessTokenVerifier | null; turn?: ConversationTurnService | null; germanTurn?: GermanConversationTurnService | null; germanPlan?: GermanConversationPlanService | null } = {}) => createApp({
    speechConfig,
    accessTokenVerifier: options.verifier === undefined ? null : options.verifier,
    conversationTurnService: options.turn ?? null,
    conversationPlanService: null,
    germanConversationTurnService: options.germanTurn ?? null,
    germanConversationPlanService: options.germanPlan ?? null,
  });
  const authed = <T extends { set: (name: string, value: string) => T }>(req: T): T => req.set("authorization", "Bearer test-token");

  beforeEach(() => { vi.stubEnv("GERMAN_CONVERSATION_USER_IDS", "user-de"); });

  it("lists en only for other users and en and de for allow-listed users", async () => {
    const other = await authed(request(appWith({ verifier: otherUser })).get("/api/v1/thinking/conversation-languages"));
    expect(other.status).toBe(200);
    expect(other.body).toEqual({ languages: ["en"] });
    const allowed = await authed(request(appWith({ verifier: germanUser })).get("/api/v1/thinking/conversation-languages"));
    expect(allowed.body).toEqual({ languages: ["en", "de"] });
  });

  it("returns 403 for a German turn from a user who is not allow-listed", async () => {
    const reply = vi.fn();
    const response = await authed(request(appWith({ verifier: otherUser, germanTurn: { reply } as unknown as GermanConversationTurnService })).post("/api/v1/thinking/conversation-turn")).send({ ...turnBody, language: "de" });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: "CONVERSATION_LANGUAGE_FORBIDDEN", message: "O alemão não está liberado para esta conta." } });
    expect(reply).not.toHaveBeenCalled();
  });

  it("returns 403 for a German plan from a user who is not allow-listed", async () => {
    const plan = vi.fn();
    const response = await authed(request(appWith({ verifier: otherUser, germanPlan: { plan } as unknown as GermanConversationPlanService })).post("/api/v1/thinking/conversation-plan")).send({ topic: "futebol", language: "de" });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CONVERSATION_LANGUAGE_FORBIDDEN");
    expect(plan).not.toHaveBeenCalled();
  });

  it.each([["turn", "/api/v1/thinking/conversation-turn", turnBody], ["plan", "/api/v1/thinking/conversation-plan", { topic: "futebol" }]])("returns 400 for language fr on the %s route", async (_label, path, body) => {
    const response = await authed(request(appWith({ verifier: germanUser, turn: { reply: vi.fn() }, germanTurn: { reply: vi.fn() } as unknown as GermanConversationTurnService, germanPlan: { plan: vi.fn() } as unknown as GermanConversationPlanService })).post(path)).send({ ...body, language: "fr" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(path.endsWith("turn") ? "INVALID_CONVERSATION_TURN" : "INVALID_CONVERSATION_PLAN");
  });

  it("returns the German plan with openingTranslation for an allow-listed user", async () => {
    const germanPlan = { plan: vi.fn(async () => ({ ...validPlan, outcome: "generated" as const })) };
    const response = await authed(request(appWith({ verifier: germanUser, germanPlan: germanPlan as unknown as GermanConversationPlanService })).post("/api/v1/thinking/conversation-plan")).send({ topic: "meu fim de semana", language: "de" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ title: validPlan.title, opening: validPlan.opening, openingTranslation: validPlan.openingTranslation, paths: validPlan.paths });
    expect(germanPlan.plan).toHaveBeenCalledWith(expect.objectContaining({ topic: "meu fim de semana" }));
  });

  it("returns the generic German plan when the German service is not configured", async () => {
    const response = await authed(request(appWith({ verifier: germanUser })).post("/api/v1/thinking/conversation-plan")).send({ topic: "futebol", language: "de" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(genericGermanConversationPlan());
  });

  it("returns 503 for an allow-listed German turn when the German service is not configured", async () => {
    const response = await authed(request(appWith({ verifier: germanUser })).post("/api/v1/thinking/conversation-turn")).send({ ...turnBody, language: "de" });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("CONVERSATION_UNAVAILABLE");
  });

  it("returns say, move, pathId, translations and suggestions for an allow-listed German turn", async () => {
    const germanTurn = { reply: vi.fn(async (_input: unknown) => ({ ...validTurn, pathId: null, outcome: "decided" as const })) };
    const response = await authed(request(appWith({ verifier: germanUser, germanTurn: germanTurn as unknown as GermanConversationTurnService })).post("/api/v1/thinking/conversation-turn")).send({ ...turnBody, language: "de" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ say: validTurn.say, move: "FOLLOW", pathId: null, sayTranslation: validTurn.sayTranslation, personTranslation: validTurn.personTranslation, suggestions: validTurn.suggestions });
    expect(germanTurn.reply).toHaveBeenCalledWith(expect.not.objectContaining({ language: "de" }));
  });

  it("keeps an English turn unchanged for an allow-listed user", async () => {
    const turn = vi.fn(async (_input: unknown) => ({ say: "Pasta sounds great. What sauce?", move: "FOLLOW" as const, pathId: null, outcome: "decided" as const }));
    const germanTurn = { reply: vi.fn() };
    const response = await authed(request(appWith({ verifier: germanUser, turn: { reply: turn }, germanTurn: germanTurn as unknown as GermanConversationTurnService })).post("/api/v1/thinking/conversation-turn")).send(turnBody);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ say: "Pasta sounds great. What sauce?", move: "FOLLOW", pathId: null });
    expect(germanTurn.reply).not.toHaveBeenCalled();
    const input = turn.mock.calls[0][0] as Record<string, unknown>;
    expect(input).not.toHaveProperty("language");
    expect(input).toMatchObject({ topic: turnBody.topic, transcript: turnBody.transcript, usedPathIds: [] });
  });
});

describe("German conversation services without a key", () => {
  it("creates no service without an API key", () => {
    expect(createGermanConversationPlanService(undefined, "m")).toBeNull();
    expect(createGermanConversationTurnService(undefined, "m")).toBeNull();
    expect(createGermanConversationTurnService("key", "m")).toBeInstanceOf(GermanConversationTurnService);
  });
});
