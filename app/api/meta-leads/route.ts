import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { notifyNewLead } from "@/lib/leadNotify";

// Facebook/Instagram instant form leads → the same pipeline as the website
// form. Before this existed, a lead ad submission stopped dead in Meta's Leads
// Center: no row in Supabase, no alert to Ryan, no text back. Someone filled
// out the form and heard nothing.
//
// Two ways in, on purpose:
//   POST  — Meta's leadgen webhook. Instant. Signature-checked.
//   GET   — two jobs: Meta's webhook handshake (hub.challenge), and a manual
//           or scheduled backfill poll when called with the cron secret. The
//           poll is the safety net for anything the webhook missed.
//
// Env it needs (all missing → safe no-op, nothing breaks):
//   META_PAGE_ACCESS_TOKEN  long-lived Page token with leads_retrieval
//   META_APP_SECRET         to verify webhook signatures
//   META_VERIFY_TOKEN       any string you also type into Meta's webhook setup
//   META_LEAD_FORM_IDS      comma-separated form ids, for the backfill poll
//   CRON_SECRET             guards the backfill poll
//   SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, QUO_API_KEY

const GRAPH = "https://graph.facebook.com/v21.0";

// The LeadFlow Pro Facebook Page.
const PAGE_ID = process.env.META_PAGE_ID || "887023637835514";

// Reading a form's leads needs a PAGE access token. The token in
// META_PAGE_ACCESS_TOKEN is a system user token, which is not the same thing:
// Meta answers /{form_id}/leads with "Object with ID does not exist, cannot be
// loaded due to missing permissions" (code 100, subcode 33), which reads like a
// wrong ID and is really a wrong token type. So trade the system user token for
// the Page's own token first.
//
// Cached for the life of the lambda. Page tokens derived from a non-expiring
// system user token do not expire either, and a cold start just fetches again.
let cachedPageToken: string | null = null;

async function pageToken(systemToken: string): Promise<string> {
  if (cachedPageToken) return cachedPageToken;
  try {
    const r = await fetch(
      `${GRAPH}/${PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(systemToken)}`,
    );
    if (r.ok) {
      const j = (await r.json()) as { access_token?: string };
      if (j.access_token) {
        cachedPageToken = j.access_token;
        return cachedPageToken;
      }
    } else {
      console.error("Meta page token exchange failed:", r.status, await r.text().catch(() => ""));
    }
  } catch (e) {
    console.error("Meta page token exchange error:", e);
  }
  // Fall back rather than go dark. If the system token happens to work, leads
  // still flow; if it does not, the per-form error below says so plainly.
  return systemToken;
}

type MetaField = { name?: string; values?: string[] };
type MetaDisclaimerResponse = { checkbox_key?: string; is_checked?: string | boolean };
type MetaLead = {
  id: string;
  created_time?: string;
  form_id?: string;
  field_data?: MetaField[];
  custom_disclaimer_responses?: MetaDisclaimerResponse[];
};

// Which campaign a form belongs to, for attribution. Add new form ids here
// when a new instant form is published (the id only exists after publish).
const FORM_CAMPAIGNS: Record<string, string> = {
  "1674448410325108": "mall-video-leadform",
  "2311682272983064": "mall-video-leadform",
  // LFP | Time Back Business Review | v1 — published 2026-08-20, the Time
  // Back campaign's form. Also listed in META_LEAD_FORM_IDS in Vercel.
  "2235052820606054": "time_back",
  // LFP | Fix First Form | v1 — published 2026-08-25, the picture lead ad
  // campaign's form. Also add to META_LEAD_FORM_IDS in Vercel.
  "1794058118689457": "fix_first",
};

