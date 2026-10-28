import type { RequestHandler } from "express";
import type { ShortReplyService } from "../thinking/short-reply-service.js";

const text = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
export function createShortReplyController(service: ShortReplyService | null): RequestHandler {
  return async (request, response) => {
    const body = request.body as { currentQuestion?: unknown; transcript?: unknown; nextQuestionAvailable?: unknown } | null;
    if (!body || !text(body.currentQuestion, 800) || !text(body.transcript, 1000) || typeof body.nextQuestionAvailable !== "boolean") {
      response.status(400).json({ error: { code: "INVALID_SHORT_REPLY", message: "Invalid short reply request." } }); return;
    }
    if (!service) { response.status(200).json({ enabled: false, action: "ANSWER", say: null, question: null }); return; }
    const controller = new AbortController();
    response.on("close", () => { if (!response.writableEnded) controller.abort(); });
    const result = await service.decide({ currentQuestion: body.currentQuestion, transcript: body.transcript, nextQuestionAvailable: body.nextQuestionAvailable, signal: controller.signal });
    response.status(200).json({ enabled: true, action: result.action, say: result.say, question: result.question });
  };
}
