import type { RequestHandler } from "express";

import { isGermanConversationUser } from "../thinking/german-conversation-service.js";
import type { GermanConversationReportLine, GermanConversationReportService } from "../thinking/german-conversation-report-service.js";

type UnknownRecord = Record<string, unknown>;

const maxTopicLength = 200;
const maxLines = 80;
const maxLineTextLength = 2_000;
const reportKeys = ["topic", "lines"];
const lineKeys = ["speaker", "text"];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: UnknownRecord, expected: string[]): boolean {
  return Object.keys(value).every((key) => expected.includes(key));
}

function parseReportBody(body: unknown): { topic: string; lines: GermanConversationReportLine[] } | null {
  if (!isRecord(body) || !hasOnlyKeys(body, reportKeys)) return null;
  const { topic, lines } = body;
  if (typeof topic !== "string" || !topic.trim() || topic.length > maxTopicLength) return null;
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > maxLines) return null;
  const parsed: GermanConversationReportLine[] = [];
  for (const line of lines) {
    if (!isRecord(line) || !hasOnlyKeys(line, lineKeys)) return null;
    const { speaker, text } = line;
    if (speaker !== "tuck" && speaker !== "person") return null;
    if (typeof text !== "string" || !text.trim() || text.length > maxLineTextLength) return null;
    parsed.push({ speaker, text: text.trim() });
  }
  if (!parsed.some((line) => line.speaker === "person")) return null;
  return { topic: topic.trim(), lines: parsed };
}

export function createGermanConversationReportController(service: GermanConversationReportService | null): RequestHandler {
  return async (request, response) => {
    const parsed = parseReportBody(request.body);
    if (!parsed) {
      response.status(400).json({ error: { code: "INVALID_GERMAN_REPORT", message: "Relatório de conversa inválido." } }); return;
    }
    if (!isGermanConversationUser(response.locals.authenticatedUser?.userId)) {
      response.status(403).json({ error: { code: "CONVERSATION_LANGUAGE_FORBIDDEN", message: "O alemão não está liberado para esta conta." } }); return;
    }
    if (!service) {
      response.status(503).json({ error: { code: "GERMAN_REPORT_UNAVAILABLE", message: "The German report is not available on this server." } }); return;
    }
    const controller = new AbortController();
    response.on("close", () => { if (!response.writableEnded) controller.abort(); });
    const result = await service.generate({ ...parsed, signal: controller.signal });
    if (!result.report) {
      response.status(502).json({ error: { code: "GERMAN_REPORT_FAILED", message: "Não consegui montar o relatório agora. Tente novamente." } }); return;
    }
    response.status(200).json(result.report);
  };
}
