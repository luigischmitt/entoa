"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { VoiceAssessmentState } from "@/components/interview/microphone-capture";
import { waitForPendingAssessments } from "@/lib/interview/assessment-report-wait.mjs";
import { conversationAssessmentSamples, hasCandidateSpeech, pendingConversationAssessments } from "@/lib/interview/conversation-report.mjs";
import { requestPersistedInterviewReport } from "@/lib/interview/persisted-report";
import { uploadAnswerClip } from "@/lib/interview/answer-clips";
import { createOnceGate } from "@/lib/interview/session-policy.mjs";
import { summarizeAzureAssessments } from "@/lib/interview/report-metrics.mjs";
import type { InterviewPhase } from "@/lib/interview/types";
import type { ReportState } from "../components/interview-report";

export type ConversationAssessmentEntry = { questionLabel: string; sequenceNumber: number; round?: number; state: VoiceAssessmentState };
export type ConversationReportTurn = { sequenceNumber: number; speaker: "interviewer" | "candidate"; content: string | null };
export type ConversationReportInputs = {
  assessments: Record<string, ConversationAssessmentEntry>;
  turns: ConversationReportTurn[];
  /** Reviewed transcripts still on their way from the server, one per committed answer. */
  pendingReviewed: number;
};

const noSpeechMessage = "Nenhuma fala foi registrada nesta conversa.";
const notSavedMessage = "A conversa não foi salva, por isso a análise não pode ser gerada agora.";
const failedMessage = "A análise desta conversa falhou ou excedeu o tempo limite. As falas registradas continuam disponíveis abaixo.";

/**
 * Builds the report once, when the conversation ends: waits for pending voice assessments and transcript reviews,
 * uploads the answer clips, waits for the saved turns, then asks the backend for the persisted conversation report.
 * Without a saved session there is no fallback: the report is unavailable.
 */
export function useConversationReport({ phase, locale, sessionId, readInputs, waitForSessionId, waitForCompletionSync }: {
  phase: InterviewPhase;
  locale: "pt-BR" | "en";
  sessionId: string | null;
  readInputs: () => ConversationReportInputs;
  waitForSessionId: (timeoutMs?: number) => Promise<string | null>;
  waitForCompletionSync: (timeoutMs?: number) => Promise<boolean>;
}): { reportState: ReportState; answerClipPaths: Record<string, string> } {
  const [reportState, setReportState] = useState<ReportState>({ status: "idle" });
  const [answerClipPaths, setAnswerClipPaths] = useState<Record<string, string>>({});
  const [claimReport] = useState(createOnceGate);
  const uploadedSessionsRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  // The effect reads the latest values without restarting: only the ending phase starts the report.
  const latestRef = useRef({ locale, sessionId, readInputs, waitForSessionId, waitForCompletionSync });
  useEffect(() => { latestRef.current = { locale, sessionId, readInputs, waitForSessionId, waitForCompletionSync }; });
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Clip storage runs beside the report and never blocks it; a failed or slow upload just leaves the clip out.
  const uploadClips = useCallback(async (interviewId: string, entries: Record<string, ConversationAssessmentEntry>) => {
    try {
      const { data: auth } = await getSupabaseBrowserClient().auth.getUser();
      if (!auth.user) return;
      const uploaded = await Promise.all(Object.values(entries).flatMap((entry) => entry.state.status === "available" ? (entry.state.clips ?? []).map(async (clip) => {
        const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4_000));
        return { key: `${entry.sequenceNumber}:${clip.phraseIndex}`, path: await Promise.race([uploadAnswerClip(interviewId, auth.user!.id, entry.sequenceNumber, clip.phraseIndex, clip), timeout]) };
      }) : []));
      if (mountedRef.current) setAnswerClipPaths((paths) => ({ ...paths, ...Object.fromEntries(uploaded.flatMap(({ key, path }) => path ? [[key, path]] : [])) }));
    } catch { /* Clip storage must never block the report. */ }
  }, []);

  useEffect(() => {
    if (phase !== "ending" || !claimReport()) return;
    const startedAt = Date.now();
    const unavailable = (message: string, reason: string) => {
      console.warn("[conversation-report] unavailable", { reason, durationMs: Date.now() - startedAt });
      if (mountedRef.current) setReportState({ status: "unavailable", message });
    };
    void (async () => {
      await waitForPendingAssessments(() => {
        const { assessments, pendingReviewed } = latestRef.current.readInputs();
        return pendingConversationAssessments(assessments) + pendingReviewed;
      });
      const { assessments, turns } = latestRef.current.readInputs();
      if (!hasCandidateSpeech(turns)) return unavailable(noSpeechMessage, "no_candidate_speech");
      const samples = conversationAssessmentSamples(assessments);
      const { locale: currentLocale, sessionId: knownSessionId, waitForSessionId: waitForSaved, waitForCompletionSync: waitForSync } = latestRef.current;
      const savedSessionId = knownSessionId ?? await waitForSaved(2_000);
      if (!savedSessionId) return unavailable(notSavedMessage, "no_session");

      if (!uploadedSessionsRef.current.has(savedSessionId)) {
        uploadedSessionsRef.current.add(savedSessionId);
        void uploadClips(savedSessionId, assessments);
      }

      try {
        if (!await waitForSync(12_000)) throw new Error("Conversation persistence did not finish before report generation.");
        const persisted = await requestPersistedInterviewReport(savedSessionId, summarizeAzureAssessments(samples), currentLocale);
        console.info("[conversation-report] ready", { durationMs: Date.now() - startedAt });
        if (mountedRef.current) setReportState({ status: "ready", result: persisted });
      } catch {
        unavailable(failedMessage, "request_failed_or_timed_out");
      }
    })();
  }, [claimReport, phase, uploadClips]);

  // Until the first result or failure the ending room shows the report as pending.
  const shown: ReportState = phase === "ending" && reportState.status === "idle" ? { status: "pending" } : reportState;
  return { reportState: shown, answerClipPaths };
}
