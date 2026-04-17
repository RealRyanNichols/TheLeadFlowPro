import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; cls: string }> = {
  new:         { label: "New",          cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  contacted:   { label: "Contacted",    cls: "bg-brand-500/15 text-brand-400 border-brand-500/30" },
  nurturing:   { label: "Nurturing",    cls: "bg-accent-500/15 text-accent-400 border-accent-500/30" },
  qualified:   { label: "Qualified",    cls: "bg-lead-500/15 text-lead-400 border-lead-500/30" },
  booked:      { label: "Booked",       cls: "bg-lead-500/15 text-lead-400 border-lead-500/30" },
  won:         { label: "Won",          cls: "bg-lead-500/25 text-lead-400 border-lead-500/40" },
  lost:        { label: "Lost",         cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  unresponsive:{ label: "Unresponsive", cls: "bg-ink-700 text-ink-300 border-white/10" }
};

const SOURCE: Record<string, string> = {
  call: "Call", text: "Text", form: "Web form",
  dm_instagram: "IG DM", dm_facebook: "FB DM", dm_tiktok: "TikTok DM", dm_x: "X DM",
  email: "Email", ad_meta: "Meta ad", ad_google: "Google ad", ad_tiktok: "TikTok ad",
  walk_in: "Walk-in", referral: "Referral", other: "Other"
};

export function LeadStatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.new;
  return <span className={cn("stat-pill border text-[11px]", s.cls)}>{s.label}</span>;
}

export function LeadSourceLabel({ source }: { source: string }) {
  return <span className="text-xs text-ink-400">{SOURCE[source] ?? source}</span>;
}
