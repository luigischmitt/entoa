import { describe, expect, it } from "vitest";
import { defaultInterviewTurnAnalysisTimeoutMs, loadThinkingConfig, maxInterviewTurnAnalysisTimeoutMs } from "../src/thinking/config.js";

describe("speculative handoff config", () => {
  it("defaults off and accepts only off or on", () => {
    expect(loadThinkingConfig({}).speculativeHandoffEnabled).toBe(false);
    expect(loadThinkingConfig({ INTERVIEW_SPECULATIVE_HANDOFF: "on" }).speculativeHandoffEnabled).toBe(true);
    expect(() => loadThinkingConfig({ INTERVIEW_SPECULATIVE_HANDOFF: "true" })).toThrow("off or on");
  });
});

describe("per-answer report analysis timeout", () => {
  it("keeps 22 seconds by default and allows slow reasoning analyses up to 45 seconds", () => {
    expect(defaultInterviewTurnAnalysisTimeoutMs).toBe(22_000);
    expect(maxInterviewTurnAnalysisTimeoutMs).toBe(45_000);
  });
});
