import { createHash, timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  BUSINESS_DIAGNOSTIC_CAMPAIGN,
  BUSINESS_DIAGNOSTIC_FIELDS,
  BUSINESS_DIAGNOSTIC_SECTIONS,
  BUSINESS_DIAGNOSTIC_SOURCE,
  BUSINESS_DIAGNOSTIC_VERSION,
  answerList,
  answerString,
  cleanDiagnosticAnswers,
  deriveDiagnosticTags,
  diagnosticInterest,
  diagnosticPriority,
  diagnosticReadinessLabel,
  diagnosticSummary,
  fieldVisible,
  missingRequiredFields,
  scoreDiagnosticCompleteness,
  scoreDiagnosticOpportunity,
  type DiagnosticAnswers,
} from "@/lib/businessDiagnostic";
import {
  DIAGNOSTIC_EMAIL_STEPS,
  verifyDiagnosticServerResumeToken,
  sendDiagnosticInternalAlert,
  sendDiagnosticNurtureStep,
  sendDiagnosticReceiptEmail,
  sendDiagnosticResumeEmail,
} from "@/lib/businessDiagnosticEmails";
import { SUPABASE_URL } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 150_000;
const MIN_SUBMIT_SECONDS = 3;
const RATE_WINDOW_MS = 10 * 60_000;
const POST_RATE_LIMIT = 20;
const GET_RATE_LIMIT = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

type DiagnosticAction = "save" | "submit";

type DiagnosticRow = {
  id: string;
  lead_id: string;
  request_id: string;
  resume_token_hash: string;
  status: "draft" | "submitted";
  form_version: number;
  answers: DiagnosticAnswers;
  source_channel: string;
  source_detail: string | null;
  referrer: string | null;
  utm: Record<string, string>;
  consent_snapshot: Record<string, unknown>;
  completeness_score: number;
  opportunity_score: number;
  tags: string[];
  core_completed_at: string | null;
  submitted_at: string | null;
  resume_expires_at: string;
  resume_state: "active" | "revoked";
  resume_revoked_at: string | null;
  resume_email_sent_at: string | null;
  email_campaign: string;
  email_campaign_status: "not_enrolled" | "active" | "completed" | "stopped";
  email_campaign_enrolled_at: string | null;
  email_campaign_completed_at: string | null;
  email_campaign_stopped_at: string | null;
  email_campaign_stop_reason: string | null;
  revision_count: number;
  created_at: string;
  updated_at: string;
};

type PersistResult = {
  row: DiagnosticRow;
  isNewDiagnostic: boolean;
  newlySubmitted: boolean;
  newlyEnrolled: boolean;
};

class PublicRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function response(body: object, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...extraHeaders,
    },
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function takeRateLimit(request: Request, kind: "get" | "post"): boolean {
  const now = Date.now();
  const key = `${kind}:${clientIp(request)}`;
  const limit = kind === "get" ? GET_RATE_LIMIT : POST_RATE_LIMIT;
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;

  if (rateBuckets.size > 2_000) {
    for (const [bucketKey, value] of rateBuckets) {
      if (value.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }
  return true;
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return (
      originUrl.host === requestUrl.host ||
      originUrl.host === "www.theleadflowpro.com" ||
      originUrl.host === "theleadflowpro.com"
    );
  } catch {
    return false;
  }
}

function serviceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) throw new PublicRequestError(503, "The form is temporarily unavailable.");
  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sameHash(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function resumeAccessAllowed(row: DiagnosticRow, token: string): boolean {
  const browserTokenMatches = sameHash(row.resume_token_hash, hashToken(token));
  const signedRequestId = verifyDiagnosticServerResumeToken(token);
  return (
    row.resume_state === "active" &&
    Date.parse(row.resume_expires_at) > Date.now() &&
    (browserTokenMatches || signedRequestId === row.request_id)
  );
}

function timestampAtOrAfterCreated(row: Pick<DiagnosticRow, "created_at">): string {
  const createdAt = Date.parse(row.created_at);
  return new Date(Math.max(Date.now(), Number.isFinite(createdAt) ? createdAt : 0)).toISOString();
}

function limitedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\0/g, "").trim().slice(0, maxLength);
  return clean || null;
}

