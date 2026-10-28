import express, { Router } from "express";

import { createTranscriptionController } from "../controllers/transcription-controller.js";
import { defaultRetainedAnswerAudio, type RetainedAnswerAudio } from "../transcription/retained-answer-audio.js";
import type { TranscriptionService } from "../transcription/types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const retryTimeoutMs = 120_000;

/** Content-free outcome line for a retry; never the token, transcript or audio. */
function logTranscriptionRetry(outcome: "complete" | "expired" | "failed" | "empty", durationMs: number): void {
  console.info(JSON.stringify({ event: "transcription_retry", outcome, durationMs }));
}

export function createTranscriptionRouter(service: TranscriptionService, retainedAnswers: RetainedAnswerAudio = defaultRetainedAnswerAudio) {
  const transcriptionRouter = Router();
  const controller = createTranscriptionController(service);

  transcriptionRouter.get("/providers", controller.providers);
  transcriptionRouter.post("/", express.raw({ type: ["audio/wav", "audio/webm", "audio/mp4"], limit: "4mb" }), controller.transcribe);

  // Retries the transcription of an answer whose audio the websocket kept after an upstream failure (see retryToken).
  transcriptionRouter.post("/retry", async (request, response) => {
    const retryToken = (request.body as { retryToken?: unknown } | undefined)?.retryToken;
    if (typeof retryToken !== "string" || !uuidPattern.test(retryToken)) {
      response.status(400).json({ error: { code: "INVALID_RETRY_REQUEST", message: "Pedido de nova tentativa inválido." } });
      return;
    }
    const userId = response.locals.authenticatedUser?.userId as string | undefined;
    const entry = userId ? retainedAnswers.take(userId, retryToken) : null;
    if (!entry) {
      logTranscriptionRetry("expired", 0);
      response.status(410).json({ error: { code: "RETRY_EXPIRED", message: "O áudio desta resposta expirou. Grave novamente." } });
      return;
    }

    let result;
    try {
      result = await service.transcribe(entry.wav, "whisper-large-v3-turbo", "wav", AbortSignal.timeout(retryTimeoutMs), { question: entry.question });
    } catch {
      // The entry is kept so the candidate can retry again while the window is open.
      logTranscriptionRetry("failed", entry.durationMs);
      response.status(502).json({ error: { code: "TRANSCRIPTION_FAILED", message: "Ainda não conseguimos transcrever. Tente de novo em instantes." } });
      return;
    }

    retainedAnswers.delete(retryToken);
    if (!result.transcript.trim()) {
      logTranscriptionRetry("empty", entry.durationMs);
      response.status(422).json({ error: { code: "NO_SPEECH_RECOGNIZED", message: "Não conseguimos reconhecer fala nessa gravação. Grave novamente." } });
      return;
    }
    logTranscriptionRetry("complete", entry.durationMs);
    response.status(200).json({ status: "complete", provider: result.provider, durationMs: entry.durationMs, transcript: result.transcript });
  });

  return transcriptionRouter;
}