// Which optional consent checkbox is which, PER FORM.
//
// Meta returns custom disclaimer checkboxes with generated keys, so sorted
// position is the only ordering available. That is fine when every form has
// the same boxes in the same order, and silently wrong the moment one does
// not. The Fix First form has exactly ONE box and it is the email opt-in;
// reading position 0 as "sms" recorded a marketing opt-in as a texting
// opt-in and left marketing false, so nobody who asked for the daily email
// would have been enrolled in it.
//
// Add a row here whenever a new form is published. A form that is missing
// falls back to the legacy two-box order.
const FORM_CONSENT_LAYOUT: Record<string, ReadonlyArray<"sms" | "marketing">> = {
  // Two boxes: call/text consent, then 30-day email consent.
  "2235052820606054": ["sms", "marketing"],
  // One box: the daily email series only. The form copy says in as many
  // words "No automated marketing texts," so there is no SMS consent here.
  "1794058118689457": ["marketing"],
};
const LEGACY_CONSENT_LAYOUT: ReadonlyArray<"sms" | "marketing"> = ["sms", "marketing"];

// Fallback for a form that was published in Ads Manager but not yet added to
// FORM_CONSENT_LAYOUT above. Reading a lone checkbox as position 0 of the
// legacy order records an SMS opt-in nobody gave AND leaves marketing false,
// so the person never gets the daily email they actually asked for. Every
// single-box form on this account is the email opt-in, and the standing rule
// is that no automated marketing texts go out at all, so infer by box count
// and never infer "sms" from one box.
function inferLayout(boxCount: number): ReadonlyArray<"sms" | "marketing"> {
  if (boxCount === 1) return ["marketing"];
  return LEGACY_CONSENT_LAYOUT;
}

// Reads the optional consent checkboxes using that form's layout above.
// Forms with no checkboxes at all (the old free-build ones) get no text and
// no marketing email, which is the playbook rule: a phone number alone is
// not consent.
function parseConsents(raw: MetaLead): { sms: boolean; marketing: boolean } {
  const boxes = [...(raw.custom_disclaimer_responses ?? [])].sort((a, b) =>
    String(a.checkbox_key ?? "").localeCompare(String(b.checkbox_key ?? "")),
  );
  const checked = (r?: MetaDisclaimerResponse) =>
    r ? r.is_checked === true || r.is_checked === "1" || r.is_checked === "true" : false;

  const layout =
    (raw.form_id ? FORM_CONSENT_LAYOUT[raw.form_id] : undefined) ??
    inferLayout(boxes.length);

  const out = { sms: false, marketing: false };
  layout.forEach((kind, i) => {
    if (checked(boxes[i])) out[kind] = true;
  });
  // Unchecked or absent means NO, always. A phone number alone is not consent.
  return out;
}

// Meta names custom questions after the question text, slugged. Match loosely
// so a wording tweak in the form does not silently drop the answer.
function pick(fields: Map<string, string>, ...needles: string[]): string | null {
  for (const [k, v] of fields) {
    for (const n of needles) {
      if (k.includes(n)) return v || null;
    }
  }
  return null;
}

function mapLead(raw: MetaLead) {
  const fields = new Map<string, string>();
  for (const f of raw.field_data ?? []) {
    if (!f?.name) continue;
    fields.set(String(f.name).toLowerCase(), (f.values ?? [])[0] ?? "");
  }

  const email = pick(fields, "email") ?? "";
  const full_name =
    pick(fields, "full_name", "full name") ??
    [pick(fields, "first_name"), pick(fields, "last_name")].filter(Boolean).join(" ").trim();
  const phone = pick(fields, "phone");

  const industry = pick(fields, "kind_of_business", "what_kind_of_business");
  // "website_right_now" catches the Free Build Volume form's "What do you have
  // for a website right now?"; the other two catch the older Qualified forms.
  const platform = pick(fields, "have_online", "online_right_now", "website_right_now");
  const timeline = pick(fields, "how_soon", "want_this_built", "want_this_moving");
  const consents = parseConsents(raw);

  // Everything the lead actually told us, kept verbatim so the admin view and
  // the alert email show real answers instead of an empty row.
  const answers = [...fields.entries()]
    .filter(([k]) => !/^(email|phone_number|full_name|first_name|last_name)$/.test(k))
    .map(([k, v]) => `${k.replace(/_/g, " ").replace(/\?$/, "")}: ${v}`);

  return {
    external_id: `meta:${raw.id}`,
    lead: {
      full_name: full_name || "Facebook lead",
      email: email || `${raw.id}@no-email.facebook.lead`,
      phone: phone || null,
      business_name: null,
      website_url: null,
      current_platform: platform,
      industry,
      desired_modules: [] as string[],
      interest: "done_for_you",
      goals: answers.length ? answers.join("\n") : null,
      budget_range: null,
      timeline,
      best_contact_method: phone ? "text" : "email",
      source: "meta_lead_ad",
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: FORM_CAMPAIGNS[raw.form_id ?? ""] ?? "meta_lead_form",
      // Consent comes ONLY from the form's own optional checkboxes. No
      // checkbox checked means no text and no marketing email, full stop.
      sms_consent: consents.sms && !!phone,
      marketing_email_consent: consents.marketing,
      consent_at: new Date().toISOString(),
      external_id: `meta:${raw.id}`,
      diagnostic: { meta_lead_id: raw.id, form_id: raw.form_id ?? null, fields: Object.fromEntries(fields) },
    },
  };
}

