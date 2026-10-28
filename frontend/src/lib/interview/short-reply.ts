import { authorizedFetch } from "@/lib/auth/backend-auth";
import { parseShortReplyResponse, type ShortReply } from "./short-reply-policy.mjs";

export async function requestShortReply(input: { currentQuestion: string; transcript: string; nextQuestionAvailable: boolean; signal: AbortSignal }, timeoutMs = 3500): Promise<ShortReply | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
    const response = await authorizedFetch(`${baseUrl}/api/v1/thinking/short-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentQuestion: input.currentQuestion, transcript: input.transcript, nextQuestionAvailable: input.nextQuestionAvailable }),
      signal: AbortSignal.any([input.signal, AbortSignal.timeout(timeoutMs)]),
    });
    if (!response.ok) return null;
    return parseShortReplyResponse(await response.json());
  } catch {
    return null;
  }
}
