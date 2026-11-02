"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { PageIntro } from "./shared";
import "./interview-setup.css";
import "./free-mode-setup.css";
import { SlidingSegmented } from "@/components/ui/sliding-segmented";
import { defaultInterviewConfig } from "../interview-config";
import { prewarmInterviewerUtterance } from "../hooks/use-speech-playback";
import { useLocale } from "@/lib/locale";
import { startNavigation } from "@/lib/navigation-progress.mjs";
import type { InterviewConfig } from "@/lib/interview/types";
import type { ConversationPlanInput } from "@/lib/interview/conversation-policy.mjs";
import type { ConversationTopic } from "@/lib/interview/conversation-topics.mjs";
import { requestConversationPlan } from "@/lib/interview/conversation";
import { CONVERSATION_TOPICS, pickConversationTopic, readRecentTopicIds, rememberConversationTopic, topicToConversationPlan } from "@/lib/interview/conversation-topics.mjs";
import { unlockSharedAudio } from "@/lib/interview/audio-unlock.mjs";
import { storeRoomHandoff } from "@/lib/interview/room-handoff.mjs";
import { readStoredMicrophoneDeviceId } from "@/lib/interview/mic-device.mjs";
import { readStoredInterviewerCharacter } from "@/lib/interview/interviewer-character-preference.mjs";
import { readStoredInterviewerVoice } from "@/lib/interview/voice-picker.mjs";
import { readStoredInterviewerSpeechSpeed } from "@/lib/interview/interviewer-speech-speed.mjs";

const subscribeNever = () => () => {};
const subscribeMounted = () => () => {};
const getMounted = () => true;
const getServerMounted = () => false;
const SUGGESTION_COUNT = 6;
const durationOptions = [
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
];

/** Six suggestions from six different categories, each pick counted as recent for the next one. Runs only on the client. */
function drawSuggestions(recentIds: string[]): ConversationTopic[] {
  const picked: ConversationTopic[] = [];
  const categories = new Set<string>();
  let recent = recentIds;
  for (let index = 0; index < SUGGESTION_COUNT; index += 1) {
    const available = CONVERSATION_TOPICS.filter((item: ConversationTopic) => !categories.has(item.category));
    const next = pickConversationTopic({ recentIds: recent, topics: available.length > 0 ? available : undefined });
    if (!next) break;
    picked.push(next);
    categories.add(next.category);
    recent = [next.id, ...recent];
  }
  return picked;
}

/**
 * Free conversation setup. The learner types a topic or picks a suggestion (or draws one at random); nothing starts
 * until "Começar conversa". A picked suggestion starts from the bank with no backend call; a typed topic is planned
 * by Tuck first. Suggestions are drawn after mount, so server and first client render match and the area is reserved.
 */
