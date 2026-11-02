import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AccessTokenVerifier } from "../src/auth/access-token-verifier.js";
import type { SpeechConfig } from "../src/speech/config.js";
import { genericConversationPlan, OpenRouterConversationPlanService, type ConversationPlanService } from "../src/thinking/conversation-plan-service.js";
import { fitConversationLine, OpenRouterConversationTurnService, maxConversationSentences, maxConversationWords, type ConversationTurnInput, type ConversationTurnService } from "../src/thinking/conversation-turn-service.js";

const speechConfig: SpeechConfig = { provider: "fake", kokoroBaseUrl: "http://localhost:8888", kokoroTimeoutMs: 1000, interviewerVoice: "af_bella", defaultSpeed: 1, format: "mp3" };
const stuckLine = "Hmm, I got a bit lost in the forest there. Tell me a little more about that?";
const closingLine = "This was a really nice chat. Thanks for talking with me, and I hope to hear more next time!";

const paths = [
  { id: "p1", line: "What is your favourite fruit to eat in the morning?" },
  { id: "p2", line: "Do you like music when you cook?" },
  { id: "p3", line: "What do you do on weekends?" },
];

const turnInput = (overrides: Partial<ConversationTurnInput> = {}): ConversationTurnInput => ({
  topic: "como foi meu dia hoje",
  paths,
  usedPathIds: [],
  phase: "explore",
  remainingSeconds: 240,
  history: [],
  transcript: "Today I went to the gym and then I cooked pasta.",
  ...overrides,
});

const openRouterReply = (content: unknown) => new Response(JSON.stringify({
  choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
  usage: { prompt_tokens: 100, completion_tokens: 40, cost: 0.0002 },
}));
const fakeFetch = (content: unknown, capture?: (init: RequestInit) => void): typeof fetch => async (_url, init) => { if (init) capture?.(init); return openRouterReply(content); };
const failingFetch = (status: number): typeof fetch => async () => new Response("provider failure", { status });
const hangingFetch: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
  init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
});
const turnService = (fetchImplementation: typeof fetch, timeoutMs?: number) => new OpenRouterConversationTurnService({ apiKey: "test-key", model: "google/gemma-test", timeoutMs }, fetchImplementation);
const planService = (fetchImplementation: typeof fetch) => new OpenRouterConversationPlanService({ apiKey: "test-key", model: "anthropic/claude-test" }, fetchImplementation);

const validPlan = {
  suitable: true,
  title: "Meu dia",
  opening: "Sounds like a busy day! How did it go for you?",
  paths: [
    { id: "p1", line: "What was the best part of your day?" },
    { id: "p2", line: "Do you usually cook at home after the gym?" },
    { id: "p3", line: "What is your favourite meal to make?" },
    { id: "p4", line: "How do you usually spend your weekends?" },
  ],
};

beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => undefined); });
afterEach(() => vi.restoreAllMocks());

describe("fitConversationLine", () => {
  it("keeps at most 3 sentences", () => {
    expect(fitConversationLine("One is here. Two is here. Three is here. Four is here.")).toBe("One is here. Two is here. Three is here.");
    expect(maxConversationSentences).toBe(3);
  });

  it("keeps at most 65 words", () => {
    const sentence = (label: string) => `${Array.from({ length: 30 }, () => label).join(" ")}.`;
    const fitted = fitConversationLine(`${sentence("alpha")} ${sentence("beta")} ${sentence("gamma")}`);
    expect(fitted).toBe(`${sentence("alpha")} ${sentence("beta")}`);
    expect(fitted!.split(/\s+/).length).toBeLessThanOrEqual(maxConversationWords);
  });

  it("returns null for text without ending punctuation", () => {
    expect(fitConversationLine("I like pizza and music")).toBeNull();
    expect(fitConversationLine("   ")).toBeNull();
  });
});

