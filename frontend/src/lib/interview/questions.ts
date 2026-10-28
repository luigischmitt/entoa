import { getQuestionBankForRole } from "./question-bank.mjs";
import { isValidJobDirection } from "./job-direction.mjs";
import { roleForSpeech } from "./opening-copy.mjs";
import { isResumePractice } from "./resume-neutral.mjs";
import { personalizeTechnicalQuestions } from "./personalization.mjs";
import type { InterviewConfig, InterviewQuestion } from "./types";

export function getFixedInterviewQuestions(config: InterviewConfig, learnerProfile: Array<{ topicId: string; sessionCount: number }> = []): InterviewQuestion[] {
  const role = config.role || "this role";
  // A role typed in Portuguese is never spliced into an English sentence ("strong fit for Analista de Dados").
  // Resume practice has no target job: bank questions never name the inferred role.
  const spokenRole = isResumePractice(config) ? "this kind of work" : roleForSpeech(role);
  const questions = getQuestionBankForRole(config.role, config.seniority, config.focus).map((question) => ({ ...question, prompt: question.prompt.replace("{role}", spokenRole) }));
  const direction = config.jobDirection;
  if (questions[0] && isValidJobDirection(direction)
    && direction.targetRole.trim() === role.trim()
    && direction.suggestedSeniority === config.seniority) {
    const fromResume = config.interviewSource === "resume";
    questions[0] = {
      ...questions[0],
      prompt: fromResume
        ? "Could you introduce yourself and walk me through the experience from your resume you'd most like to talk about?"
        : "Based on the role description you shared, which part of your experience would be most valuable in this position?",
      cue: fromResume ? "Give a concise example from your resume." : "Give a concise example, then connect it to the role.",
    };
    return personalizeTechnicalQuestions(applyTailoredQuestions(questions, direction.tailoredQuestions, fromResume ? "resume" : "job"), learnerProfile, { seniority: config.seniority });
  }
  return personalizeTechnicalQuestions(questions, learnerProfile, { seniority: config.seniority });
}

const maxTailoredQuestions = 8;

/**
 * Tailored job/resume questions replace bank technical questions (up to eight, even when the focus has fewer technical
 * slots) and run immediately after the introduction, so a short interview is mostly about this job or resume. The
 * remaining bank questions keep their order after them, and the list keeps its length.
 */
function applyTailoredQuestions(questions: InterviewQuestion[], tailored: string[] | undefined, prefix: "job" | "resume"): InterviewQuestion[] {
  const used = new Set(questions.map((question) => question.prompt.trim().toLowerCase()));
  const picked: InterviewQuestion[] = [];
  for (const prompt of tailored ?? []) {
    const key = prompt.trim().toLowerCase();
    if (picked.length >= maxTailoredQuestions || !key || used.has(key)) continue;
    picked.push({ id: `${prefix}-${picked.length + 1}`, prompt: prompt.trim(), cue: "Give a concrete example from your experience with this.", kind: "technical" });
    used.add(key);
  }
  if (picked.length === 0) return questions;
  const [introduction, ...rest] = questions;
  const closing = rest.at(-1);
  const middle = rest.slice(0, -1);
  // Drop bank technical questions first (the tailored ones replace them), then the last ones, to keep the length.
  let technicalToDrop = picked.length;
  const kept = middle.filter((question) => {
    if (question.kind !== "technical" || technicalToDrop === 0) return true;
    technicalToDrop -= 1;
    return false;
  }).slice(0, Math.max(0, middle.length - picked.length));
  return [introduction, ...picked, ...kept, ...(closing ? [closing] : [])];
}
