"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestGermanConversationReport, type GermanConversationReport } from "@/lib/interview/conversation";
import type { ReportState } from "../components/interview-report";

type ReportLine = { speaker: "tuck" | "person"; text: string };

const REPORT_TIMEOUT_MS = 60_000;

/**
 * The written report of a German conversation. Requested once when `active` becomes true (and again on retry), only when
 * the person said something. `onReady` runs once per successful request; the report is then returned for the document.
 */
export function useGermanConversationReport({ active, topic, lines, onReady }: {
  active: boolean;
  topic: string;
  lines: ReportLine[];
  onReady?: (report: GermanConversationReport) => void;
}) {
  const hasPerson = lines.some((line) => line.speaker === "person");
  // Serialized so that a new array with the same content does not start another request.
  const payloadKey = JSON.stringify({ topic, lines });
  const [report, setReport] = useState<GermanConversationReport | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const succeededRef = useRef(false);
  // Read through a ref so a new callback never starts another request.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });

  useEffect(() => {
    if (!active || !hasPerson || succeededRef.current) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(REPORT_TIMEOUT_MS)]);
    requestGermanConversationReport(JSON.parse(payloadKey), signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        succeededRef.current = true;
        onReadyRef.current?.(next);
        setReport(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [active, hasPerson, payloadKey, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((count) => count + 1);
  }, []);

  // A ready report is shown by the document, so its state is "idle" (neither pending nor unavailable).
  const reportState: ReportState = !active || report
    ? { status: "idle" }
    : !hasPerson
      ? { status: "unavailable", message: "Não há falas para analisar." }
      : failed
        ? { status: "unavailable", message: "Não foi possível gerar o relatório agora." }
        : { status: "pending" };

  return { reportState, report, retry };
}