function slug(value: unknown, fallback: string): string {
  const clean = limitedString(value, 100)
    ?.toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || fallback;
}

function cleanHttpUrl(value: string): string | null {
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

function sanitizeAnswers(input: unknown): DiagnosticAnswers {
  const answers = cleanDiagnosticAnswers(input);

  for (const field of BUSINESS_DIAGNOSTIC_FIELDS) {
    const value = answers[field.id];
    if (typeof value === "string") {
      const withoutNulls = value.replace(/\0/g, "").trim();
      if (!withoutNulls) {
        delete answers[field.id];
        continue;
      }
      if (field.type === "select") {
        const allowed = new Set((field.options ?? []).map((option) => option.value));
        if (!allowed.has(withoutNulls)) {
          delete answers[field.id];
          continue;
        }
      }
      if (field.type === "email") {
        const email = withoutNulls.toLowerCase();
        if (!EMAIL_RE.test(email) || email.length > 200) {
          delete answers[field.id];
          continue;
        }
        answers[field.id] = email;
        continue;
      }
      if (field.type === "url") {
        const url = cleanHttpUrl(withoutNulls);
        if (!url) {
          delete answers[field.id];
          continue;
        }
        answers[field.id] = url;
        continue;
      }
      answers[field.id] = withoutNulls;
    }
  }

  // Conditional answers can remain in local state after somebody changes an
  // earlier choice. Do not keep details the current form no longer shows.
  for (const field of BUSINESS_DIAGNOSTIC_FIELDS) {
    if (!fieldVisible(field, answers)) delete answers[field.id];
  }

  if (Buffer.byteLength(JSON.stringify(answers), "utf8") > 120_000) {
    throw new PublicRequestError(413, "Those answers are too large to save.");
  }
  return answers;
}

function sanitizeUtm(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const output: Record<string, string> = {};
  const keys = ["source", "medium", "campaign", "content", "term"] as const;
  for (const key of keys) {
    const value = limitedString(source[key] ?? source[`utm_${key}`], 100);
    if (value) output[key] = value;
  }
  return output;
}

function sanitizeReferrer(value: unknown): string | null {
  const raw = limitedString(value, 1_000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) ? url.toString().slice(0, 1_000) : null;
  } catch {
    return null;
  }
}

function validateStartedAt(value: unknown) {
  const startedAt =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Date.parse(value)
        : Number.NaN;
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < MIN_SUBMIT_SECONDS * 1_000) {
    throw new PublicRequestError(400, "Please take a moment to review the form before submitting.");
  }
}

function requireValidAnswers(answers: DiagnosticAnswers, action: DiagnosticAction) {
  const fullName = answerString(answers, "full_name");
  const email = answerString(answers, "email");
  const businessName = answerString(answers, "business_name");
  if (!fullName || !businessName || !EMAIL_RE.test(email)) {
    throw new PublicRequestError(400, "Name, business name, and a valid email are required to save.");
  }
  if (action !== "submit") return;

  const missing = missingRequiredFields(answers);
  if (missing.length) {
    throw new PublicRequestError(
      400,
      `Please complete the required fields: ${missing
        .slice(0, 5)
        .map((field) => field.label)
        .join(", ")}${missing.length > 5 ? ", and the other highlighted fields" : ""}.`,
    );
  }
  const contact = answerString(answers, "preferred_contact_method");
  if (["call", "text"].includes(contact) && !answerString(answers, "phone")) {
    throw new PublicRequestError(400, "Add a phone number or choose email as your contact method.");
  }
  if (answers.sms_consent === true && !answerString(answers, "phone")) {
    throw new PublicRequestError(400, "Add a phone number before selecting call or text permission.");
  }
}