export function FreeModeSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const mountedRef = useRef(false);
  const mounted = useSyncExternalStore(subscribeMounted, getMounted, getServerMounted);
  const [topic, setTopic] = useState("");
  const [bankTopic, setBankTopic] = useState<ConversationTopic | null>(null);
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
    if (config.playInterviewerAudio) prewarmInterviewerUtterance(plan.opening, voice);
    if (storeRoomHandoff(window.sessionStorage, config)) {
      startNavigation();
      router.push("/interview");
    }
    else { setStartError(true); setPreparing(false); }
  };

  // Fills the box with a random topic from the bank; it does not start the conversation.
  const shuffleTopic = () => {
    const picked = pickConversationTopic({ recentIds: readRecentTopicIds(window.localStorage) });
    if (!picked) { setPlanError("Não foi possível sortear um tema agora. Digite um tema para começar."); return; }
    setPlanError(null);
    setTopic(picked.title);
    setBankTopic(picked);
  };

  const startBankTopic = (picked: ConversationTopic) => {
    unlockSharedAudio(true);
    rememberConversationTopic(window.localStorage, picked.id);
    startConversation(topicToConversationPlan(picked));
  };

  const startTyped = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = topic.trim();
    if (!text || preparing) return;
    if (bankTopic && text === bankTopic.title) {
      setPlanError(null);
      startBankTopic(bankTopic);
      return;
    }
    unlockSharedAudio(true);
    setPreparing(true);
    setPlanError(null);
    try {
      const plan = await requestConversationPlan(text, AbortSignal.timeout(20_000));
      if (mountedRef.current) startConversation(plan);
    } catch {
      if (!mountedRef.current) return;
      setPlanError("Não consegui preparar essa conversa agora. Tente de novo ou escolha uma sugestão.");
      setPreparing(false);
    }
  };

  return (
    <main id="main-content" className="mx-auto w-full min-w-0 max-w-5xl px-4 pb-[calc(var(--shl-bottom-nav-h,0px)+2rem)] pt-6 sm:px-8 sm:pt-8 lg:pb-16 lg:pt-10">
      <PageIntro
        title={t("Modo livre")}
        description={t("Converse em inglês com o Tuck sobre o que quiser, sem roteiro de entrevista.")}
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        <form onSubmit={startTyped} className="ds-card flex min-w-0 flex-col gap-6 p-5 sm:p-7" noValidate>
          <h2 id="free-mode-topic-title" className="ds-card-title">{t("Sobre o que vamos conversar?")}</h2>

          <div className="flex flex-col gap-2">
            <label htmlFor="free-mode-topic" className="sr-only">{t("Tema da conversa")}</label>
            <input
              id="free-mode-topic"
              type="text"
              className="ds-field w-full"
              value={topic}
              maxLength={200}
              placeholder={t("Digite um tema")}
              autoComplete="off"
              disabled={preparing}
              onChange={(event) => { setTopic(event.target.value); setBankTopic(null); }}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p id="free-mode-suggestions" className="ds-label">{t("Sugestões")}</p>
              <button type="button" className="ds-btn ds-btn-quiet min-h-11" onClick={shuffleTopic} disabled={preparing}>
                {t("Sortear tema")}
              </button>
            </div>
            <div role="group" aria-labelledby="free-mode-suggestions" className="fms-topics">
              {mounted && (
                <TopicSuggestions
                  selectedId={bankTopic?.id ?? null}
                  disabled={preparing}
                  onPick={(picked) => { setPlanError(null); setTopic(picked.title); setBankTopic(picked); }}
                />
              )}
            </div>
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

          <button type="submit" className="ds-btn ds-btn-cta-green" disabled={!topic.trim() || preparing} aria-busy={preparing || undefined}>
            {preparing && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
            {preparing ? t("Preparando a conversa…") : t("Começar conversa")}
          </button>
        </form>

        <aside className="ds-card p-5 sm:p-7" aria-labelledby="free-mode-how-title">
          <h2 id="free-mode-how-title" className="ds-card-title">{t("Como funciona")}</h2>
          <ol className="mt-6 flex flex-col gap-5">
            <li className="flex items-start gap-4">
              <span className="isu-step" aria-hidden="true">1</span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="ds-label">{t("Escolha um tema")}</p>
                <p className="ds-small">{t("Digite o que quiser ou use uma sugestão.")}</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="isu-step" aria-hidden="true">2</span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="ds-label">{t("Converse com o Tuck")}</p>
                <p className="ds-small">{t("A conversa é toda em inglês, sem perguntas de entrevista.")}</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="isu-step" aria-hidden="true">3</span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="ds-label">{t("Receba seu relatório")}</p>
                <p className="ds-small">{t("Só sobre a conversa: seu inglês e sua voz, nada técnico.")}</p>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </main>
  );
}

/** The six suggestion buttons. Mounted only after the first client render, so the draw never runs during server render. */
function TopicSuggestions({ selectedId, disabled, onPick }: {
  selectedId: string | null;
  disabled: boolean;
  onPick: (picked: ConversationTopic) => void;
}) {
  const [suggestions] = useState<ConversationTopic[]>(() => drawSuggestions(readRecentTopicIds(window.localStorage)));
  return (
    <>
      {suggestions.map((item) => (
        <button
          key={item.id}
          type="button"
          className="fms-topic"
          aria-pressed={selectedId === item.id}
          disabled={disabled}
          onClick={() => onPick(item)}
        >
          {item.title}
        </button>
      ))}
    </>
  );
}
