import { pinnedOpenRouterFetch } from "./thinking/openrouter-routing.js";
import cors from "cors";
import express from "express";

import { resolveAccessTokenVerifier } from "./auth/resolve-verifier.js";
import type { AccessTokenVerifier } from "./auth/access-token-verifier.js";
import { requireAccessToken } from "./middlewares/require-access-token.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found-handler.js";
import { getAllowedOrigins, isOriginAllowed } from "./middlewares/allowed-origins.js";
import { createApiRouter } from "./routes/index.js";
import { loadSpeechConfig, type SpeechConfig } from "./speech/config.js";
import { createSpeechProvider } from "./speech/create-speech-provider.js";
import type { SpeechProvider } from "./speech/types.js";
import { loadThinkingConfig, type ThinkingConfig } from "./thinking/config.js";
import { createThinkingService } from "./thinking/openrouter-thinking-service.js";
import { createOrchestrationService } from "./thinking/openrouter-orchestration-service.js";
import { bindLogContext, bindLogUser } from "./logging/structured-logging.js";
import { createInterviewReportService } from "./thinking/openrouter-interview-report-service.js";
import { createJobDirectionService } from "./thinking/openrouter-job-direction-service.js";
import { createResumeDirectionService } from "./thinking/openrouter-resume-direction-service.js";
import { OpenRouterPolishedAnswerService, type PolishedAnswerService } from "./thinking/polished-answer-service.js";
import { JobDirectionUserLimit } from "./thinking/job-direction-user-limit.js";
import type { InterviewOrchestrationService, InterviewReportService, JobDirectionService, ResumeDirectionService, ThinkingService } from "./thinking/types.js";
import { createClosingReactionService, type ClosingReactionService } from "./thinking/closing-reaction-service.js";
import { createShortReplyService, type ShortReplyService } from "./thinking/short-reply-service.js";
import { createConversationTurnService, type ConversationTurnService } from "./thinking/conversation-turn-service.js";
import { createConversationPlanService, type ConversationPlanService } from "./thinking/conversation-plan-service.js";
import { createGermanConversationPlanService, createGermanConversationTurnService, type GermanConversationPlanService, type GermanConversationTurnService } from "./thinking/german-conversation-service.js";
import { createRedoCheckService, type RedoCheckService } from "./thinking/redo-check-service.js";
import { SpeculativeTurnAnalysisService } from "./thinking/speculative-turn-analysis-service.js";
import { FollowUpWriter } from "./thinking/follow-up-writer.js";
import { loadTranscriptionConfig, type TranscriptionConfig } from "./transcription/config.js";
import { createTranscriptionService } from "./transcription/create-transcription-service.js";
import { createPronunciationAssessmentService } from "./transcription/create-pronunciation-assessment-service.js";
import type { TranscriptionService } from "./transcription/types.js";
import { AdminUsageService } from "./admin/usage-service.js";
import type { PronunciationAssessmentService } from "./transcription/azure-pronunciation-assessment.js";
import { PracticeDailyLimit } from "./routes/voice.routes.js";
import { loadAuthConfig } from "./auth/config.js";
import { createSupabaseReportPersistence, createPersistedInterviewReportService, type ReportPersistence } from "./thinking/persisted-interview-report.js";

/** Speculative analysis deadline; the call is off the critical path, so it gets 7 s unless SPECULATIVE_ANALYSIS_TIMEOUT_MS overrides it. */
/**
 * The live answer analysis needs speed above all (it must finish while the candidate still talks). Measured on 2026-10-27
 * with real interview snapshots: gemma-4-26b answered in ~1.6 s and wrote follow-up bridges; mistral-small-3.2 took 6-9 s
 * and hit the 7 s timeout. `INTERVIEW_SPECULATIVE_MODEL` overrides it without a deploy.
 */
export const defaultSpeculativeAnalysisModel = "google/gemma-4-26b-a4b-it";
function speculativeAnalysisModel(): string {
  return process.env.INTERVIEW_SPECULATIVE_MODEL?.trim() || defaultSpeculativeAnalysisModel;
}

