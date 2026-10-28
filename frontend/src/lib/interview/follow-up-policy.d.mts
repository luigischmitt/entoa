export const maxFollowUpsPerQuestion: 2;
export const secondFollowUpMinWords: 40;
export function canAskAnotherFollowUp(input: { followUpsAsked: number; lastFollowUpAnswer: string | null; hasTimeAfterNext: boolean }): boolean;
