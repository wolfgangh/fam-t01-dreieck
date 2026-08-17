/** de-DE Eingabe: 360.000,00 oder 360000 oder 3,5 */
export function parseDeNumber(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(/€/g, "");
  if (t === "" || t === "-" || t === "−") return null;
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  let normalized = t;
  if (hasComma && hasDot) {
    normalized = t.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = t.replace(",", ".");
  } else if (hasDot) {
    const parts = t.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (parts.length > 2 || last.length === 3) {
      normalized = t.replace(/\./g, "");
    }
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function isTyped(raw: string): boolean {
  return raw.trim().length > 0;
}
