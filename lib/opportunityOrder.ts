export type Opportunity = { id: string; status: string; priority?: string | null; close_probability?: number | null; next_follow_up_at?: string | null; created_at: string };
const heat: Record<string, number> = { hot: 5, high: 4, warm: 3, normal: 2, low: 1, cold: 0 };
const stage: Record<string, number> = { proposal: 4, call_booked: 3, contacted: 2, new: 1 };
const time = (value?: string | null) => { const n = Date.parse(value || ""); return Number.isFinite(n) ? n : 0; };
export function compareOpportunities(a: Opportunity, b: Opportunity) {
  const closed = (s: string) => s === "won" ? 1 : s === "lost" ? 2 : 0;
  return closed(a.status) - closed(b.status)
    || (heat[b.priority || "normal"] ?? 2) - (heat[a.priority || "normal"] ?? 2)
    || (stage[b.status] ?? 0) - (stage[a.status] ?? 0)
    || (b.close_probability ?? -1) - (a.close_probability ?? -1)
    || (time(a.next_follow_up_at) || Infinity) - (time(b.next_follow_up_at) || Infinity)
    || time(b.created_at) - time(a.created_at)
    || a.id.localeCompare(b.id);
}
