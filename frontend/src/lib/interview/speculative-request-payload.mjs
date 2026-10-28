export function speculativeRequestPayload(input) {
  const { threadQuestions, recentFollowUpKinds, ...rest } = input;
  return {
    ...rest,
    ...(threadQuestions?.length ? { threadQuestions } : {}),
    ...(recentFollowUpKinds?.length ? { recentFollowUpKinds } : {}),
  };
}
