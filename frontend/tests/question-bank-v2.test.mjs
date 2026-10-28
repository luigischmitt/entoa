import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { getQuestionBankForRole } from "../src/lib/interview/question-bank.mjs";
import { normalizeFocus, normalizeSeniority } from "../src/lib/interview/interview-normalization.mjs";
import { getFixedInterviewQuestions } from "../src/lib/interview/questions.ts";

const rolesPath = new URL("../src/lib/interview/question-bank/roles/", import.meta.url);
const roleFiles = await Promise.all((await readdir(rolesPath)).filter((name) => name.endsWith(".mjs")).map(async (name) => [name, (await import(new URL(name, rolesPath))).default]));

test("every role file has four valid levels, 8/3/3 prompts, and unique ids", () => {
  for (const [file, bank] of roleFiles) {
    assert.deepEqual(Object.keys(bank.levels).sort(), ["intern", "junior", "mid-level", "senior"].sort(), file);
    const ids = [];
    for (const [level, groups] of Object.entries(bank.levels)) {
      assert.equal(groups.technical.length, 8, `${file}/${level}/technical`);
      assert.equal(groups.behavioral.length, 3, `${file}/${level}/behavioral`);
      assert.equal(groups.background.length, 3, `${file}/${level}/background`);
      for (const question of Object.values(groups).flat()) {
        assert.equal((question.prompt.match(/\?/gu) ?? []).length, 1, `${file}/${level}/${question.id}`);
        assert.ok(question.prompt.length <= 200, `${file}/${level}/${question.id}`);
        ids.push(question.id);
      }
    }
    assert.equal(new Set(ids).size, ids.length, `${file} ids`);
  }
});

test("both focus modes compose the authored categories in order", () => {
  const role = "Software Engineer";
  const level = "senior";
  const source = roleFiles.find(([, bank]) => bank.role === role)[1].levels[level];
  const mixed = getQuestionBankForRole(role, level, "mixed");
  const technical = getQuestionBankForRole(role, level, "technical-depth");
  const expectedMixed = ["introduction", source.technical[0].id, source.background[0].id, source.technical[1].id, source.behavioral[0].id, source.technical[2].id, source.behavioral[1].id, source.technical[3].id, source.background[1].id, source.technical[4].id, source.behavioral[2].id, source.technical[5].id, source.background[2].id, source.technical[6].id, "closing"];
  const expectedTechnical = ["introduction", source.technical[0].id, source.technical[1].id, source.background[0].id, source.technical[2].id, source.technical[3].id, source.behavioral[0].id, source.technical[4].id, source.technical[5].id, source.behavioral[1].id, source.technical[6].id, source.technical[7].id, source.background[1].id, source.behavioral[2].id, "closing"];
  assert.deepEqual(mixed.map(({ id }) => id), expectedMixed);
  assert.deepEqual(technical.map(({ id }) => id), expectedTechnical);
  for (const questions of [mixed, technical]) {
    assert.equal(questions.length, 15);
    assert.equal(new Set(questions.map(({ id }) => id)).size, 15);
    assert.equal(questions[0].kind, "background");
    assert.equal(questions.at(-1).kind, "background");
  }
});

test("legacy values normalize and unknown roles use the generic bank", () => {
  assert.equal(normalizeSeniority("staff"), "senior");
  assert.equal(normalizeSeniority("unexpected"), "junior");
  assert.equal(normalizeFocus("communication"), "mixed");
  assert.equal(normalizeFocus("behavioral"), "mixed");
  assert.equal(normalizeFocus("unexpected"), "mixed");
  assert.deepEqual(getQuestionBankForRole("not a role", "junior"), getQuestionBankForRole("General", "junior"));
});

test("tailored questions replace technical slots only", () => {
  const tailoredQuestions = Array.from({ length: 8 }, (_, index) => `Could you explain a distinct technical decision number ${index + 1}?`);
  const direction = { targetRole: "Software Engineer", suggestedSeniority: "senior", mainInterviewEmphasis: "Technical decisions and delivery.", priorityCompetencies: ["Design"], productTeamContext: "A product team.", tailoredQuestions };
  const config = { role: "Software Engineer", seniority: "senior", focus: "technical-depth", duration: "15", questionCount: null, interviewSource: "job", jobDirection: direction };
  const result = getFixedInterviewQuestions(config);
  const technicalSlots = result.flatMap((question, index) => question.kind === "technical" ? [index] : []);
  assert.equal(technicalSlots.length, 8);
  assert.deepEqual(technicalSlots.map((index) => result[index].prompt), tailoredQuestions);
  assert.ok(result.filter((question) => question.kind !== "technical").every((question) => !question.id.startsWith("job-")));
  assert.equal(result[0].id, "introduction");
  assert.equal(result.at(-1).id, "closing");
});