function speculativeAnalysisTimeoutMs(): number {
  const value = Number(process.env.SPECULATIVE_ANALYSIS_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 1_000 && value <= 30_000 ? Math.round(value) : 7_000;
}

/** Resolved once at import so a missing SUPABASE_URL fails startup; null when BACKEND_AUTH_REQUIRED=false. */
export const defaultAccessTokenVerifier = resolveAccessTokenVerifier();
export const defaultTranscriptionConfig = loadTranscriptionConfig();
export const defaultTranscriptionService = createTranscriptionService(defaultTranscriptionConfig);
export const defaultPronunciationAssessmentService = createPronunciationAssessmentService(defaultTranscriptionConfig);

type AppDependencies = {
  speechConfig?: SpeechConfig;
  speechProvider?: SpeechProvider;
  transcriptionConfig?: TranscriptionConfig;
  transcriptionService?: TranscriptionService;
  thinkingConfig?: ThinkingConfig;
  thinkingService?: ThinkingService | null;
  orchestrationService?: InterviewOrchestrationService;
  reportService?: InterviewReportService | null;
  jobDirectionService?: JobDirectionService | null;
  resumeDirectionService?: ResumeDirectionService | null;
  jobDirectionUserLimit?: JobDirectionUserLimit;
  closingReactionService?: ClosingReactionService | null;
  shortReplyService?: ShortReplyService | null;
  conversationTurnService?: ConversationTurnService | null;
  conversationPlanService?: ConversationPlanService | null;
  polishedAnswerService?: PolishedAnswerService | null;
  redoCheckService?: RedoCheckService | null;
  adminUsageService?: AdminUsageService;
  adminUserIds?: string;
  /** Omit to use the Azure assessment configuration; pass null to disable voice practice. */
  pronunciationAssessmentService?: PronunciationAssessmentService | null;
  practiceDailyLimit?: PracticeDailyLimit;
  /** Receives content-free Azure voice-practice usage logs (defaults to console.info). */
  practiceLogger?: (line: string) => void;
  /** Omit to use the user's bearer token and the configured Supabase publishable key through RLS. */
  persistedReportPersistence?: ReportPersistence | null;
  /** Omit for the environment default; pass null to disable authentication. */
  accessTokenVerifier?: AccessTokenVerifier | null;
  /** Receives one JSON line per accepted client audio diagnostic (defaults to console.info). */
  clientEventLogger?: (line: string) => void;
  /** Omit to create the German plan service from the thinking config; pass null to disable German conversations. */
  germanConversationPlanService?: GermanConversationPlanService | null;
  /** Omit to create the German turn service from the thinking config; pass null to disable German conversations. */
  germanConversationTurnService?: GermanConversationTurnService | null;
};

export function createApp({ speechConfig, speechProvider, transcriptionConfig, transcriptionService, thinkingConfig, thinkingService, orchestrationService, reportService, jobDirectionService, resumeDirectionService, jobDirectionUserLimit, accessTokenVerifier, clientEventLogger, closingReactionService, shortReplyService, polishedAnswerService, redoCheckService, adminUsageService, adminUserIds, pronunciationAssessmentService, practiceDailyLimit, practiceLogger, persistedReportPersistence, conversationTurnService, conversationPlanService, germanConversationPlanService, germanConversationTurnService }: AppDependencies = {}) {
  const resolvedSpeechConfig = speechConfig ?? loadSpeechConfig();
  const resolvedSpeechProvider = speechProvider ?? createSpeechProvider(resolvedSpeechConfig);
  const resolvedTranscriptionService = transcriptionService
    ?? (transcriptionConfig ? createTranscriptionService(transcriptionConfig) : defaultTranscriptionService);
  const resolvedThinkingConfig = thinkingConfig ?? loadThinkingConfig();
  const resolvedThinkingService = thinkingService === undefined ? createThinkingService(resolvedThinkingConfig) : thinkingService;
  const resolvedOrchestrationService = orchestrationService ?? createOrchestrationService(resolvedThinkingConfig);
  const resolvedReportService = reportService === undefined ? createInterviewReportService(resolvedThinkingConfig) : reportService;
  const authConfig = loadAuthConfig();
  const resolvedPersistedReportPersistence = persistedReportPersistence === undefined
    ? createSupabaseReportPersistence({ supabaseUrl: authConfig.supabaseUrl, publishableKey: authConfig.publishableKey })
    : persistedReportPersistence;
  const persistedReportGenerator = createPersistedInterviewReportService(resolvedReportService, resolvedPersistedReportPersistence);
  const resolvedJobDirectionService = jobDirectionService === undefined ? createJobDirectionService({ ...resolvedThinkingConfig, model: resolvedThinkingConfig.interviewDirectionModel ?? "anthropic/claude-haiku-5.5", timeoutMs: resolvedThinkingConfig.jobDirectionTimeoutMs ?? 25_000 }) : jobDirectionService;
  const resolvedResumeDirectionService = resumeDirectionService === undefined ? createResumeDirectionService({ ...resolvedThinkingConfig, model: resolvedThinkingConfig.interviewDirectionModel ?? "anthropic/claude-haiku-5.5", timeoutMs: resolvedThinkingConfig.resumeDirectionTimeoutMs ?? resolvedThinkingConfig.timeoutMs, hedgeAfterMs: resolvedThinkingConfig.resumeDirectionHedgeAfterMs }) : resumeDirectionService;
  const resolvedJobDirectionUserLimit = jobDirectionUserLimit ?? new JobDirectionUserLimit();
  const speculativeModel = speculativeAnalysisModel();
  const resolvedShortReplyService = shortReplyService === undefined ? createShortReplyService(resolvedThinkingConfig.openRouterApiKey ?? undefined, speculativeModel) : shortReplyService;
  const resolvedConversationTurnService = conversationTurnService === undefined ? createConversationTurnService(resolvedThinkingConfig.openRouterApiKey ?? undefined, speculativeModel) : conversationTurnService;
  // A separate limiter: a conversation plan must not wait behind a job-direction cooldown, or the other way round.
  const resolvedConversationPlanService = conversationPlanService === undefined ? createConversationPlanService(resolvedThinkingConfig.openRouterApiKey ?? undefined, resolvedThinkingConfig.interviewDirectionModel ?? "anthropic/claude-haiku-5.5") : conversationPlanService;
  // German conversations use the same Haiku model as the other conversation services; the allow-list is checked per request.
  const germanConversationModel = resolvedThinkingConfig.interviewDirectionModel ?? "anthropic/claude-haiku-5.5";
  const resolvedGermanConversationPlanService = germanConversationPlanService === undefined ? createGermanConversationPlanService(resolvedThinkingConfig.openRouterApiKey ?? undefined, germanConversationModel) : germanConversationPlanService;
  const resolvedGermanConversationTurnService = germanConversationTurnService === undefined ? createGermanConversationTurnService(resolvedThinkingConfig.openRouterApiKey ?? undefined, germanConversationModel) : germanConversationTurnService;
  const conversationPlanUserLimit = new JobDirectionUserLimit();
  // Only mistral is served by the pinned provider; other models use plain OpenRouter routing.
  const speculativeService = resolvedThinkingConfig.openRouterApiKey ? new SpeculativeTurnAnalysisService({ apiKey: resolvedThinkingConfig.openRouterApiKey, model: speculativeModel, timeoutMs: speculativeAnalysisTimeoutMs() }, speculativeModel.startsWith("mistralai/") ? pinnedOpenRouterFetch : fetch, new FollowUpWriter({ apiKey: resolvedThinkingConfig.openRouterApiKey, model: process.env.INTERVIEW_FOLLOW_UP_MODEL?.trim() || speculativeModel, timeoutMs: speculativeAnalysisTimeoutMs() }, speculativeModel.startsWith("mistralai/") ? pinnedOpenRouterFetch : fetch)) : null;
  const resolvedClosingReactionService = closingReactionService === undefined ? (resolvedThinkingConfig.openRouterApiKey ? createClosingReactionService(resolvedThinkingConfig) : null) : closingReactionService;
  const resolvedPolishedAnswerService = polishedAnswerService === undefined && resolvedThinkingConfig.openRouterApiKey
    ? new OpenRouterPolishedAnswerService({ key: resolvedThinkingConfig.openRouterApiKey, model: resolvedThinkingConfig.model, timeoutMs: 20_000 })
    : polishedAnswerService ?? null;
  const resolvedRedoCheckService = redoCheckService === undefined ? createRedoCheckService(resolvedThinkingConfig) : redoCheckService;
  const resolvedPronunciationAssessmentService = pronunciationAssessmentService === undefined
    ? (transcriptionConfig ? createPronunciationAssessmentService(transcriptionConfig) : defaultPronunciationAssessmentService)
    : pronunciationAssessmentService;
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => callback(null, isOriginAllowed(origin, getAllowedOrigins())),
      exposedHeaders: ["X-Voice-Source"],
    }),
  );
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  const verifier = accessTokenVerifier === undefined ? defaultAccessTokenVerifier : accessTokenVerifier;
  app.use("/api/v1", bindLogContext);
  app.use("/api/v1", requireAccessToken(verifier, (request) => request.method === "GET" && request.path === "/speech/health"));
  app.use("/api/v1", bindLogUser);
  app.use("/api/v1", createApiRouter(resolvedSpeechProvider, resolvedSpeechConfig, resolvedTranscriptionService, resolvedThinkingService, resolvedOrchestrationService, resolvedReportService, resolvedJobDirectionService, resolvedResumeDirectionService, resolvedJobDirectionUserLimit, clientEventLogger, speculativeService, resolvedThinkingConfig.speculativeHandoffEnabled === true, resolvedClosingReactionService, resolvedPolishedAnswerService, resolvedRedoCheckService, adminUsageService, adminUserIds, resolvedPronunciationAssessmentService, practiceDailyLimit, practiceLogger, persistedReportGenerator, resolvedShortReplyService, resolvedConversationTurnService, resolvedConversationPlanService, conversationPlanUserLimit, resolvedGermanConversationPlanService, resolvedGermanConversationTurnService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