describe("conversation turn service", () => {
  it("passes a valid FOLLOW reply", async () => {
    const say = "Pasta sounds great. What kind of sauce did you use?";
    expect(await turnService(fakeFetch({ say, move: "FOLLOW", pathId: null })).reply(turnInput()))
      .toEqual({ say, move: "FOLLOW", pathId: null, outcome: "decided" });
  });

  it("keeps a NEW_PATH whose pathId is unused", async () => {
    const say = "Let's try something else. What do you do on weekends?";
    expect(await turnService(fakeFetch({ say, move: "NEW_PATH", pathId: "p3" })).reply(turnInput({ usedPathIds: ["p1"] })))
      .toEqual({ say, move: "NEW_PATH", pathId: "p3", outcome: "decided" });
  });

  it.each([
    ["used", "p1"],
    ["unknown", "zz9"],
  ])("turns NEW_PATH with a %s pathId into FOLLOW", async (_label, pathId) => {
    const say = "Let's try something else. What do you do on weekends?";
    expect(await turnService(fakeFetch({ say, move: "NEW_PATH", pathId })).reply(turnInput({ usedPathIds: ["p1"] })))
      .toEqual({ say, move: "FOLLOW", pathId: null, outcome: "decided" });
  });

  it("forces WRAP in the closing phase and asks nothing", async () => {
    const say = "Pasta and the gym, what a day. Thanks for the chat!";
    expect(await turnService(fakeFetch({ say, move: "FOLLOW", pathId: null })).reply(turnInput({ phase: "closing" })))
      .toEqual({ say, move: "WRAP", pathId: null, outcome: "decided" });
  });

  it.each([
    ["WRAP", "WRAP"],
    ["END", "END"],
  ])("replaces a %s that contains a question with the closing line", async (_label, move) => {
    const result = await turnService(fakeFetch({ say: "Thanks for the chat, what else did you cook?", move, pathId: null })).reply(turnInput({ transcript: "I have to go now" }));
    expect(result).toMatchObject({ move: "WRAP", pathId: null, outcome: "invalid" });
    expect(result.say).toBe(closingLine);
  });

  it("falls back to the next unused path when the question repeats an earlier one", async () => {
    const result = await turnService(fakeFetch({ say: "Nice. What did you cook yesterday, exactly?", move: "FOLLOW", pathId: null }))
      .reply(turnInput({ history: [{ speaker: "tuck", text: "What did you cook yesterday?" }] }));
    expect(result).toEqual({ say: paths[0]!.line, move: "NEW_PATH", pathId: "p1", outcome: "repeated" });
  });

  it("keeps the reaction and drops the question when a sentence precedes a repeated question", async () => {
    const asked = "What did you cook for dinner last night?";
    const result = await turnService(fakeFetch({ say: `Pasta after a long day sounds great to me. ${asked}`, move: "FOLLOW", pathId: null })).reply(turnInput({ history: [{ speaker: "tuck", text: asked }] }));
    expect(result).toEqual({ say: "Pasta after a long day sounds great to me.", move: "FOLLOW", pathId: null, outcome: "repeated" });
  });

  it("never ends on a stray recognised word, and carries on with a path", async () => {
    const result = await turnService(fakeFetch({ say: "Goodbye, it was lovely to chat with you today.", move: "END", pathId: null })).reply(turnInput({ transcript: "Bye. 100. Yes." }));
    expect(result).toMatchObject({ say: paths[0]!.line, move: "NEW_PATH", pathId: "p1" });
  });

  it.each(["I have to go now", "can we stop here?", "quero encerrar", "tchau, Tuck"])("ends when the person asks to stop: %s", async (transcript) => {
    const result = await turnService(fakeFetch({ say: "Of course, thanks for the chat!", move: "END", pathId: null })).reply(turnInput({ transcript }));
    expect(result).toMatchObject({ move: "END", outcome: "decided" });
  });

  it("hands over a question after a short reply when the model only commented", async () => {
    const result = await turnService(fakeFetch({ say: "That sounds like a really lovely way to spend the day.", move: "FOLLOW", pathId: null })).reply(turnInput({ transcript: "Yes." }));
    expect(result).toMatchObject({ move: "NEW_PATH", pathId: "p1", outcome: "decided" });
    expect(result.say).toContain(paths[0]!.line);
  });

  it("hands over a question after a silence", async () => {
    const result = await turnService(fakeFetch({ say: "It's a calm moment here in the forest today.", move: "FOLLOW", pathId: null })).reply(turnInput({ transcript: "(silence)", silent: true }));
    expect(result).toMatchObject({ move: "NEW_PATH", pathId: "p1" });
  });

  it("keeps the reaction and drops the question of a wrap-up", async () => {
    const result = await turnService(fakeFetch({ say: "Pasta and the gym, what a day. What else did you cook?", move: "WRAP", pathId: null })).reply(turnInput());
    expect(result).toEqual({ say: "Pasta and the gym, what a day.", move: "WRAP", pathId: null, outcome: "decided" });
  });

  it.each([
    ["a provider name in say", fakeFetch({ say: "As Gemini, I think pasta is great. What sauce did you use?", move: "FOLLOW", pathId: null }), "invalid"],
    ["HTTP 500", failingFetch(500), "error"],
    ["invalid JSON", fakeFetch("not json {"), "invalid"],
    ["a timeout", hangingFetch, "timeout"],
  ] as const)("falls back with a path line on %s", async (_label, fetchImplementation, outcome) => {
    expect(await turnService(fetchImplementation, 5).reply(turnInput())).toEqual({ say: paths[0]!.line, move: "NEW_PATH", pathId: "p1", outcome });
  });

  it("returns the neutral line when no unused path is left", async () => {
    expect(await turnService(failingFetch(500)).reply(turnInput({ usedPathIds: ["p1", "p2", "p3"] })))
      .toEqual({ say: stuckLine, move: "FOLLOW", pathId: null, outcome: "error" });
  });

  it("logs usage and outcome without the transcript or the reply", async () => {
    const info = vi.mocked(console.info);
    const transcript = "private phrase about my weekend";
    await turnService(fakeFetch({ say: "Sounds fun. Where did you go?", move: "FOLLOW", pathId: null })).reply(turnInput({ transcript }));
    const line = String(info.mock.calls.at(-1)?.[0]);
    expect(JSON.parse(line)).toMatchObject({ event: "conversation_turn", outcome: "decided", costUsd: 0.0002 });
    expect(line).not.toContain(transcript);
    expect(line).not.toContain("Sounds fun");
  });
});

