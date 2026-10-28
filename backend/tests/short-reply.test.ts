import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { defaultThinkingModel, defaultThinkingTimeoutMs, type ThinkingConfig } from "../src/thinking/config.js";
import { OpenRouterShortReplyService, shortReplySystemPrompt, type ShortReplyAction } from "../src/thinking/short-reply-service.js";
import type { SpeechConfig } from "../src/speech/config.js";

const speechConfig: SpeechConfig = { provider: "fake", kokoroBaseUrl: "http://localhost:8888", kokoroTimeoutMs: 1000, interviewerVoice: "af_bella", defaultSpeed: 1, format: "mp3" };
const config: ThinkingConfig = { openRouterApiKey: "server-test-key", model: defaultThinkingModel, timeoutMs: defaultThinkingTimeoutMs, orchestrationTimeoutMs: 6000, bridgeTimeoutMs: 400, diagnosticsEnabled: true };
const input = { currentQuestion: "How did you improve system performance?", transcript: "What does bottleneck mean?", nextQuestionAvailable: true };
const fakeFetch = (reply: unknown, capture?: (init: RequestInit) => void): typeof fetch => async (_url, init) => { if (init) capture?.(init); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }], usage: { prompt_tokens: 12, completion_tokens: 8, cost: 0.00001 } })); };
const service = (fetchImplementation: typeof fetch) => new OpenRouterShortReplyService({ apiKey: "test-key", model: "google/gemma-fast" }, fetchImplementation);
const reply = (action: ShortReplyAction, say: string | null = null, question: string | null = null) => ({ action, say, question });

afterEach(() => vi.restoreAllMocks());

describe("short reply service", () => {
  it.each([
    ["ANSWER", reply("ANSWER")],
    ["REPEAT", reply("REPEAT", "Sure, I'll say it more slowly.")],
    ["REPHRASE", reply("REPHRASE", "Let me ask it another way.", "What part of the system was slow?" )],
    ["DEFINE", reply("DEFINE", "A bottleneck is the part that limits overall system speed.")],
    ["MOVE_ON", reply("MOVE_ON", "No problem, let's move on to the next question.")],
    ["END", reply("END", "Of course, let's stop here. Thank you for your time.")],
    ["ASIDE", reply("ASIDE", "I'm an AI interviewer for interview practice.")],
  ] as const)("accepts %s", async (_action, modelReply) => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(await service(fakeFetch(modelReply)).decide({ ...input, nextQuestionAvailable: _action === "END" || _action === "ASIDE" ? false : true })).toMatchObject({ ...modelReply, outcome: "decided" });
  });

  it.each([
    ["REPHRASE without question mark", reply("REPHRASE", null, "What part of the system was slow")],
    ["DEFINE with URL", reply("DEFINE", "See https://example.com for a bottleneck definition.")],
    ["MOVE_ON without next question", reply("MOVE_ON", "No problem, let's move on.") , false],
    ["END without say", reply("END")],
    ["ASIDE naming a provider", reply("ASIDE", "I'm Gemini, an AI interviewer for interview practice.")],
    ["ASIDE with question mark", reply("ASIDE", "I'm an AI interviewer for interview practice, okay?")],
    ["unknown action", { action: "OTHER", say: null, question: null }],
    ["extra key", { ...reply("ANSWER"), extra: true }],
  ])("falls back for %s", async (_label, modelReply, available = true) => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(await service(fakeFetch(modelReply)).decide({ ...input, nextQuestionAvailable: available })).toEqual({ action: "ANSWER", say: null, question: null, outcome: "invalid" });
  });

  it("skips transcripts longer than 25 words without a model call", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    let calls = 0;
    const result = await service(async () => { calls++; return fakeFetch(reply("ANSWER"))("", {}); }).decide({ ...input, transcript: Array.from({ length: 26 }, (_, index) => `word${index}`).join(" ") });
    expect(calls).toBe(0);
    expect(result).toEqual({ action: "ANSWER", say: null, question: null, outcome: "skipped_long" });
  });

  it("uses the configured model and strict JSON schema and logs no transcript", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    let init: RequestInit | undefined;
    const transcript = "private phrase: what does bottleneck mean?";
    await service(fakeFetch(reply("DEFINE", "A bottleneck limits the speed of a system."), (value) => { init = value; })).decide({ ...input, transcript });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("google/gemma-fast");
    expect(body.response_format.json_schema).toMatchObject({ name: "short_reply", strict: true, schema: { additionalProperties: false } });
    expect(body.response_format.json_schema.schema.properties.action.enum).toEqual(["ANSWER", "REPEAT", "REPHRASE", "DEFINE", "MOVE_ON", "END", "ASIDE"]);
    expect(body.messages[0].content).toBe(shortReplySystemPrompt);
    expect(shortReplySystemPrompt).toContain("END:");
    expect(shortReplySystemPrompt).toContain("ASIDE:");
    expect(JSON.parse(body.messages[1].content)).toEqual({ currentQuestion: input.currentQuestion, transcript, nextQuestionAvailable: true });
    expect(body.usage).toEqual({ include: true });
    const line = String(info.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({ event: "interview_short_reply", action: "DEFINE", outcome: "decided", promptTokens: 12 });
    expect(line).not.toContain(transcript);
  });
});

describe("POST /api/v1/thinking/short-reply", () => {
  const appWith = (shortReplyService: Parameters<typeof createApp>[0] extends infer T ? T extends { shortReplyService?: infer S } ? S : never : never) => createApp({ speechConfig, accessTokenVerifier: null, shortReplyService });
  it("rejects a bad body", async () => {
    const decide = vi.fn();
    const response = await request(appWith({ decide })).post("/api/v1/thinking/short-reply").send({ ...input, transcript: "" });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: "INVALID_SHORT_REPLY", message: "Invalid short reply request." } });
    expect(decide).not.toHaveBeenCalled();
  });
  it("returns disabled fallback when service is null", async () => {
    const response = await request(appWith(null)).post("/api/v1/thinking/short-reply").send(input);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: false, action: "ANSWER", say: null, question: null });
  });
  it("passes the decision through", async () => {
    const decide = vi.fn(async () => ({ action: "END" as const, say: "Of course, let's stop here.", question: null, outcome: "decided" as const }));
    const response = await request(appWith({ decide })).post("/api/v1/thinking/short-reply").send(input);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: true, action: "END", say: "Of course, let's stop here.", question: null });
    expect(decide).toHaveBeenCalledWith(expect.objectContaining(input));
  });
});
