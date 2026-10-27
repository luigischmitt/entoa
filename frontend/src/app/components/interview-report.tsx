"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { getCurrentLocale, t } from "@/lib/locale";
import { ArrowLeft, ArrowUpRight, Download } from "lucide-react";
import { answerOrdinalForSequence, pairInterviewTurns, type InterviewReportResult } from "@/lib/interview/report";
import type { AzureMetricSummary } from "@/lib/interview/report-metrics.mjs";
import type { InterviewConfig } from "@/lib/interview/types";
import type { ProgressRecord } from "@/lib/interview/progress-insights.mjs";
import { RESUME_PRACTICE_LABEL } from "@/lib/interview/resume-neutral.mjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { findingsForAnswer } from "@/lib/interview/report-response.mjs";
import { analysisCoverageNotice, buildReportDeltas, displayInterviewerTakeaway, displayTechnicalFindings, phonemeTip } from "@/lib/interview/report-presentation.mjs";
import { voiceDeliveryInterpretation } from "@/lib/interview/voice-report-insights.mjs";
import { buildErrorRows, buildJobCoverage, buildPracticePriorities, buildVoiceNotes, formatReportDate, reportFileBase, reportSummaryText, type JobCoverageItem } from "@/lib/interview/report-document.mjs";
import { useReplayReveal } from "@/lib/use-replay-reveal";
import { LoadingMark, LoadingRegion, SkCard } from "@/components/ui/loading-state";
import { AzureVoiceReport } from "./azure-voice-report";
import "./interview-report.css";

/** Joins neighbouring changed words (and the spaces between them) so a correction reads as one mark, like the landing. */
function mergeChanged(parts: Array<{ text: string; changed: boolean }>) {
  const merged: Array<{ text: string; changed: boolean }> = [];
  parts.forEach((part, index) => {
    const bridge = !part.changed && !part.text.trim() && parts[index - 1]?.changed && parts[index + 1]?.changed;
    const changed = part.changed || Boolean(bridge);
    const last = merged.at(-1);
    if (last && last.changed === changed) last.text += part.text;
    else merged.push({ text: part.text, changed });
  });
  return merged;
}

export type ReportState = { status: "idle" | "pending" | "ready" | "unavailable"; result?: InterviewReportResult; message?: string };
type Turns = ReturnType<typeof pairInterviewTurns>;
const reportLoadingSteps = [
  "Revisando a transcrição das suas respostas",
  "Analisando conteúdo técnico",
  "Analisando seu inglês",
  "Juntando os sinais da sua voz",
];
const maxVisibleErrors = 8;
const maxStrengths = 4;
const maxPronunciationWords = 6;
const pronunciationScoreLimit = 70;
/** Answers longer than this are clamped on screen (to four lines) until the reader asks for the full text. */
const longAnswerChars = 280;
const seniorityLabels: Record<string, string> = { junior: "Júnior", "mid-level": "Pleno", senior: "Sênior" };
const jobStatusLabels: Record<JobCoverageItem["status"], string> = {
  shown: "Citado nas respostas",
  partial: "Citado, com lacunas",
  missing: "Ainda não apareceu",
};

const rise = (index: number) => ({ "--i": index }) as CSSProperties;

type ReadyAnswer = { turn: Turns[number]; ordinal: number; findings: ReturnType<typeof findingsForAnswer> };

function CapturedAnswers({ turns }: { turns: Turns }) {
  return <details className="rp-more"><summary>{t("Transcrição completa")}</summary><ol className="rp-transcript">{turns.map((turn, index) => <li key={`${turn.sequenceNumber}-${index}`}><p lang="en"><span className="font-semibold">{t("Pergunta:")}</span> {turn.question}</p><p lang="en" className="mt-2"><span className="font-semibold">{t("Sua resposta:")}</span> {turn.answer}</p></li>)}</ol></details>;
}

/** Antes → depois rows tick in: the row slides in, the arrow points, then the new value lands. */
function DeltaRow({ label, change, index }: { label: string; change?: string; index: number }) {
  const [from, to] = label.split(" → ");
  return (
    <p className="rp-delta ds-item" data-change={change} style={{ "--i": index + 3 } as CSSProperties}>
      {to === undefined ? label : <>{from} <span className="rp-delta-arrow" aria-hidden="true">→</span><span className="sr-only"> → </span> <span className="rp-delta-to">{to}</span></>}
    </p>
  );
}

