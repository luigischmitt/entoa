import type { RequestHandler } from "express";

import { genericConversationPlan, maxConversationTopicLength, type ConversationPlanService } from "../thinking/conversation-plan-service.js";
import { type ConversationLine, type ConversationPath, type ConversationPhase, type ConversationTurnService } from "../thinking/conversation-turn-service.js";
import type { JobDirectionUserLimit } from "../thinking/job-direction-user-limit.js";

type UnknownRecord = Record<string, unknown>;

const maxPaths = 12;
const maxUsedPathIds = 12;
const maxHistoryLines = 40;
const maxHistoryTextLength = 2_000;
const maxTranscriptLength = 4_000;
const maxIdLength = 40;
const maxPathLineLength = 300;
const turnKeys = ["topic", "paths", "usedPathIds", "phase", "remainingSeconds", "history", "transcript"];
const phases: ConversationPhase[] = ["warmup", "explore", "closing"];

export type ConversationTurnBody = {
  topic: string;
  paths: ConversationPath[];
  usedPathIds: string[];
  phase: ConversationPhase;
  remainingSeconds: number;
  history: ConversationLine[];
  transcript: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: UnknownRecord, expected: string[]): boolean {
  return Object.keys(value).every((key) => expected.includes(key));
}

/** Non-empty after trimming, and no longer than the limit as sent. */
function boundedText(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximumLength;
}

function isPath(value: unknown): value is ConversationPath {
  return isRecord(value) && hasOnlyKeys(value, ["id", "line"]) && boundedText(value.id, maxIdLength) && boundedText(value.line, maxPathLineLength);
}

function isLine(value: unknown): value is ConversationLine {
  return isRecord(value) && hasOnlyKeys(value, ["speaker", "text"]) && (value.speaker === "tuck" || value.speaker === "person") && boundedText(value.text, maxHistoryTextLength);
}

function parseConversationTurn(body: unknown): ConversationTurnBody | null {
  if (!isRecord(body) || !hasOnlyKeys(body, turnKeys)) return null;
  const { topic, paths, usedPathIds, phase, remainingSeconds, history, transcript } = body;
  if (!boundedText(topic, maxConversationTopicLength) || !boundedText(transcript, maxTranscriptLength)) return null;
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > maxPaths || !paths.every(isPath)) return null;
  if (!Array.isArray(usedPathIds) || usedPathIds.length > maxUsedPathIds || !usedPathIds.every((id) => boundedText(id, maxIdLength))) return null;
  if (!phases.includes(phase as ConversationPhase)) return null;
  if (typeof remainingSeconds !== "number" || !Number.isFinite(remainingSeconds) || remainingSeconds < 0) return null;
  if (!Array.isArray(history) || history.length > maxHistoryLines || !history.every(isLine)) return null;

  return { topic, paths, usedPathIds, phase: phase as ConversationPhase, remainingSeconds, history, transcript };
}

function parseConversationPlanTopic(body: unknown): string | null {
  if (!isRecord(body) || !hasOnlyKeys(body, ["topic"]) || !boundedText(body.topic, maxConversationTopicLength)) return null;
  return body.topic.trim();
}

export function createConversationTurnController(service: ConversationTurnService | null): RequestHandler {
  return async (request, response) => {
    const input = parseConversationTurn(request.body);
    if (!input) {
      response.status(400).json({ error: { code: "INVALID_CONVERSATION_TURN", message: "Invalid conversation turn request." } }); return;
    }
    if (!service) {
      response.status(503).json({ error: { code: "CONVERSATION_UNAVAILABLE", message: "The conversation is not available on this server." } }); return;
    }
    const controller = new AbortController();
    response.on("close", () => { if (!response.writableEnded) controller.abort(); });
    const result = await service.reply({ ...input, transcript: input.transcript, signal: controller.signal });
    response.status(200).json({ say: result.say, move: result.move, pathId: result.pathId });
  };
}

export function createConversationPlanController(service: ConversationPlanService | null, userLimit: JobDirectionUserLimit): RequestHandler {
  return async (request, response) => {
    const topic = parseConversationPlanTopic(request.body);
    if (topic === null) {
      response.status(400).json({ error: { code: "INVALID_CONVERSATION_PLAN", message: `Envie um tema entre 1 e ${maxConversationTopicLength} caracteres.` } }); return;
    }

    const userId = response.locals.authenticatedUser?.userId;
    if (typeof userId !== "string" || userId.length === 0) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sua sessão expirou. Entre novamente." } }); return;
    }
    // Without a model the generic plan still lets the conversation start, so no rate limit is needed.
    if (!service) {
      response.status(200).json(genericConversationPlan()); return;
    }
    const lease = userLimit.acquire(userId);
    if (!lease.allowed) {
      response.setHeader("Retry-After", String(lease.retryAfterSeconds));
      response.status(429).json({ error: { code: "CONVERSATION_PLAN_RATE_LIMITED", message: "A preparação da conversa está temporariamente limitada. Tente novamente em instantes." } }); return;
    }

    const controller = new AbortController();
    response.on("close", () => { if (!response.writableEnded) controller.abort(); });
    let outcome: "success" | "failure" = "failure";
    try {
      const result = await service.plan({ topic, signal: controller.signal });
      outcome = result.outcome === "generated" || result.outcome === "unsuitable" ? "success" : "failure";
      response.status(200).json({ title: result.title, opening: result.opening, paths: result.paths });
    } finally {
      lease.release(outcome);
    }
  };
}