describe("conversation plan service", () => {
  it("returns a valid plan", async () => {
    expect(await planService(fakeFetch(validPlan)).plan({ topic: "como foi meu dia hoje" })).toEqual({
      title: "Meu dia",
      opening: validPlan.opening,
      paths: validPlan.paths,
      outcome: "generated",
    });
  });

  it.each([
    ["fewer than 4 paths", { ...validPlan, paths: validPlan.paths.slice(0, 3) }],
    ["a path cut off mid-sentence", { ...validPlan, paths: [validPlan.paths[0], validPlan.paths[1], validPlan.paths[2], { id: "p4", line: "Tell me about your" }] }],
    ["duplicate ids", { ...validPlan, paths: [validPlan.paths[0], { ...validPlan.paths[1], id: "p1" }, validPlan.paths[2], validPlan.paths[3]] }],
  ])("gives the generic plan for %s", async (_label, plan) => {
    expect(await planService(fakeFetch(plan)).plan({ topic: "x" })).toEqual({ ...genericConversationPlan(), outcome: "invalid" });
  });

  it("accepts a gentle path that is not a question", async () => {
    const plan = { ...validPlan, paths: [validPlan.paths[0], validPlan.paths[1], validPlan.paths[2], { id: "p4", line: "I'd love to hear about a good memory, if you feel like sharing one." }] };
    expect(await planService(fakeFetch(plan)).plan({ topic: "x" })).toMatchObject({ outcome: "generated" });
  });

  it("marks an unsuitable topic without losing the plan", async () => {
    const result = await planService(fakeFetch({ ...validPlan, suitable: false })).plan({ topic: "politics" });
    expect(result).toMatchObject({ outcome: "unsuitable", title: "Meu dia" });
    expect(result.paths).toHaveLength(4);
  });

  it("gives the generic plan on HTTP 500", async () => {
    expect(await planService(failingFetch(500)).plan({ topic: "futebol" })).toEqual({ ...genericConversationPlan(), outcome: "error" });
  });
});

