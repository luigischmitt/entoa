import type { RequestHandler } from "express";

import { genericConversationPlan, maxConversationTopicLength, type ConversationPlanService } from "../thinking/conversation-plan-service.js";
import { type ConversationLine, type ConversationPath, type ConversationPhase, type ConversationTurnService } from "../thinking/conversation-turn-service.js";
import { genericGermanConversationPlan, isGermanConversationUser, type GermanConversationPlanService, type GermanConversationTurnService } from "../thinking/german-conversation-service.js";
import type { JobDirectionUserLimit } from "../thinking/job-direction-user-limit.js";

type UnknownRecord = Record<string, unknown>;

const maxPaths = 12;
const maxUsedPathIds = 12;
const maxHistoryLines = 40;
const maxHistoryTextLength = 2_000;
const maxTranscriptLength = 4_000;
const maxIdLength = 40;
const maxPathLineLength = 300;
const turnKeys = ["topic", "paths", "usedPathIds", "phase", "remainingSeconds", "history", "transcript", "silent", "language"];
const planKeys = ["topic", "language"];
const phases: ConversationPhase[] = ["warmup", "explore", "closing"];

export type ConversationTurnBody = {
  topic: string;
  paths: ConversationPath[];
  usedPathIds: string[];
  phase: ConversationPhase;
  remainingSeconds: number;
  history: ConversationLine[];
  transcript: string;
  silent?: boolean;
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

/** Absent means English; "de" is the only other language. */
function isLanguage(value: unknown): value is "de" | undefined {
  return value === undefined || value === "de";
}

function isPath(value: unknown): value is ConversationPath {
  return isRecord(value) && hasOnlyKeys(value, ["id", "line"]) && boundedText(value.id, maxIdLength) && boundedText(value.line, maxPathLineLength);
}

function isLine(value: unknown): value is ConversationLine {
  return isRecord(value) && hasOnlyKeys(value, ["speaker", "text"]) && (value.speaker === "tuck" || value.speaker === "person") && boundedText(value.text, maxHistoryTextLength);
}

function parseConversationTurn(body: unknown): (ConversationTurnBody & { language?: "de" }) | null {
  if (!isRecord(body) || !hasOnlyKeys(body, turnKeys)) return null;
  const { topic, paths, usedPathIds, phase, remainingSeconds, history, transcript, silent, language } = body;
  if (silent !== undefined && typeof silent !== "boolean") return null;
  if (!isLanguage(language)) return null;
  if (!boundedText(topic, maxConversationTopicLength) || !boundedText(transcript, maxTranscriptLength)) return null;
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > maxPaths || !paths.every(isPath)) return null;
  if (!Array.isArray(usedPathIds) || usedPathIds.length > maxUsedPathIds || !usedPathIds.every((id) => boundedText(id, maxIdLength))) return null;
  if (!phases.includes(phase as ConversationPhase)) return null;
  if (typeof remainingSeconds !== "number" || !Number.isFinite(remainingSeconds) || remainingSeconds < 0) return null;
  if (!Array.isArray(history) || history.length > maxHistoryLines || !history.every(isLine)) return null;

  return { topic, paths, usedPathIds, phase: phase as ConversationPhase, remainingSeconds, history, transcript, ...(silent ? { silent } : {}), ...(language ? { language } : {}) };
}

function parseConversationPlan(body: unknown): { topic: string; language?: "de" } | null {
  if (!isRecord(body) || !hasOnlyKeys(body, planKeys) || !boundedText(body.topic, maxConversationTopicLength) || !isLanguage(body.language)) return null;
  return { topic: body.topic.trim(), ...(body.language ? { language: body.language } : {}) };
}

export function createConversationTurnController(service: ConversationTurnService | null, germanService: GermanConversationTurnService | null = null): RequestHandler {
  return async (request, response) => {
    const parsed = parseConversationTurn(request.body);
    if (!parsed) {
      response.status(400).json({ error: { code: "INVALID_CONVERSATION_TURN", message: "Invalid conversation turn request." } }); return;
    }
    const { language, ...input } = parsed;
    if (language === "de") {
      if (!isGermanConversationUser(response.locals.authenticatedUser?.userId)) {
        response.status(403).json({ error: { code: "CONVERSATION_LANGUAGE_FORBIDDEN", message: "O alemão não está liberado para esta conta." } }); return;
      }
      if (!germanService) {
        response.status(503).json({ error: { code: "CONVERSATION_UNAVAILABLE", message: "The conversation is not available on this server." } }); return;
      }
      const controller = new AbortController();
      response.on("close", () => { if (!response.writableEnded) controller.abort(); });
      const result = await germanService.reply({ ...input, transcript: input.transcript, signal: controller.signal });
      response.status(200).json({ say: result.say, move: result.move, pathId: result.pathId, sayTranslation: result.sayTranslation, personTranslation: result.personTranslation, suggestions: result.suggestions });
      return;
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

export function createConversationPlanController(service: ConversationPlanService | null, userLimit: JobDirectionUserLimit, germanService: GermanConversationPlanService | null = null): RequestHandler {
  return async (request, response) => {
    const parsed = parseConversationPlan(request.body);
    if (parsed === null) {
      response.status(400).json({ error: { code: "INVALID_CONVERSATION_PLAN", message: `Envie um tema entre 1 e ${maxConversationTopicLength} caracteres.` } }); return;
    }
    const { topic, language } = parsed;

    const userId = response.locals.authenticatedUser?.userId;
    if (typeof userId !== "string" || userId.length === 0) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sua sessão expirou. Entre novamente." } }); return;
    }
    if (language === "de") {
      if (!isGermanConversationUser(userId)) {
        response.status(403).json({ error: { code: "CONVERSATION_LANGUAGE_FORBIDDEN", message: "O alemão não está liberado para esta conta." } }); return;
      }
      // Without a model the generic German plan still lets the conversation start, so no rate limit is needed.
      if (!germanService) {
        response.status(200).json(genericGermanConversationPlan()); return;
      }
    } else if (!service) {
      // Without a model the generic plan still lets the conversation start, so no rate limit is needed.
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
      if (language === "de" && germanService) {
        const result = await germanService.plan({ topic, signal: controller.signal });
        outcome = result.outcome === "generated" || result.outcome === "unsuitable" ? "success" : "failure";
        response.status(200).json({ title: result.title, opening: result.opening, openingTranslation: result.openingTranslation, paths: result.paths });
      } else if (service) {
        const result = await service.plan({ topic, signal: controller.signal });
        outcome = result.outcome === "generated" || result.outcome === "unsuitable" ? "success" : "failure";
        response.status(200).json({ title: result.title, opening: result.opening, paths: result.paths });
      }
    } finally {
      lease.release(outcome);
    }
  };
}

/** Lists the conversation languages this account may pick: German only for allow-listed users. */
export function createConversationLanguagesController(): RequestHandler {
  return (_request, response) => {
    response.status(200).json({ languages: isGermanConversationUser(response.locals.authenticatedUser?.userId) ? ["en", "de"] : ["en"] });
  };
}