function coreIsComplete(answers: DiagnosticAnswers): boolean {
  return BUSINESS_DIAGNOSTIC_SECTIONS.filter((section) => section.core)
    .flatMap((section) => section.fields)
    .filter((field) => field.required && fieldVisible(field, answers))
    .every((field) => {
      const value = answers[field.id];
      return typeof value === "boolean"
        ? value
        : typeof value === "string"
          ? value.trim().length > 0
          : Array.isArray(value) && value.length > 0;
    });
}

function resumeUrl(token: string): string {
  const url = new URL("https://www.theleadflowpro.com/diagnostic");
  url.searchParams.set("resume", token);
  return url.toString();
}

function desiredModules(answers: DiagnosticAnswers): string[] {
  const map: Record<string, string[]> = {
    website_repair: ["website_funnels"],
    new_website: ["website_funnels", "forms_tools"],
    shopify_ecommerce: ["website_funnels", "commerce_hub", "payments_checkout"],
    lead_generation: ["forms_tools", "ads_attribution"],
    crm: ["crm_pipeline", "admin_workspace"],
    follow_up: ["email_automation", "calls_texts"],
    ai_agents: ["ai_agent"],
    ads: ["ads_attribution"],
    social_media: ["analytics_reporting"],
    content: ["analytics_reporting"],
    analytics: ["analytics_reporting"],
    operations: ["admin_workspace", "connector_mcp"],
  };
  const modules = new Set<string>();
  for (const need of answerList(answers, "help_categories")) {
    for (const module of map[need] ?? []) modules.add(module);
  }
  return [...modules].slice(0, 20);
}

function compactAnswer(value: string, max = 500): string | null {
  return value ? value.slice(0, max) : null;
}

function compactDiagnostic(
  row: Pick<DiagnosticRow, "id" | "status" | "request_id" | "submitted_at">,
  answers: DiagnosticAnswers,
  completeness: number,
  opportunity: number,
  tags: string[],
) {
  return {
    source: BUSINESS_DIAGNOSTIC_SOURCE,
    campaign: BUSINESS_DIAGNOSTIC_CAMPAIGN,
    version: BUSINESS_DIAGNOSTIC_VERSION,
    submission_id: row.id,
    request_id: row.request_id,
    status: row.status,
    submitted_at: row.submitted_at,
    completeness_score: completeness,
    readiness_label: diagnosticReadinessLabel(completeness),
    opportunity_score: opportunity,
    tags,
    summary: {
      problem: compactAnswer(
        answerString(answers, "primary_problem") || answerString(answers, "situation_summary"),
      ),
      desired_outcome: compactAnswer(answerString(answers, "desired_outcome")),
      success_definition: compactAnswer(answerString(answers, "success_definition")),
      help_categories: answerList(answers, "help_categories"),
      timeframe: compactAnswer(answerString(answers, "timeframe"), 100),
      decision_role: compactAnswer(answerString(answers, "decision_role"), 100),
      website_state: compactAnswer(answerString(answers, "website_state"), 100),
      website_platform: compactAnswer(answerString(answers, "website_platform"), 100),
      website_issue_detail: compactAnswer(answerString(answers, "website_issue_detail")),
      facebook_page_status: compactAnswer(answerString(answers, "facebook_page_status"), 100),
      youtube_status: compactAnswer(answerString(answers, "youtube_status"), 100),
      crm_status: compactAnswer(answerString(answers, "crm_status"), 100),
      lead_response_time: compactAnswer(answerString(answers, "lead_response_time"), 100),
    },
  };
}

