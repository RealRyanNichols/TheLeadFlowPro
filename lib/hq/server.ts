import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret, randomToken, sha256Hex } from "./crypto";
import { hashKey, keyKind, mintKey } from "./keys";
import { ACCESS_TOKEN_TTL_SECONDS, CODE_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, type RegistrationRequest } from "./oauth";
import { last10 } from "./phone";
import { parseWorkspace } from "./settings";
import type { Brief, Connection, ConnectionKind, Content, HqEvent, Lead, LeadStatus, Message, Workspace, WorkspaceSettings } from "./types";

// The data layer for the plugin. Every function takes the Supabase client
// it should use, so the same code runs under the service role (cron,
// webhooks, the MCP server) and under a browser session (the HQ pages,
// where RLS does the scoping). Every query still filters by workspace id
// in code: RLS is the backstop, not the only wall.

// Untyped on purpose: the hq_* tables are not in the generated Database
// type, and every query here narrows its own rows.
export type Db = SupabaseClient<any, any, any>;

function fail(where: string, error: { message?: string } | null): never {
  throw new Error(`${where}: ${error?.message ?? "unknown database error"}`);
}

/* ------------------------------------------------------------------------ */
/* workspaces                                                                */
/* ------------------------------------------------------------------------ */

export async function getWorkspaceById(db: Db, id: string): Promise<Workspace | null> {
  const { data, error } = await db.from("hq_workspaces").select("*").eq("id", id).maybeSingle();
  if (error) fail("getWorkspaceById", error);
  return data ? parseWorkspace(data) : null;
}

/** The workspace a signed-in person works in: the one they own, else the first they belong to. */
export async function getWorkspaceForUser(db: Db, userId: string): Promise<Workspace | null> {
  const { data: members, error } = await db
    .from("hq_members")
    .select("workspace_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) fail("getWorkspaceForUser", error);
  if (!members || members.length === 0) return null;
  const pick = members.find((m: { role: string }) => m.role === "owner") ?? members[0];
  return getWorkspaceById(db, pick.workspace_id);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "business"
  );
}

export type NewWorkspace = {
  ownerId: string;
  name: string;
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  timezone?: string | null;
  services?: string[];
};

