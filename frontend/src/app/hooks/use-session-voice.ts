"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { resetInterviewVoiceSource } from "@/lib/interview/speech-playback.mjs";
import { prepareInterviewSessionVoice } from "./use-speech-playback";

// Preparation slower than this shortens the breathing room before the opening: the candidate has already waited.
const LONG_PREPARATION_MS = 1_600;
const OPENING_DELAY_MS = 2_200;
const SHORT_OPENING_DELAY_MS = 600;

/**
 * Decides the session's voice once, on mount, before the opening plays. `voiceReady` stays false until the opening's
 * first chunk answered (or the preparation timed out); with audio off it is true at once. `waitForOpeningDelay()` resolves
 * once the opening's breathing room has passed, counted from `voiceReady`.
 */
export function useSessionVoice(audioEnabled: boolean, openingText: string, voice: string | undefined, speed: number) {
  const [voiceReady, setVoiceReady] = useState(!audioEnabled);
  // The opening's settings are the ones of mount: a later speed change must not prepare (or reset the pin) again.
  const openingRef = useRef({ openingText, voice, speed });
  const readyAtRef = useRef<number | null>(audioEnabled ? null : 0);
  const delayMsRef = useRef(OPENING_DELAY_MS);

  useEffect(() => {
    resetInterviewVoiceSource();
    if (!audioEnabled) return;
    let cancelled = false;
    const startedAt = performance.now();
    const { openingText: text, voice: voiceId, speed: speechSpeed } = openingRef.current;
    void prepareInterviewSessionVoice(text, voiceId, speechSpeed).then(() => {
      if (cancelled) return;
      const now = performance.now();
      delayMsRef.current = now - startedAt > LONG_PREPARATION_MS ? SHORT_OPENING_DELAY_MS : OPENING_DELAY_MS;
      readyAtRef.current = now;
      setVoiceReady(true);
    });
    return () => { cancelled = true; };
  }, [audioEnabled]);

  const waitForOpeningDelay = useCallback(async () => {
    const readyAt = readyAtRef.current;
    if (readyAt === null) return;
    const remaining = delayMsRef.current - (performance.now() - readyAt);
    if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }, []);

  return { voiceReady, waitForOpeningDelay };
}
