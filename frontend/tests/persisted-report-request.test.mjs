import assert from "node:assert/strict";
import test from "node:test";
import { requestPersistedReport } from "../src/lib/interview/persisted-report-request.mjs";

test("posts only the persisted interview id, locale and voice summary to the authenticated endpoint", async () => {
  let request;
  const report = { technicalContent: { summary: "Ready" } };
  const result = await requestPersistedReport("interview/id", { accuracy: { mean: 80, sampleCount: 1 } }, "en", async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ status: "ready", report }), { status: 200 });
  }, "https://api.example.test");

  assert.deepEqual(result, report);
  assert.equal(request.url, "https://api.example.test/api/v1/thinking/report/interview/interview%2Fid");
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(request.init.body), { locale: "en", azureSummary: { accuracy: { mean: 80, sampleCount: 1 } } });
});

test("sends regenerate only when requested", async () => {
  const bodies = [];
  const fetcher = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ status: "ready", report: {} }), { status: 200 });
  };
  await requestPersistedReport("id", null, "pt-BR", fetcher, "https://api.example.test");
  await requestPersistedReport("id", null, "pt-BR", fetcher, "https://api.example.test", { regenerate: false });
  await requestPersistedReport("id", null, "pt-BR", fetcher, "https://api.example.test", { regenerate: true });
  assert.equal("regenerate" in bodies[0], false);
  assert.equal("regenerate" in bodies[1], false);
  assert.equal(bodies[2].regenerate, true);
});

test("surfaces the retryable server error copy", async () => {
  await assert.rejects(
    requestPersistedReport("id", null, "pt-BR", async () => new Response(JSON.stringify({ error: { message: "Tente em instantes." } }), { status: 502 }), "https://api.example.test"),
    /Tente em instantes\./,
  );
});
