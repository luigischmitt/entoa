import test from "node:test";
import assert from "node:assert/strict";
import { analysisCoverageNotice, diffReportWords, displayInterviewerTakeaway, displayTechnicalFindings, isCompleteSentence, phonemeTip } from "../src/lib/interview/report-presentation.mjs";

test("word diff marks only changed words and preserves shared words", () => {
  assert.deepEqual(diffReportWords("I made a test.", "We ran a test."), {
    original: [{ text: "I", changed: true }, { text: " ", changed: false }, { text: "made", changed: true }, { text: " ", changed: false }, { text: "a", changed: false }, { text: " ", changed: false }, { text: "test", changed: false }, { text: ".", changed: false }],
    revised: [{ text: "We", changed: true }, { text: " ", changed: false }, { text: "ran", changed: true }, { text: " ", changed: false }, { text: "a", changed: false }, { text: " ", changed: false }, { text: "test", changed: false }, { text: ".", changed: false }],
  });
});

test("phoneme tips cover Azure symbols and use a safe fallback", () => {
  assert.match(phonemeTip("θ"), /língua entre os dentes/u);
  assert.match(phonemeTip("iy"), /i mais longo/u);
  assert.match(phonemeTip(undefined, "worked"), /-ed/u);
  assert.equal(phonemeTip("unknown"), "pronuncie cada sílaba com clareza");
});

test("incomplete explanations and contradictory positive points stay out of the report", () => {
  assert.equal(isCompleteSentence("Em português, usamos"), false);
  assert.equal(isCompleteSentence("O presente simples ."), false);
  assert.equal(isCompleteSentence("Em português, o verbo muda conforme o sujeito."), true);
  const technical = displayTechnicalFindings(
    [{ explanation: "Você explicou o critério de escolha.", evidence: "we chose based on cost" }, { explanation: "Frase incompleta", evidence: "x" }],
    [{ explanation: "Faltou explicar o critério de escolha.", evidence: "we chose based on cost" }],
  );
  assert.deepEqual(technical.strengths, []);
  assert.equal(technical.gaps.length, 1);
  assert.deepEqual(displayInterviewerTakeaway({ remember: "Você explicou o critério de escolha.", concern: "Faltou explicar o critério de escolha." }), { remember: null, concern: "Faltou explicar o critério de escolha." });
  assert.deepEqual(displayTechnicalFindings([{ explanation: "Você explicou o critério de escolha.", evidence: "x" }], [], [{ explanation: "Faltou explicar o critério de escolha." }]).strengths, []);
});

test("coverage notice uses visible answer ordinals and only appears for an incomplete report", () => {
  assert.equal(analysisCoverageNotice({ analyzedTurnCount: 2, totalTurnCount: 3, missingSequenceNumbers: [5] }, (sequenceNumber) => ({ 5: 2 })[sequenceNumber]), "Não conseguimos analisar a resposta 2. Os pontos abaixo cobrem as outras respostas.");
  assert.equal(analysisCoverageNotice({ analyzedTurnCount: 3, totalTurnCount: 3, missingSequenceNumbers: [] }), null);
});
