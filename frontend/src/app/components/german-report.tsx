"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useLocale } from "@/lib/locale";
import { requestGermanConversationReport, type GermanConversationReport } from "@/lib/interview/conversation";
import "./german-report.css";

type ReportLine = { speaker: "tuck" | "person"; text: string };
type ReportStatus = "loading" | "error" | "done";

const REPORT_TIMEOUT_MS = 60_000;

/**
 * The written report at the end of a German conversation: a short summary, corrections, useful words and phrases to
 * practise. Requested once on mount (and on retry) only when the person said something; otherwise it renders nothing.
 */
export function GermanReport({ topic, lines, onReady }: { topic: string; lines: ReportLine[]; onReady?: (report: GermanConversationReport) => void }) {
  const { t } = useLocale();
  const hasPerson = lines.some((line) => line.speaker === "person");
  // Serialized so that a new array with the same content does not start another request.
  const payloadKey = JSON.stringify({ topic, lines });
  const [status, setStatus] = useState<ReportStatus>("loading");
  const [report, setReport] = useState<GermanConversationReport | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Read through a ref so a new callback never starts another request.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });

  useEffect(() => {
    if (!hasPerson) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(REPORT_TIMEOUT_MS)]);
    requestGermanConversationReport(JSON.parse(payloadKey), signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        onReadyRef.current?.(next);
        setReport(next);
        setStatus("done");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [payloadKey, hasPerson, attempt]);

  if (!hasPerson) return null;

  function retry() {
    setStatus("loading");
    setAttempt((count) => count + 1);
  }

  return (
    <section className="gr-root" aria-label={t("Relatório da conversa")} aria-busy={status === "loading" || undefined}>
      {status === "loading" && (
        <p className="gr-status">
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          {t("Preparando seu relatório…")}
        </p>
      )}

      {status === "error" && (
        <div className="gr-status">
          <p>{t("Não foi possível gerar o relatório agora.")}</p>
          <button type="button" className="ds-btn ds-btn-quiet min-h-11" onClick={retry}>{t("Tentar de novo")}</button>
        </div>
      )}

      {status === "done" && report && <GermanReportView report={report} />}
    </section>
  );
}

/** The report itself, also shown when a saved German conversation is opened from the history. */
export function GermanReportView({ report }: { report: GermanConversationReport }) {
  const { t } = useLocale();
  return (
    <>
      <p className="gr-summary">{report.summary}</p>

      {report.corrections.length > 0 && (
        <div className="gr-section">
          <h2 className="ds-label gr-heading">{t("Correções")}</h2>
          <ul className="gr-list">
            {report.corrections.map((item, index) => (
              <li key={index} className="gr-item">
                <p className="gr-original">{item.original}</p>
                <p className="gr-corrected"><span aria-hidden="true">→ </span>{item.corrected}</p>
                <p className="gr-muted">{item.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.vocabulary.length > 0 && (
        <div className="gr-section">
          <h2 className="ds-label gr-heading">{t("Palavras da conversa")}</h2>
          <ul className="gr-list">
            {report.vocabulary.map((item, index) => (
              <li key={index} className="gr-item gr-inline">
                <span className="gr-de">{item.de}</span>
                <span className="gr-muted"> — {item.pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.practice.length > 0 && (
        <div className="gr-section">
          <h2 className="ds-label gr-heading">{t("Para praticar em voz alta")}</h2>
          <ul className="gr-list">
            {report.practice.map((item, index) => (
              <li key={index} className="gr-item">
                <p className="gr-de">{item.de}</p>
                <p className="gr-muted">{item.pt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