async function ensureLead(
  supabase: SupabaseClient,
  requestId: string,
  answers: DiagnosticAnswers,
  sourceChannel: string,
  utm: Record<string, string>,
): Promise<string> {
  const externalId = `business-diagnostic:${requestId}`;
  const existing = await supabase
    .from("leads")
    .select("id")
    .eq("external_id", externalId)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(`lead lookup failed: ${existing.error.code}`);
  if (existing.data?.id) return existing.data.id;

  const phone = answerString(answers, "phone") || null;
  const insert = await supabase
    .from("leads")
    .insert({
      full_name: answerString(answers, "full_name"),
      email: answerString(answers, "email").toLowerCase(),
      phone,
      business_name: answerString(answers, "business_name"),
      website_url: answerString(answers, "website_url") || null,
      current_platform: answerString(answers, "website_platform") || null,
      industry: answerString(answers, "industry") || null,
      desired_modules: desiredModules(answers),
      interest: diagnosticInterest(answers),
      goals: diagnosticSummary(answers),
      budget_range: answerString(answers, "initial_investment_range") || null,
      timeline: answerString(answers, "timeframe") || null,
      best_contact_method: answerString(answers, "preferred_contact_method") || "email",
      source: "website",
      utm_source: utm.source || sourceChannel,
      utm_medium: utm.medium || "questionnaire",
      utm_campaign: utm.campaign || BUSINESS_DIAGNOSTIC_CAMPAIGN,
      sms_consent: false,
      marketing_email_consent: false,
      external_id: externalId,
      diagnostic: {
        source: BUSINESS_DIAGNOSTIC_SOURCE,
        campaign: BUSINESS_DIAGNOSTIC_CAMPAIGN,
        version: BUSINESS_DIAGNOSTIC_VERSION,
        request_id: requestId,
        status: "draft",
      },
    })
    .select("id")
    .single();
  if (!insert.error && insert.data?.id) return insert.data.id;

  if (insert.error?.code === "23505") {
    const raced = await supabase
      .from("leads")
      .select("id")
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle();
    if (!raced.error && raced.data?.id) return raced.data.id;
  }
  throw new Error(`lead insert failed: ${insert.error?.code || "unknown"}`);
}

async function updateLead(
  supabase: SupabaseClient,
  leadId: string,
  row: DiagnosticRow,
  answers: DiagnosticAnswers,
  sourceChannel: string,
  utm: Record<string, string>,
  completeness: number,
  opportunity: number,
  priority: "normal" | "high" | "hot",
  tags: string[],
) {
  const submitted = row.status === "submitted";
  const phone = answerString(answers, "phone") || null;
  const sevenDayConsent = answers.seven_day_email_consent === true;
  const ongoingConsent = answers.ongoing_marketing_consent === true;
  const smsConsent = answers.sms_consent === true && Boolean(phone);
  const update: Record<string, unknown> = {
    full_name: answerString(answers, "full_name"),
    email: answerString(answers, "email").toLowerCase(),
    phone,
    business_name: answerString(answers, "business_name"),
    website_url: answerString(answers, "website_url") || null,
    current_platform: answerString(answers, "website_platform") || null,
    industry: answerString(answers, "industry") || null,
    desired_modules: desiredModules(answers),
    interest: diagnosticInterest(answers),
    goals: diagnosticSummary(answers),
    budget_range: answerString(answers, "initial_investment_range") || null,
    timeline: answerString(answers, "timeframe") || null,
    best_contact_method: answerString(answers, "preferred_contact_method") || "email",
    source: "website",
    utm_source: utm.source || sourceChannel,
    utm_medium: utm.medium || "questionnaire",
    utm_campaign: utm.campaign || BUSINESS_DIAGNOSTIC_CAMPAIGN,
    priority,
    diagnostic: compactDiagnostic(row, answers, completeness, opportunity, tags),
  };
  if (submitted) {
    update.sms_consent = smsConsent;
    update.marketing_email_consent = sevenDayConsent || ongoingConsent;
    update.next_follow_up_at = row.submitted_at;
    if (smsConsent || sevenDayConsent || ongoingConsent) update.consent_at = new Date().toISOString();
  }

  const result = await supabase.from("leads").update(update).eq("id", leadId);
  if (result.error) throw new Error(`lead update failed: ${result.error.code}`);
}

