"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { PageIntro } from "./shared";
import { SlidingSegmented } from "@/components/ui/sliding-segmented";
import { defaultInterviewConfig } from "../interview-config";
import { prewarmInterviewerUtterance } from "../hooks/use-speech-playback";
import { useLocale } from "@/lib/locale";
import type { InterviewConfig } from "@/lib/interview/types";
import type { ConversationPlanInput } from "@/lib/interview/conversation-policy.mjs";
import { requestConversationPlan } from "@/lib/interview/conversation";
import { pickConversationTopic, readRecentTopicIds, rememberConversationTopic, topicToConversationPlan } from "@/lib/interview/conversation-topics.mjs";
import { unlockSharedAudio } from "@/lib/interview/audio-unlock.mjs";
import { storeRoomHandoff } from "@/lib/interview/room-handoff.mjs";
import { readStoredMicrophoneDeviceId } from "@/lib/interview/mic-device.mjs";
import { readStoredInterviewerCharacter } from "@/lib/interview/interviewer-character-preference.mjs";
import { readStoredInterviewerVoice } from "@/lib/interview/voice-picker.mjs";
import { readStoredInterviewerSpeechSpeed } from "@/lib/interview/interviewer-speech-speed.mjs";

const subscribeNever = () => () => {};
const durationOptions = [
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
];

/** Free conversation setup: a typed topic is planned by Tuck first; a random topic starts at once from the bank. */
export function FreeModeSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const mountedRef = useRef(false);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("5");
  const [preparing, setPreparing] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [startError, setStartError] = useState(false);

  // Preferences as the interview setup reads them (a per-browser choice, saved for the next session).
  const storedMicrophoneId = useSyncExternalStore(subscribeNever, () => readStoredMicrophoneDeviceId(window.localStorage), () => null);
  const voice = useSyncExternalStore(subscribeNever, () => readStoredInterviewerVoice(window.localStorage), () => defaultInterviewConfig.voice ?? "");
  const speechSpeed = useSyncExternalStore(subscribeNever, () => readStoredInterviewerSpeechSpeed(window.localStorage), () => defaultInterviewConfig.speechSpeed ?? 1);
  const showCharacter = useSyncExternalStore(subscribeNever, () => readStoredInterviewerCharacter(window.localStorage), () => true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Runs inside the click: the audio elements are unlocked before any request is awaited.
  const startConversation = (plan: ConversationPlanInput) => {
    const config: InterviewConfig = {
      ...defaultInterviewConfig,
      role: "Modo livre",
      seniority: "mid-level",
      focus: "mixed",
      duration,
      questionCount: null,
      voice,
      speechSpeed,
      showInterviewerCharacter: showCharacter,
      microphoneDeviceId: storedMicrophoneId,
      mode: "conversation",
      conversationPlan: plan,
    };
    if (config.playInterviewerAudio) prewarmInterviewerUtterance(plan.opening, voice, speechSpeed);
    if (storeRoomHandoff(window.sessionStorage, config)) router.push("/interview");
    else { setStartError(true); setPreparing(false); }
  };

  const startRandom = () => {
    unlockSharedAudio(true);
    const picked = pickConversationTopic({ recentIds: readRecentTopicIds(window.localStorage) });
    if (!picked) { setPlanError("Não foi possível escolher um tema agora. Digite um tema para começar."); return; }
    rememberConversationTopic(window.localStorage, picked.id);
    startConversation(topicToConversationPlan(picked));
  };

  const startTyped = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = topic.trim();
    if (!text || preparing) return;
    unlockSharedAudio(true);
    setPreparing(true);
    setPlanError(null);
    try {
      const plan = await requestConversationPlan(text, AbortSignal.timeout(20_000));
      if (mountedRef.current) startConversation(plan);
    } catch {
      if (!mountedRef.current) return;
      setPlanError("Não consegui preparar essa conversa agora. Tente de novo ou escolha um tema aleatório.");
      setPreparing(false);
    }
  };

  return (
    <main id="main-content" className="mx-auto w-full min-w-0 max-w-2xl px-4 pb-[calc(var(--shl-bottom-nav-h,0px)+2rem)] pt-6 sm:px-8 sm:pt-8 lg:pb-16 lg:pt-10">
      <PageIntro
        title={t("Modo livre")}
        description={t("Escolha um tema e converse em inglês com o Tuck, sem roteiro de entrevista.")}
      />
      <form onSubmit={startTyped} className="ds-card mt-8 flex flex-col gap-6 p-5 sm:p-7" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="free-mode-topic" className="sr-only">{t("Sobre o que você quer conversar?")}</label>
          <input
            id="free-mode-topic"
            type="text"
            className="ds-field w-full"
            value={topic}
            maxLength={200}
            placeholder={t("Sobre o que você quer conversar?")}
            autoComplete="off"
            disabled={preparing}
            onChange={(event) => setTopic(event.target.value)}
          />
        </div>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="ds-label mb-2">{t("Duração")}</legend>
          <SlidingSegmented
            name="free-mode-duration"
            ariaLabel={t("Duração")}
            className="grid-cols-3"
            itemClassName="min-h-11"
            options={durationOptions}
            value={duration}
            onChange={setDuration}
          />
        </fieldset>

        {planError && <p role="alert" className="text-sm font-medium text-danger">{t(planError)}</p>}
        {startError && <p role="alert" className="alert alert-warning text-sm">{t("Não foi possível abrir a sala de conversa neste navegador. Libere o armazenamento do site e tente novamente.")}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="ds-btn ds-btn-soft sm:w-auto" onClick={startRandom} disabled={preparing}>
            {t("Tema aleatório")}
          </button>
          <button type="submit" className="ds-btn ds-btn-cta-green sm:w-auto" disabled={!topic.trim() || preparing} aria-busy={preparing || undefined}>
            {preparing && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
            {preparing ? t("Preparando a conversa…") : t("Começar conversa")}
          </button>
        </div>
      </form>
    </main>
  );
}
