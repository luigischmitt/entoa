import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestHandler } from "express";
import { format } from "node:util";

/** Who a log line belongs to. Mutable so the user can be filled in after authentication. */
export type LogContext = { interviewId?: string; userId?: string };
export type LogSeverity = "INFO" | "WARNING" | "ERROR";

const storage = new AsyncLocalStorage<LogContext>();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export const interviewIdHeader = "x-interview-id";

/** Returns the lowercase UUID, or undefined for anything else (the id comes from the client and is never trusted as free text). */
export function parseInterviewId(value: unknown): string | undefined {
  return typeof value === "string" && uuidPattern.test(value) ? value.toLowerCase() : undefined;
}

/** First 8 characters of the user id: enough to match a row in the database, not enough to be an identifier elsewhere. */
export function shortUserId(userId: unknown): string | undefined {
  return typeof userId === "string" && userId !== "" ? userId.slice(0, 8) : undefined;
}

export const runWithLogContext = <T>(context: LogContext, run: () => T): T => storage.run(context, run);
export const getLogContext = (): LogContext | undefined => storage.getStore();

/** Starts a log context for the request, so every line written while it is handled carries the interview id. */
export const bindLogContext: RequestHandler = (request, _response, next) => {
  runWithLogContext({ interviewId: parseInterviewId(request.header(interviewIdHeader)) }, next);
};

/** Adds the authenticated user to the request's log context. Mount it right after the authentication middleware. */
export const bindLogUser: RequestHandler = (_request, response, next) => {
  const context = getLogContext();
  const user = response.locals.authenticatedUser as { userId?: unknown } | undefined;
  if (context) context.userId = shortUserId(user?.userId);
  next();
};

// Events that mean a provider or a guard failed even though the code logs them with console.info.
const warningEvents = new Set(["speech_upstream_failure", "auth_rejected", "auth_disabled", "transcription_fallback", "interview_orchestration_fallback", "speech_azure_breaker"]);
const failureResults = new Set(["timeout", "failed", "error", "unavailable"]);
const rank: Record<LogSeverity, number> = { INFO: 0, WARNING: 1, ERROR: 2 };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function severityOf(base: LogSeverity, payload: Record<string, unknown>): LogSeverity {
  const flagged = (typeof payload.event === "string" && warningEvents.has(payload.event))
    || (typeof payload.outcome === "string" && failureResults.has(payload.outcome))
    || (typeof payload.status === "string" && failureResults.has(payload.status))
    || payload.lifecycleOutcome === "failed" || payload.lifecycleOutcome === "limit_reached";
  const severity: LogSeverity = flagged ? "WARNING" : "INFO";
  return rank[severity] > rank[base] ? severity : base;
}

/** The single JSON line Cloud Logging reads: `severity` becomes the entry severity, the rest stays searchable. */
export function buildLogEntry(base: LogSeverity, args: unknown[], context: LogContext | undefined = getLogContext()): Record<string, unknown> {
  let payload: Record<string, unknown> | null = null;
  if (args.length === 1 && typeof args[0] === "string") {
    try {
      const parsed: unknown = JSON.parse(args[0]);
      if (isRecord(parsed)) payload = parsed;
    } catch { /* A plain text message. */ }
  }
  const body = payload ?? { message: format(...args) };
  return {
    ...body,
    ...(context?.interviewId && body.interviewId === undefined ? { interviewId: context.interviewId } : {}),
    ...(context?.userId && body.userId === undefined ? { userId: context.userId } : {}),
    severity: severityOf(base, body),
  };
}

let installed = false;

/** Routes console.* through buildLogEntry. Call before anything captures console.info (default parameters do). */
export function installStructuredLogging(target: Console = console): void {
  if (installed) return;
  installed = true;
  const levels: Array<[keyof Pick<Console, "log" | "info" | "warn" | "error">, LogSeverity]> = [["log", "INFO"], ["info", "INFO"], ["warn", "WARNING"], ["error", "ERROR"]];
  for (const [method, severity] of levels) {
    const write = target[method].bind(target);
    target[method] = (...args: unknown[]) => write(JSON.stringify(buildLogEntry(severity, args)));
  }
}
