import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { sendInternalLeadAlert } from "@/lib/leadNotify";
import { deliverLeadEmailNotificationsForLead } from "@/lib/leadEmailNotifications";
import { dispatchSpeedToLeadWithBudget } from "@/lib/speedToLeadAlertsServer";
import { contractorFollowUp, metaAnswerLines } from "@/lib/metaLeadAnswers";
import {
  createMetaDailyEnrollment,
  hasMetaDailyEnrollment,
  hasMetaDailyDuplicateHold,
  readMetaDailyEnrollment,
} from "@/lib/metaDailyEnrollment";
import {
  syncResendContacts,
  readResendContactOptOuts,
  type ResendContactLead,
  type ResendContactSyncResult,
} from "@/lib/resendContacts";
import {
  isAllowedLeadFlowAdId,
  isAllowedMetaTestLeadId,
  isRegisteredMetaForm,
  LEADFLOW_META,
  metaRuntimeIdentityIssues,
  parseRegisteredFormIds,
  registeredMetaForm,
  registeredMetaFormIds,
} from "@/lib/metaCampaignGuard";

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
const LEADFLOW_META_RESEND_SEGMENT_ID = "f500eae4-6d02-4825-9aad-24808610deef";
const WORKSHOP_META_FORM_ID = "1749164796410610";
const MAX_FORM_PAGES = 100;
const NEW_META_REENTRY_START = Date.parse("2026-10-08T12:00:00.000Z");

export const maxDuration = 60;

