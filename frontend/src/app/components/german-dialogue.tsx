"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/locale";
import type { ConversationSuggestion } from "@/lib/interview/conversation-policy.mjs";
import "./german-dialogue.css";

export type GermanDialogueLine = { speaker: "tuck" | "person"; text: string; translation: string | null };

/**
 * The German conversation transcript: each line with its Portuguese translation, plus the answers the person can give.
 * The list scrolls inside its own box (newest at the bottom), so the call dock below always stays on screen.
 */
export function GermanDialogue({ lines, suggestions, live, full = false }: {
  lines: GermanDialogueLine[];
  suggestions: ConversationSuggestion[];
  live: boolean;
  /** The ending page: the whole conversation at its natural height, no inner scroll. */
  full?: boolean;
}) {
  const { t } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lines]);

  return (
    <section className="gd-root" data-full={full || undefined} aria-label={t("Conversa em alemão")}>
      <div ref={listRef} className="gd-list" role="log" aria-live="polite">
        {lines.map((line, index) => (
          <div key={index} className="gd-line" data-speaker={line.speaker}>
            <p className="gd-speaker">{line.speaker === "tuck" ? "Tuck" : t("Você")}</p>
            <p className="gd-text">{line.text}</p>
            {line.translation !== null && <p className="gd-translation">{line.translation}</p>}
          </div>
        ))}
      </div>

      {live && suggestions.length > 0 && (
        <div className="gd-suggestions">
          <p className="gd-suggestions-title">{t("Você pode dizer")}</p>
          <ul className="gd-suggestion-list">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="gd-suggestion">
                <span className="gd-suggestion-de">{suggestion.de}</span>
                <span className="gd-suggestion-pt">{suggestion.pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
