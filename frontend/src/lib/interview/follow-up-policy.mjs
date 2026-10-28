export const maxFollowUpsPerQuestion = 2;
export const secondFollowUpMinWords = 40;

export function canAskAnotherFollowUp({ followUpsAsked, lastFollowUpAnswer, hasTimeAfterNext }) {
  if (followUpsAsked === 0) return true;
  if (followUpsAsked === 1 && followUpsAsked < maxFollowUpsPerQuestion) {
    const words = typeof lastFollowUpAnswer === "string" ? lastFollowUpAnswer.trim().split(/\s+/u).filter(Boolean).length : 0;
    return words >= secondFollowUpMinWords && hasTimeAfterNext === true;
  }
  return false;
}
