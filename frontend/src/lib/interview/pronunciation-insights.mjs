const isText = (value) => typeof value === "string" && value.trim().length > 0;

const familyDefinitions = {
  th: { label: "Som de th (think, this)" },
  initialR: { label: "R inicial (right, run)" },
  ed: { label: "Final -ed (worked, used)" },
  shortLongI: { label: "i curto x i longo (ship/sheep)" },
  openVowels: { label: "Vogais abertas (cat, cut)" },
  schwa: { label: "Vogal neutra (about)" },
  h: { label: "H aspirado (hello)" },
  final: { label: "Consoantes (t, d, s…)" },
  intonation: { label: "Entonação plana" },
};

function familyFor(problem) {
  const word = problem.word.trim();
  const phoneme = typeof problem.worstPhoneme === "string" ? problem.worstPhoneme.toLowerCase().replace(/[ːˑ]/gu, "") : "";
  if (/ed$/iu.test(word)) return "ed";
  if (phoneme === "th" || phoneme === "dh" || /^(θ|ð)$/u.test(phoneme)) return "th";
  if (/^r/iu.test(word) || phoneme === "r") return "initialR";
  if (phoneme === "ih" || phoneme === "iy") return "shortLongI";
  if (phoneme === "ae" || phoneme === "ah") return "openVowels";
  if (phoneme === "ax" || phoneme === "ə") return "schwa";
  if (phoneme === "hh") return "h";
  if (/^(p|t|k|b|d|g|m|n|ng|l|s|z|f|v|ch|sh|ʧ|ʤ|ŋ)$/u.test(phoneme)) return "final";
  return null;
}

function interviewDate(record) {
  for (const value of [record.completedAt, record.startedAt, record.createdAt]) {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  }
  return null;
}

/** Flatten persisted Azure phrase evidence and aggregate recurring sound families. */
export function buildPronunciationInsights(records) {
  const interviews = Array.isArray(records) ? records : [];
  const phrases = [];
  for (const record of interviews) {
    const date = interviewDate(record);
    const answers = record?.feedback?.azureSummary?.answers;
    if (!Array.isArray(answers)) continue;
    // Answers are keyed by the interviewer turn sequence; show the 1-based answer position instead.
    const ordinals = new Map(answers.map((answer) => answer?.sequenceNumber).filter(Number.isSafeInteger).sort((a, b) => a - b).map((sequence, index) => [sequence, index + 1]));
    for (const answer of answers) {
      if (!Array.isArray(answer?.phrases)) continue;
      for (const phrase of answer.phrases) {
        if (!isText(phrase?.text) || !Number.isSafeInteger(answer.sequenceNumber) || !Number.isSafeInteger(phrase.phraseIndex)) continue;
        const clip = Array.isArray(answer.clips) ? answer.clips.find((item) => item?.phraseIndex === phrase.phraseIndex && isText(item.path)) : null;
        phrases.push({
          phraseIndex: phrase.phraseIndex,
          text: phrase.text.trim(),
          issue: phrase.issue === "intonation" ? "intonation" : "pronunciation",
          problemWords: Array.isArray(phrase.problemWords) ? phrase.problemWords.filter((word) => isText(word?.word)).map((word) => ({ ...word, word: word.word.trim() })) : [],
          date,
          answerNumber: ordinals.get(answer.sequenceNumber) ?? 1,
          clipPath: clip?.path ?? null,
          interviewId: record.id,
          completedAt: date,
        });
      }
    }
  }

  phrases.sort((a, b) => (Date.parse(b.completedAt ?? "") || 0) - (Date.parse(a.completedAt ?? "") || 0)
    || a.answerNumber - b.answerNumber || a.phraseIndex - b.phraseIndex);

  const grouped = new Map();
  for (const phrase of phrases) {
    const keys = new Set(phrase.issue === "intonation" ? ["intonation"] : phrase.problemWords.map(familyFor).filter(Boolean));
    for (const key of keys) {
      const group = grouped.get(key) ?? { id: key, ...familyDefinitions[key], count: 0, examples: [] };
      group.count += 1;
      for (const problem of phrase.problemWords) {
        if (familyFor(problem) === key && !group.examples.some((word) => word.toLowerCase() === problem.word.toLowerCase()) && group.examples.length < 3) group.examples.push(problem.word);
      }
      grouped.set(key, group);
    }
  }

  const families = [...grouped.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  return { families, phrases: phrases.slice(0, 20) };
}
