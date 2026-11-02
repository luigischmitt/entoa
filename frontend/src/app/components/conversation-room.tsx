"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MicrophoneCapture, type MicControls, type VoiceCaptureState, type VoiceTranscriptionState } from "@/components/interview/microphone-capture";
import { createSpeechFeed, toucanStateFor } from "@/components/interview/toucan/toucan-engine.mjs";
import { AssessmentSocketRegistry } from "@/lib/interview/assessment-socket-registry.mjs";
import { buildConversationTurnRequest, fallbackConversationTurn, isConversationEnd, nextUsedPathIds, shouldReact, type ConversationLine, type ConversationPlanInput } from "@/lib/interview/conversation-policy.mjs";
import { requestConversationTurn } from "@/lib/interview/conversation";
import { conversationAssessmentSamples } from "@/lib/interview/conversation-report.mjs";
import { pairInterviewTurns } from "@/lib/interview/report";
import { buildAzureAnswerRecords, summarizeAzureAssessments } from "@/lib/interview/report-metrics.mjs";
import { replaceCandidateTurnContent } from "@/lib/interview/report-incremental.mjs";
import { renameInterview } from "@/lib/interview/persistence";
import { canSkipVoiceQuestion, finalTranscriptForSubmission } from "@/lib/interview/session-policy.mjs";
import { resolveInterviewerSpeechSpeed, storeInterviewerSpeechSpeed } from "@/lib/interview/interviewer-speech-speed.mjs";
import { resolveInterviewerCaption, splitInterviewerSpeech } from "@/lib/interview/speech-playback.mjs";
import { CONVERSATION_REACTIONS } from "@/lib/interview/static-reactions.mjs";
import type { ProgressRecord } from "@/lib/interview/progress-insights.mjs";
import type { InterviewConfig, InterviewPhase } from "@/lib/interview/types";
import { useLocale } from "@/lib/locale";
import { useInterviewPersistence } from "../hooks/use-interview-persistence";
import { useConversationReport, type ConversationAssessmentEntry } from "../hooks/use-conversation-report";
import { useInterviewSession } from "../hooks/use-interview-session";
import { useMicEngine } from "../hooks/use-mic-engine";
import { createInterviewerAcknowledgements, prewarmInterviewerUtterance, useSpeechPlayback, useSpeechWarmup } from "../hooks/use-speech-playback";
import { CallDock, CandidateTile, InterviewerTile, Toast, useCandidateCamera, useMicLevelMeter } from "./call-stage";
import { InterviewReport } from "./interview-report";
import "./interview-room.css";

type ConversationTurn = { sequenceNumber: number; speaker: "interviewer" | "candidate"; content: string | null };
type AssessmentEntry = ConversationAssessmentEntry;
const noProgressRecords: ProgressRecord[] = [];

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

/**
 * Free conversation with Tuck. Sequence numbers follow the interview room: Tuck's line N, the person's answer N+1,
 * Tuck's next line N+2. The room is never resumed: interview-client drops stored conversation checkpoints.
 */