async function persistDiagnostic(input: {
  supabase: SupabaseClient;
  existing: DiagnosticRow | null;
  leadId: string;
  requestId: string;
  token: string;
  tokenHash: string;
  action: DiagnosticAction;
  answers: DiagnosticAnswers;
  sourceChannel: string;
  sourceDetail: string | null;
  referrer: string | null;
  utm: Record<string, string>;
  completeness: number;
  opportunity: number;
  tags: string[];
  attempt?: number;
}): Promise<PersistResult> {
  const now = input.existing
    ? timestampAtOrAfterCreated(input.existing)
    : new Date().toISOString();
  const status: "draft" | "submitted" =
    input.action === "submit" || input.existing?.status === "submitted" ? "submitted" : "draft";
  const wantsCampaign = input.answers.seven_day_email_consent === true;
  const consentSnapshot = {
    seven_day_email_consent: wantsCampaign,
    ongoing_marketing_consent: input.answers.ongoing_marketing_consent === true,
    sms_consent: input.answers.sms_consent === true && Boolean(answerString(input.answers, "phone")),
    privacy_terms_accepted: input.answers.privacy_terms_acceptance === true,
    captured_at: now,
    form_version: BUSINESS_DIAGNOSTIC_VERSION,
    campaign: BUSINESS_DIAGNOSTIC_CAMPAIGN,
  };
  const values = {
    answers: input.answers,
    source_channel: input.sourceChannel,
    source_detail: input.sourceDetail,
    referrer: input.referrer,
    utm: input.utm,
    consent_snapshot: consentSnapshot,
    completeness_score: input.completeness,
    opportunity_score: input.opportunity,
    tags: input.tags,
  };

  if (!input.existing) {
    const insert = await input.supabase
      .from("business_growth_diagnostics")
      .insert({
        lead_id: input.leadId,
        request_id: input.requestId,
        resume_token_hash: input.tokenHash,
        status: "draft",
        form_version: BUSINESS_DIAGNOSTIC_VERSION,
        ...values,
        core_completed_at: null,
        submitted_at: null,
        email_campaign: BUSINESS_DIAGNOSTIC_CAMPAIGN,
        email_campaign_status: "not_enrolled",
      })
      .select("*")
      .single();
    if (!insert.error && insert.data) {
      if (input.action === "submit") {
        const submitted = await persistDiagnostic({
          ...input,
          existing: insert.data as DiagnosticRow,
          leadId: insert.data.lead_id,
        });
        return { ...submitted, isNewDiagnostic: true };
      }
      return {
        row: insert.data as DiagnosticRow,
        isNewDiagnostic: true,
        newlySubmitted: false,
        newlyEnrolled: false,
      };
    }

    if (insert.error?.code === "23505" && (input.attempt ?? 0) < 1) {
      const raced = await input.supabase
        .from("business_growth_diagnostics")
        .select("*")
        .eq("request_id", input.requestId)
        .maybeSingle();
      if (!raced.error && raced.data) {
        if (!resumeAccessAllowed(raced.data as DiagnosticRow, input.token)) {
          throw new PublicRequestError(403, "That private resume link is not valid.");
        }
        return persistDiagnostic({
          ...input,
          existing: raced.data as DiagnosticRow,
          leadId: raced.data.lead_id,
          attempt: 1,
        });
      }
    }
    throw new Error(`diagnostic insert failed: ${insert.error?.code || "unknown"}`);
  }

  const shouldTransition = input.action === "submit" && input.existing.status === "draft";
  let campaignStatus = input.existing.email_campaign_status;
  let campaignEnrolledAt = input.existing.email_campaign_enrolled_at;
  let campaignCompletedAt = input.existing.email_campaign_completed_at;
  let campaignStoppedAt = input.existing.email_campaign_stopped_at;
  let campaignStopReason = input.existing.email_campaign_stop_reason;

  if (status === "submitted" && campaignStatus === "not_enrolled" && wantsCampaign) {
    campaignStatus = "active";
    campaignEnrolledAt = now;
  } else if (campaignStatus === "active" && !wantsCampaign) {
    campaignStatus = "stopped";
    campaignStoppedAt = now;
    campaignStopReason = "Consent withdrawn in the diagnostic form";
  }
  if (campaignStatus === "not_enrolled") {
    campaignEnrolledAt = null;
    campaignCompletedAt = null;
    campaignStoppedAt = null;
    campaignStopReason = null;
  }
  const newlyEnrolled =
    campaignStatus === "active" && input.existing.email_campaign_status !== "active";

  let query = input.supabase
    .from("business_growth_diagnostics")
    .update({
      ...values,
      status,
      submitted_at: input.existing.submitted_at || (status === "submitted" ? now : null),
      core_completed_at:
        input.existing.core_completed_at || (coreIsComplete(input.answers) ? now : null),
      email_campaign: BUSINESS_DIAGNOSTIC_CAMPAIGN,
      email_campaign_status: campaignStatus,
      email_campaign_enrolled_at: campaignEnrolledAt,
      email_campaign_completed_at: campaignCompletedAt,
      email_campaign_stopped_at: campaignStoppedAt,
      email_campaign_stop_reason: campaignStopReason,
      revision_count: input.existing.revision_count + 1,
    })
    .eq("id", input.existing.id)
    .eq("resume_state", "active")
    .gt("resume_expires_at", new Date().toISOString());
  if (shouldTransition) query = query.eq("status", "draft");
  const update = await query.select("*").maybeSingle();
  if (update.error) throw new Error(`diagnostic update failed: ${update.error.code}`);
  if (update.data) {
    return {
      row: update.data as DiagnosticRow,
      isNewDiagnostic: false,
      newlySubmitted: shouldTransition,
      newlyEnrolled,
    };
  }

  // Another request transitioned the same draft first. Keep the transition
  // idempotent, but still save the latest sanitized answers.
  const fresh = await input.supabase
    .from("business_growth_diagnostics")
    .select("*")
    .eq("id", input.existing.id)
    .single();
  if (fresh.error || !fresh.data) throw new Error("diagnostic race recovery failed");
  if (!resumeAccessAllowed(fresh.data as DiagnosticRow, input.token)) {
    throw new PublicRequestError(403, "That private resume link is not valid.");
  }
  return persistDiagnostic({
    ...input,
    existing: fresh.data as DiagnosticRow,
    leadId: fresh.data.lead_id,
    action: "save",
    attempt: (input.attempt ?? 0) + 1,
  });
}

