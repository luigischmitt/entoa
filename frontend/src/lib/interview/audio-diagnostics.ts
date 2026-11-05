import { authorizedFetch } from "@/lib/auth/backend-auth";

import { getActiveInterviewId } from "./active-interview.mjs";
import { createDiagnosticsReporter } from "./client-diagnostics.mjs";
import { detectInAppBrowser, readAudioSessionType } from "./client-environment.mjs";

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type AudioDiagnosticEvent = { kind: string; [field: string]: unknown };

const reporter = createDiagnosticsReporter({
  send: (events: object[]) => authorizedFetch(`${backendBaseUrl}/api/v1/client-events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(events),
    keepalive: true,
  }),
});

// Latest microphone state, merged into every event so a playback line says whether the mic was open at the time.
const micState: { micActive?: boolean; micContextState?: string } = {};

/** Fire-and-forget, content-free; safe to pass as an `onDiagnostic` callback. */
export const reportAudioDiagnostic = (event: AudioDiagnosticEvent) => {
  try {
    const inApp = event.kind === "mic_error" || event.kind === "unlock" ? { inAppBrowser: detectInAppBrowser(typeof navigator === "undefined" ? "" : navigator.userAgent) ?? "none" } : {};
    reporter.report({ ...micState, audioSessionType: readAudioSessionType(), ...inApp, interviewId: getActiveInterviewId(), ...event });
  } catch { /* Diagnostics never throw. */ }
};

/** `onDiagnostic` for the microphone engine: tracks the mic state, then reports. */
export const reportMicDiagnostic = (event: AudioDiagnosticEvent) => {
  if (typeof event.micActive === "boolean") micState.micActive = event.micActive;
  if (typeof event.micContextState === "string") micState.micContextState = event.micContextState;
  if (event.kind === "mic_close") micState.micContextState = undefined;
  reportAudioDiagnostic(event);
};

export const flushAudioDiagnostics = () => reporter.flush();

export type InterviewLifecycleEvent = {
  interviewId?: string;
  lifecycleOutcome: "created" | "existing" | "failed" | "limit_reached" | "completed" | "abandoned";
  lifecycleOrigin?: "new" | "resumed";
};

/** What happened to an interview (created, reused, refused by the trial limit, ended). Content-free. */
export const reportInterviewLifecycle = (event: InterviewLifecycleEvent) => reportAudioDiagnostic({ kind: "interview_lifecycle", ...event });
