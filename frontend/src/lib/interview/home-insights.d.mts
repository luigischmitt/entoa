import type { ProgressRecord } from "./progress-insights.mjs";

export type HomeInsights = {
  /** Completed interviews only (records without a mode count as interviews). */
  interviewCount: number;
  /** Completed free conversations. */
  conversationCount: number;
  /** Every completed practice: interviews and conversations. */
  practiceCount: number;
  lastInterviewAt: string | null;
  lastReportReady: boolean;
  lastTakeaway: string | null;
  lastInterviewId: string | null;
  lastPriority: string | null;
  topPattern: { type: string | null; suggestion: string } | null;
};

export function buildHomeInsights(records: ProgressRecord[] | unknown): HomeInsights;
