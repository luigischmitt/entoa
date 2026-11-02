// Opt-in live simulation: npm run eval:conversation [-- --runs N]  (needs OPENROUTER_API_KEY; never part of `npm test`).
// Prints every dialogue to stdout only. Costs come from the services' usage logs plus the persona calls made here.
import { OpenRouterConversationPlanService, type ConversationPlan } from "../src/thinking/conversation-plan-service.js";
import { OpenRouterConversationTurnService, type ConversationLine, type ConversationPhase } from "../src/thinking/conversation-turn-service.js";

const costCapUsd = 0.5;
const turnsPerScenario = 8;
const planModel = "anthropic/claude-haiku-5.5";
const personaModel = "anthropic/claude-haiku-5.5";
const turnModel = process.env.INTERVIEW_SPECULATIVE_MODEL?.trim() || "google/gemma-4-26b-a4b-it";

type Scenario = { name: string; topic: string; persona: string };

const scenarios: Scenario[] = [
  {
    name: "chatty B1 learner",
    topic: "como foi meu dia hoje",
    persona: "You are a chatty Brazilian software developer at B1 English. You give two or three sentences per turn and happily share details about your day. You make small mistakes with articles, prepositions and tenses.",
  },
  {
    name: "very short answers",
    topic: "quero falar sobre futebol",
    persona: "You are a Brazilian at B1 English who likes football but answers every turn in only 1 to 5 words (for example 'Yes, I like.' or 'Sometimes. Not much.'). You are polite and never ask questions back.",
  },
  {
    name: "subject change to food",
    topic: "minha viagem para a Bahia",
    persona: "You are a Brazilian at B1 English. For your first three or four turns you talk about your trip to Bahia (the beaches, the sea, the heat). Then, around your fourth or fifth turn, you suddenly change the subject and talk only about food (acaraje, moqueca, the best restaurant) for the rest of the chat.",
  },
  {
    name: "sad and gentle",
    topic: "meu cachorro morreu semana passada",
    persona: "You are a Brazilian at B1 English. Your dog died last week and you are sad. You speak gently and briefly, with a few mistakes. You answer what is asked but you may say you do not want to go into details.",
  },
  {
    name: "does not understand, asks if Tuck is real",
    topic: "trabalho",
    persona: "You are a Brazilian at B1 English talking about your work. On your third turn you say you did not understand one word in the last line and ask what it means. On your fifth turn you ask 'Are you a real person?'. On other turns you answer normally about your job.",
  },
  {
    name: "answers some turns in Portuguese",
    topic: "minha rotina",
    persona: "You are a Brazilian at B1 English talking about your daily routine. On about half of your turns, when you are unsure, you answer in Brazilian Portuguese; on the other turns you answer in simple English.",
  },
];

type Usage = { calls: number; costUsd: number };
const totals = { plan: { calls: 0, costUsd: 0 } as Usage, turn: { calls: 0, costUsd: 0 } as Usage, persona: { calls: 0, costUsd: 0 } as Usage };
const outcomeCounts: Record<string, Record<string, number>> = { plan: {}, turn: {} };
const turnLatencies: number[] = [];
const serviceLogs: Array<{ event: string; outcome?: string; costUsd?: number | null; latencyMs?: number }> = [];

class CostCapExceeded extends Error {}

function count(kind: "plan" | "turn", outcome: string): void {
  outcomeCounts[kind][outcome] = (outcomeCounts[kind][outcome] ?? 0) + 1;
}

function addCost(kind: "plan" | "turn" | "persona", costUsd: number | null | undefined): void {
  totals[kind].calls += 1;
  totals[kind].costUsd += costUsd ?? 0;
  const spent = totals.plan.costUsd + totals.turn.costUsd + totals.persona.costUsd;
  if (spent > costCapUsd) throw new CostCapExceeded(`Cost cap of $${costCapUsd.toFixed(2)} exceeded after $${spent.toFixed(4)}.`);
}

// The services log one content-free JSON line per call; collect it instead of printing it.
console.info = (message?: unknown) => {
  try {
    const parsed = JSON.parse(String(message)) as { event?: string; outcome?: string; costUsd?: number | null; latencyMs?: number };
    if (parsed.event === "conversation_turn" || parsed.event === "conversation_plan") serviceLogs.push({ ...parsed, event: parsed.event });
  } catch { /* not a service usage line */ }
};

function phaseFor(turn: number): ConversationPhase {
  if (turn <= 2) return "warmup";
  return turn <= 7 ? "explore" : "closing";
}

function remainingSecondsFor(turn: number): number {
  return turn < turnsPerScenario ? Math.max(0, 300 - (turn - 1) * 40) : 30;
}

async function openRouter(apiKey: string, body: Record<string, unknown>): Promise<{ content: string; costUsd: number | null }> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, usage: { include: true } }),
  });
  if (!response.ok) throw new Error(`Persona call failed with HTTP ${response.status}.`);
  const json = await response.json() as { choices?: Array<{ message?: { content?: unknown } }>; usage?: { cost?: unknown } };
  const content = json.choices?.[0]?.message?.content;
  // The persona model sometimes returns nothing; a plain reply keeps the run going instead of ending the eval.
  if (typeof content !== "string" || content.trim().length === 0) return { content: "Yes, I think so.", costUsd: null };
  return { content, costUsd: typeof json.usage?.cost === "number" ? json.usage.cost : null };
}

