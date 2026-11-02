const tokenize = (text) => text.match(/[\p{L}\p{N}’'-]+|[^\p{L}\p{N}’'-]+/gu) ?? [];

/** Word-level comparison that preserves punctuation and whitespace. */
export function diffReportWords(original, revised) {
  const left = tokenize(String(original ?? ""));
  const right = tokenize(String(revised ?? ""));
  const table = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) for (let j = right.length - 1; j >= 0; j -= 1) {
    table[i][j] = left[i].toLowerCase() === right[j].toLowerCase() ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const oldParts = [];
  const newParts = [];
  for (let i = 0, j = 0; i < left.length || j < right.length;) {
    if (i < left.length && j < right.length && left[i].toLowerCase() === right[j].toLowerCase()) {
      oldParts.push({ text: left[i], changed: false }); newParts.push({ text: right[j], changed: false }); i += 1; j += 1;
    } else if (j < right.length && (i === left.length || table[i][j + 1] >= table[i + 1][j])) {
      newParts.push({ text: right[j], changed: /[\p{L}\p{N}]/u.test(right[j]) }); j += 1;
    } else {
      oldParts.push({ text: left[i], changed: /[\p{L}\p{N}]/u.test(left[i]) }); i += 1;
    }
  }
  return { original: oldParts, revised: newParts };
}

/** A report explanation must look like a finished sentence before we show it. */
export function isCompleteSentence(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text || /(?:\.{2,}|…|[—–,:;-])\s*["'”’)]*$/u.test(text)) return false;
  return /[^\s.!?][.!?]["'”’)]*$/u.test(text);
}

const normalizePoint = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/gu, " ").trim();

const pointTokens = (value) => normalizePoint(value).split(" ").filter((word) => word.length > 2)
  .map((word) => word.replace(/(?:ando|endo|indo|acao|coes|ou|ar|er|ir|ado|ada|ido|ida)$/u, ""));

function samePoint(first, second) {
  const left = new Set(pointTokens(first));
  const right = new Set(pointTokens(second));
  if (!left.size || !right.size) return normalizePoint(first) === normalizePoint(second);
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.min(left.size, right.size) >= 0.7;
}

/** Keep gaps over matching strengths so the report never makes the same point in opposing columns. */
export function displayTechnicalFindings(strengths = [], gaps = [], otherNegativeFindings = []) {
  const visibleGaps = gaps.filter((item) => isCompleteSentence(item?.explanation));
  const negativeFindings = [...visibleGaps, ...otherNegativeFindings];
  return {
    strengths: strengths.filter((item) => isCompleteSentence(item?.explanation)
      && !negativeFindings.some((gap) => samePoint(item.explanation, gap?.explanation) || samePoint(item.evidence, gap?.evidence))),
    gaps: visibleGaps,
  };
}

export function displayInterviewerTakeaway(takeaway, otherNegativeFindings = []) {
  const concern = isCompleteSentence(takeaway?.concern) ? takeaway.concern.trim() : null;
  const negativeFindings = concern ? [{ explanation: concern }, ...otherNegativeFindings] : otherNegativeFindings;
  const remember = isCompleteSentence(takeaway?.remember) && !negativeFindings.some((item) => samePoint(takeaway.remember, item?.explanation)) ? takeaway.remember.trim() : null;
  return { remember, concern };
}

export function hasIncompleteAnalysisCoverage(report) {
  const coverage = report?.analysisCoverage;
  return Number.isFinite(coverage?.analyzedTurnCount) && Number.isFinite(coverage?.totalTurnCount)
    && coverage.totalTurnCount > 0 && coverage.analyzedTurnCount < coverage.totalTurnCount;
}

/** State exactly which answers are missing, without implying the report covers them. */
export function analysisCoverageNotice(coverage, ordinalForSequence = (sequenceNumber) => sequenceNumber) {
  if (!hasIncompleteAnalysisCoverage({ analysisCoverage: coverage })) return null;
  const missing = Array.isArray(coverage.missingSequenceNumbers) ? coverage.missingSequenceNumbers
    .filter((sequenceNumber) => Number.isSafeInteger(sequenceNumber))
    .map((sequenceNumber) => ordinalForSequence(sequenceNumber) ?? sequenceNumber) : [];
  if (missing.length === 1) return `Não conseguimos analisar a resposta ${missing[0]}. Os pontos abaixo cobrem as outras respostas.`;
  if (missing.length > 1) return `Não conseguimos analisar as respostas ${missing.join(" e ")}. Os pontos abaixo cobrem as outras respostas.`;
  return "Nem todas as respostas puderam ser analisadas. Os pontos abaixo cobrem as outras respostas.";
}
