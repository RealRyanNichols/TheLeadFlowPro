export type LeadTouch = { name: string | null; at: string | null; unavailable?: boolean; limited?: boolean };
export type TouchRecord = { lead_id: string; created_at: string; author?: string | null; detail?: string | null; kind?: string; direction?: string };
const automation = /\b(claude|codex|brain|system|bot|automation|webhook|import)\b/i;
export function touchFromRecord(row: TouchRecord): LeadTouch | null {
  if (row.direction && row.direction !== "outbound") return null;
  const match = row.kind === "sales" ? row.detail?.match(/^([^:\n]{1,80}): (?:Stage changed|Owner set|Priority|Follow.up|Expected value|Close probability|Marked|Call|Saved|Updated|Set|Lost reason)/i) : null;
  const name = (row.author || match?.[1] || "").trim();
  if (!name || name.length > 80 || automation.test(name) || name.includes("@") || !Number.isFinite(Date.parse(row.created_at))) return null;
  return { name, at: row.created_at };
}
export function latestTouches(rows: TouchRecord[]) {
  const result: Record<string, LeadTouch> = {};
  for (const row of rows) {
    const touch = touchFromRecord(row);
    if (touch && (!result[row.lead_id] || Date.parse(touch.at!) > Date.parse(result[row.lead_id].at!))) result[row.lead_id] = touch;
  }
  return result;
}