async function createFollowUp(
  supabase: SupabaseClient,
  leadId: string,
  answers: DiagnosticAnswers,
  priority: "normal" | "high" | "hot",
) {
  const title = "Review Business Growth Diagnostic and follow up";
  const current = await supabase
    .from("lead_tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("title", title)
    .is("completed_at", null)
    .limit(1)
    .maybeSingle();
  if (current.error || current.data) return;

  const preferred = answerString(answers, "preferred_contact_method");
  const phone = answerString(answers, "phone");
  const canText = phone && answers.sms_consent === true;
  const taskType = preferred === "call" && phone ? "call" : preferred === "text" && canText ? "text" : "email";
  await supabase.from("lead_tasks").insert({
    lead_id: leadId,
    title,
    due_date: new Date().toISOString().slice(0, 10),
    priority,
    task_type: taskType,
  });
}

async function claimAndSendResumeEmail(
  supabase: SupabaseClient,
  row: DiagnosticRow,
  answers: DiagnosticAnswers,
  url: string,
): Promise<boolean> {
  if (row.resume_email_sent_at) return false;
  const claimedAt = timestampAtOrAfterCreated(row);
  const claim = await supabase
    .from("business_growth_diagnostics")
    .update({ resume_email_sent_at: claimedAt })
    .eq("id", row.id)
    .is("resume_email_sent_at", null)
    .select("id")
    .maybeSingle();
  if (claim.error || !claim.data) return false;

  const sent = await sendDiagnosticResumeEmail({
    fullName: answerString(answers, "full_name"),
    email: answerString(answers, "email"),
    resumeUrl: url,
    completenessScore: row.completeness_score,
  });
  if (!sent) {
    await supabase
      .from("business_growth_diagnostics")
      .update({ resume_email_sent_at: null })
      .eq("id", row.id)
      .eq("resume_email_sent_at", claimedAt);
  }
  return sent;
}

export async function GET(request: Request) {
  if (!takeRateLimit(request, "get")) {
    return response({ error: "Too many requests. Try again in a few minutes." }, 429, {
      "Retry-After": "600",
    });
  }

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || url.searchParams.get("resume") || "";
    if (!TOKEN_RE.test(token)) {
      return response({ error: "That private resume link is not valid." }, 400);
    }

    const supabase = serviceClient();
    const signedRequestId = verifyDiagnosticServerResumeToken(token);
    let query = supabase
      .from("business_growth_diagnostics")
      .select(
        "request_id, status, form_version, answers, completeness_score, opportunity_score, submitted_at, updated_at",
      )
      .eq("resume_state", "active")
      .gt("resume_expires_at", new Date().toISOString());
    query = signedRequestId
      ? query.eq("request_id", signedRequestId)
      : query.eq("resume_token_hash", hashToken(token));
    const result = await query.maybeSingle();
    if (result.error) throw new Error(`resume lookup failed: ${result.error.code}`);
    if (!result.data) return response({ error: "That private resume link was not found." }, 404);

    return response({ ok: true, ...result.data });
  } catch (error) {
    if (error instanceof PublicRequestError) {
      return response({ error: error.message }, error.status);
    }
    console.error("Business diagnostic resume failed:", error instanceof Error ? error.message : error);
    return response({ error: "Could not load those answers. Try again." }, 500);
  }
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return response({ error: "Request origin not allowed." }, 403);
  if (!takeRateLimit(request, "post")) {
    return response({ error: "Too many saves. Try again in a few minutes." }, 429, {
      "Retry-After": "600",
    });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return response({ error: "Those answers are too large to save." }, 413);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new PublicRequestError(400, "Bad request.");
    }
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
      throw new PublicRequestError(413, "Those answers are too large to save.");
    }
    if (limitedString(body.company_website, 200) || limitedString(body._gotcha, 200)) {
      // A successful no-op gives simple bots nothing useful to adapt to.
      return response({ ok: true, status: "saved" });
    }

    const action: DiagnosticAction = body.action === "submit" ? "submit" : "save";
    const requestId = limitedString(body.request_id, 50)?.toLowerCase() || "";
    const token = limitedString(body.resume_token, 140) || "";
    if (!UUID_RE.test(requestId) || !TOKEN_RE.test(token)) {
      throw new PublicRequestError(400, "Start a new questionnaire and try again.");
    }
    if (action === "submit") validateStartedAt(body.started_at);

    const answers = sanitizeAnswers(body.answers);
    requireValidAnswers(answers, action);
    const utm = sanitizeUtm(body.utm);
    const sourceChannel = slug(body.source_channel, "website");
    const sourceDetail = limitedString(body.source_detail, 200);
    const referrer = sanitizeReferrer(body.referrer);
    const tokenHash = hashToken(token);
    const completeness = scoreDiagnosticCompleteness(answers);
    const opportunity = scoreDiagnosticOpportunity(answers);
    const priority = diagnosticPriority(opportunity, answers);
    const tags = deriveDiagnosticTags(answers, sourceChannel);

    const supabase = serviceClient();
    const lookup = await supabase
      .from("business_growth_diagnostics")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();
    if (lookup.error) throw new Error(`diagnostic lookup failed: ${lookup.error.code}`);
    const existing = (lookup.data as DiagnosticRow | null) ?? null;
    if (existing && !resumeAccessAllowed(existing, token)) {
      throw new PublicRequestError(403, "That private resume link is not valid.");
    }

    const leadId = existing?.lead_id || (await ensureLead(supabase, requestId, answers, sourceChannel, utm));
    const persisted = await persistDiagnostic({
      supabase,
      existing,
      leadId,
      requestId,
      token,
      tokenHash,
      action,
      answers,
      sourceChannel,
      sourceDetail,
      referrer,
      utm,
      completeness,
      opportunity,
      tags,
    });
    await updateLead(
      supabase,
      persisted.row.lead_id,
      persisted.row,
      answers,
      sourceChannel,
      utm,
      completeness,
      opportunity,
      priority,
      tags,
    );

    const url = resumeUrl(token);
    let emailSent = false;
    let firstEmailSent = false;

    if (persisted.isNewDiagnostic && persisted.row.status === "draft") {
      await supabase.from("lead_activity").insert({
        lead_id: persisted.row.lead_id,
        kind: "system",
        detail: `Business Growth Diagnostic draft saved at ${completeness}% complete.`,
      });
    }

    if (action === "save" && persisted.row.status === "draft") {
      emailSent = await claimAndSendResumeEmail(supabase, persisted.row, answers, url);
    }

    if (persisted.newlySubmitted) {
      await createFollowUp(supabase, persisted.row.lead_id, answers, priority);
      await supabase.from("lead_activity").insert({
        lead_id: persisted.row.lead_id,
        kind: "system",
        detail: `Business Growth Diagnostic submitted at ${completeness}% complete. Priority: ${priority}.`,
      });

      await sendDiagnosticInternalAlert({
        leadId: persisted.row.lead_id,
        fullName: answerString(answers, "full_name"),
        businessName: answerString(answers, "business_name"),
        email: answerString(answers, "email"),
        phone: answerString(answers, "phone") || null,
        sourceChannel,
        priority,
        completenessScore: completeness,
        opportunityScore: opportunity,
        summary: diagnosticSummary(answers),
        tags,
      });

      if (!persisted.newlyEnrolled) {
        emailSent = await sendDiagnosticReceiptEmail({
          fullName: answerString(answers, "full_name"),
          email: answerString(answers, "email"),
          resumeUrl: url,
          completenessScore: completeness,
        });
      }
    }

    if (persisted.newlyEnrolled) {
      const result = await sendDiagnosticNurtureStep(
        supabase,
        {
          id: persisted.row.lead_id,
          full_name: answerString(answers, "full_name"),
          email: answerString(answers, "email"),
        },
        answers,
        url,
        DIAGNOSTIC_EMAIL_STEPS[0],
      );
      firstEmailSent = result === "sent" || result === "already_claimed";
      if (persisted.newlySubmitted && (result === "failed" || result === "skipped")) {
        emailSent = await sendDiagnosticReceiptEmail({
          fullName: answerString(answers, "full_name"),
          email: answerString(answers, "email"),
          resumeUrl: url,
          completenessScore: completeness,
        });
      }
    }

    return response({
      ok: true,
      request_id: requestId,
      status: persisted.row.status,
      completeness_score: completeness,
      opportunity_score: opportunity,
      readiness_label: diagnosticReadinessLabel(completeness),
      resume_url: url,
      email_sent: emailSent,
      first_email_sent: firstEmailSent,
    });
  } catch (error) {
    if (error instanceof PublicRequestError) {
      return response({ error: error.message }, error.status);
    }
    if (error instanceof SyntaxError) return response({ error: "Bad request." }, 400);
    console.error("Business diagnostic save failed:", error instanceof Error ? error.message : error);
    return response({ error: "Could not save your questionnaire. Try again." }, 500);
  }
}
