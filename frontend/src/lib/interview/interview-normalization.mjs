const seniorities = new Set(["intern", "junior", "mid-level", "senior"]);
const focuses = new Set(["mixed", "technical-depth"]);
export function normalizeSeniority(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "staff") return "senior";
  return seniorities.has(normalized) ? normalized : "junior";
}
export function normalizeFocus(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return focuses.has(normalized) ? normalized : "mixed";
}
