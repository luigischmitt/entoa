import assert from "node:assert/strict";
import test from "node:test";
import { getFixedInterviewQuestions } from "../src/lib/interview/questions.ts";
import { getQuestionBankForRole, questionBankRoles } from "../src/lib/interview/question-bank.mjs";

const seniorities = ["intern", "junior", "mid-level", "senior"];
const focuses = ["mixed", "technical-depth"];
const allBanks = questionBankRoles.flatMap((role) => seniorities.flatMap((seniority) => focuses.map((focus) => [
  `${role}/${seniority}/${focus}`, getQuestionBankForRole(role, seniority, focus),
])));
const tailored = [
  "How would you validate a distinct technical decision for the first project?",
  "How would you validate a distinct technical decision for the second project?",
  "How would you validate a distinct technical decision for the third project?",
];
const direction = {
  targetRole: "QA Analyst", suggestedSeniority: "mid-level", mainInterviewEmphasis: "Automação de testes",
  priorityCompetencies: ["Automação com Playwright"], productTeamContext: "Equipe de produto", tailoredQuestions: tailored,
};

test("every listed role composes 15 questions for every seniority and focus", () => {
  for (const [name, bank] of allBanks) {
    assert.equal(bank.length, 15, name);
    assert.equal(bank[0].id, "introduction", name);
    assert.equal(bank.at(-1).id, "closing", name);
  }
});

test("unknown and empty roles use General, and role matching accepts aliases and keyword variants", () => {
  for (const role of ["", undefined, null, "Astronaut", "Product Manager", "Tech Lead"]) {
    assert.deepEqual(getQuestionBankForRole(role, "junior"), getQuestionBankForRole("General", "junior"), String(role));
  }
  assert.deepEqual(getQuestionBankForRole("  backend ENGINEER "), getQuestionBankForRole("Backend Engineer"));
  for (const [variant, canonical] of [
    ["fullstack engineer", "Full-Stack Engineer"], ["Full Stack Developer", "Full-Stack Engineer"],
    ["sre", "Site Reliability Engineer"], ["ML engineer", "Machine Learning Engineer"],
    ["frontend developer", "Frontend Engineer"], ["Analista de Dados", "Data Analyst"],
    ["Cientista de Dados", "Data Scientist"], ["Engenheiro de Dados", "Data Engineer"],
    ["Desenvolvedor Backend", "Backend Engineer"], ["Desenvolvedor Frontend", "Frontend Engineer"],
    ["QA Analyst", "QA Automation Engineer"], ["Quality Assurance Engineer", "QA Automation Engineer"],
    ["Quality Assurance Analyst", "QA Automation Engineer"], ["Test Analyst", "QA Automation Engineer"],
    ["Test Automation Engineer", "QA Automation Engineer"], ["Analista de QA", "QA Automation Engineer"],
    ["Analista de Testes", "QA Automation Engineer"], ["SDET", "QA Automation Engineer"],
    ["iOS Developer", "Mobile Engineer"], ["Android Developer", "Mobile Engineer"],
    ["Platform Engineer", "DevOps Engineer"], ["Senior Java Developer", "Software Engineer"],
  ]) assert.deepEqual(getQuestionBankForRole(variant), getQuestionBankForRole(canonical), variant);
});

test("composed prompts are single short spoken questions and ids are unique kebab-case", () => {
  for (const [name, bank] of allBanks) {
    const ids = bank.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length, name);
    for (const question of bank) {
      const prompt = question.prompt.replace("{role}", "Backend Engineer");
      assert.ok(prompt.length <= 220, `${name}/${question.id} too long`);
      assert.ok(!/[\r\n]/u.test(prompt), `${name}/${question.id} has line break`);
      assert.equal((prompt.match(/\?/gu) ?? []).length, 1, `${name}/${question.id} question mark count`);
      assert.ok(prompt.endsWith("?"), `${name}/${question.id} must end with ?`);
      assert.match(question.id, /^[a-z]+(?:-[a-z]+)*$/u, `${name}/${question.id}`);
      assert.ok(question.cue.trim().length > 0, `${name}/${question.id} needs a cue`);
    }
  }
});

test("only the introduction uses the role placeholder", () => {
  for (const [name, bank] of allBanks) {
    assert.ok(bank[0].prompt.includes("{role}"), name);
    assert.ok(bank.slice(1).every(({ prompt }) => !prompt.includes("{role}")), name);
  }
});

test("approved directions use the fixed English opening and preserve the role bank", () => {
  const config = { role: "Backend Engineer", seniority: "mid-level", jobDirection: {
    targetRole: "Backend Engineer", suggestedSeniority: "mid-level", mainInterviewEmphasis: "Reliable API design",
    priorityCompetencies: ["comunicação interpessoal"], productTeamContext: "Uma equipe de pagamentos",
  } };
  const questions = getFixedInterviewQuestions(config);
  assert.equal(questions[0].prompt, "Based on the role description you shared, which part of your experience would be most valuable in this position?");
  assert.doesNotMatch(questions[0].prompt, /comunicação interpessoal|pagamentos/u);
  assert.deepEqual(questions.slice(1).map(({ id, prompt }) => ({ id, prompt })), getQuestionBankForRole("Backend Engineer", "mid-level").slice(1).map(({ id, prompt }) => ({ id, prompt })));
  const generic = getFixedInterviewQuestions({ role: "Backend Engineer", seniority: "mid-level" })[0].prompt;
  assert.equal(generic, getQuestionBankForRole("Backend Engineer", "mid-level")[0].prompt.replace("{role}", "Backend Engineer"));
  assert.equal(getFixedInterviewQuestions({ ...config, jobDirection: { ...config.jobDirection, targetRole: "Frontend Engineer" } })[0].prompt, generic);
  const longDirection = getFixedInterviewQuestions({ role: "R".repeat(100), seniority: "staff", jobDirection: {
    targetRole: "R".repeat(100), suggestedSeniority: "staff", mainInterviewEmphasis: "Experiência com ".concat("gestão técnica ".repeat(14)),
    priorityCompetencies: ["comunicação e alinhamento com partes interessadas".padEnd(100, "x")], productTeamContext: "Equipe distribuída ".repeat(14),
  } });
  assert.ok(longDirection[0].prompt.length <= 220);
  assert.doesNotMatch(longDirection[0].prompt, /partes interessadas|gestão técnica|Equipe distribuída/u);
});

