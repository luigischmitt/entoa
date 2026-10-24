export const quickSessionSize = 5;
export const focusedSessionSize = 8;
export const masteredAccuracy = 85;

const quickMaxWords = 14;
const unknownWeakness = 50;
const patternTypeOrder = ["GRAMMAR", "WORD_CHOICE", "FALSE_COGNATE", "STRUCTURE"];

const accuracyOf = (attempt) => {
  const accuracy = attempt?.scores?.accuracy;
  return typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null;
};

const latestAccuracyOf = (attempts) => {
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const accuracy = accuracyOf(attempts[index]);
    if (accuracy !== null) return accuracy;
  }
  return null;
};

const attemptKey = (attempt) => (attempt?.id ? `id:${attempt.id}` : `created:${attempt?.createdAt}`);

/** Practice state of one phrase; mastered means its latest scored attempt reached masteredAccuracy. */
export function phrasePracticeState(attempts) {
  const list = Array.isArray(attempts) ? attempts : [];
  const latestAccuracy = latestAccuracyOf(list);
  const scored = list.map(accuracyOf).filter((accuracy) => accuracy !== null);
  return {
    practiced: list.length > 0,
    latestAccuracy,
    bestAccuracy: scored.length ? Math.max(...scored) : null,
    mastered: latestAccuracy !== null && latestAccuracy >= masteredAccuracy,
  };
}

/** Stable priority: unmastered and unpracticed first, then recurrence, weakness and recency. */
export function rankTrainingPhrases(phrases, attempts = {}) {
  return phrases
    .map((phrase, index) => {
      const state = phrasePracticeState(attempts[phrase.id]);
      return {
        phrase,
        index,
        mastered: state.mastered ? 1 : 0,
        practiced: state.practiced ? 1 : 0,
        recurrence: phrase.recurrence ?? 0,
        weakness: state.latestAccuracy ?? phrase.beforeAccuracy ?? unknownWeakness,
        time: phrase.time ?? 0,
      };
    })
    .sort((first, second) => first.mastered - second.mastered
      || first.practiced - second.practiced
      || second.recurrence - first.recurrence
      || first.weakness - second.weakness
      || second.time - first.time
      || first.index - second.index)
    .map((entry) => entry.phrase);
}

function candidatesFor(phrases, options) {
  if (options.kind === "quick") return phrases;
  if (options.kind === "pronunciation") return phrases.filter((phrase) => phrase.source === "pronunciation");
  const { patternType } = options;
  return phrases.filter((phrase) => phrase.source === "english" && (!patternType || phrase.patternType === patternType));
}

function interleaveSources(ranked) {
  const queues = {
    english: ranked.filter((phrase) => phrase.source === "english"),
    pronunciation: ranked.filter((phrase) => phrase.source === "pronunciation"),
  };
  const first = ranked[0]?.source === "pronunciation" ? "pronunciation" : "english";
  const second = first === "english" ? "pronunciation" : "english";
  const session = [];
  for (let turn = 0; session.length < quickSessionSize; turn += 1) {
    const [preferred, fallback] = turn % 2 === 0 ? [first, second] : [second, first];
    const source = queues[preferred].length ? preferred : fallback;
    if (!queues[source].length) break;
    session.push(queues[source].shift());
  }
  return session;
}

/** Builds one short session of phrases, ranked by rankTrainingPhrases, without duplicates. */
export function buildVoiceSession(phrases, attempts = {}, options) {
  const unique = [...new Map(phrases.map((phrase) => [phrase.id, phrase])).values()];
  const excluded = new Set(options.excludeIds ?? []);
  const available = unique.filter((phrase) => !excluded.has(phrase.id));
  const pool = candidatesFor(available, options).length ? available : unique;
  const ranked = rankTrainingPhrases(candidatesFor(pool, options), attempts);
  if (options.kind === "quick") {
    const short = ranked.filter((phrase) => phrase.wordCount <= quickMaxWords);
    return interleaveSources(short.length >= quickSessionSize ? short : ranked);
  }
  return ranked.slice(0, focusedSessionSize);
}

/** Counts for the session picker; mastered phrases are excluded from availability. */
export function voiceSessionCatalog(phrases, attempts = {}) {
  const mastered = phrases.filter((phrase) => phrasePracticeState(attempts[phrase.id]).mastered);
  const open = phrases.filter((phrase) => !phrasePracticeState(attempts[phrase.id]).mastered);
  const counts = new Map();
  for (const phrase of open) {
    if (phrase.source === "english" && phrase.patternType) counts.set(phrase.patternType, (counts.get(phrase.patternType) ?? 0) + 1);
  }
  const types = [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((first, second) => second.count - first.count || patternTypeOrder.indexOf(first.type) - patternTypeOrder.indexOf(second.type));
  return {
    total: phrases.length,
    mastered: mastered.length,
    quick: { available: open.length },
    english: { available: open.filter((phrase) => phrase.source === "english").length, types },
    pronunciation: { available: open.filter((phrase) => phrase.source === "pronunciation").length },
  };
}

/** Compares each session phrase with the attempts it had when the session opened. */
export function summarizeVoiceSession(sessionPhrases, attemptsAtStart = {}, attemptsNow = {}) {
  const measured = sessionPhrases.map((phrase) => {
    const startAttempts = attemptsAtStart[phrase.id] ?? [];
    const startKeys = new Set(startAttempts.map(attemptKey));
    const newAttempts = (attemptsNow[phrase.id] ?? []).filter((attempt) => !startKeys.has(attemptKey(attempt)));
    const startAccuracy = latestAccuracyOf(startAttempts);
    const before = startAccuracy ?? (typeof phrase.beforeAccuracy === "number" ? phrase.beforeAccuracy : null);
    const newScores = newAttempts.map(accuracyOf).filter((accuracy) => accuracy !== null);
    const after = newScores.length ? Math.max(...newScores) : null;
    return { phrase, before, after, practiced: newAttempts.length > 0 };
  });
  const rounded = (value) => (value === null ? null : Math.round(value));
  return {
    practiced: measured.filter((entry) => entry.practiced).length,
    improved: measured.filter((entry) => entry.before !== null && entry.after !== null && entry.after > entry.before).length,
    rows: measured.map(({ phrase, before, after, practiced }) => ({
      id: phrase.id,
      text: phrase.referenceText,
      before: rounded(before),
      after: rounded(after),
      practiced,
    })),
  };
}