/** One answer on the paper: the question, the full answer, what worked, what to improve, and a pointer to the error list. */
function ReportAnswer({ answer }: { answer: ReadyAnswer }) {
  const [expanded, setExpanded] = useState(false);
  const { turn, ordinal, findings } = answer;
  const long = turn.answer.length > longAnswerChars;
  const hasNotes = findings.strengths.length > 0 || findings.gaps.length > 0;
  return (
    <div className="rp-answer">
      <p className="rp-psub">{t("Pergunta {n}", { n: ordinal })}</p>
      <p className="rp-answer-question" lang="en">{turn.question}</p>
      <p className="rp-psub">{t("Sua resposta")}</p>
      <p lang="en" className={`rp-answer-text${long && !expanded ? " is-clamped" : ""}`}>{turn.answer}</p>
      {long && (
        <button type="button" className="rp-inline-button rp-noprint" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          {t(expanded ? "Recolher resposta" : "Ver resposta completa")}
        </button>
      )}
      {hasNotes ? (
        <div className="rp-answer-cols">
          {findings.strengths.length > 0 && (
            <div className="rp-answer-col">
              <p className="rp-psub">{t("O que funcionou")}</p>
              {findings.strengths.map((item, index) => <p key={index}>{item.explanation}</p>)}
            </div>
          )}
          {findings.gaps.length > 0 && (
            <div className="rp-answer-col">
              <p className="rp-psub">{t("Como melhorar")}</p>
              {findings.gaps.map((item, index) => <p key={index}>{item.explanation}</p>)}
            </div>
          )}
        </div>
      ) : (
        <p className="rp-pnote">{t("Sem observações de conteúdo nesta resposta.")}</p>
      )}
      {findings.patterns.length > 0 && <p className="rp-pnote">{t("Erros de inglês nesta resposta: {k}", { k: findings.patterns.length })}</p>}
    </div>
  );
}

/** Words the voice analysis flagged as hard (score under the limit), lowest score first, each word once. */
function pronunciationWords(summary: AzureMetricSummary) {
  const words = new Map<string, { word: string; score: number; worstPhoneme: string | null }>();
  for (const answer of summary.answers ?? []) {
    for (const phrase of answer.phrases ?? []) {
      for (const problem of phrase.problemWords ?? []) {
        if (problem.score === null || problem.score >= pronunciationScoreLimit) continue;
        const key = problem.word.toLowerCase();
        const current = words.get(key);
        if (!current || problem.score < current.score) words.set(key, { word: problem.word, score: problem.score, worstPhoneme: problem.worstPhoneme });
      }
    }
  }
  return [...words.values()].sort((a, b) => a.score - b.score).slice(0, maxPronunciationWords);
}

/** Everything the ready report shows, derived once from the result (shared by the paper and the appendix). */
function buildReadyModel(result: InterviewReportResult, turns: Turns, azureSummary: AzureMetricSummary, progressRecords: ProgressRecord[], currentInterviewId: string | undefined, answerCount: number) {
  const reference = (sequenceNumber: number) => answerOrdinalForSequence(turns, sequenceNumber);
  const answers: ReadyAnswer[] = turns.map((turn, index) => ({
    turn,
    ordinal: reference(turn.sequenceNumber) ?? index + 1,
    findings: findingsForAnswer(result, turn.sequenceNumber),
  }));
  const allPatterns = answers.flatMap((answer) => answer.findings.patterns);
  const initialTakeaway = displayInterviewerTakeaway(result.interviewerTakeaway);
  const technical = displayTechnicalFindings(result.technicalContent.strengths, result.technicalContent.gaps, initialTakeaway.concern ? [{ explanation: initialTakeaway.concern }] : []);
  return {
    reference,
    summary: reportSummaryText(result),
    coverageNotice: analysisCoverageNotice(result.analysisCoverage, reference),
    strengths: technical.strengths.slice(0, maxStrengths),
    answers,
    errorRows: buildErrorRows(allPatterns),
    voiceNotes: buildVoiceNotes(azureSummary),
    voiceFacts: voiceDeliveryInterpretation(azureSummary.answers ?? []),
    pronunciation: pronunciationWords(azureSummary),
    priorities: buildPracticePriorities(result),
    deltas: buildReportDeltas(result, azureSummary, progressRecords, currentInterviewId, answerCount),
  };
}