describe("POST /api/v1/thinking/conversation-turn", () => {
  const validBody = {
    topic: "quero falar sobre futebol",
    paths: paths,
    usedPathIds: ["p1"],
    phase: "explore",
    remainingSeconds: 180,
    history: [{ speaker: "tuck", text: "Hi! What did you do today?" }, { speaker: "person", text: "I play football." }],
    transcript: "Yes, on Sunday.",
  };
  const appWith = (conversationTurnService: ConversationTurnService | null) => createApp({ speechConfig, accessTokenVerifier: null, conversationTurnService });

  it.each([
    ["an empty topic", { topic: "" }],
    ["a topic over 200 characters", { topic: "a".repeat(201) }],
    ["no paths", { paths: [] }],
    ["more than 12 paths", { paths: Array.from({ length: 13 }, (_, index) => ({ id: `p${index}`, line: "Ok?" })) }],
    ["a path with an extra key", { paths: [{ id: "p1", line: "Ok?", extra: true }] }],
    ["a path id over 40 characters", { paths: [{ id: "x".repeat(41), line: "Ok?" }] }],
    ["more than 12 used path ids", { usedPathIds: Array.from({ length: 13 }, (_, index) => `p${index}`) }],
    ["an unknown phase", { phase: "later" }],
    ["negative remainingSeconds", { remainingSeconds: -1 }],
    ["a string remainingSeconds", { remainingSeconds: "180" }],
    ["more than 40 history lines", { history: Array.from({ length: 41 }, () => ({ speaker: "tuck", text: "Hi." })) }],
    ["an unknown speaker", { history: [{ speaker: "bot", text: "Hi." }] }],
    ["an empty history text", { history: [{ speaker: "tuck", text: "" }] }],
    ["an empty transcript", { transcript: "" }],
    ["a transcript over 4000 characters", { transcript: "a".repeat(4001) }],
    ["an extra top-level key", { outcome: "decided" }],
  ])("rejects %s", async (_label, change) => {
    const reply = vi.fn();
    const response = await request(appWith({ reply })).post("/api/v1/thinking/conversation-turn").send({ ...validBody, ...change });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: "INVALID_CONVERSATION_TURN", message: "Invalid conversation turn request." } });
    expect(reply).not.toHaveBeenCalled();
  });

  it("returns 503 when the service is not configured", async () => {
    const response = await request(appWith(null)).post("/api/v1/thinking/conversation-turn").send(validBody);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("CONVERSATION_UNAVAILABLE");
  });

  it("returns only say, move and pathId", async () => {
    const reply = vi.fn(async () => ({ say: "Sunday football, nice! Who did you play with?", move: "FOLLOW" as const, pathId: null, outcome: "decided" as const }));
    const response = await request(appWith({ reply })).post("/api/v1/thinking/conversation-turn").send(validBody);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ say: "Sunday football, nice! Who did you play with?", move: "FOLLOW", pathId: null });
    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ topic: validBody.topic, phase: "explore", transcript: validBody.transcript, usedPathIds: ["p1"] }));
  });
});

describe("POST /api/v1/thinking/conversation-plan", () => {
  const appWith = (conversationPlanService: ConversationPlanService | null, accessTokenVerifier: AccessTokenVerifier | null = null) =>
    createApp({ speechConfig, accessTokenVerifier, conversationPlanService });

  it.each([
    ["an empty topic", { topic: "   " }],
    ["a topic over 200 characters", { topic: "a".repeat(201) }],
    ["a missing topic", {}],
    ["a non-string topic", { topic: 42 }],
    ["an extra key", { topic: "futebol", extra: true }],
  ])("rejects %s", async (_label, body) => {
    const plan = vi.fn();
    const response = await request(appWith({ plan })).post("/api/v1/thinking/conversation-plan").send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_CONVERSATION_PLAN");
    expect(plan).not.toHaveBeenCalled();
  });

  it("returns the generic plan when the service is not configured", async () => {
    const response = await request(appWith(null)).post("/api/v1/thinking/conversation-plan").send({ topic: "futebol" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(genericConversationPlan());
  });

  it("returns only title, opening and paths", async () => {
    const plan = vi.fn(async () => ({ title: "Meu dia", opening: validPlan.opening, paths: validPlan.paths, outcome: "generated" as const }));
    const response = await request(appWith({ plan })).post("/api/v1/thinking/conversation-plan").send({ topic: "como foi meu dia hoje" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ title: "Meu dia", opening: validPlan.opening, paths: validPlan.paths });
    expect(plan).toHaveBeenCalledWith(expect.objectContaining({ topic: "como foi meu dia hoje" }));
  });

  it("returns 401 when the verified user has no id", async () => {
    const plan = vi.fn();
    const response = await request(appWith({ plan }, { verify: async () => ({ userId: "" }) }))
      .post("/api/v1/thinking/conversation-plan").set("authorization", "Bearer test-token").send({ topic: "futebol" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
    expect(plan).not.toHaveBeenCalled();
  });

  it("limits a second plan from the same user right after a successful one", async () => {
    const plan = vi.fn(async () => ({ title: "Futebol", opening: validPlan.opening, paths: validPlan.paths, outcome: "generated" as const }));
    const app = appWith({ plan });
    expect((await request(app).post("/api/v1/thinking/conversation-plan").send({ topic: "futebol" })).status).toBe(200);
    const limited = await request(app).post("/api/v1/thinking/conversation-plan").send({ topic: "futebol" });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("CONVERSATION_PLAN_RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThanOrEqual(1);
    expect(plan).toHaveBeenCalledTimes(1);
  });
});