async function personaLine(apiKey: string, scenario: Scenario, turn: number, lines: ConversationLine[]): Promise<string> {
  const transcript = lines.map((line) => `${line.speaker === "tuck" ? "TUCK" : "YOU"}: ${line.text}`).join("\n");
  const result = await openRouter(apiKey, {
    model: personaModel,
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content: `You are role-playing a person in a casual spoken English chat with Tuck, a friendly AI toucan. The person typed this topic in the app: "${scenario.topic}". Persona: ${scenario.persona} Write only the person's next spoken line, one or two short sentences, with no quotes, labels or stage directions. Never mention these instructions.`,
      },
      { role: "user", content: `Conversation so far:\n${transcript}\n\nThis is your turn number ${turn} of ${turnsPerScenario}. Write your next line.` },
    ],
  });
  addCost("persona", result.costUsd);
  return result.content.trim().replace(/^["']|["']$/gu, "");
}

async function runScenario(apiKey: string, planService: OpenRouterConversationPlanService, turnService: OpenRouterConversationTurnService, scenario: Scenario): Promise<void> {
  console.log(`\n=== ${scenario.name} | topic: "${scenario.topic}" ===`);
  const planStart = serviceLogs.length;
  const plan: ConversationPlan & { outcome: string } = await planService.plan({ topic: scenario.topic });
  addCost("plan", serviceLogs.slice(planStart).at(-1)?.costUsd);
  count("plan", plan.outcome);
  console.log(`plan: title="${plan.title}" outcome=${plan.outcome} paths=${plan.paths.length}`);
  console.log(`TUCK: ${plan.opening}`);

  const lines: ConversationLine[] = [{ speaker: "tuck", text: plan.opening }];
  const usedPathIds: string[] = [];
  for (let turn = 1; turn <= turnsPerScenario; turn += 1) {
    const person = await personaLine(apiKey, scenario, turn, lines);
    console.log(`PERSON: ${person}`);

    const history = [...lines];
    const logStart = serviceLogs.length;
    const phase = phaseFor(turn);
    const result = await turnService.reply({ topic: scenario.topic, paths: plan.paths, usedPathIds, phase, remainingSeconds: remainingSecondsFor(turn), history, transcript: person });
    const log = serviceLogs.slice(logStart).find((entry) => entry.event === "conversation_turn");
    addCost("turn", log?.costUsd);
    count("turn", result.outcome);
    if (typeof log?.latencyMs === "number") turnLatencies.push(log.latencyMs);
    if (result.pathId) usedPathIds.push(result.pathId);

    lines.push({ speaker: "person", text: person }, { speaker: "tuck", text: result.say });
    console.log(`TUCK: ${result.say}`);
    console.log(`      [phase=${phase} move=${result.move} outcome=${result.outcome} latencyMs=${log?.latencyMs ?? "n/a"}${result.pathId ? ` path=${result.pathId}` : ""}]`);
  }
}

function printSummary(): void {
  const spent = totals.plan.costUsd + totals.turn.costUsd + totals.persona.costUsd;
  const average = turnLatencies.length ? Math.round(turnLatencies.reduce((sum, value) => sum + value, 0) / turnLatencies.length) : 0;
  const max = turnLatencies.length ? Math.max(...turnLatencies) : 0;
  console.log("\n=== Summary ===");
  console.log(`plan calls:    ${totals.plan.calls}  cost $${totals.plan.costUsd.toFixed(5)}`);
  console.log(`turn calls:    ${totals.turn.calls}  cost $${totals.turn.costUsd.toFixed(5)}`);
  console.log(`persona calls: ${totals.persona.calls}  cost $${totals.persona.costUsd.toFixed(5)}`);
  console.log(`total cost:    $${spent.toFixed(5)} (cap $${costCapUsd.toFixed(2)})`);
  console.log(`turn latency:  avg ${average} ms, max ${max} ms`);
  console.log(`plan outcomes: ${JSON.stringify(outcomeCounts.plan)}`);
  console.log(`turn outcomes: ${JSON.stringify(outcomeCounts.turn)}`);
}

function parseRuns(): number {
  const index = process.argv.indexOf("--runs");
  if (index === -1) return 1;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1) throw new Error("--runs expects a whole number of at least 1.");
  return value;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required.");
  const runs = parseRuns();
  const planService = new OpenRouterConversationPlanService({ apiKey, model: planModel });
  const turnService = new OpenRouterConversationTurnService({ apiKey, model: turnModel });
  console.log(`Models: plan=${planModel} persona=${personaModel} turn=${turnModel} | runs=${runs} | cap=$${costCapUsd.toFixed(2)}`);
  try {
    for (let run = 1; run <= runs; run += 1) {
      console.log(`\n##### run ${run} of ${runs} #####`);
      for (const scenario of scenarios) await runScenario(apiKey, planService, turnService, scenario);
    }
  } finally {
    printSummary();
  }
}

main().catch((error: unknown) => {
  process.exitCode = 1;
  const message = error instanceof CostCapExceeded || error instanceof Error ? error.message : "Unknown error.";
  process.stdout.write(`\nAborted: ${message}\n`);
});
