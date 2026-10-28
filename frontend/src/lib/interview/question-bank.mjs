// Fixed question banks are authored per role and seniority in question-bank/roles.
import { normalizeSeniority, normalizeFocus } from "./interview-normalization.mjs";
import role0 from "./question-bank/roles/ai-deployment-engineer.mjs";
import role1 from "./question-bank/roles/ai-engineer.mjs";
import role2 from "./question-bank/roles/backend-engineer.mjs";
import role3 from "./question-bank/roles/cloud-engineer.mjs";
import role4 from "./question-bank/roles/data-analyst.mjs";
import role5 from "./question-bank/roles/data-engineer.mjs";
import role6 from "./question-bank/roles/data-scientist.mjs";
import role7 from "./question-bank/roles/devops-engineer.mjs";
import role8 from "./question-bank/roles/engineering-manager.mjs";
import role9 from "./question-bank/roles/frontend-engineer.mjs";
import role10 from "./question-bank/roles/full-stack-engineer.mjs";
import role11 from "./question-bank/roles/generic.mjs";
import role12 from "./question-bank/roles/machine-learning-engineer.mjs";
import role13 from "./question-bank/roles/mobile-engineer.mjs";
import role14 from "./question-bank/roles/qa-automation-engineer.mjs";
import role15 from "./question-bank/roles/security-engineer.mjs";
import role16 from "./question-bank/roles/site-reliability-engineer.mjs";
import role17 from "./question-bank/roles/software-engineer.mjs";
const introduction = { id: "introduction", prompt: "Can you tell me about your experience and what makes you a strong fit for {role}?", cue: "Give a concise overview, then connect one strength to the role.", kind: "background" };
const closing = { id: "closing", prompt: "What would you like to ask about the team or the role?", cue: "Ask one thoughtful question that helps you evaluate the opportunity.", kind: "background" };
const roleFiles = [role0, role1, role2, role3, role4, role5, role6, role7, role8, role9, role10, role11, role12, role13, role14, role15, role16, role17];
const banksByName = new Map(roleFiles.map((entry) => [entry.role, entry]));
// Common variants candidates type instead of the listed role name.
const roleAliases = {
  "fullstack engineer": "Full-Stack Engineer",
  "full stack engineer": "Full-Stack Engineer",
  "full-stack developer": "Full-Stack Engineer",
  "full stack developer": "Full-Stack Engineer",
  "software developer": "Software Engineer",
  "front-end engineer": "Frontend Engineer",
  "front end engineer": "Frontend Engineer",
  "frontend developer": "Frontend Engineer",
  "back-end engineer": "Backend Engineer",
  "back end engineer": "Backend Engineer",
  "backend developer": "Backend Engineer",
  "sre": "Site Reliability Engineer",
  "ml engineer": "Machine Learning Engineer",
  "qa engineer": "QA Automation Engineer",
  "sdet": "QA Automation Engineer",
  "devops": "DevOps Engineer",
  "data science": "Data Scientist",
};

function normalizeRole(role) {
  return String(role ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Keyword fallback for titles outside the exact/alias lookup, most specific first. Patterns run on the lowercased title.
const roleKeywordRules = [
  [/\b(?:qa|sdet|quality|tester|testes?|testing|test (?:analyst|engineer|automation))\b/, "QA Automation Engineer"],
  [/\b(?:security|seguran[cç]a)\b/, "Security Engineer"],
  [/\b(?:machine learning|ml|mlops)\b/, "Machine Learning Engineer"],
  [/\b(?:ai|ia)\b.*\b(?:engineer|engenheir[oa]|developer)\b/, "AI Engineer"],
  [/\b(?:data scien\w*|cientista de dados)\b/, "Data Scientist"],
  [/\b(?:data engineer\w*|engenheir[oa] de dados|analytics engineer)\b/, "Data Engineer"],
  [/\b(?:data analyst|analista de dados|bi analyst|business intelligence|analista de bi)\b/, "Data Analyst"],
  [/\b(?:sre|site reliability|confiabilidade)\b/, "Site Reliability Engineer"],
  [/\b(?:devops|devsecops|platform engineer|infrastructure engineer|engenheir[oa] de plataforma|engenheir[oa] de infraestrutura)\b/, "DevOps Engineer"],
  [/\b(?:cloud|nuvem)\b/, "Cloud Engineer"],
  [/\b(?:ios|android|mobile|react native|flutter)\b/, "Mobile Engineer"],
  [/\b(?:full[\s-]?stack)\b/, "Full-Stack Engineer"],
  [/\b(?:front[\s-]?end|frontend)\b/, "Frontend Engineer"],
  [/\b(?:back[\s-]?end|backend)\b/, "Backend Engineer"],
  [/\b(?:engineering manager|gerente de engenharia)\b/, "Engineering Manager"],
  [/\b(?:software|desenvolvedor[a]?|developer|programmer|programador[a]?)\b/, "Software Engineer"],
];


const compositions = {
  mixed: ["introduction", ["technical", 0], ["background", 0], ["technical", 1], ["behavioral", 0], ["technical", 2], ["behavioral", 1], ["technical", 3], ["background", 1], ["technical", 4], ["behavioral", 2], ["technical", 5], ["background", 2], ["technical", 6], "closing"],
  "technical-depth": ["introduction", ["technical", 0], ["technical", 1], ["background", 0], ["technical", 2], ["technical", 3], ["behavioral", 0], ["technical", 4], ["technical", 5], ["behavioral", 1], ["technical", 6], ["technical", 7], ["background", 1], ["behavioral", 2], "closing"],
};

function matchRole(role) {
  const normalized = normalizeRole(role);
  const alias = roleAliases[normalized];
  const exact = alias ?? roleFiles.find((entry) => normalizeRole(entry.role) === normalized)?.role;
  if (exact) return banksByName.get(exact);
  const keyword = roleKeywordRules.find(([pattern]) => pattern.test(normalized));
  return keyword ? banksByName.get(keyword[1]) : banksByName.get("General");
}

export function getQuestionBankForRole(role, seniority, focus = "mixed") {
  const bank = matchRole(role) ?? banksByName.get("General");
  const level = bank.levels[normalizeSeniority(seniority)];
  const order = compositions[normalizeFocus(focus)];
  return order.map((entry) => {
    if (entry === "introduction") return introduction;
    if (entry === "closing") return closing;
    const [kind, index] = entry;
    const source = kind === "background" ? level.background : level[kind];
    return { ...source[index], kind };
  });
}

export const genericQuestionBank = getQuestionBankForRole("", "junior");
export const genericJuniorQuestionBank = genericQuestionBank;
export const technicalQuestionAlternates = {};
export const questionBankRoles = roleFiles.map(({ role }) => role).filter((role) => role !== "General");
export const technicalQuestionTopicIds = new Set(roleFiles.flatMap(({ levels }) => Object.values(levels).flatMap(({ technical }) => technical.map(({ id }) => id))));
