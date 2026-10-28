import { isValidJobDirection } from "./job-direction.mjs";
import { buildRoleContext } from "./resume-neutral.mjs";
import { normalizeSeniority } from "./interview-normalization.mjs";

/** Builds every report-stage payload from the interview's approved snapshot, never the raw description. */
export function buildInterviewReportRequest(config, reportData, locale = "pt-BR") {
  const direction = config.jobDirection;
  const jobDirection = direction
    && config.interviewSource !== "resume"
    && isValidJobDirection(direction)
    && direction.targetRole.trim() === config.role.trim()
    && normalizeSeniority(direction.suggestedSeniority) === normalizeSeniority(config.seniority)
    ? direction
    : undefined;
  return {
    ...reportData,
    ...(locale === "en" ? { locale: "en" } : {}),
    roleContext: buildRoleContext(config),
    ...(jobDirection ? { jobDirection } : {}),
  };
}
