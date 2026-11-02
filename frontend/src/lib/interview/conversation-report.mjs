// Pure rules behind the conversation report: which voice recordings count and whether there is anything to analyze.

/** Every recording of a conversation counts (no clarification exclusions, unlike interviews). */
export function conversationAssessmentSamples(entries) {
  return Object.values(entries ?? {}).map(({ state }) => state.status === "available"
    ? { status: "available", durationMs: state.durationMs, scores: state.scores }
    : state.status === "pending" ? { status: "pending" } : { status: "unavailable" });
}

/** Recordings still waiting for their voice assessment. */
export function pendingConversationAssessments(entries) {
  return Object.values(entries ?? {}).filter((entry) => entry.state.status === "pending").length;
}

/** True when the person said at least one non-blank line. */
export function hasCandidateSpeech(turns) {
  return (turns ?? []).some((turn) => turn.speaker === "candidate" && typeof turn.content === "string" && turn.content.trim() !== "");
}
