import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { bindLogContext, bindLogUser, buildLogEntry, parseInterviewId, shortUserId } from "../src/logging/structured-logging.js";
import { sanitizeClientEvent } from "../src/controllers/client-events-controller.js";

const interviewId = "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

describe("buildLogEntry", () => {
  it("adds severity and the interview and user of the context to a JSON event", () => {
    const entry = buildLogEntry("INFO", [JSON.stringify({ event: "speech_usage", chars: 12 })], { interviewId, userId: "d316f454" });
    expect(entry).toEqual({ event: "speech_usage", chars: 12, interviewId, userId: "d316f454", severity: "INFO" });
  });

  it("raises provider failures logged with console.info to WARNING", () => {
    expect(buildLogEntry("INFO", [JSON.stringify({ event: "speech_upstream_failure", provider: "chatterbox" })], {}).severity).toBe("WARNING");
    expect(buildLogEntry("INFO", [JSON.stringify({ event: "interview_speculative_analysis", outcome: "timeout" })], {}).severity).toBe("WARNING");
    expect(buildLogEntry("INFO", [JSON.stringify({ event: "transcript_review", status: "unavailable" })], {}).severity).toBe("WARNING");
    expect(buildLogEntry("INFO", [JSON.stringify({ event: "interview_lifecycle", lifecycleOutcome: "limit_reached" })], {}).severity).toBe("WARNING");
  });

  it("keeps cancellations and successes at INFO", () => {
    expect(buildLogEntry("INFO", [JSON.stringify({ event: "interview_answer_completion_timing", outcome: "aborted" })], {}).severity).toBe("INFO");
    expect(buildLogEntry("INFO", [JSON.stringify({ event: "transcript_review", status: "success" })], {}).severity).toBe("INFO");
  });

  it("never lowers the severity of console.warn or console.error", () => {
    expect(buildLogEntry("WARNING", [JSON.stringify({ event: "speech_usage" })], {}).severity).toBe("WARNING");
    expect(buildLogEntry("ERROR", [JSON.stringify({ event: "speech_upstream_failure" })], {}).severity).toBe("ERROR");
  });

  it("wraps plain text and errors in a message", () => {
    expect(buildLogEntry("INFO", ["Backend listening on port 8080"], {})).toEqual({ message: "Backend listening on port 8080", severity: "INFO" });
    const entry = buildLogEntry("ERROR", [new Error("boom")], { interviewId });
    expect(entry.message).toContain("Error: boom");
    expect(entry).toMatchObject({ interviewId, severity: "ERROR" });
  });

  it("does not overwrite an id the event already carries", () => {
    const other = "11111111-2222-4333-8444-555555555555";
    expect(buildLogEntry("INFO", [JSON.stringify({ event: "x", interviewId: other })], { interviewId }).interviewId).toBe(other);
  });
});

describe("log context", () => {
  it("only accepts UUIDs as interview ids and shortens user ids", () => {
    expect(parseInterviewId(interviewId.toUpperCase())).toBe(interviewId);
    expect(parseInterviewId("not-a-uuid")).toBeUndefined();
    expect(parseInterviewId("9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f\nfake log line")).toBeUndefined();
    expect(shortUserId("d316f454-1ac6-48ee-9a09-e448f148b268")).toBe("d316f454");
    expect(shortUserId(undefined)).toBeUndefined();
  });

  it("follows a request across async work", async () => {
    const app = express();
    app.use(bindLogContext);
    app.use((_request, response, next) => { response.locals.authenticatedUser = { userId: "d316f454-1ac6-48ee-9a09-e448f148b268" }; next(); });
    app.use(bindLogUser);
    app.get("/probe", async (_request, response) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      response.json(buildLogEntry("INFO", [JSON.stringify({ event: "probe" })]));
    });
    const tagged = await request(app).get("/probe").set("X-Interview-Id", interviewId);
    expect(tagged.body).toEqual({ event: "probe", interviewId, userId: "d316f454", severity: "INFO" });
    const untagged = await request(app).get("/probe").set("X-Interview-Id", "garbage");
    expect(untagged.body).toEqual({ event: "probe", userId: "d316f454", severity: "INFO" });
  });
});

describe("client lifecycle events", () => {
  it("keeps the interview id and the whitelisted lifecycle fields", () => {
    expect(sanitizeClientEvent({ kind: "interview_lifecycle", interviewId, lifecycleOutcome: "existing", lifecycleOrigin: "resumed", answer: "secret" }))
      .toEqual({ kind: "interview_lifecycle", interviewId, lifecycleOutcome: "existing", lifecycleOrigin: "resumed" });
  });

  it("drops an invalid interview id or lifecycle value", () => {
    expect(sanitizeClientEvent({ kind: "interview_lifecycle", interviewId: "x", lifecycleOutcome: "exploded", lifecycleOrigin: "teleported" })).toEqual({ kind: "interview_lifecycle" });
  });
});