// Read-only. Answers, in one cron run, the three questions that actually
// separate the possible causes: who does Meta think this token is, did the
// Page token exchange really work, and which permissions were granted.
async function logTokenDiagnostics(systemToken: string, readToken: string) {
  const probe = async (label: string, path: string, tok: string) => {
    try {
      const r = await fetch(`${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(tok)}`);
      const raw = await r.text().catch(() => "");
      // NEVER log a token. This diagnostic previously printed the response
      // body verbatim, and one of the probes below asks for a Page's
      // access_token field, so a live Page token (EAA..., ~200 chars) was
      // landing in Vercel's logs every time the poll failed - which is the
      // exact condition this diagnostic exists for, on a 5 minute cron.
      const body = raw
        .replace(/EAA[A-Za-z0-9]{20,}/g, "<token redacted>")
        .replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"<redacted>"');
      console.error(`Meta diag ${label}: ${r.status} ${body.slice(0, 500)}`);
    } catch (e) {
      console.error(`Meta diag ${label} threw:`, e);
    }
  };

  console.error("Meta diag: page token exchange produced a different token =", readToken !== systemToken);
  await probe("me(system)", "me?fields=id,name", systemToken);
  await probe("permissions(system)", "me/permissions", systemToken);
  // Deliberately does NOT request access_token. Whether the exchange produced
  // a token is already answered by the line above; the token's value is never
  // needed to diagnose anything and asking for it only puts it on the wire.
  await probe("page(system)", `${PAGE_ID}?fields=id,name`, systemToken);
  await probe("me(read)", "me?fields=id,name", readToken);
  await probe("page-forms(read)", `${PAGE_ID}/leadgen_forms?fields=id,name&limit=5`, readToken);
}

