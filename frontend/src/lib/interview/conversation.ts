import { authorizedFetch } from "@/lib/auth/backend-auth";
import type { ConversationPlanInput, ConversationSuggestion, ConversationTurnReply, ConversationTurnRequest } from "./conversation-policy.mjs";

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const moves = new Set(["FOLLOW", "NEW_PATH", "CLARIFY", "WRAP", "END"]);
const maxSuggestions = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePlan(body: unknown): ConversationPlanInput {
  if (!isRecord(body) || typeof body.title !== "string" || typeof body.opening !== "string" || !Array.isArray(body.paths)) {
    throw new Error("Invalid conversation plan");
  }
  const paths = body.paths.map((path) => {
    if (!isRecord(path) || typeof path.id !== "string" || typeof path.line !== "string") throw new Error("Invalid conversation path");
    return { id: path.id, line: path.line };
  });
  if (paths.length === 0) throw new Error("Empty conversation plan");
  return {
    title: body.title,
    opening: body.opening,
    ...(typeof body.openingTranslation === "string" ? { openingTranslation: body.openingTranslation } : {}),
    paths,
  };
}

/** Suggested answers: malformed items are dropped and at most three are kept. */
function parseSuggestions(value: unknown): ConversationSuggestion[] {
  if (!Array.isArray(value)) return [];
  const suggestions: ConversationSuggestion[] = [];
  for (const item of value) {
    if (isRecord(item) && typeof item.de === "string" && typeof item.pt === "string") suggestions.push({ de: item.de, pt: item.pt });
    if (suggestions.length === maxSuggestions) break;
  }
  return suggestions;
}

function parseReply(body: unknown): ConversationTurnReply {
  if (!isRecord(body) || typeof body.say !== "string" || typeof body.move !== "string" || !moves.has(body.move)) {
    throw new Error("Invalid conversation turn");
  }
  return {
    say: body.say,
    move: body.move as ConversationTurnReply["move"],
    pathId: typeof body.pathId === "string" ? body.pathId : null,
    // German replies only: translations and suggestions, present when the backend sends them.
    ...("sayTranslation" in body ? { sayTranslation: typeof body.sayTranslation === "string" ? body.sayTranslation : null } : {}),
    ...("personTranslation" in body ? { personTranslation: typeof body.personTranslation === "string" ? body.personTranslation : null } : {}),
    ...("suggestions" in body ? { suggestions: parseSuggestions(body.suggestions) } : {}),
  };
}

/** Conversation languages the signed-in user may pick; ["en"] on any failure or a malformed answer. */
export async function requestConversationLanguages(signal?: AbortSignal): Promise<Array<"en" | "de">> {
  try {
    const response = await authorizedFetch(`${backendBaseUrl}/api/v1/thinking/conversation-languages`, { signal });
    if (!response.ok) return ["en"];
    const body: unknown = await response.json();
    if (!isRecord(body) || !Array.isArray(body.languages)) return ["en"];
    const languages = body.languages.filter((language): language is "en" | "de" => language === "en" || language === "de");
    return languages.length > 0 ? languages : ["en"];
  } catch {
    return ["en"];
  }
}

/** Prepares the plan for a typed topic. Rejects on any failure; the caller keeps the user on the setup. */
export async function requestConversationPlan(topic: string, signal: AbortSignal, language?: "de"): Promise<ConversationPlanInput> {
  const response = await authorizedFetch(`${backendBaseUrl}/api/v1/thinking/conversation-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(language ? { topic, language } : { topic }),
    signal,
  });
  if (!response.ok) throw new Error(`Conversation plan failed: ${response.status}`);
  return parsePlan(await response.json());
}

/** One conversation turn. Rejects on any failure; the room then uses the client-side fallback line. */
export async function requestConversationTurn(body: ConversationTurnRequest, signal: AbortSignal): Promise<ConversationTurnReply> {
  const response = await authorizedFetch(`${backendBaseUrl}/api/v1/thinking/conversation-turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(`Conversation turn failed: ${response.status}`);
  return parseReply(await response.json());
}
