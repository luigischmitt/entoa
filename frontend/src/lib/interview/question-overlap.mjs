const STOP_WORDS = new Set([
  "the", "and", "for", "with", "you", "your", "how", "what", "why", "when", "which", "who", "did", "does", "do", "can", "could", "would", "tell", "about", "describe", "specific", "specifically", "apply", "applied", "use", "used", "ensure", "make", "made", "this", "that", "these", "those", "into", "from", "have", "has", "had", "are", "was", "were", "been", "any", "some", "one", "more", "most", "also", "just", "me", "us", "our", "in", "on", "of", "to", "a", "an",
]);

function stem(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function contentStems(text) {
  const normalized = String(text ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  return new Set(words.map(stem));
}

/** Deterministic lexical check: true when two interview prompts ask about the same subject. */
export function repeatsTopic(candidate, earlier) {
  const a = contentStems(candidate);
  const b = contentStems(earlier);
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const stemmed of a) if (b.has(stemmed)) shared += 1;
  const union = new Set([...a, ...b]).size;
  return shared >= 4 && (shared / Math.min(a.size, b.size) >= 0.7 || shared / union >= 0.5);
}
