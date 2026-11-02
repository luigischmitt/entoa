/** Match each per-answer finding to its answer, with legacy flat-list fallback. */
import { displayTechnicalFindings } from "./report-presentation.mjs";

export function findingsForAnswer(result, sequenceNumber) {
  const turn = result.turns?.find((item) => item.sequenceNumber === sequenceNumber);
  const technical = displayTechnicalFindings(
    turn?.technicalStrengths ?? result.technicalContent.strengths.filter((item) => item.sequenceNumber === sequenceNumber),
    turn?.technicalGaps ?? result.technicalContent.gaps.filter((item) => item.sequenceNumber === sequenceNumber),
  );
  return {
    strengths: technical.strengths,
    gaps: technical.gaps,
    patterns: turn?.englishPatterns ?? result.englishCommunication.patterns.filter((item) => item.sequenceNumber === sequenceNumber),
  };
}

export function summarizeDelivery(delivery) {
  if (!delivery) return null;
  const pauses = delivery.pauseCount ?? 0;
  const hasLongPause = delivery.longestPauseMs >= 1_000;
  const hints = [];
  if (delivery.wordsPerMinute < 95) hints.push("O ritmo ficou mais pausado do que o habitual.");
  if (delivery.wordsPerMinute > 170) hints.push("O ritmo ficou acelerado; pequenas pausas podem ajudar.");
  if (pauses > 2 && hasLongPause) hints.push("Algumas pausas longas podem interromper a linha de raciocínio.");
  if (delivery.fillerCount > 4) hints.push("Vale observar se as hesitações se repetem.");
  return { wordsPerMinute: Number.isFinite(delivery.wordsPerMinute) ? Math.round(delivery.wordsPerMinute) : null, pauseCount: pauses, longestPauseMs: delivery.longestPauseMs ?? 0, fillerCount: delivery.fillerCount ?? 0, hint: hints[0] ?? null };
}
