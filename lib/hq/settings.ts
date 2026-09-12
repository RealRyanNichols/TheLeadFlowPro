import { DEFAULT_SETTINGS, type Plan, type Voice, type Workspace, type WorkspaceSettings } from "./types";

// Settings arrive from the database as loose JSON and from the settings
// form as loose form fields. Both go through here so the engine only ever
// sees clamped, typed values.

const int = (v: unknown, def: number, min: number, max: number) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const bool = (v: unknown, def: boolean) => {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1" || v === "on") return true;
  if (v === "false" || v === "0" || v === "off" || v === "") return false;
  return def;
};

export function parseSettings(raw: unknown): WorkspaceSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const followUpDays = Array.isArray(s.followUpDays)
    ? [...new Set(s.followUpDays.map((d) => int(d, 0, 1, 90)).filter((d) => d > 0))]
        .sort((a, b) => a - b)
        .slice(0, 8)
    : DEFAULT_SETTINGS.followUpDays;
  const alertPhones = Array.isArray(s.alertPhones)
    ? s.alertPhones
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean)
        .slice(0, 5)
    : [];
  return {
    autoTextBack: bool(s.autoTextBack, DEFAULT_SETTINGS.autoTextBack),
    autoEmailReply: bool(s.autoEmailReply, DEFAULT_SETTINGS.autoEmailReply),
    responseTargetMinutes: int(s.responseTargetMinutes, DEFAULT_SETTINGS.responseTargetMinutes, 5, 240),
    briefHour: int(s.briefHour, DEFAULT_SETTINGS.briefHour, 0, 23),
    briefEmail: bool(s.briefEmail, DEFAULT_SETTINGS.briefEmail),
    alertEmail: bool(s.alertEmail, DEFAULT_SETTINGS.alertEmail),
    alertSms: bool(s.alertSms, DEFAULT_SETTINGS.alertSms),
    alertPhones,
    followUpDays: followUpDays.length ? followUpDays : DEFAULT_SETTINGS.followUpDays,
    weeklyContent: bool(s.weeklyContent, DEFAULT_SETTINGS.weeklyContent),
    weeklyDay: int(s.weeklyDay, DEFAULT_SETTINGS.weeklyDay, 0, 6),
    notes: typeof s.notes === "string" ? s.notes.slice(0, 1500) : "",
  };
}

const VOICES: Voice[] = ["plain", "friendly", "formal"];
const PLANS: Plan[] = ["none", "trial", "active", "past_due", "canceled"];

/** The database row, typed. Tolerates missing columns from older rows. */
export function parseWorkspace(row: Record<string, unknown>): Workspace {
  const str = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : null);
  const voice = VOICES.includes(row.voice as Voice) ? (row.voice as Voice) : "plain";
  const plan = PLANS.includes(row.plan as Plan) ? (row.plan as Plan) : "none";
  return {
    id: String(row.id),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    owner_id: String(row.owner_id ?? ""),
    owner_name: str("owner_name"),
    industry: str("industry"),
    phone: str("phone"),
    email: str("email"),
    website: str("website"),
    city: str("city"),
    state: str("state"),
    timezone: str("timezone") || "America/Chicago",
    brand_color: str("brand_color") || "#1240E8",
    voice,
    services: Array.isArray(row.services) ? row.services.map(String) : [],
    offer: str("offer"),
    review_link: str("review_link"),
    plan,
    trial_ends_at: str("trial_ends_at"),
    stripe_customer_id: str("stripe_customer_id"),
    stripe_subscription_id: str("stripe_subscription_id"),
    subscription_status: str("subscription_status"),
    current_period_end: str("current_period_end"),
    trial_used_at: str("trial_used_at"),
    stripe_event_at: int(row.stripe_event_at, 0, 0, Number.MAX_SAFE_INTEGER),
    inbound_token: str("inbound_token") || "",
    has_sms_token: !!str("sms_token_hash") || !!str("sms_token_hint"),
    settings: parseSettings(row.settings),
    onboarding_step: int(row.onboarding_step, 0, 0, 9),
    created_at: str("created_at") || new Date(0).toISOString(),
    updated_at: str("updated_at") || new Date(0).toISOString(),
  };
}

/** Whether the workspace profile is complete enough for drafts to sound right. */
export function profileGaps(ws: Workspace): string[] {
  const gaps: string[] = [];
  if (!ws.name.trim()) gaps.push("business name");
  if (!ws.owner_name?.trim()) gaps.push("your name");
  if (!ws.phone?.trim()) gaps.push("business phone");
  if (!ws.email?.trim()) gaps.push("business email");
  if (!ws.city?.trim()) gaps.push("city");
  if (ws.services.length === 0) gaps.push("at least one service");
  return gaps;
}