export function ConversationRoom({ config, plan, onLeave }: { config: InterviewConfig; plan: ConversationPlanInput; onLeave: () => void }) {
  const { t, locale } = useLocale();
  useSpeechWarmup();
  const durationMinutes = Math.max(5, Number.parseInt(config.duration, 10) || 5);
  const [phase, setPhaseState] = useState<InterviewPhase>("introducing");
  const phaseRef = useRef<InterviewPhase>("introducing");
  const setPhase = useCallback((next: InterviewPhase) => { phaseRef.current = next; setPhaseState(next); }, []);
  const [sequence, setSequence] = useState(1);
  const sequenceRef = useRef(1);
  const [tuckLine, setTuckLine] = useState(plan.opening);
  const [lines, setLines] = useState<ConversationLine[]>(() => [{ speaker: "tuck", text: plan.opening }]);
  const linesRef = useRef(lines);
  const [turns, setTurns] = useState<ConversationTurn[]>(() => [{ sequenceNumber: 1, speaker: "interviewer", content: plan.opening }]);
  const turnsRef = useRef(turns);
  const usedPathIdsRef = useRef<string[]>([]);
  const leftRef = useRef(false);
  const submittingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const secondsRef = useRef(0);
  const [autoCaptureKey, setAutoCaptureKey] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [voiceTranscription, setVoiceTranscription] = useState<VoiceTranscriptionState>({ status: "idle" });
  const [voiceCaptureState, setVoiceCaptureState] = useState<VoiceCaptureState>("idle");
  // Kept like the interview room does: the report of a conversation reads these.
  const [voiceAssessments, setVoiceAssessments] = useState<Record<string, AssessmentEntry>>({});
  const voiceAssessmentsRef = useRef(voiceAssessments);
  useEffect(() => { voiceAssessmentsRef.current = voiceAssessments; }, [voiceAssessments]);
  // Answers still waiting for their reviewed transcript (one per Tuck line), and the reviews already received.
  const pendingReviewedRef = useRef(new Set<number>());
  const reviewedSequencesRef = useRef(new Set<number>());
  const reviewedAttemptsRef = useRef(new Set<string>());
  const [assessmentSockets] = useState(() => new AssessmentSocketRegistry());
  const [captionsPreference, setCaptionsPreference] = useState(config.showQuestionCaptions);
  const [speechSpeed, setSpeechSpeed] = useState(() => resolveInterviewerSpeechSpeed(config.speechSpeed ?? 1));
  const changeSpeechSpeed = useCallback((speed: number) => {
    const next = resolveInterviewerSpeechSpeed(speed);
    setSpeechSpeed(next);
    storeInterviewerSpeechSpeed(window.localStorage, next);
  }, []);
  const speechFeed = useMemo(() => createSpeechFeed(), []);
  // The instant static reactions ("Oh, really?") after an answer of two words or more.
  const [acknowledgements] = useState(() => createInterviewerAcknowledgements(speechFeed.push, config.voice, speechSpeed, CONVERSATION_REACTIONS));
  const [initialSpeed] = useState(speechSpeed);
  useEffect(() => { if (initialSpeed === 1) void acknowledgements.preload(); }, [acknowledgements, initialSpeed]);
  // At other speeds they are synthesized, so they wait for the quiet moment after the first line, as in the interview.
  const preloadReactions = useCallback(() => { void acknowledgements.preload(); }, [acknowledgements]);
  const leaveRef = useRef(onLeave);
  useEffect(() => { leaveRef.current = onLeave; });

  const { seconds, remaining, timeLimitReached } = useInterviewSession(phase, durationMinutes);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  const question = useMemo(() => ({ id: `tuck-${sequence}`, prompt: tuckLine, cue: "" }), [sequence, tuckLine]);
  const snapshot = useMemo(() => ({
    activeQuestion: question, currentIndex: 0, questionSequenceNumber: sequence, followUpsAsked: 0,
    threadQuestions: [], recentFollowUpKinds: [], elapsedSeconds: seconds, turns, askedQuestionIds: [],
  }), [question, sequence, seconds, turns]);
  const { sessionId, persistenceMessage, enqueueTurn, abandonSession, waitForSessionId, waitForCompletionSync } = useInterviewPersistence(config, question, sequence, phase, snapshot);
  const updateTurns = (next: ConversationTurn[]) => {
    turnsRef.current = next;
    setTurns(next);
  };
  const record = (turn: ConversationTurn) => {
    updateTurns([...turnsRef.current.filter((item) => item.sequenceNumber !== turn.sequenceNumber), turn].sort((a, b) => a.sequenceNumber - b.sequenceNumber));
    enqueueTurn({ interviewId: "", ...turn });
  };
  const readReportInputs = useCallback(() => ({
    assessments: voiceAssessmentsRef.current,
    turns: turnsRef.current,
    pendingReviewed: pendingReviewedRef.current.size,
  }), []);
  // The report of the whole conversation, built once when it ends (see use-conversation-report).
  const { reportState, answerClipPaths } = useConversationReport({ phase, locale, sessionId, readInputs: readReportInputs, waitForSessionId, waitForCompletionSync });
  const azureSummary = useMemo(() => ({
    ...summarizeAzureAssessments(conversationAssessmentSamples(voiceAssessments)),
    answers: buildAzureAnswerRecords(Object.values(voiceAssessments), answerClipPaths),
  }), [answerClipPaths, voiceAssessments]);

  const { engine: micEngine } = useMicEngine(phase !== "closing" && phase !== "ending", { deviceId: config.microphoneDeviceId ?? null });
  const camera = useCandidateCamera(config.candidateCameraEnabled, phase !== "ending");
  const meter = useMicLevelMeter(phase === "answering");

  // Leaves the conversation without finishing it (dock, back button): the session is marked abandoned.
  const leaveConversation = useCallback(() => {
    leftRef.current = true;
    abortRef.current?.abort();
    acknowledgements.cancel();
    abandonSession();
    leaveRef.current();
  }, [abandonSession, acknowledgements]);
  const ended = phase === "ending";
  useEffect(() => {
    if (ended) return;
    window.history.pushState(window.history.state, "");
    const onPopState = () => {
      window.history.pushState(window.history.state, "");
      leaveConversation();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [ended, leaveConversation]);
  useEffect(() => () => {
    abortRef.current?.abort();
    acknowledgements.cancel();
    assessmentSockets.closeAll();
  }, [acknowledgements, assessmentSockets]);

  // The end control (or the time running out before the person speaks): stop everything, the room shows its ending.
  const endConversation = useCallback(() => {
    if (phaseRef.current === "ending") return;
    leftRef.current = true;
    abortRef.current?.abort();
    acknowledgements.cancel();
    setPhase("ending");
  }, [acknowledgements, setPhase]);

  // Tuck finished a line: a closing line ends the conversation, otherwise the microphone opens for the answer.
  const onTuckSpoken = useCallback(() => {
    const current = phaseRef.current;
    // Also fired when the speech is off or cut short: only a line Tuck was saying moves the conversation on.
    if (current !== "introducing" && current !== "speaking" && current !== "closing") return;
    if (current === "closing" || secondsRef.current >= durationMinutes * 60) { endConversation(); return; }
    setVoiceCaptureState("idle");
    setAutoCaptureKey(String(sequenceRef.current));
    setPhase("answering");
  }, [durationMinutes, endConversation, setPhase]);
  const waitForReaction = useCallback(() => acknowledgements.beforeQuestion(), [acknowledgements]);
  const isTuckTurn = phase === "introducing" || phase === "speaking" || phase === "closing";
  const speechSegments = useMemo(() => splitInterviewerSpeech(tuckLine), [tuckLine]);
  const { activeSegment, speechMessage, retrySpeech } = useSpeechPlayback(speechSegments, onTuckSpoken, isTuckTurn && config.playInterviewerAudio, undefined, preloadReactions, speechSpeed, speechFeed.push, waitForReaction, config.voice);

  // The time is up while the person is not speaking: the conversation ends now (a spoken answer is always finished first).
  useEffect(() => {
    if (timeLimitReached && phase === "answering" && canSkipVoiceQuestion(voiceCaptureState, voiceTranscription.status)) endConversation();
  }, [endConversation, phase, timeLimitReached, voiceCaptureState, voiceTranscription.status]);

  const submitTurn = async (transcript: string) => {
    submittingRef.current = true;
    const tuckSequence = sequenceRef.current;
    const personLines: ConversationLine[] = [...linesRef.current, { speaker: "person", text: transcript }];
    linesRef.current = personLines;
    setLines(personLines);
    record({ sequenceNumber: tuckSequence + 1, speaker: "candidate", content: transcript });
    // The reviewed transcript may already have arrived; otherwise the report waits for it, as it does for voice assessments.
    if (!reviewedSequencesRef.current.has(tuckSequence)) pendingReviewedRef.current.add(tuckSequence);
    setVoiceTranscription({ status: "idle" });
    setVoiceCaptureState("idle");
    setAnswerError(null);
    setPhase("advancing");
    if (shouldReact(transcript)) acknowledgements.schedule({ shouldPlay: () => !leftRef.current && phaseRef.current === "advancing" });
    const controller = new AbortController();
    abortRef.current = controller;
    const body = buildConversationTurnRequest({ plan, usedPathIds: usedPathIdsRef.current, elapsedSeconds: secondsRef.current, durationMinutes, lines: personLines, transcript });
    const reply = await requestConversationTurn(body, AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]))
      .catch(() => fallbackConversationTurn({ plan, usedPathIds: usedPathIdsRef.current, phase: body.phase }));
    if (leftRef.current) return;
    abortRef.current = null;
    usedPathIdsRef.current = nextUsedPathIds(usedPathIdsRef.current, reply);
    const nextSequence = tuckSequence + 2;
    linesRef.current = [...personLines, { speaker: "tuck", text: reply.say }];
    setLines(linesRef.current);
    sequenceRef.current = nextSequence;
    setSequence(nextSequence);
    setTuckLine(reply.say);
    record({ sequenceNumber: nextSequence, speaker: "interviewer", content: reply.say });
    void prewarmInterviewerUtterance(reply.say, config.voice, speechSpeed);
    submittingRef.current = false;
    setPhase(isConversationEnd(reply) || body.phase === "closing" ? "closing" : "speaking");
  };

  const idle = phase !== "answering";
  const captionsForced = phase === "closing" || !config.playInterviewerAudio || Boolean(speechMessage);
  const showCaption = captionsForced || captionsPreference;
  const caption = resolveInterviewerCaption({
    audioEnabled: config.playInterviewerAudio,
    isSpeaking: isTuckTurn,
    playbackFailed: Boolean(speechMessage),
    activeSegment: activeSegment && speechSegments.includes(activeSegment) ? activeSegment : null,
    firstSegment: speechSegments[0],
    fallbackText: tuckLine,
    questionPrompt: tuckLine,
  });
  const assessmentContext = useMemo(() => ({ questionLabel: tuckLine.slice(0, 180), sequenceNumber: sequence, round: 0 }), [tuckLine, sequence]);
  const progress = Math.min(100, Math.round((seconds / (durationMinutes * 60)) * 100));

  const renderDock = (mic: MicControls) => {
    const micState = mic.isRecording ? "recording" : mic.isPending ? "pending" : mic.errorMessage ? "error" : idle ? "off" : "ready";
    const micLabel = mic.isRecording ? "Concluir resposta"
      : mic.isPending ? "Processando sua resposta"
        : mic.hasAnswer ? "Gravar novamente"
          : mic.errorMessage ? "Tentar gravar novamente" : idle ? "Aguardando sua vez" : "Iniciar gravação";
    return (
      <CallDock
        toasts={<>
          {mic.errorMessage && (
            <Toast tone="error" role="alert" actions={<button type="button" className="mt-toast-btn" onClick={mic.canRetryTranscription ? () => { void mic.retryTranscription(); } : mic.start} disabled={idle}>{t("Tentar novamente")}</button>}>{t(mic.errorMessage)}</Toast>
          )}
          {mic.micNotice && (
            <Toast tone="warn" actions={<button type="button" className="mt-toast-btn" onClick={mic.retry}>{t("Tentar de novo")}</button>}>
              <strong>{t(mic.micNotice === "silent" ? "Não estamos recebendo áudio do seu microfone." : "Ainda não ouvimos sua voz.")}</strong>{" "}
              {t(mic.micNotice === "silent" ? "Confira se o microfone certo está selecionado e se não está mudo." : "Fale normalmente perto do microfone ou tente de novo.")}
            </Toast>
          )}
          {speechMessage && (
            <Toast tone="warn" actions={phase === "answering" && voiceCaptureState === "idle" ? <button type="button" className="mt-toast-btn" onClick={retrySpeech}>{t("Tentar de novo")}</button> : undefined}>{t(speechMessage)}</Toast>
          )}
          {answerError && <Toast tone="error" role="alert" onDismiss={() => setAnswerError(null)}>{t(answerError)}</Toast>}
          {camera.cameraError && <Toast tone="warn" onDismiss={camera.dismissError}>{t(camera.cameraError)}</Toast>}
          {timeLimitReached && phase === "answering" && <Toast>{t("O tempo chegou ao fim. Responda esta fala e a conversa termina.")}</Toast>}
          {persistenceMessage && <Toast>{t(persistenceMessage)}</Toast>}
        </>}
        micState={micState}
        micLabel={t(micLabel)}
        micDisabled={mic.isPending || (!mic.isRecording && (idle || !mic.canStart))}
        recording={mic.isRecording}
        pending={mic.isPending}
        recordingTime={mic.formattedDuration}
        onMic={mic.isRecording ? mic.stop : mic.start}
        onDiscard={mic.discard}
        captionsOn={showCaption}
        captionsForced={captionsForced}
        onCaptions={() => setCaptionsPreference((value) => !value)}
        cameraOn={camera.enabled}
        cameraState={camera.cameraState}
        cameraDisabled={phase === "ending"}
        onCamera={camera.toggle}
        skipDisabled
        hideSkip
        onSkip={() => undefined}
        onEnd={endConversation}
        endLabel="Encerrar conversa"
        speechSpeed={config.playInterviewerAudio ? speechSpeed : null}
        onSpeechSpeed={changeSpeechSpeed}
      />
    );
  };

  /** The conversation is over: the report of the whole conversation, with a way back to the dashboard. */
  function renderEnding() {
    const samples = conversationAssessmentSamples(voiceAssessments);
    return (
      <main id="main-content" className="rm-root mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-8">
        <button type="button" className="ds-btn ds-btn-quiet -ml-3 mb-4 min-h-10 gap-2 px-3 text-sm" onClick={onLeave}>
          <ArrowLeft className="size-4" aria-hidden="true" /> {t("Voltar ao dashboard ")}
        </button>
        <InterviewReport
          config={config}
          elapsed={formatClock(seconds)}
          totalClock={formatClock(durationMinutes * 60)}
          answerCount={turns.filter((turn) => turn.speaker === "candidate" && turn.content?.trim()).length}
          persistenceLabel=""
          persistenceMessage={persistenceMessage}
          feedbackSyncMessage={null}
          reportState={reportState}
          progressRecords={noProgressRecords}
          currentInterviewId={sessionId ?? undefined}
          customTitle={null}
          onRename={sessionId ? (title) => renameInterview(sessionId, title) : undefined}
          turns={pairInterviewTurns(turns)}
          azureSummary={azureSummary}
          coverage={{
            available: samples.filter((entry) => entry.status === "available").length,
            pending: samples.filter((entry) => entry.status === "pending").length,
            total: samples.length,
          }}
          onLeave={onLeave}
        />
      </main>
    );
  }

  if (phase === "ending") return renderEnding();

  return (
    <main id="main-content" className="rm-root mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-8">
      <div className="mt-call" data-over={timeLimitReached ? "true" : undefined}>
        <header className="mt-top">
          <div className="mt-top-title">
            <h1 className="mt-title">{plan.title}</h1>
          </div>
          <div className="mt-top-meta">
            <div className="mt-timer" data-over={timeLimitReached ? "true" : undefined}>
              <strong>{remaining}</strong> <span className="mt-timer-rest">{t("restantes")}</span>
            </div>
          </div>
          <progress className="mt-progress" value={progress} max="100" aria-label={`${progress}% ${t("do tempo planejado")}`} />
        </header>

        <section className="mt-stage" aria-label={t("Participantes da sala")}>
          <CandidateTile
            tileRef={meter.tileRef}
            stream={camera.enabled ? camera.stream : null}
            cameraRequesting={camera.cameraState === "requesting"}
            capturing={voiceCaptureState === "listening" || voiceCaptureState === "detected"}
            detected={voiceCaptureState === "detected"}
          />
          <InterviewerTile
            speaking={isTuckTurn}
            advancing={phase === "advancing"}
            caption={showCaption ? caption : null}
            avatarState={toucanStateFor({ phase, audioPlaying: config.playInterviewerAudio && !speechMessage })}
            showCharacter={config.showInterviewerCharacter !== false}
            speechFeed={speechFeed}
            candidateLevelRef={meter.levelRef}
          />
        </section>

        <MicrophoneCapture
          key={sequence}
          disabled={idle}
          assessmentSockets={assessmentSockets}
          assessmentContext={assessmentContext}
          onLevel={meter.push}
          render={renderDock}
          onTranscriptionChange={(transcription) => {
            setVoiceTranscription(transcription);
            if (transcription.status === "idle" || transcription.status === "available") setAnswerError(null);
            if (transcription.status !== "available" || phaseRef.current !== "answering" || submittingRef.current || leftRef.current) return;
            const transcript = finalTranscriptForSubmission(transcription);
            if (transcript) void submitTurn(transcript);
            else setAnswerError("Não consegui ouvir sua resposta. Tente falar de novo.");
          }}
          onCaptureStateChange={setVoiceCaptureState}
          autoStartSignal={autoCaptureKey === String(sequence) ? autoCaptureKey : null}
          micEngine={micEngine}
          onAssessmentChange={(attemptId, assessment, context) => setVoiceAssessments((current) => ({ ...current, [attemptId]: { ...context, state: assessment } }))}
          onReviewedTranscript={(attemptId, transcript, changed, context) => {
            const sequence = context.sequenceNumber;
            reviewedSequencesRef.current.add(sequence);
            pendingReviewedRef.current.delete(sequence);
            if (reviewedAttemptsRef.current.has(attemptId)) return;
            reviewedAttemptsRef.current.add(attemptId);
            if (!transcript || !changed) return;
            // The reviewed text replaces the answer Tuck's line N led to (sequence N+1), so the report reads the corrected words.
            const candidateSequence = sequence + 1;
            if (!turnsRef.current.some((turn) => turn.sequenceNumber === candidateSequence && turn.speaker === "candidate")) return;
            updateTurns(replaceCandidateTurnContent(turnsRef.current, candidateSequence, transcript));
            enqueueTurn({ interviewId: "", sequenceNumber: candidateSequence, speaker: "candidate", content: transcript });
          }}
        />
      </div>
    </main>
  );
}