// The LeadFlow Pro Facebook Page. An environment override may be used only
// when it is the exact same full ID; runtimeIdentityIssues fails closed on any
// other value before a lead is fetched or stored.
const PAGE_ID = process.env.META_PAGE_ID?.trim() || LEADFLOW_META.pageId;
const RUNTIME_IDENTITY_ISSUES = metaRuntimeIdentityIssues({
  pageId: PAGE_ID,
  supabaseUrl: SUPABASE_URL,
});

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
const cachedAdAccounts = new Map<string, string>();

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
  ad_id?: string;
  field_data?: MetaField[];
  custom_disclaimer_responses?: MetaDisclaimerResponse[];
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
    registeredMetaForm(raw.form_id)?.consentLayout ??
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
  const productChoice = pick(
    fields,
    "want_us_to_build_first",
    "want_built_first",
    "build_first",
  );
  const budgetRange = pick(
    fields,
    "prepared_to_invest",
    "traffic_and_follow_up",
    "first_30_days",
  );
  const product = (productChoice ?? "").toLowerCase();
  const desiredModules = [
    product.includes("website") ? "website_funnels" : null,
    product.includes("funnel") || product.includes("form") ? "website_funnels" : null,
    product.includes("tool") || product.includes("calculator") ? "forms_tools" : null,
    product.includes("crm") ? "crm_pipeline" : null,
    product.includes("follow-up") || product.includes("automation") ? "email_automation" : null,
    product.includes("archive") ? "archive_library" : null,
    product.includes("seo") ? "website_funnels" : null,
  ].filter((value, index, values): value is string => !!value && values.indexOf(value) === index);
  const consents = parseConsents(raw);
  const registration = registeredMetaForm(raw.form_id);
  // SMS: a checked box, or a registry form flagged textOnSubmit (Ryan's call
  // on 9/17/2026: the Rent Receipt intro promises a call or text back, so the
  // submission is the request for that one text). lib/quo.ts still fails
  // closed unless QUO_OUTBOUND_SMS_DISABLED is exactly "false", and ingest()
  // skips any number that ever sent STOP.
  const smsConsent = (consents.sms || !!registration?.textOnSubmit) && !!phone;
  // A checked marketing box is consent, and so is submitting one of the
  // registry's inquiryOptIn forms: those forms have no checkboxes because the
  // submission itself is the request to hear about that offer (Ryan,
  // 2026-09-07).
  const marketingEmailConsent = consents.marketing || !!registration?.inquiryOptIn;
  const capturedAt = new Date().toISOString();
  const hasDeliverableEmail = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/.test(email.trim()) &&
    !email.toLowerCase().includes("@no-email.");
  // This marker is server-owned and committed with the captured lead. Its
  // clock starts now, rather than restarting a provider-created old ledger.
  // Existing humans return from ingest before an insert, so their refusals,
  // opt-outs, prior claims and enrollment clocks remain unchanged.
  const dailyEnrollment = registration && marketingEmailConsent && hasDeliverableEmail &&
    raw.form_id !== WORKSHOP_META_FORM_ID
    ? createMetaDailyEnrollment(capturedAt, raw.id)
    : null;
  const campaign = registration?.campaign ?? "meta_lead_form";
  // The free website build was retired on 2026-09-22. Leads from the forms
  // that sold it are website leads now, filed under the paid Website Launch.
  const isWebsiteCampaign = campaign === "free_build_volume" || campaign.startsWith("free_website");

  // Everything the lead actually told us, kept verbatim so the admin view and
  // the alert email show real answers instead of an empty row.
  // Registered forms with answerLabels read in the words on the form.
  const answers = metaAnswerLines(fields.entries(), registration);
  // Pat's follow up grouping (v2 contractor form only) goes on top, and sets
  // the lead's priority so the priority group is easy to find.
  const followUp = registration?.funnel === "contractor_owner" ? contractorFollowUp(fields.entries()) : null;
  if (followUp) answers.unshift(followUp.label);

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
      desired_modules: desiredModules,
      interest: isWebsiteCampaign ? "website_launch" : "done_for_you",
      goals: answers.length ? answers.join("\n") : null,
      ...(followUp ? { priority: followUp.priority } : {}),
      budget_range: budgetRange,
      timeline,
      best_contact_method: phone ? "text" : "email",
      source: "meta_lead_ad",
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: campaign,
      // SMS consent comes ONLY from a checked box. Email follow-up comes from
      // a checked box or from an inquiryOptIn form (see registry).
      sms_consent: smsConsent,
      marketing_email_consent: marketingEmailConsent,
      consent_at: smsConsent || marketingEmailConsent ? capturedAt : null,
      external_id: `meta:${raw.id}`,
      diagnostic: {
        source: registration?.funnel ?? "meta_lead_form",
        notification_pipeline: "lead_intake_v1",
        meta_lead_id: raw.id,
        form_id: raw.form_id ?? null,
        ad_id: raw.ad_id ?? null,
        ad_attribution: raw.ad_id ? "ad_id_present" : "unverified_no_ad_id",
        fields: Object.fromEntries(fields),
        ...(dailyEnrollment ? { meta_daily30: dailyEnrollment } : {}),
      },
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
  const url = `${GRAPH}/${leadgenId}?fields=id,created_time,form_id,ad_id,field_data,custom_disclaimer_responses&access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url);
  if (!r.ok) {
    console.error("Meta lead fetch failed:", leadgenId, r.status, await r.text().catch(() => ""));
    return null;
  }
  return (await r.json()) as MetaLead;
}

async function paidLeadBelongsToLeadFlow(raw: MetaLead, token: string): Promise<boolean> {
  if (!isRegisteredMetaForm(raw.form_id)) {
    console.error("Meta lead rejected: form is not in the LeadFlow registry", raw.form_id ?? "<missing>");
    return false;
  }

  // A registered form is a LeadFlow form: the registry is compiled from this
  // Page's own forms and the webhook already rejects any other Page. What the
  // form cannot prove is which campaign paid for the lead, and that is an
  // attribution question, not an ownership one.
  //
  // MISSING ad_id IS THE NORMAL CASE, NOT A RED FLAG. The Page token this
  // route reads with has leads_retrieval but not ads_read, so Meta omits
  // ad_id from every lead it returns. Verified on 2026-09-03: all thirteen
  // historical leads, every one of them bought by a running ad, came back
  // with no ad_id, and from the Sep 1 deploy until this fix the route logged
  // "missing ad id" 4,680 times in 26 hours and would have dropped any new
  // paid lead on the floor. A lead on our own form with no ad id is kept and
  // its attribution is marked unverified. Only a lead that names an ad we
  // can prove belongs to someone else is refused.
  if (isAllowedLeadFlowAdId(raw.ad_id)) return true;
  if (!raw.ad_id) {
    if (isAllowedMetaTestLeadId(raw.id, process.env.META_TEST_LEAD_IDS)) {
      console.warn("Meta test lead accepted from explicit allowlist:", raw.id);
    } else {
      console.warn(
        "Meta lead accepted without ad id; attribution unverified",
        raw.id,
        raw.form_id ?? "<missing>",
      );
    }
    return true;
  }
  // An ad id we did not compile into the allowlist is usually an ad Ryan
  // created after the last deploy. Ask Meta whose account it belongs to; the
  // compiled list stays the fast path and the Graph lookup is the fallback.

  try {
    if (cachedAdAccounts.has(raw.ad_id)) {
      const cached = cachedAdAccounts.get(raw.ad_id);
      return cached === LEADFLOW_META.adAccountId;
    }
    const r = await fetch(
      `${GRAPH}/${raw.ad_id}?fields=account_id&access_token=${encodeURIComponent(token)}`,
    );
    if (!r.ok) {
      // Not proof of anything. The form is ours; only a definitive foreign
      // account answer may refuse the lead.
      console.warn("Meta ad account lookup failed; lead kept, attribution unverified", raw.ad_id, r.status);
      return true;
    }
    const body = (await r.json()) as { account_id?: string };
    if (body.account_id) cachedAdAccounts.set(raw.ad_id, body.account_id);
    if (body.account_id !== LEADFLOW_META.adAccountId) {
      console.error(
        "Meta lead rejected: ad belongs to a foreign account",
        raw.ad_id,
        body.account_id ?? "<missing>",
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Meta ad account lookup threw; lead kept, attribution unverified", raw.ad_id, error);
    return true;
  }
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
type ExistingLead = {
  id: string; external_id: string | null; full_name: string | null; email: string | null;
  status: string; marketing_email_consent: boolean | null; email_unsubscribed_at: string | null;
  diagnostic: unknown;
};

async function syncCapturedLeadToResend(lead: ResendContactLead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || lead.marketing_email_consent !== true || lead.email_unsubscribed_at ||
      !lead.email || lead.email.includes("@no-email.")) return;
  try {
    const deadlineAt = Date.now() + 8000;
    const signal = AbortSignal.timeout(8000);
    const result = await syncResendContacts({
      apiKey, segmentId: LEADFLOW_META_RESEND_SEGMENT_ID, leads: [lead], maxMutations: 2,
      fetcher: async (url, init) => {
        if (Date.now() >= deadlineAt) throw new Error("Contact sync deadline");
        const response = await fetch(url, { ...init, signal });
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const delay = Number.isFinite(retryAfter) ? Math.max(550, retryAfter * 1000) : 1000;
          if (Date.now() + delay >= deadlineAt) throw new Error("Contact sync deadline");
        }
        return response;
      },
    });
    console.info("Immediate Meta contact reconciliation:", {
      ok: result.ok, created: result.created, added_to_segment: result.added_to_segment,
      preserved_provider_opt_out: result.preserved_provider_opt_out, failed: result.failed,
    });
  } catch {
    console.error("Immediate Meta contact reconciliation deferred to the existing poll");
  }
}

type MappedLead = ReturnType<typeof mapLead>["lead"];

async function enrollExistingMetaMatch(
  supabase: { from: (table: string) => any }, hit: ExistingLead,
  lead: MappedLead, raw: MetaLead, token: string,
): Promise<void> {
  const marker = readMetaDailyEnrollment(lead.diagnostic);
  const apiKey = process.env.RESEND_API_KEY;
  const email = String(hit.email ?? "").trim().toLowerCase();
  const submittedAt = Date.parse(raw.created_time ?? "");
  if (!marker || !apiKey || hit.marketing_email_consent !== true || hit.email_unsubscribed_at ||
      !["new", "contacted"].includes(hit.status) || !email || email.includes("@no-email.") ||
      email !== lead.email.trim().toLowerCase() || hasMetaDailyEnrollment(hit.diagnostic) ||
      hasMetaDailyDuplicateHold(hit.diagnostic)) return;
  // The routine recovery poll must not silently migrate old cohorts before
  // the reviewed owner-only migration. Only a genuinely new verified Meta
  // submission may enroll an existing unmarked website/legacy prospect.
  if (!Number.isFinite(submittedAt) || submittedAt < NEW_META_REENTRY_START ||
      submittedAt > Date.now() + 5 * 60_000) return;
  const exactEmailPattern = email.replace(/[\\%_]/g, character => `\\${character}`);
  const { data: sameAddress, error: addressError } = await supabase.from("leads")
    .select("id,diagnostic").ilike("email", exactEmailPattern).is("deleted_at", null).not("is_test", "is", true);
  if (addressError || !Array.isArray(sameAddress) || sameAddress.some((row: { id: string; diagnostic?: unknown }) =>
    row.id !== hit.id && !(row.diagnostic && typeof row.diagnostic === "object" &&
      !Array.isArray(row.diagnostic) &&
      (row.diagnostic as Record<string, unknown>).meta_daily30_duplicate_of === hit.id))) return;
  if (!(await paidLeadBelongsToLeadFlow(raw, token))) return;
  const { data: history, error: historyError } = await supabase.from("lead_emails")
    .select("step,delivery_status").eq("lead_id", hit.id);
  if (historyError || !Array.isArray(history) || history.some((row: { step: number; delivery_status: string }) =>
    row.delivery_status !== "sent" || (row.step >= 701 && row.step <= 830))) return;
  const provider = await readResendContactOptOuts({ apiKey });
  if (!provider.ok || provider.emails.has(email)) return;
  const prior = hit.diagnostic && typeof hit.diagnostic === "object" && !Array.isArray(hit.diagnostic)
    ? hit.diagnostic as Record<string, unknown> : {};
  // Merge exactly once against the complete previously read JSON. Lifecycle
  // filters are repeated in this write so a staff refusal/opt-out wins a race.
  let update = supabase.from("leads").update({ diagnostic: { ...prior, meta_daily30: marker } })
    .eq("id", hit.id).eq("email", hit.email).eq("marketing_email_consent", true).is("email_unsubscribed_at", null)
    .is("deleted_at", null).not("is_test", "is", true).in("status", ["new", "contacted"]);
  update = hit.diagnostic === null || hit.diagnostic === undefined
    ? update.is("diagnostic", null) : update.eq("diagnostic", JSON.stringify(hit.diagnostic));
  const { data: changed, error } = await update.select("id").maybeSingle();
  if (error || !changed) return;
  await syncCapturedLeadToResend({ full_name: hit.full_name, email: hit.email,
    marketing_email_consent: true, email_unsubscribed_at: null });
}

async function claimExisting(
  supabase: { from: (t: string) => any },
  external_id: string,
  email: string,
  phone: string | null,
  lead: MappedLead,
  raw: MetaLead,
  token: string,
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
    .select("id,external_id,full_name,email,status,marketing_email_consent,email_unsubscribed_at,diagnostic")
    .is("deleted_at", null)
    .not("is_test", "is", true)
    .or(or.join(","))
    .limit(100);

  const matches = (data as ExistingLead[] | null) ?? [];
  const hit = matches.find(row => hasMetaDailyEnrollment(row.diagnostic)) ??
    matches.find(row => !hasMetaDailyDuplicateHold(row.diagnostic)) ?? matches[0];
  if (!hit) return false;

  // Multiple pre-existing records require the reviewed canonical/duplicate
  // repair. Never enroll a new second ledger or override conflicting consent.
  if (matches.length === 1) await enrollExistingMetaMatch(supabase, hit, lead, raw, token);

  if (!hit.external_id) {
    await supabase.from("leads").update({ external_id }).eq("id", hit.id);
  }

  // Quiet toward the person, loud toward Ryan. Someone who fills out a paid
  // lead form a second time is raising their hand again, and that used to be
  // absorbed with no alert and no trace. The activity row keyed on the Meta
  // lead id is the idempotency marker, so a five-minute poll that sees the
  // same submission again does not alert twice.
  const detail = `Submitted a Facebook lead form again: ${external_id}.`.slice(0, 1000);
  try {
    const { data: seen } = await supabase
      .from("lead_activity")
      .select("id")
      .eq("lead_id", hit.id)
      .eq("detail", detail)
      .limit(1);
    if (!(seen as unknown[] | null)?.length) {
      await sendInternalLeadAlert({
        full_name: lead?.full_name || real || "Facebook lead",
        email: real || `${digits ?? "unknown"}@no-email.facebook.lead`,
        phone,
        business_name: lead?.business_name ?? null,
        interest: lead?.interest || "unsure",
        goals: `REPEAT SUBMISSION. This person is already in the CRM (lead ${hit.id}) and just filled out a Facebook lead form again. ${lead?.goals || ""}`.trim(),
        source: "meta_lead_ad",
        utm_source: lead?.utm_source ?? "facebook",
        sms_consent: false,
      }, { leadId: hit.id });
      await supabase.from("lead_activity").insert({ lead_id: hit.id, kind: "system", detail });
      // A repeat inquiry is recorded for staff; it does not undo a previous
      // refusal, sales status, unsubscribe or automatic-series decision.
    }
  } catch (e) {
    console.error("meta repeat-lead alert failed:", e instanceof Error ? e.message : e);
  }
  return true;
}

// Insert if new, then attempt the transactional email jobs and optional text.
// Returns true only when this call created the row, so a webhook and a
// backfill poll racing on the same lead cannot double-contact the applicant.
async function ingest(raw: MetaLead, token: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);
  const { lead, external_id } = mapLead(raw);

  // The five-minute poll returns the same hundred leads every run. A lead
  // that is already in the CRM needs no ownership check, no Graph lookup and
  // no log line; before this check every historical lead was re-judged
  // (and re-logged) 288 times a day.
  const { data: known } = await supabase
    .from("leads")
    .select("id,external_id,full_name,email,status,marketing_email_consent,email_unsubscribed_at,diagnostic")
    .eq("external_id", external_id)
    .limit(1)
    .maybeSingle();
  if (known) {
    await enrollExistingMetaMatch(supabase, known as ExistingLead, lead, raw, token);
    return false;
  }

  if (!(await paidLeadBelongsToLeadFlow(raw, token))) return false;

  if (await claimExisting(supabase, external_id, lead.email, lead.phone, lead, raw, token)) return false;

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

  await Promise.all([
    // Contact creation sends no email. Try this individual persisted lead
    // now, so a signed webhook need not wait for the five-minute poll. The
    // existing reconciler preserves native opt-outs; the poll retries a
    // temporary contact-provider failure without replaying the welcome.
    syncCapturedLeadToResend({ full_name: lead.full_name, email: lead.email,
      marketing_email_consent: lead.marketing_email_consent, email_unsubscribed_at: null }),
    // The lead insert trigger committed both email jobs with the lead. Attempt
    // them immediately; a protected cron retries any provider failure without
    // relying on Meta to redeliver an already-persisted lead.
    (async () => {
      try {
        await deliverLeadEmailNotificationsForLead(supabase, data.id);
      } catch (error) {
        console.error(
          "Immediate Meta lead email delivery failed; queued retry remains:",
          error instanceof Error ? error.message : error,
        );
      }
    })(),
    // Speed to lead: the staff text and the one automatic first text, the
    // only sender of it. A number that ever sent STOP stays silent even when
    // it comes back through a textOnSubmit form: the global STOP list is
    // checked inside the sender (lib/quo.ts) and outranks the form.
    dispatchSpeedToLeadWithBudget(supabase, data.id),
  ]);
  return true;
}

async function syncLiveMetaLeadsToResend(): Promise<ResendContactSyncResult | { skipped: string }> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!serviceKey || !resendKey) return { skipped: "missing database or email configuration" };

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const { data, error } = await supabase
    .from("leads")
    .select("full_name,email,source,diagnostic,marketing_email_consent,email_unsubscribed_at")
    .or("source.eq.meta_lead_ad,diagnostic->meta_daily30.not.is.null")
    .is("deleted_at", null)
    .not("is_test", "is", true);
  if (error) {
    console.error("Resend contact source query failed:", error.message);
    return { skipped: "lead query failed" };
  }

  const result = await syncResendContacts({
    apiKey: resendKey,
    leads: (data ?? []).filter(lead => lead.source === "meta_lead_ad" || readMetaDailyEnrollment(lead.diagnostic)),
    segmentId: LEADFLOW_META_RESEND_SEGMENT_ID,
  });
  console.info("Resend contact reconciliation:", {
    eligible: result.eligible,
    contacts_before: result.contacts_before,
    segment_members_before: result.segment_members_before,
    created: result.created,
    added_to_segment: result.added_to_segment,
    marked_unsubscribed: result.marked_unsubscribed,
    preserved_provider_opt_out: result.preserved_provider_opt_out,
    already_present: result.already_present,
    deferred: result.deferred,
    failed: result.failed,
  });
  return result;
}

function signatureOk(body: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  // Fail CLOSED. This used to `return true` when the secret was missing, so
  // that an unconfigured deploy would not drop leads. META_APP_SECRET is set
  // now, and leaving the escape hatch in means the endpoint silently reopens
  // to forged leads the moment that variable goes missing.
  //
  // Failing closed does not cost leads. Meta retries a non-200 for hours, and
  // the GET backfill poll on this same route pulls leads straight from the
  // Graph API every five minutes regardless of what the webhook did. There are
  // two independent paths in; only this one is reachable by strangers.
  if (!secret) return false;
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (RUNTIME_IDENTITY_ISSUES.length) {
    console.error("Meta lead route identity guard failed:", RUNTIME_IDENTITY_ISSUES.join("; "));
    return NextResponse.json({ error: "LeadFlow runtime identity mismatch" }, { status: 503 });
  }

  // 1. Meta's webhook handshake.
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verify = url.searchParams.get("hub.verify_token");
  if (mode === "subscribe" && challenge) {
    const expected = process.env.META_VERIFY_TOKEN;
    if (!expected || verify !== expected) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse(challenge, { status: 200 });
  }

  // 2. Backfill poll. Pulls recent leads per form and ingests anything new.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const requested = parseRegisteredFormIds(
    url.searchParams.get("form_ids") || process.env.META_LEAD_FORM_IDS,
  );
  if (requested.unknown.length) {
    console.error("Meta poll rejected unknown form IDs:", requested.unknown.join(","));
    return NextResponse.json({ error: "Unknown Meta form ID" }, { status: 400 });
  }
  // Poll every centrally registered LeadFlow form. The Vercel variable is an
  // optional subset/compatibility input, not a second source of truth: a form
  // that has passed the registry's ownership and consent review must not go
  // dark merely because an environment variable was not updated after the ad
  // was published.
  const formIds = [...new Set([...registeredMetaFormIds(), ...requested.ids])];

  // Lead persistence must not go dark when the email provider is temporarily
  // unavailable. The transactional outbox keeps email failures retryable; the
  // database and Meta credentials are the ingestion gate.
  if (!token || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Missing LeadFlow Meta or database configuration" },
      { status: 503 },
    );
  }

  const readToken = await pageToken(token);

  let diagnosed = false;
  let imported = 0;
  let seen = 0;
  let incompleteForms = 0;
  for (const formId of formIds) {
    let after: string | null = null;
    const cursors = new Set<string>();
    let complete = false;
    for (let page = 0; page < MAX_FORM_PAGES; page++) {
      const url = new URL(`${GRAPH}/${formId}/leads`);
      url.searchParams.set("fields", "id,created_time,form_id,ad_id,field_data,custom_disclaimer_responses");
      url.searchParams.set("limit", "100");
      url.searchParams.set("access_token", readToken);
      if (after) url.searchParams.set("after", after);
      let r: Response;
      try {
        r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      } catch {
        console.error("Meta form poll transport failure:", formId);
        break;
      }
      if (!r.ok) {
        // Response bodies and opaque paging URLs can contain credentials or
        // private lead values. Only aggregate/status diagnostics are needed.
        console.error("Meta form poll failed:", formId, r.status);
        // Use the existing redacted ownership diagnostics once per run.
        if (!diagnosed) {
          diagnosed = true;
          await logTokenDiagnostics(token, readToken);
        }
        break;
      }
      let body: {
        data?: MetaLead[]; paging?: { next?: string; cursors?: { after?: string } };
      };
      try { body = await r.json(); } catch { break; }
      if (!Array.isArray(body.data)) break;
      for (const raw of body.data) {
        seen++;
        if (await ingest(raw, token)) imported++;
      }
      if (!body.paging?.next) { complete = true; break; }
      const cursor = body.paging.cursors?.after;
      if (typeof cursor !== "string" || !cursor || cursor.length > 2000 || cursors.has(cursor)) break;
      cursors.add(cursor);
      after = cursor;
    }
    if (!complete) incompleteForms++;
  }

  const resendContacts = await syncLiveMetaLeadsToResend();
  return NextResponse.json({ ok: incompleteForms === 0, seen, imported,
    incomplete_forms: incompleteForms, resend_contacts: resendContacts },
    { status: incompleteForms ? 503 : 200 });
}

export async function POST(request: Request) {
  const body = await request.text();

  if (RUNTIME_IDENTITY_ISSUES.length) {
    console.error("Meta lead webhook identity guard failed:", RUNTIME_IDENTITY_ISSUES.join("; "));
    return NextResponse.json({ error: "LeadFlow runtime identity mismatch" }, { status: 503 });
  }

  if (!signatureOk(body, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Missing LeadFlow Meta or database configuration" },
      { status: 503 },
    );
  }

  let payload: {
    entry?: {
      id?: string;
      changes?: { field?: string; value?: { leadgen_id?: string } }[];
    }[];
  };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let imported = 0;
  const readToken = await pageToken(token);
  for (const entry of payload.entry ?? []) {
    if (entry.id !== LEADFLOW_META.pageId) {
      console.error("Meta webhook rejected foreign Page ID:", entry.id ?? "<missing>");
      continue;
    }
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;
      const raw = await fetchLead(leadgenId, readToken);
      if (raw && (await ingest(raw, token))) imported++;
    }
  }

  // Meta retries anything that is not a fast 200. Do not hold the webhook
  // open for provider reconciliation; the protected five-minute GET poll
  // owns that retryable work.
  return NextResponse.json({ ok: true, imported });
}