/** Creates the workspace, the owner membership, and the inbound token in one go. */
export async function createWorkspace(db: Db, input: NewWorkspace): Promise<{ workspace: Workspace; inboundToken: string }> {
  const inbound = mintKey("inbound");
  const base = slugify(input.name);
  let workspace: Workspace | null = null;
  for (let attempt = 0; attempt < 5 && !workspace; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomToken(4)}`;
    const { data, error } = await db
      .from("hq_workspaces")
      .insert({
        slug,
        name: input.name,
        owner_id: input.ownerId,
        owner_name: input.ownerName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        industry: input.industry ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        timezone: input.timezone ?? "America/Chicago",
        services: input.services ?? [],
        inbound_token: inbound.plaintext,
        inbound_token_hash: inbound.hash,
        inbound_token_hint: inbound.hint,
        settings: {},
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505" && /slug/.test(error.message ?? "")) continue;
      fail("createWorkspace", error);
    }
    workspace = parseWorkspace(data);
  }
  if (!workspace) throw new Error("createWorkspace: could not find a free slug");
  const { error: memberError } = await db.from("hq_members").insert({ workspace_id: workspace.id, user_id: input.ownerId, role: "owner" });
  if (memberError) fail("createWorkspace.member", memberError);
  return { workspace, inboundToken: inbound.plaintext };
}

export type WorkspacePatch = Partial<
  Pick<
    Workspace,
    | "name"
    | "owner_name"
    | "industry"
    | "phone"
    | "email"
    | "website"
    | "city"
    | "state"
    | "timezone"
    | "brand_color"
    | "voice"
    | "services"
    | "offer"
    | "review_link"
    | "plan"
    | "trial_ends_at"
    | "stripe_customer_id"
    | "stripe_subscription_id"
    | "subscription_status"
    | "current_period_end"
    | "trial_used_at"
    | "stripe_event_at"
    | "onboarding_step"
  >
> & { settings?: WorkspaceSettings };

export async function updateWorkspace(db: Db, id: string, patch: WorkspacePatch): Promise<Workspace> {
  const { data, error } = await db.from("hq_workspaces").update(patch).eq("id", id).select("*").single();
  if (error) fail("updateWorkspace", error);
  return parseWorkspace(data);
}

export async function regenerateInboundToken(db: Db, id: string): Promise<string> {
  const inbound = mintKey("inbound");
  const { error } = await db.from("hq_workspaces").update({ inbound_token: inbound.plaintext, inbound_token_hash: inbound.hash, inbound_token_hint: inbound.hint }).eq("id", id);
  if (error) fail("regenerateInboundToken", error);
  return inbound.plaintext;
}

export async function findWorkspaceByInboundToken(db: Db, token: string): Promise<Workspace | null> {
  if (keyKind(token) !== "inbound") return null;
  const { data, error } = await db.from("hq_workspaces").select("*").eq("inbound_token_hash", hashKey(token)).maybeSingle();
  if (error) fail("findWorkspaceByInboundToken", error);
  return data ? parseWorkspace(data) : null;
}

/** The text-message webhook token is separate from the form token and never published. */
export async function regenerateSmsToken(db: Db, id: string): Promise<string> {
  const sms = mintKey("inbound");
  const { error } = await db.from("hq_workspaces").update({ sms_token_hash: sms.hash, sms_token_hint: sms.hint }).eq("id", id);
  if (error) fail("regenerateSmsToken", error);
  return sms.plaintext;
}

export async function findWorkspaceBySmsToken(db: Db, token: string): Promise<Workspace | null> {
  if (keyKind(token) !== "inbound") return null;
  const { data, error } = await db.from("hq_workspaces").select("*").eq("sms_token_hash", hashKey(token)).maybeSingle();
  if (error) fail("findWorkspaceBySmsToken", error);
  return data ? parseWorkspace(data) : null;
}

export async function findWorkspaceByStripe(db: Db, field: "stripe_customer_id" | "stripe_subscription_id", value: string): Promise<Workspace | null> {
  const { data, error } = await db.from("hq_workspaces").select("*").eq(field, value).maybeSingle();
  if (error) fail("findWorkspaceByStripe", error);
  return data ? parseWorkspace(data) : null;
}

/** Workspaces the engine should run for. */
export async function listLiveWorkspaces(db: Db): Promise<Workspace[]> {
  const { data, error } = await db.from("hq_workspaces").select("*").in("plan", ["trial", "active", "past_due"]).limit(2000);
  if (error) fail("listLiveWorkspaces", error);
  return (data ?? []).map(parseWorkspace);
}

export async function isMember(db: Db, workspaceId: string, userId: string): Promise<"owner" | "member" | null> {
  const { data, error } = await db.from("hq_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  if (error) fail("isMember", error);
  return (data?.role as "owner" | "member") ?? null;
}

/* ------------------------------------------------------------------------ */
/* leads                                                                     */
/* ------------------------------------------------------------------------ */

export type ListLeadsOptions = { statuses?: LeadStatus[]; limit?: number; search?: string; sinceDays?: number };

export async function listLeads(db: Db, workspaceId: string, opts: ListLeadsOptions = {}): Promise<Lead[]> {
  let q = db.from("hq_leads").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(Math.min(1000, opts.limit ?? 100));
  if (opts.statuses && opts.statuses.length) q = q.in("status", opts.statuses);
  if (opts.sinceDays) q = q.gte("created_at", new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString());
  if (opts.search) {
    const s = opts.search.replace(/[%_,()]/g, " ").trim();
    if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,service.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) fail("listLeads", error);
  return (data ?? []) as Lead[];
}

export async function getLead(db: Db, workspaceId: string, id: string): Promise<Lead | null> {
  const { data, error } = await db.from("hq_leads").select("*").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
  if (error) fail("getLead", error);
  return (data as Lead) ?? null;
}

export type LeadInsert = {
  name: string;
  phone: string | null;
  email: string | null;
  source: Lead["source"];
  source_detail?: string | null;
  message?: string | null;
  service?: string | null;
  consent_sms?: boolean;
  consent_email?: boolean;
  value_cents?: number | null;
  external_id?: string | null;
  meta?: Record<string, unknown>;
  status?: LeadStatus;
};

/**
 * Insert a lead, or recognize a repeat. The same external id is the same
 * lead. The same phone or email inside seven days on an open lead is a
 * repeat submission, which is recorded on the timeline instead of
 * alerting the owner twice. A repeat can fill in blanks; it can never
 * turn consent on, because the doors it comes through are public.
 */
export async function insertLead(db: Db, workspaceId: string, input: LeadInsert): Promise<{ lead: Lead; created: boolean }> {
  if (input.external_id) {
    const { data: existing } = await db.from("hq_leads").select("*").eq("workspace_id", workspaceId).eq("external_id", input.external_id).maybeSingle();
    if (existing) return { lead: existing as Lead, created: false };
  }
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const digits = last10(input.phone);
  const email = input.email?.toLowerCase() ?? null;
  let match: Lead | null = null;
  if (digits) {
    const { data } = await db.from("hq_leads").select("*").eq("workspace_id", workspaceId).in("status", ["new", "contacted", "quoted"]).gte("created_at", since).ilike("phone", `%${digits}`).order("created_at", { ascending: false }).limit(1);
    match = ((data ?? []) as Lead[])[0] ?? null;
  }
  if (!match && email) {
    const { data } = await db.from("hq_leads").select("*").eq("workspace_id", workspaceId).in("status", ["new", "contacted", "quoted"]).gte("created_at", since).ilike("email", email.replace(/[%_]/g, "")).order("created_at", { ascending: false }).limit(1);
    match = ((data ?? []) as Lead[])[0] ?? null;
  }
  if (match) {
    const merged: Partial<Lead> = {};
    if (!match.message && input.message) merged.message = input.message;
    if (!match.service && input.service) merged.service = input.service;
    if (!match.email && input.email) merged.email = input.email;
    if (!match.phone && input.phone) merged.phone = input.phone;
    const lead = Object.keys(merged).length ? await updateLead(db, workspaceId, match.id, merged) : match;
    return { lead, created: false };
  }
  const { data, error } = await db
    .from("hq_leads")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      source: input.source,
      source_detail: input.source_detail ?? null,
      message: input.message ?? null,
      service: input.service ?? null,
      consent_sms: !!input.consent_sms,
      consent_email: !!input.consent_email,
      value_cents: input.value_cents ?? null,
      external_id: input.external_id ?? null,
      meta: input.meta ?? {},
      status: input.status ?? "new",
    })
    .select("*")
    .single();
  if (error) fail("insertLead", error);
  return { lead: data as Lead, created: true };
}

export async function updateLead(db: Db, workspaceId: string, id: string, patch: Partial<Lead>): Promise<Lead> {
  const { id: _id, workspace_id: _ws, created_at: _c, ...safe } = patch;
  const { data, error } = await db.from("hq_leads").update(safe).eq("workspace_id", workspaceId).eq("id", id).select("*").single();
  if (error) fail("updateLead", error);
  return data as Lead;
}

export async function findLeadByPhone(db: Db, workspaceId: string, phone: string): Promise<Lead | null> {
  const digits = last10(phone);
  if (!digits) return null;
  const { data, error } = await db.from("hq_leads").select("*").eq("workspace_id", workspaceId).ilike("phone", `%${digits}`).order("created_at", { ascending: false }).limit(1);
  if (error) fail("findLeadByPhone", error);
  return ((data ?? []) as Lead[])[0] ?? null;
}

/* ------------------------------------------------------------------------ */
/* events                                                                    */
/* ------------------------------------------------------------------------ */

export type EventInsert = {
  kind: HqEvent["kind"];
  detail: string;
  leadId?: string | null;
  actor: string;
  dedupeKey?: string | null;
  meta?: Record<string, unknown>;
};

/** Returns false when a dedupe key already exists, which is how "once" is enforced. */
export async function recordEvent(db: Db, workspaceId: string, input: EventInsert): Promise<boolean> {
  const { error } = await db.from("hq_events").insert({
    workspace_id: workspaceId,
    lead_id: input.leadId ?? null,
    kind: input.kind,
    detail: input.detail.slice(0, 1000),
    actor: input.actor.slice(0, 80),
    dedupe_key: input.dedupeKey ?? null,
    meta: input.meta ?? {},
  });
  if (error) {
    if (error.code === "23505") return false;
    fail("recordEvent", error);
  }
  return true;
}

export async function listEvents(db: Db, workspaceId: string, opts: { limit?: number; sinceDays?: number; leadId?: string; kinds?: HqEvent["kind"][] } = {}): Promise<HqEvent[]> {
  let q = db.from("hq_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(Math.min(1000, opts.limit ?? 100));
  if (opts.leadId) q = q.eq("lead_id", opts.leadId);
  if (opts.kinds?.length) q = q.in("kind", opts.kinds);
  if (opts.sinceDays) q = q.gte("created_at", new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString());
  const { data, error } = await q;
  if (error) fail("listEvents", error);
  return (data ?? []) as HqEvent[];
}

export async function firedKeys(db: Db, workspaceId: string, prefix: string): Promise<Set<string>> {
  const { data, error } = await db.from("hq_events").select("dedupe_key").eq("workspace_id", workspaceId).like("dedupe_key", `${prefix}%`).limit(5000);
  if (error) fail("firedKeys", error);
  return new Set(((data ?? []) as { dedupe_key: string | null }[]).map((r) => r.dedupe_key).filter((k): k is string => !!k));
}

/* ------------------------------------------------------------------------ */
/* messages                                                                  */
/* ------------------------------------------------------------------------ */

export type MessageInsert = {
  leadId: string | null;
  direction: "in" | "out";
  channel: "sms" | "email";
  purpose: Message["purpose"];
  body: string;
  subject?: string | null;
  status: Message["status"];
  provider?: string | null;
  providerId?: string | null;
  createdBy: string;
  error?: string | null;
  sentAt?: string | null;
};

export async function insertMessage(db: Db, workspaceId: string, input: MessageInsert): Promise<Message> {
  const { data, error } = await db
    .from("hq_messages")
    .insert({
      workspace_id: workspaceId,
      lead_id: input.leadId,
      direction: input.direction,
      channel: input.channel,
      purpose: input.purpose,
      body: input.body.slice(0, 5000),
      subject: input.subject ?? null,
      status: input.status,
      provider: input.provider ?? null,
      provider_id: input.providerId ?? null,
      error: input.error ?? null,
      created_by: input.createdBy.slice(0, 80),
      sent_at: input.sentAt ?? null,
    })
    .select("*")
    .single();
  if (error) fail("insertMessage", error);
  return data as Message;
}

export async function getMessage(db: Db, workspaceId: string, id: string): Promise<Message | null> {
  const { data, error } = await db.from("hq_messages").select("*").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
  if (error) fail("getMessage", error);
  return (data as Message) ?? null;
}

/**
 * Take a draft off the table before sending it. Two callers racing for the
 * same message (a double tap, a retried request) get exactly one winner;
 * the other sees null and stops.
 */
export async function claimMessage(db: Db, workspaceId: string, id: string, body: string): Promise<Message | null> {
  const { data, error } = await db
    .from("hq_messages")
    .update({ status: "sending", body: body.slice(0, 5000) })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .in("status", ["draft", "queued", "failed"])
    .select("*")
    .maybeSingle();
  if (error) fail("claimMessage", error);
  return (data as Message) ?? null;
}

export async function updateMessage(db: Db, workspaceId: string, id: string, patch: Partial<Message>): Promise<Message> {
  const { id: _id, workspace_id: _ws, created_at: _c, ...safe } = patch;
  const { data, error } = await db.from("hq_messages").update(safe).eq("workspace_id", workspaceId).eq("id", id).select("*").single();
  if (error) fail("updateMessage", error);
  return data as Message;
}

export async function listMessages(db: Db, workspaceId: string, opts: { leadId?: string; statuses?: Message["status"][]; limit?: number } = {}): Promise<Message[]> {
  let q = db.from("hq_messages").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(Math.min(500, opts.limit ?? 50));
  if (opts.leadId) q = q.eq("lead_id", opts.leadId);
  if (opts.statuses?.length) q = q.in("status", opts.statuses);
  const { data, error } = await q;
  if (error) fail("listMessages", error);
  return (data ?? []) as Message[];
}

/* ------------------------------------------------------------------------ */
/* content and briefs                                                        */
/* ------------------------------------------------------------------------ */

export async function listContent(db: Db, workspaceId: string, opts: { statuses?: Content["status"][]; limit?: number; weekOf?: string; kinds?: Content["kind"][] } = {}): Promise<Content[]> {
  let q = db.from("hq_content").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(Math.min(500, opts.limit ?? 50));
  if (opts.statuses?.length) q = q.in("status", opts.statuses);
  if (opts.kinds?.length) q = q.in("kind", opts.kinds);
  if (opts.weekOf) q = q.eq("week_of", opts.weekOf);
  const { data, error } = await q;
  if (error) fail("listContent", error);
  return (data ?? []) as Content[];
}

export async function getContent(db: Db, workspaceId: string, id: string): Promise<Content | null> {
  const { data, error } = await db.from("hq_content").select("*").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
  if (error) fail("getContent", error);
  return (data as Content) ?? null;
}

export type ContentInsert = {
  kind: Content["kind"];
  title: string;
  body: string;
  hook?: string | null;
  cta?: string | null;
  extras?: Record<string, unknown>;
  weekOf?: string | null;
  createdBy: string;
};

export async function insertContent(db: Db, workspaceId: string, input: ContentInsert): Promise<Content> {
  const { data, error } = await db
    .from("hq_content")
    .insert({
      workspace_id: workspaceId,
      kind: input.kind,
      title: input.title.slice(0, 200),
      body: input.body.slice(0, 10000),
      hook: input.hook ?? null,
      cta: input.cta ?? null,
      extras: input.extras ?? {},
      week_of: input.weekOf ?? null,
      created_by: input.createdBy.slice(0, 80),
    })
    .select("*")
    .single();
  if (error) fail("insertContent", error);
  return data as Content;
}

export async function updateContent(db: Db, workspaceId: string, id: string, patch: Partial<Content>): Promise<Content | null> {
  const { id: _id, workspace_id: _ws, created_at: _c, ...safe } = patch;
  const { data, error } = await db.from("hq_content").update(safe).eq("workspace_id", workspaceId).eq("id", id).select("*").maybeSingle();
  if (error) fail("updateContent", error);
  return (data as Content) ?? null;
}

/** Insert a brief for the day; null when one already exists (the engine ran). */
export async function insertBrief(db: Db, workspaceId: string, input: { kind: Brief["kind"]; date: string; text: string; json: Record<string, unknown>; deliveredVia: string[] }): Promise<Brief | null> {
  const { data, error } = await db
    .from("hq_briefs")
    .insert({ workspace_id: workspaceId, kind: input.kind, brief_date: input.date, body_text: input.text, body_json: input.json, delivered_via: input.deliveredVia })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return null;
    fail("insertBrief", error);
  }
  return data as Brief;
}

export async function latestBrief(db: Db, workspaceId: string, kind: Brief["kind"]): Promise<Brief | null> {
  const { data, error } = await db.from("hq_briefs").select("*").eq("workspace_id", workspaceId).eq("kind", kind).order("brief_date", { ascending: false }).limit(1).maybeSingle();
  if (error) fail("latestBrief", error);
  return (data as Brief) ?? null;
}

/* ------------------------------------------------------------------------ */
/* connections                                                               */
/* ------------------------------------------------------------------------ */

const CONNECTION_COLUMNS = "id, workspace_id, kind, label, config, status, last_error, last_checked_at, created_at, updated_at";

export async function listConnections(db: Db, workspaceId: string): Promise<Connection[]> {
  const { data, error } = await db.from("hq_connections").select(CONNECTION_COLUMNS).eq("workspace_id", workspaceId);
  if (error) fail("listConnections", error);
  return (data ?? []) as Connection[];
}

export async function getConnectionWithSecret(
  db: Db,
  workspaceId: string,
  kind: ConnectionKind,
): Promise<{ connection: Connection; secret: string | null; webhookSecret: string | null } | null> {
  const { data, error } = await db.from("hq_connections").select("*").eq("workspace_id", workspaceId).eq("kind", kind).maybeSingle();
  if (error) fail("getConnectionWithSecret", error);
  if (!data) return null;
  const { secret_ciphertext, webhook_secret_ciphertext, ...connection } = data as Connection & { secret_ciphertext: string | null; webhook_secret_ciphertext: string | null };
  return { connection, secret: decryptSecret(secret_ciphertext), webhookSecret: decryptSecret(webhook_secret_ciphertext) };
}

export async function upsertConnection(
  db: Db,
  workspaceId: string,
  input: {
    kind: ConnectionKind;
    label: string;
    config: Record<string, unknown>;
    secret?: string | null;
    webhookSecret?: string | null;
    status?: Connection["status"];
    lastError?: string | null;
  },
): Promise<Connection> {
  const row: Record<string, unknown> = {
    workspace_id: workspaceId,
    kind: input.kind,
    label: input.label.slice(0, 120),
    config: input.config,
    status: input.status ?? "connected",
    last_error: input.lastError ?? null,
    last_checked_at: new Date().toISOString(),
  };
  if (input.secret !== undefined) row.secret_ciphertext = input.secret ? encryptSecret(input.secret) : null;
  if (input.webhookSecret !== undefined) row.webhook_secret_ciphertext = input.webhookSecret ? encryptSecret(input.webhookSecret) : null;
  const { data, error } = await db.from("hq_connections").upsert(row, { onConflict: "workspace_id,kind" }).select(CONNECTION_COLUMNS).single();
  if (error) fail("upsertConnection", error);
  return data as Connection;
}

export async function deleteConnection(db: Db, workspaceId: string, kind: ConnectionKind): Promise<void> {
  const { error } = await db.from("hq_connections").delete().eq("workspace_id", workspaceId).eq("kind", kind);
  if (error) fail("deleteConnection", error);
}

export async function findWorkspaceByMetaPage(db: Db, pageId: string): Promise<Workspace | null> {
  const { data, error } = await db.from("hq_connections").select("workspace_id").eq("kind", "meta_page").eq("config->>page_id", pageId).eq("status", "connected").limit(1).maybeSingle();
  if (error) fail("findWorkspaceByMetaPage", error);
  return data ? getWorkspaceById(db, data.workspace_id) : null;
}

/* ------------------------------------------------------------------------ */
/* api keys                                                                  */
/* ------------------------------------------------------------------------ */

export type ApiKeyRow = { id: string; workspace_id: string; name: string; key_hint: string; created_by: string | null; last_used_at: string | null; revoked_at: string | null; created_at: string };

export async function createApiKey(db: Db, workspaceId: string, userId: string | null, name: string): Promise<{ plaintext: string; row: ApiKeyRow }> {
  const key = mintKey("api");
  const { data, error } = await db
    .from("hq_api_keys")
    .insert({ workspace_id: workspaceId, name: name.slice(0, 80) || "Plugin key", key_hash: key.hash, key_hint: key.hint, created_by: userId })
    .select("id, workspace_id, name, key_hint, created_by, last_used_at, revoked_at, created_at")
    .single();
  if (error) fail("createApiKey", error);
  return { plaintext: key.plaintext, row: data as ApiKeyRow };
}

export async function listApiKeys(db: Db, workspaceId: string): Promise<ApiKeyRow[]> {
  const { data, error } = await db.from("hq_api_keys").select("id, workspace_id, name, key_hint, created_by, last_used_at, revoked_at, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) fail("listApiKeys", error);
  return (data ?? []) as ApiKeyRow[];
}

export async function revokeApiKey(db: Db, workspaceId: string, id: string): Promise<void> {
  const { error } = await db.from("hq_api_keys").update({ revoked_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("id", id);
  if (error) fail("revokeApiKey", error);
}

/* ------------------------------------------------------------------------ */
/* oauth                                                                     */
/* ------------------------------------------------------------------------ */

export type OAuthClient = { client_id: string; client_name: string; redirect_uris: string[]; client_uri: string | null; logo_uri: string | null; token_endpoint_auth_method: string };

export async function registerClient(db: Db, reg: RegistrationRequest): Promise<{ client: OAuthClient; clientSecret: string | null }> {
  const client_id = `lfpclient_${randomToken(24)}`;
  const clientSecret = reg.token_endpoint_auth_method === "client_secret_post" ? randomToken(40) : null;
  const { data, error } = await db
    .from("hq_oauth_clients")
    .insert({
      client_id,
      client_name: reg.client_name,
      redirect_uris: reg.redirect_uris,
      client_uri: reg.client_uri,
      logo_uri: reg.logo_uri,
      token_endpoint_auth_method: reg.token_endpoint_auth_method,
      ...(clientSecret ? { client_secret_hash: sha256Hex(clientSecret) } : {}),
    })
    .select("client_id, client_name, redirect_uris, client_uri, logo_uri, token_endpoint_auth_method")
    .single();
  if (error) fail("registerClient", error);
  return { client: data as OAuthClient, clientSecret };
}

/** True when the client is public, or the posted secret matches. */
export async function clientSecretOk(db: Db, clientId: string, secret: unknown): Promise<boolean> {
  const { data, error } = await db.from("hq_oauth_clients").select("token_endpoint_auth_method, client_secret_hash").eq("client_id", clientId).maybeSingle();
  if (error) fail("clientSecretOk", error);
  if (!data) return false;
  if (data.token_endpoint_auth_method !== "client_secret_post") return true;
  return typeof secret === "string" && !!data.client_secret_hash && sha256Hex(secret) === data.client_secret_hash;
}

export async function getClient(db: Db, clientId: string): Promise<OAuthClient | null> {
  if (!/^lfpclient_[a-z0-9]{24}$/.test(clientId)) return null;
  const { data, error } = await db.from("hq_oauth_clients").select("client_id, client_name, redirect_uris, client_uri, logo_uri, token_endpoint_auth_method").eq("client_id", clientId).maybeSingle();
  if (error) fail("getClient", error);
  return (data as OAuthClient) ?? null;
}

export async function saveAuthorizationCode(
  db: Db,
  input: { clientId: string; workspaceId: string; userId: string; redirectUri: string; codeChallenge: string; scope: string; resource: string | null },
): Promise<string> {
  const code = mintKey("code");
  const { error } = await db.from("hq_oauth_codes").insert({
    code_hash: code.hash,
    client_id: input.clientId,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    scope: input.scope,
    resource: input.resource,
    expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) fail("saveAuthorizationCode", error);
  return code.plaintext;
}

export type StoredCode = {
  code_hash: string;
  client_id: string;
  workspace_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  resource: string | null;
  expires_at: string;
  used_at: string | null;
};

/** Marks the code used atomically; a second exchange of the same code gets null. */
export async function consumeAuthorizationCode(db: Db, code: string): Promise<StoredCode | null> {
  if (keyKind(code) !== "code") return null;
  const { data, error } = await db
    .from("hq_oauth_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", hashKey(code))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (error) fail("consumeAuthorizationCode", error);
  return (data as StoredCode) ?? null;
}

export type IssuedTokens = { access_token: string; refresh_token: string; expires_in: number; scope: string; token_type: "Bearer" };

export async function issueTokens(db: Db, input: { clientId: string; workspaceId: string; userId: string; scope: string }): Promise<IssuedTokens> {
  const access = mintKey("access");
  const refresh = mintKey("refresh");
  const { error } = await db.from("hq_oauth_tokens").insert({
    access_hash: access.hash,
    refresh_hash: refresh.hash,
    client_id: input.clientId,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    scope: input.scope,
    access_expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) fail("issueTokens", error);
  return { access_token: access.plaintext, refresh_token: refresh.plaintext, expires_in: ACCESS_TOKEN_TTL_SECONDS, scope: input.scope, token_type: "Bearer" };
}

export type StoredToken = { id: string; client_id: string; workspace_id: string; user_id: string; scope: string; access_expires_at: string; refresh_expires_at: string | null; revoked_at: string | null };

/** Rotate: the old refresh token is revoked the moment the new pair is issued. */
export async function refreshTokens(db: Db, refreshToken: string, clientId: string): Promise<IssuedTokens | null> {
  if (keyKind(refreshToken) !== "refresh") return null;
  const { data, error } = await db
    .from("hq_oauth_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("refresh_hash", hashKey(refreshToken))
    .eq("client_id", clientId)
    .is("revoked_at", null)
    .gt("refresh_expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (error) fail("refreshTokens", error);
  if (!data) return null;
  const row = data as StoredToken;
  return issueTokens(db, { clientId: row.client_id, workspaceId: row.workspace_id, userId: row.user_id, scope: row.scope });
}

export async function revokeToken(db: Db, token: string): Promise<void> {
  const kind = keyKind(token);
  if (kind !== "access" && kind !== "refresh") return;
  const column = kind === "access" ? "access_hash" : "refresh_hash";
  const { error } = await db.from("hq_oauth_tokens").update({ revoked_at: new Date().toISOString() }).eq(column, hashKey(token)).is("revoked_at", null);
  if (error) fail("revokeToken", error);
}

export async function listTokensForWorkspace(db: Db, workspaceId: string): Promise<(StoredToken & { client_name: string; created_at: string; last_used_at: string | null })[]> {
  const { data, error } = await db
    .from("hq_oauth_tokens")
    .select("id, client_id, workspace_id, user_id, scope, access_expires_at, refresh_expires_at, revoked_at, created_at, last_used_at, hq_oauth_clients(client_name)")
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) fail("listTokensForWorkspace", error);
  type Row = StoredToken & { created_at: string; last_used_at: string | null; hq_oauth_clients: { client_name: string } | { client_name: string }[] | null };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const joined = Array.isArray(r.hq_oauth_clients) ? r.hq_oauth_clients[0] : r.hq_oauth_clients;
    const { hq_oauth_clients: _j, ...rest } = r;
    return { ...rest, client_name: joined?.client_name ?? "Connector" };
  });
}

export async function revokeTokenById(db: Db, workspaceId: string, id: string): Promise<void> {
  const { error } = await db.from("hq_oauth_tokens").update({ revoked_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("id", id);
  if (error) fail("revokeTokenById", error);
}

/* ------------------------------------------------------------------------ */
/* bearer resolution                                                         */
/* ------------------------------------------------------------------------ */

export type Principal = { workspace: Workspace; scopes: Set<string>; via: "api_key" | "oauth"; userId: string | null };

/** An API key or an OAuth access token becomes a workspace and a scope set, or nothing. */
export async function resolveBearer(db: Db, token: string, allScopes: readonly string[]): Promise<Principal | null> {
  const kind = keyKind(token);
  const now = new Date().toISOString();
  if (kind === "api") {
    const { data, error } = await db.from("hq_api_keys").select("id, workspace_id, revoked_at").eq("key_hash", hashKey(token)).maybeSingle();
    if (error) fail("resolveBearer.api", error);
    if (!data || data.revoked_at) return null;
    const workspace = await getWorkspaceById(db, data.workspace_id);
    if (!workspace) return null;
    void db.from("hq_api_keys").update({ last_used_at: now }).eq("id", data.id).then(() => undefined, () => undefined);
    return { workspace, scopes: new Set(allScopes), via: "api_key", userId: null };
  }
  if (kind === "access") {
    const { data, error } = await db.from("hq_oauth_tokens").select("id, workspace_id, user_id, scope, access_expires_at, revoked_at").eq("access_hash", hashKey(token)).maybeSingle();
    if (error) fail("resolveBearer.oauth", error);
    if (!data || data.revoked_at || data.access_expires_at <= now) return null;
    const workspace = await getWorkspaceById(db, data.workspace_id);
    if (!workspace) return null;
    void db.from("hq_oauth_tokens").update({ last_used_at: now }).eq("id", data.id).then(() => undefined, () => undefined);
    const scopes = new Set(String(data.scope ?? "").split(" ").filter(Boolean));
    return { workspace, scopes: scopes.size ? scopes : new Set(allScopes), via: "oauth", userId: data.user_id };
  }
  return null;
}
