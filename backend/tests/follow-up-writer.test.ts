import { describe, expect, it, vi } from "vitest";
import { FollowUpWriter } from "../src/thinking/follow-up-writer.js";

const response = (value: unknown) => vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body));
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }], usage: { prompt_tokens: 1 } }), { status: 200 });
});
const base = { currentQuestion: "Tell me about your project?", snapshot: "I used Redis caching and reduced the repeated database queries.", askedQuestions: [], threadQuestions: [], recentFollowUpKinds: [], roleContext: { targetRole: "Engineer" } };
const ask = { action: "ASK", reaction: "Queries repeated less after caching.", question: "How did Redis caching change the query pattern?", kind: "how", anchor: "Redis caching" };
describe("FollowUpWriter", () => {
 it("accepts a grounded ASK", async () => { expect(await new FollowUpWriter({ apiKey: "x", model: "test", timeoutMs: 500 }, response(ask) as unknown as typeof fetch).write(base)).toMatchObject({ action: "ASK", kind: "how" }); });
 it("copies previous candidate on KEEP", async () => { const candidate = { question: "Why did you add caching to this service?", anchor: "Redis caching" }; const f = response({ action: "KEEP", reaction: "Queries repeated less after caching.", question: "wrong", kind: "why", anchor: "wrong" }); expect(await new FollowUpWriter({ apiKey: "x", model: "test", timeoutMs: 500 }, f as unknown as typeof fetch).write({ ...base, previousCandidate: candidate })).toMatchObject({ action: "KEEP", question: candidate.question, anchor: candidate.anchor }); });
 it.each(["Great work on Redis caching.", "The pipeline processed two million requests."])("drops a praising or invented reaction but keeps the question", async reaction => { const f = response({ ...ask, reaction }); expect(await new FollowUpWriter({ apiKey: "x", model: "test", timeoutMs: 500 }, f as unknown as typeof fetch).write(base)).toMatchObject({ action: "ASK", question: ask.question, reaction: null }); });
 it.each([
  ["banned language", { ...ask, question: "What specific choice helped reduce the repeated database queries?" }, "banned_language"],
  ["two question marks", { ...ask, question: "How did Redis caching help? What changed?" }, "invalid_question_shape"],
  ["twenty words", { ...ask, question: "How did you decide to use Redis caching for the repeated database queries in this project and what changed?" }, "invalid_question_shape"],
  ["nonliteral anchor", { ...ask, anchor: "missing cache detail" }, "anchor_not_literal"],
  ["repeated question", ask, "repeated_question"],
])("rejects %s", async (_label, value, rejected) => { const f = response(value); const input = rejected === "repeated_question" ? { ...base, askedQuestions: [ask.question] } : base; expect(await new FollowUpWriter({ apiKey: "x", model: "test", timeoutMs: 500 }, f as unknown as typeof fetch).write(input)).toMatchObject({ action: "NONE", rejected }); });
 it("uses anyOf for the kind schema without a nullable string enum", async () => { const f = response(ask); await new FollowUpWriter({ apiKey: "x", model: "test", timeoutMs: 500 }, f as unknown as typeof fetch).write(base); const body = JSON.parse(String(f.mock.calls[0]?.[1]?.body)); expect(body.response_format.json_schema.schema.properties.kind).toEqual({ anyOf: [expect.objectContaining({ type: "string", enum: expect.any(Array) }), { type: "null" }] }); });
 it("omits temperature for Anthropic", async () => { const f = response({ action: "NONE", reaction: null, question: null, kind: null, anchor: null }); await new FollowUpWriter({ apiKey: "x", model: "anthropic/model", timeoutMs: 500 }, f as unknown as typeof fetch).write(base); expect(JSON.parse(String(f.mock.calls[0]?.[1]?.body))).not.toHaveProperty("temperature"); });
 it("logs no candidate content", async () => { const info = vi.spyOn(console, "info").mockImplementation(() => undefined); try { const f = response({ action: "NONE", reaction: null, question: null, kind: null, anchor: null }); await new FollowUpWriter({ apiKey: "x", model: "test", timeoutMs: 500 }, f as unknown as typeof fetch).write({ ...base, snapshot: "SECRET SNAPSHOT" }); expect(String(info.mock.calls.at(-1)?.[0])).not.toContain("SECRET SNAPSHOT"); } finally { info.mockRestore(); } });
});
