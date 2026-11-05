import { Router } from "express";

import { createThinkingController } from "../controllers/thinking-controller.js";
import { createJobDirectionController } from "../controllers/job-direction-controller.js";
import { createOrchestrationController } from "../controllers/orchestration-controller.js";
import { createInterviewReportConsolidationController, createInterviewReportController, createInterviewReportTurnController } from "../controllers/interview-report-controller.js";
import { createPolishedAnswerController } from "../controllers/polished-answer-controller.js";
import { createSpeculativeTurnController, createSpeculativeTurnStatusController } from "../controllers/speculative-turn-controller.js";
import { createClosingReactionController } from "../controllers/closing-reaction-controller.js";
import { createShortReplyController } from "../controllers/short-reply-controller.js";
import { createConversationLanguagesController, createConversationPlanController, createConversationTurnController } from "../controllers/conversation-controller.js";
import type { GermanConversationPlanService, GermanConversationTurnService } from "../thinking/german-conversation-service.js";
import { createResumeDirectionHandlers } from "../controllers/resume-direction-controller.js";
import type { InterviewerSpeechPrefetcher } from "../speech/interviewer-prefetcher.js";
import { JobDirectionUserLimit } from "../thinking/job-direction-user-limit.js";
import type { ConversationPlanService } from "../thinking/conversation-plan-service.js";
import type { ConversationTurnService } from "../thinking/conversation-turn-service.js";
import type { InterviewOrchestrationService, InterviewReportService, JobDirectionService, ResumeDirectionService, ThinkingService } from "../thinking/types.js";
import type { ClosingReactionService } from "../thinking/closing-reaction-service.js";
import type { ShortReplyService } from "../thinking/short-reply-service.js";
import type { SpeculativeTurnAnalysisService } from "../thinking/speculative-turn-analysis-service.js";
import type { PolishedAnswerService } from "../thinking/polished-answer-service.js";
import { createRedoCheckController } from "../controllers/redo-check-controller.js";
import type { RedoCheckService } from "../thinking/redo-check-service.js";
import type { PersistedReportGenerator } from "../controllers/persisted-interview-report-controller.js";
import { createPersistedInterviewReportController } from "../controllers/persisted-interview-report-controller.js";

export function createThinkingRouter(service: ThinkingService | null, orchestrationService: InterviewOrchestrationService, reportService: InterviewReportService | null, jobDirectionService: JobDirectionService | null, resumeDirectionService: ResumeDirectionService | null, jobDirectionUserLimit: JobDirectionUserLimit, speechPrefetcher: InterviewerSpeechPrefetcher | null = null, speculativeService: SpeculativeTurnAnalysisService | null = null, speculativeEnabled = false, closingReactionService: ClosingReactionService | null = null, polishedAnswerService: PolishedAnswerService | null = null, redoCheckService: RedoCheckService | null = null, persistedReportGenerator: PersistedReportGenerator | null = null, shortReplyService: ShortReplyService | null = null, conversationTurnService: ConversationTurnService | null = null, conversationPlanService: ConversationPlanService | null = null, conversationPlanUserLimit: JobDirectionUserLimit = new JobDirectionUserLimit(), germanConversationPlanService: GermanConversationPlanService | null = null, germanConversationTurnService: GermanConversationTurnService | null = null) {
  const thinkingRouter = Router();
  thinkingRouter.post("/", createThinkingController(service));
  thinkingRouter.post("/job-direction", createJobDirectionController(jobDirectionService, jobDirectionUserLimit));
  thinkingRouter.post("/resume-direction", ...createResumeDirectionHandlers(resumeDirectionService, jobDirectionUserLimit));
  thinkingRouter.post("/next-turn", createOrchestrationController(orchestrationService, speechPrefetcher));
  thinkingRouter.post("/speculative-turn", createSpeculativeTurnController(speculativeService, speculativeEnabled));
  thinkingRouter.get("/speculative-turn/status", createSpeculativeTurnStatusController(speculativeService, speculativeEnabled));
  thinkingRouter.post("/closing-reaction", createClosingReactionController(closingReactionService));
  thinkingRouter.post("/short-reply", createShortReplyController(shortReplyService));
  thinkingRouter.get("/conversation-languages", createConversationLanguagesController());
  thinkingRouter.post("/conversation-turn", createConversationTurnController(conversationTurnService, germanConversationTurnService));
  thinkingRouter.post("/conversation-plan", createConversationPlanController(conversationPlanService, conversationPlanUserLimit, germanConversationPlanService));
  thinkingRouter.post("/report", createInterviewReportController(reportService));
  thinkingRouter.post("/report/interview/:interviewId", createPersistedInterviewReportController(persistedReportGenerator));
  thinkingRouter.post("/report/turn", createInterviewReportTurnController(reportService));
  thinkingRouter.post("/report/consolidate", createInterviewReportConsolidationController(reportService));
  thinkingRouter.post("/polished-answer", createPolishedAnswerController(polishedAnswerService));
  thinkingRouter.post("/redo-check", createRedoCheckController(redoCheckService));
  return thinkingRouter;
}