async function fetchLead(leadgenId: string, token: string): Promise<MetaLead | null> {
  const url = `${GRAPH}/${leadgenId}?fields=id,created_time,form_id,field_data,custom_disclaimer_responses&access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url);
  if (!r.ok) {
    console.error("Meta lead fetch failed:", leadgenId, r.status, await r.text().catch(() => ""));
    return null;
  }
  return (await r.json()) as MetaLead;
}

// Someone can already be in the leads table without an external_id: recovered
// by hand out of Leads Center, or they filled in the website form first and the
// ad form second. The unique index on external_id cannot see those, so a poll
// would insert a duplicate row and text a real person a second time.
//
// So before inserting, look for the same human by email or phone. If they are
// already here, stamp the external_id onto the row we already have and stay
// quiet. Nobody gets contacted twice, and the next poll now dedupes on the
// index like everything else.
type ExistingLead = { id: string; external_id: string | null };

async function claimExisting(
  supabase: { from: (t: string) => any },
  external_id: string,
  email: string,
  phone: string | null,
): Promise<boolean> {
  const real = email && !email.endsWith("@no-email.facebook.lead") ? email : null;
  const digits = phone ? phone.replace(/\D/g, "").slice(-10) : null;
  if (!real && !digits) return false;

  const or: string[] = [];
  if (real) or.push(`email.ilike.${real}`);
  if (digits) or.push(`phone.ilike.%${digits}`);

  // Only a LIVE row counts as "already here". Without these filters a
  // soft-deleted or test row matching the same email or phone swallowed the
  // lead: claimExisting returned true, ingest returned false, no new row was
  // created and no alert fired. A paid lead would land in a deleted record and
  // be invisible. Deleting junk in the admin must never make a future real
  // lead disappear.
  const { data } = await supabase
    .from("leads")
    .select("id, external_id")
    .is("deleted_at", null)
    .not("is_test", "is", true)
    .or(or.join(","))
    .limit(1);

  const hit = (data as ExistingLead[] | null)?.[0];
  if (!hit) return false;

  if (!hit.external_id) {
    await supabase.from("leads").update({ external_id }).eq("id", hit.id);
  }
  return true;
}

// Insert if new, then alert. Returns true only when this call created the row,
// so a webhook and a backfill poll racing on the same lead cannot double-text.
async function ingest(raw: MetaLead): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);
  const { lead, external_id } = mapLead(raw);

  if (await claimExisting(supabase, external_id, lead.email, lead.phone)) return false;

  const { data, error } = await supabase
    .from("leads")
    .insert(lead)
    .select("id")
    .single();

  if (error) {
    // 23505 = unique violation on external_id. Already handled, not a failure.
    if ((error as { code?: string }).code === "23505") return false;
    console.error("Meta lead insert failed:", external_id, error.message);
    return false;
  }
  if (!data) return false;

  await notifyNewLead(lead);
  return true;
}

function signatureOk(body: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // not configured yet → do not lock Ryan out
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // 1. Meta's webhook handshake.
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verify = url.searchParams.get("hub.verify_token");
  if (mode === "subscribe" && challenge) {
    const expected = process.env.META_VERIFY_TOKEN;
    if (expected && verify !== expected) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse(challenge, { status: 200 });
  }

  // 2. Backfill poll. Pulls recent leads per form and ingests anything new.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const formIds = (url.searchParams.get("form_ids") || process.env.META_LEAD_FORM_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token || !formIds.length) {
    return NextResponse.json({ ok: true, skipped: "missing META_PAGE_ACCESS_TOKEN or META_LEAD_FORM_IDS" });
  }

  const readToken = await pageToken(token);

  let diagnosed = false;
  let imported = 0;
  let seen = 0;
  for (const formId of formIds) {
    const r = await fetch(
      `${GRAPH}/${formId}/leads?fields=id,created_time,form_id,field_data,custom_disclaimer_responses&limit=100&access_token=${encodeURIComponent(readToken)}`,
    );
    if (!r.ok) {
      console.error("Meta form poll failed:", formId, r.status, await r.text().catch(() => ""));
      // Subcode 33 on a form id reads like "wrong id" and is almost always
      // "wrong token" or "app cannot see this Page". Guessing costs a deploy
      // per guess, so say plainly what Meta thinks this token is. Names and
      // ids only, never the token itself.
      if (!diagnosed) {
        diagnosed = true;
        await logTokenDiagnostics(token, readToken);
      }
      continue;
    }
    const { data } = (await r.json()) as { data?: MetaLead[] };
    for (const raw of data ?? []) {
      seen++;
      if (await ingest(raw)) imported++;
    }
  }

  return NextResponse.json({ ok: true, seen, imported });
}

export async function POST(request: Request) {
  const body = await request.text();

  if (!signatureOk(body, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: true, skipped: "missing META_PAGE_ACCESS_TOKEN" });

  let payload: { entry?: { changes?: { field?: string; value?: { leadgen_id?: string } }[] }[] };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let imported = 0;
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;
      const raw = await fetchLead(leadgenId, await pageToken(token));
      if (raw && (await ingest(raw))) imported++;
    }
  }

  // Meta retries anything that is not a fast 200.
  return NextResponse.json({ ok: true, imported });
}