test("resume introductions are resume-aware and resume practice questions never name the inferred role", () => {
  const config = { role: "AI Researcher", seniority: "senior", focus: "mixed", interviewSource: "resume", jobDirection: {
    targetRole: "AI Researcher", suggestedSeniority: "senior", mainInterviewEmphasis: "Resume", priorityCompetencies: ["Resume"],
    productTeamContext: "Resume", tailoredQuestions: ["How did you evaluate your models?"],
  } };
  const questions = getFixedInterviewQuestions(config);
  assert.match(questions[0].prompt, /introduce yourself/u);
  for (const question of questions) assert.ok(!question.prompt.includes("{role}") && !/AI Researcher|this role/u.test(question.prompt), question.prompt);
  const withoutDirection = getFixedInterviewQuestions({ ...config, jobDirection: undefined });
  assert.ok(withoutDirection.every(({ prompt }) => !/AI Researcher|this role/u.test(prompt)));
});

test("job and resume tailored questions fill technical slots immediately after intro; stale or absent directions keep bank", () => {
  const eight = Array.from({ length: 8 }, (_, i) => `Could you explain distinct technical decision number ${i + 1}?`);
  for (const interviewSource of ["job", "resume"]) {
    const questions = getFixedInterviewQuestions({ role: "QA Analyst", seniority: "mid-level", focus: "technical-depth", interviewSource,
      jobDirection: { ...direction, tailoredQuestions: eight } });
    const tailoredPositions = questions.flatMap((q, index) => /^(job|resume)-\d+$/u.test(q.id) ? [index] : []);
    assert.equal(tailoredPositions.length, 8);
    assert.deepEqual(tailoredPositions.map((index) => questions[index].prompt), eight);
    assert.deepEqual(tailoredPositions, [1, 2, 3, 4, 5, 6, 7, 8]);
    const ids = questions.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length);
  }
  for (const interviewSource of ["job", "resume"]) {
    const fewer = getFixedInterviewQuestions({ role: "QA Analyst", seniority: "mid-level", interviewSource, jobDirection: direction });
    assert.deepEqual(fewer.filter(({ id }) => /^(job|resume)-/u.test(id)).map(({ id, prompt }) => [id, prompt]), tailored.map((prompt, index) => [`${interviewSource === "resume" ? "resume" : "job"}-${index + 1}`, prompt]));
  }
  const bank = getQuestionBankForRole("QA Analyst", "mid-level");
  assert.deepEqual(getFixedInterviewQuestions({ role: "QA Analyst", seniority: "mid-level" }).map(({ id }) => id), bank.map(({ id }) => id));
  assert.deepEqual(getFixedInterviewQuestions({ role: "Backend Engineer", seniority: "mid-level", jobDirection: direction }).map(({ id }) => id), getQuestionBankForRole("Backend Engineer", "mid-level").map(({ id }) => id));
  assert.deepEqual(getFixedInterviewQuestions({ role: "QA Analyst", seniority: "senior", jobDirection: direction }).map(({ id }) => id), getQuestionBankForRole("QA Analyst", "senior").map(({ id }) => id));
});

test("bank broad-project metadata is preserved and tailored questions do not carry it", () => {
  for (const [name, bank] of allBanks) {
    const expected = getQuestionBankForRole(name.split("/")[0], name.split("/")[1], name.split("/")[2]);
    for (const question of bank) {
      assert.equal(question.coverage, expected.find(({ id }) => id === question.id)?.coverage, `${name}/${question.id}`);
      assert.ok(question.coverage === undefined || question.coverage === "broad-project", `${name}/${question.id}`);
    }
  }
  const questions = getFixedInterviewQuestions({ role: "QA Analyst", seniority: "mid-level", focus: "technical-depth", jobDirection: direction });
  assert.ok(questions.filter(({ id }) => id.startsWith("job-")).every(({ coverage }) => coverage === undefined));
  assert.equal(getQuestionBankForRole("Software Engineer", "intern").find(({ id }) => id === "small-project").coverage, "broad-project");
});

test("intern and junior banks never contain system-design style prompts", () => {
  for (const role of questionBankRoles) for (const seniority of ["intern", "junior"]) {
    for (const question of getQuestionBankForRole(role, seniority)) {
      assert.doesNotMatch(question.prompt, /design a|system design|architecture/iu, `${role}/${seniority}/${question.id}`);
    }
  }
});

test("legacy staff seniority and behavioral or communication focus compose the expected banks", () => {
  for (const role of questionBankRoles) {
    assert.deepEqual(getQuestionBankForRole(role, "staff"), getQuestionBankForRole(role, "senior"), role);
    for (const focus of ["behavioral", "communication"]) assert.deepEqual(getQuestionBankForRole(role, "mid-level", focus), getQuestionBankForRole(role, "mid-level", "mixed"), `${role}/${focus}`);
  }
});