type ReadyModel = ReturnType<typeof buildReadyModel>;

function refLabel(sequenceNumber: number | null | undefined) {
  return sequenceNumber === null || sequenceNumber === undefined ? null : `${t("Resposta ")}${sequenceNumber}`;
}

/** The document itself: the whole report, in the order it prints. */
function ReadyDocument({ model, jobItems, dateLabel, turnsLoading }: { model: ReadyModel; jobItems: JobCoverageItem[]; dateLabel: string; turnsLoading: boolean }) {
  const [showAllErrors, setShowAllErrors] = useState(false);
  const { reference, errorRows, voiceFacts, pronunciation } = model;
  const hasVoice = model.voiceNotes.some((note) => note.value !== null);
  return (
    <>
      {(model.summary || model.coverageNotice) && (
        <section className="rp-pblock ds-item" style={rise(0)}>
          <h2 className="rp-ph">{t("Resumo da entrevista")}</h2>
          {model.summary && <p className="rp-psummary">{model.summary}</p>}
          {model.coverageNotice && <p className="rp-pnote">{t(model.coverageNotice)}</p>}
        </section>
      )}
      {model.strengths.length > 0 && (
        <section className="rp-pblock ds-item" style={rise(1)}>
          <h2 className="rp-ph">{t("O que funcionou")}</h2>
          <ul className="rp-good">
            {model.strengths.map((item, index) => <li key={index}>{item.explanation}</li>)}
          </ul>
        </section>
      )}
      {jobItems.length > 0 && (
        <section className="rp-pblock ds-item" style={rise(2)}>
          <h2 className="rp-ph">{t("Ligado à vaga")}</h2>
          <ul className="rp-job">
            {jobItems.map((item) => (
              <li key={item.competency} data-status={item.status}>
                <b>{item.competency}</b>
                <span>{t(jobStatusLabels[item.status])}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rp-pblock rp-pblock-long ds-item" style={rise(3)}>
        <h2 className="rp-ph">{t("Seus erros")}</h2>
        {errorRows.length > 0 ? (
          <>
            <div className="rp-errh" aria-hidden="true"><span>{t("Você disse")}</span><span>{t("O certo")}</span></div>
            <ul className={`rp-errs${showAllErrors ? " is-all" : ""}`}>
              {errorRows.map((row, index) => {
                const meta = [row.note, refLabel(row.sequenceNumber === undefined ? null : reference(row.sequenceNumber))].filter(Boolean).join(" · ");
                return (
                  <li key={`${row.sequenceNumber}-${index}`} className={index >= maxVisibleErrors ? "rp-extra" : undefined}>
                    <p lang="en" className="rp-said">
                      {mergeChanged(row.said).map((part, partIndex) => part.changed ? <s key={partIndex}>{part.text}</s> : <span key={partIndex}>{part.text}</span>)}
                    </p>
                    <p lang="en" className="rp-right">
                      {mergeChanged(row.right).map((part, partIndex) => part.changed ? <u key={partIndex}>{part.text}</u> : <span key={partIndex}>{part.text}</span>)}
                    </p>
                    {meta && <small>{meta}</small>}
                  </li>
                );
              })}
            </ul>
            {errorRows.length > maxVisibleErrors && (
              <button type="button" className="rp-inline-button rp-noprint" aria-expanded={showAllErrors} onClick={() => setShowAllErrors((value) => !value)}>
                {showAllErrors ? t("Ver menos") : t("Ver todos os {n} erros", { n: errorRows.length })}
              </button>
            )}
          </>
        ) : (
          <p className="rp-pnote">{t("Nenhum erro de inglês recorrente apareceu nesta entrevista.")}</p>
        )}
      </section>
      <section className="rp-pblock rp-pblock-long ds-item" style={rise(4)}>
        <h2 className="rp-ph">{t("Resposta por resposta")}</h2>
        {model.answers.length > 0 ? (
          <div className="rp-answers">
            {model.answers.map((answer) => <ReportAnswer key={answer.turn.sequenceNumber} answer={answer} />)}
          </div>
        ) : !turnsLoading ? (
          <p className="rp-pnote">{t("As perguntas e respostas desta entrevista não estão disponíveis.")}</p>
        ) : null}
      </section>
      <section className="rp-pblock ds-item" style={rise(5)}>
        <h2 className="rp-ph">{t("Notas da sua voz")}</h2>
        {hasVoice ? (
          <>
            <ul className="rp-voice">
              {model.voiceNotes.map((note) => (
                <li key={note.key} style={{ "--p": `${note.value ?? 0}%` } as CSSProperties}>
                  <b>{note.value ?? "—"}</b>
                  <span>{t(note.label)}</span>
                  <small>{t(note.measure)}</small>
                </li>
              ))}
            </ul>
            <p className="rp-pnote">{t("De 0 a 100. A análise não avalia sotaque.")}</p>
          </>
        ) : (
          <p className="rp-pnote">{t("Sem sinais de voz suficientes nesta entrevista.")}</p>
        )}
        {voiceFacts && (
          <div className="rp-voice-detail">
            <p className="rp-psub">{t("Ritmo da fala")}</p>
            <p className="rp-vfacts">
              {voiceFacts.wordsPerMinute} {t("palavras/min")} · {voiceFacts.pauseCount} {t("pausas")}
              {voiceFacts.longestPauseMs >= 1_000 ? <> · {t("pausa mais longa de ")}{Math.round(voiceFacts.longestPauseMs / 100) / 10} {t("s")}</> : null}
              {voiceFacts.fillerCount > 0 ? <> · {voiceFacts.fillerCount} {t("hesitações")}</> : null}
            </p>
            <p className="rp-vinsight">{voiceFacts.insights.map((item, index) => <span key={item.key}>{index > 0 ? " " : ""}{t(item.key, item.values)}</span>)}</p>
          </div>
        )}
        {pronunciation.length > 0 && (
          <div className="rp-voice-detail">
            <p className="rp-psub">{t("Palavras para revisar a pronúncia")}</p>
            <ul className="rp-words">
              {pronunciation.map((item) => (
                <li key={item.word}>
                  <b lang="en">{item.word}</b>
                  <span>{t(phonemeTip(item.worstPhoneme, item.word))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      {model.priorities.length > 0 && (
        <section className="rp-pblock ds-item" style={rise(6)}>
          <h2 className="rp-ph">{t("Prioridades para praticar")}</h2>
          <ol className="rp-prio">
            {model.priorities.map((item, index) => {
              const areaText = item.area === "english" ? t("Inglês") : t("Conteúdo técnico");
              return (
                <li key={index}>
                  <b>{item.count !== null ? t(item.title) : item.title}</b>
                  <span>
                    {item.count !== null
                      ? (item.count === 1 ? t("1 vez") : t("{n} vezes", { n: item.count }))
                      : [areaText, refLabel(item.sequenceNumber === null ? null : reference(item.sequenceNumber))].filter(Boolean).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {model.deltas.length > 0 && (
        <section className="rp-pblock ds-item" style={rise(7)}>
          <h2 className="rp-ph">{t("Desde a última entrevista")}</h2>
          {model.deltas.map((delta, index) => <DeltaRow key={delta.label} label={t(delta.label)} change={delta.change} index={index} />)}
        </section>
      )}
      <footer className="rp-pfoot ds-item" style={rise(8)}>
        {t("Entoa · Gerado a partir da sua entrevista simulada de {date}", { date: dateLabel })}
      </footer>
    </>
  );
}

/** Screen-only link below the paper: the paper itself already holds the whole report. */
function ReadyAppendix() {
  return (
    <div className="rp-appendix">
      <a className="ds-btn ds-btn-cta-green rp-voice-link" href="/dashboard?view=voice">{t("Treinar minha voz")}</a>
    </div>
  );
}

/** Opens the browser's print dialog on the paper only; the file name becomes the suggested PDF name. */
function exportPdf(fileBase: string) {
  const root = document.documentElement;
  const previousTitle = document.title;
  const restore = () => {
    document.title = previousTitle;
    root.classList.remove("rp-printing");
  };
  document.title = fileBase;
  root.classList.add("rp-printing");
  window.addEventListener("afterprint", restore, { once: true });
  window.print();
}

export function InterviewReport({ config, elapsed, totalClock, answerCount, persistenceMessage, feedbackSyncMessage, reportState, turns, azureSummary, coverage, onLeave, progressRecords, currentInterviewId, historical = false, onRetry, retrying = false }: {
  config: InterviewConfig; elapsed: string; totalClock: string; answerCount: number; persistenceLabel: string; persistenceMessage: string | null; feedbackSyncMessage: string | null; reportState: ReportState; progressRecords: ProgressRecord[]; currentInterviewId?: string; historical?: boolean; turns: Turns; azureSummary: AzureMetricSummary; coverage: { available: number; pending: number; total: number }; onLeave: () => void; onRetry?: () => void; retrying?: boolean;
}): ReactNode {
  const [loadedTurns, setLoadedTurns] = useState<Turns>(turns);
  const [loadingTurns, setLoadingTurns] = useState(historical && turns.length === 0 && Boolean(currentInterviewId));
  const [loadingStep, setLoadingStep] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  // Sections and their cards rise in once, the first time they are on screen (and again only for genuinely new content).
  useReplayReveal(rootRef, [reportState.status, loadingTurns, loadedTurns.length], { once: true });
  useEffect(() => {
    if (reportState.status !== "pending") return;
    const interval = window.setInterval(() => setLoadingStep((step) => (step + 1) % reportLoadingSteps.length), 3_500);
    return () => window.clearInterval(interval);
  }, [reportState.status]);
  useEffect(() => {
    if (!historical || turns.length || !currentInterviewId) return;
    let active = true;
    void getSupabaseBrowserClient().from("interview_turns").select("sequence_number,speaker,content").eq("interview_id", currentInterviewId).order("sequence_number", { ascending: true }).then(({ data, error }) => {
      if (!active) return;
      if (!error && data) setLoadedTurns(pairInterviewTurns(data.map((item) => ({ sequenceNumber: item.sequence_number, speaker: item.speaker, content: item.content }))));
      setLoadingTurns(false);
    });
    return () => { active = false; };
  }, [historical, turns, currentInterviewId]);
  const reportDirection = reportState.result?.jobDirection ?? config.jobDirection;
  const isResume = config.interviewSource === "resume";
  const role = isResume ? t(RESUME_PRACTICE_LABEL) : config.role;
  // The document date is the record's own date when this interview is in progress history, otherwise today. Computed once per record set.
  const reportDate = useMemo(() => {
    const record = currentInterviewId ? progressRecords.find((item) => item.id === currentInterviewId) : undefined;
    const value = record?.completedAt ?? record?.startedAt ?? record?.createdAt;
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  }, [progressRecords, currentInterviewId]);
  const fileBase = useMemo(() => reportFileBase(role, reportDate), [role, reportDate]);
  const dateLabel = formatReportDate(reportDate, getCurrentLocale() === "en" ? "en" : "pt-BR");
  const seniorityLabel = config.seniority === "staff" ? "Staff / Lead" : seniorityLabels[config.seniority] ? t(seniorityLabels[config.seniority]) : null;
  const focusLabel = config.focus === "technical-depth" ? t("Profundidade técnica")
    : config.focus === "communication" ? t("Comunicação e clareza")
      : config.focus === "behavioral" ? t("Respostas comportamentais")
        : t("Prática equilibrada");
  const duration = historical ? elapsed : `${elapsed} / ${totalClock}`;
  const readyModel = useMemo(
    () => reportState.result ? buildReadyModel(reportState.result, loadedTurns, azureSummary, progressRecords, currentInterviewId, answerCount) : null,
    [reportState.result, loadedTurns, azureSummary, progressRecords, currentInterviewId, answerCount],
  );
  const jobItems = useMemo(
    () => !isResume && reportDirection?.priorityCompetencies?.length && reportState.result
      ? buildJobCoverage(reportDirection.priorityCompetencies, reportState.result.technicalContent.strengths, reportState.result.technicalContent.gaps)
      : [],
    [isResume, reportDirection, reportState.result],
  );
  const readyResult = reportState.status === "ready" ? reportState.result : undefined;
  const ready = readyResult && readyModel ? { model: readyModel } : null;
  return (
    <section ref={rootRef} className="rp-root mx-auto w-full max-w-4xl" aria-labelledby="interview-complete-title">
      {historical && <button type="button" className="ds-btn ds-btn-quiet mb-3" onClick={onLeave}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {getCurrentLocale() === "en" ? "Back to Progress" : t("Voltar ao Progresso")}
        </button>}
      <div className="rp-docbar">
        <span className="rp-file">{fileBase}.pdf</span>
        <button type="button" className="rp-pdf" disabled={reportState.status !== "ready"} onClick={() => exportPdf(fileBase)}>
          <Download width={14} height={14} aria-hidden="true" />
          {t("Exportar PDF")}
        </button>
      </div>
      {persistenceMessage && (
        <div role="status" className="rp-alert mt-5">{t(persistenceMessage)}</div>
      )}
      {feedbackSyncMessage && (
        <div role="status" className="rp-alert mt-4">{t(feedbackSyncMessage)}</div>
      )}
      {loadingTurns && (
        <LoadingRegion label={t("Carregando perguntas e respostas…")} className="mt-4 mb-4 ld-fade">
          <SkCard minHeight="9rem" i={1} lines={3} />
          <SkCard minHeight="9rem" i={3} lines={3} />
        </LoadingRegion>
      )}
      <article className="rp-paper" data-reveal="group" aria-busy={reportState.status === "pending" || loadingTurns}>
        <header className="rp-ptop">
          <div className="rp-brand"><Image src="/landing/tucano-mark.webp" width={18} height={21} alt="" unoptimized /><span>Entoa</span></div>
          <span>{t("Relatório de entrevista")} · {dateLabel}</span>
        </header>
        <div className="rp-cover">
          <h1 id="interview-complete-title" className="rp-ptitle">{role}{seniorityLabel && !isResume ? ` · ${seniorityLabel}` : ""}</h1>
          <dl className="rp-pfacts">
            <div><dt>{t("Foco")}</dt><dd>{focusLabel}</dd></div>
            <div><dt>{t("Duração")}</dt><dd className="tabular-nums">{duration}</dd></div>
            <div><dt>{t("Respostas")}</dt><dd>{answerCount}</dd></div>
          </dl>
        </div>
        {reportState.status === "pending" ? (
          <div className="rp-pending-wrap ld-fade">
            <div className="ds-card rp-card rp-pending" role="status" aria-live="polite">
              <p className="rp-loading-step"><LoadingMark /><span key={loadingStep}>{t(reportLoadingSteps[loadingStep])}…</span></p>
              <p className="rp-hint mt-2">{t("Você pode sair. O relatório continua sendo preparado; volte ao Progresso para ver o resultado.")}</p>
              {onRetry && <button type="button" className="btn ds-btn ds-btn-soft mt-4" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
                {retrying && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
                {t(retrying ? "Gerando relatório…" : "Tentar gerar novamente")}
              </button>}
            </div>
            <div className="ld-grid-3" aria-hidden="true">
              <SkCard minHeight="8rem" i={1} lines={2} />
              <SkCard minHeight="8rem" i={3} lines={2} />
              <SkCard minHeight="8rem" i={5} lines={2} />
            </div>
            <SkCard minHeight="11rem" i={6} lines={4} />
          </div>
        ) : reportState.status === "unavailable" ? (
          <div className="rp-stack">
            <div role="status" className="rp-alert">
              <h2 className="ds-label">
                {t(loadedTurns.length ? (reportState.message ?? "O relatório continua indisponível. Tente novamente em instantes.") : "Não há respostas para analisar.")}
              </h2>
              {loadedTurns.length > 0 && <p className="mt-1 text-sm leading-6">{t("Os sinais vocais disponíveis continuam abaixo.")}</p>}
              {loadedTurns.length > 0 && onRetry && (
                <button type="button" className="btn ds-btn ds-btn-soft mt-4" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
                  {retrying && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
                  {t(retrying ? "Gerando relatório…" : "Tentar gerar novamente")}
                </button>
              )}
            </div>
            {loadedTurns.length > 0 && <CapturedAnswers turns={loadedTurns} />}
            <AzureVoiceReport summary={azureSummary} coverage={coverage} />
          </div>
        ) : ready ? (
          <ReadyDocument model={ready.model} jobItems={jobItems} dateLabel={dateLabel} turnsLoading={loadingTurns} />
        ) : null}
      </article>
      {ready && <ReadyAppendix />}
      <div className="rp-foot">
        <button type="button" className={`ds-btn ${reportState.status === "pending" ? "ds-btn-quiet" : "ds-btn-cta-green"} rp-back`} onClick={onLeave}>{t(historical ? "Voltar ao Progresso " : "Voltar ao dashboard ")}
          <ArrowUpRight className="ds-arrow size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
