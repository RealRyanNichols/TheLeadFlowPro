import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow } from "@/lib/leadflow-data-api";
import {
  SOURCE_SUBMISSION_VERSION,
  emptyPermissionAnswers,
  evaluateSourceRisk,
  reviewStatuses,
  sourceOriginOptions,
  sourceSubmissionTypes,
  sourceVerticals,
  type SourcePermissionAnswers,
} from "@/lib/source-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SAMPLE_FILE_BYTES = 2_500_000;
const TEXT_SAMPLE_LIMIT = 50_000;

const sourceTypeIds = new Set<string>(sourceSubmissionTypes.map((item) => item.id));
const originIds = new Set<string>(sourceOriginOptions.map((item) => item.id));
const verticalIds = new Set<string>(sourceVerticals);
const reviewStatusIds = new Set<string>(reviewStatuses);

const SourceSubmissionSchema = z.object({
  source_type: z.string().refine((value) => sourceTypeIds.has(value), "Invalid source type."),
  source_name: z.string().trim().min(3).max(180),
  source_url: z.string().trim().max(700).optional().default(""),
  short_description: z.string().trim().min(20).max(2000),
  vertical: z.string().refine((value) => verticalIds.has(value), "Invalid vertical."),
  categories: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  geography: z.string().trim().max(240).optional().default(""),
  buyer_type: z.string().trim().max(220).optional().default(""),
  best_use_case: z.string().trim().min(12).max(2000),
  data_fields_present: z.array(z.string().trim().min(1).max(120)).min(1).max(16),
  origin_type: z.string().refine((value) => originIds.has(value), "Invalid origin type."),
  origin_notes: z.string().trim().max(2000).optional().default(""),
  permission_claim: z.custom<SourcePermissionAnswers>((value) => Boolean(value && typeof value === "object")),
  restrictions: z.string().trim().max(2000).optional().default(""),
  sample_paste: z.string().max(20000).optional().default(""),
  url_list: z.string().max(12000).optional().default(""),
  sample_notes: z.string().trim().max(2000).optional().default(""),
  contributor_name: z.string().trim().min(2).max(180),
  contributor_email: z.string().trim().email().max(220).transform((value) => value.toLowerCase()),
  contributor_phone: z.string().trim().max(60).optional().default(""),
  contributor_company: z.string().trim().max(180).optional().default(""),
  contributor_website: z.string().trim().max(700).optional().default(""),
  payout_interest: z.boolean(),
  partnership_interest: z.boolean(),
  consent_accepted: z.literal(true),
  source_path: z.string().trim().min(1).max(700).default("/submit-source"),
  client_timestamp: z.string().datetime().optional(),
  submission_version: z.string().trim().max(80).default(SOURCE_SUBMISSION_VERSION),
});

type InsertedRow = {
  id?: string;
};

type FileLike = {
  name: string;
  type: string;
  size: number;
  text: () => Promise<string>;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formBoolean(formData: FormData, key: string) {
  return formString(formData, key) === "true";
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parsePermission(value: string): SourcePermissionAnswers {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return emptyPermissionAnswers();
    return { ...emptyPermissionAnswers(), ...(parsed as Partial<SourcePermissionAnswers>) };
  } catch {
    return emptyPermissionAnswers();
  }
}

function isFileLike(value: unknown): value is FileLike {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      "type" in value &&
      "size" in value &&
      "text" in value,
  );
}

function requestIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
}

function hashValue(value: string | null) {
  if (!value) return null;
  const salt = process.env.CONSENT_HASH_SALT || process.env.NEXTAUTH_SECRET || "leadflow-local-source-submission-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function sourcePathOnly(value: string) {
  try {
    const url = new URL(value, "https://www.theleadflowpro.com");
    if (url.pathname !== "/submit-source") return "/submit-source";
    return `${url.pathname}${url.search}`.slice(0, 700);
  } catch {
    return "/submit-source";
  }
}

function utmFromPath(path: string) {
  const url = new URL(path, "https://www.theleadflowpro.com");
  return {
    utm_source: url.searchParams.get("utm_source")?.slice(0, 120) || null,
    utm_medium: url.searchParams.get("utm_medium")?.slice(0, 120) || null,
    utm_campaign: url.searchParams.get("utm_campaign")?.slice(0, 160) || null,
    utm_term: url.searchParams.get("utm_term")?.slice(0, 120) || null,
    utm_content: url.searchParams.get("utm_content")?.slice(0, 160) || null,
  };
}

function sourceHash(data: z.infer<typeof SourceSubmissionSchema>) {
  return crypto
    .createHash("sha256")
    .update(
      [
        data.source_type,
        data.source_name.toLowerCase(),
        data.source_url.toLowerCase(),
        data.vertical,
        data.geography.toLowerCase(),
      ].join("|"),
    )
    .digest("hex");
}

function mimeCanTextPreview(file: FileLike) {
  return (
    file.type.startsWith("text/") ||
    file.name.toLowerCase().endsWith(".csv") ||
    file.name.toLowerCase().endsWith(".txt")
  );
}

async function safeFilePreview(file: FileLike | null, blocked: boolean) {
  if (!file || blocked || !mimeCanTextPreview(file)) return null;
  if (file.size > TEXT_SAMPLE_LIMIT) return null;
  const text = await file.text();
  return text.slice(0, TEXT_SAMPLE_LIMIT);
}

async function insertEvent(eventName: string, data: z.infer<typeof SourceSubmissionSchema>, riskLevel: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "server",
    route: sourcePathOnly(data.source_path),
    user_role: "anonymous",
    vertical: data.vertical,
    category: data.categories[0] ?? null,
    source_url: `https://www.theleadflowpro.com${sourcePathOnly(data.source_path)}`,
    source_path: sourcePathOnly(data.source_path),
    properties: {
      user_role: "anonymous",
      source_type: data.source_type,
      risk_level: riskLevel,
      ...properties,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sampleFile = isFileLike(formData.get("sample_file")) ? formData.get("sample_file") as FileLike : null;

    if (sampleFile && sampleFile.size > MAX_SAMPLE_FILE_BYTES) {
      return NextResponse.json({ error: "Sample file must be 2.5 MB or smaller." }, { status: 400 });
    }

    const raw = {
      source_type: formString(formData, "source_type"),
      source_name: formString(formData, "source_name"),
      source_url: formString(formData, "source_url"),
      short_description: formString(formData, "short_description"),
      vertical: formString(formData, "vertical"),
      categories: parseJsonArray(formString(formData, "categories")),
      geography: formString(formData, "geography"),
      buyer_type: formString(formData, "buyer_type"),
      best_use_case: formString(formData, "best_use_case"),
      data_fields_present: parseJsonArray(formString(formData, "data_fields_present")),
      origin_type: formString(formData, "origin_type"),
      origin_notes: formString(formData, "origin_notes"),
      permission_claim: parsePermission(formString(formData, "permission_claim")),
      restrictions: formString(formData, "restrictions"),
      sample_paste: formString(formData, "sample_paste"),
      url_list: formString(formData, "url_list"),
      sample_notes: formString(formData, "sample_notes"),
      contributor_name: formString(formData, "contributor_name"),
      contributor_email: formString(formData, "contributor_email"),
      contributor_phone: formString(formData, "contributor_phone"),
      contributor_company: formString(formData, "contributor_company"),
      contributor_website: formString(formData, "contributor_website"),
      payout_interest: formBoolean(formData, "payout_interest"),
      partnership_interest: formBoolean(formData, "partnership_interest"),
      consent_accepted: formBoolean(formData, "consent_accepted"),
      source_path: formString(formData, "source_path") || "/submit-source",
      client_timestamp: formString(formData, "client_timestamp") || undefined,
      submission_version: formString(formData, "submission_version") || SOURCE_SUBMISSION_VERSION,
    };

    const parsed = SourceSubmissionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid source submission." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const risk = evaluateSourceRisk({
      sourceType: data.source_type,
      originType: data.origin_type,
      dataFieldsPresent: data.data_fields_present,
      permission: data.permission_claim,
      restrictions: data.restrictions,
      sourceUrl: data.source_url,
    });
    const cleanPath = sourcePathOnly(data.source_path);
    const submittedAt = new Date().toISOString();
    const requestId = crypto.randomUUID();
    const ipHash = hashValue(requestIp(req));
    const userAgentHash = hashValue(req.headers.get("user-agent"));
    const sampleText = risk.blockedSampleStorage
      ? null
      : [data.sample_paste, data.url_list, data.sample_notes, await safeFilePreview(sampleFile, risk.blockedSampleStorage)]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, TEXT_SAMPLE_LIMIT) || null;

    if (!hasLeadFlowDataApiConfig()) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        submissionId: requestId,
        reviewStatus: data.permission_claim.researchOnly && risk.reviewStatus === "submitted" ? "approved_for_research" : risk.reviewStatus,
        riskLevel: risk.riskLevel,
        flags: risk.flags,
        warnings: risk.warnings,
      });
    }

    const contributorRows = await insertLeadFlowRow<InsertedRow>("contributor_accounts", {
      name: data.contributor_name,
      email: data.contributor_email,
      phone: data.contributor_phone || null,
      company_name: data.contributor_company || null,
      website_url: data.contributor_website || null,
      payout_interest: data.payout_interest,
      partnership_interest: data.partnership_interest,
      consent_version: data.submission_version,
      source_path: cleanPath,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      metadata: {
        request_id: requestId,
      },
    });
    const contributorId = contributorRows[0]?.id ?? null;
    const reviewStatus = data.permission_claim.researchOnly && risk.reviewStatus === "submitted"
      ? "approved_for_research"
      : risk.reviewStatus;

    if (!reviewStatusIds.has(reviewStatus)) {
      return NextResponse.json({ error: "Invalid computed review status." }, { status: 500 });
    }

    const sourceRows = await insertLeadFlowRow<InsertedRow>("submitted_sources", {
      contributor_id: contributorId,
      source_type: data.source_type,
      source_name: data.source_name,
      source_url: data.source_url || null,
      description: data.short_description,
      vertical: data.vertical,
      categories: data.categories,
      geography: data.geography || null,
      buyer_type: data.buyer_type || null,
      best_use_case: data.best_use_case,
      data_fields_present: data.data_fields_present,
      origin_type: data.origin_type,
      origin_notes: data.origin_notes || null,
      permission_claim: data.permission_claim,
      resale_claim: data.permission_claim.canBeResold ? "yes" : data.permission_claim.researchOnly ? "research_only" : "no",
      outreach_claim: data.permission_claim.canBeUsedForOutreach ? "yes" : data.permission_claim.researchOnly ? "research_only" : "no",
      sensitive_data_flag: risk.sensitiveDataFlag,
      minors_flag: risk.minorsFlag,
      restrictions: data.restrictions || null,
      review_status: reviewStatus,
      risk_level: risk.riskLevel,
      risk_flags: risk.flags,
      source_hash: sourceHash(data),
      source_url_submitted: data.source_url || null,
      source_path: cleanPath,
      ...utmFromPath(cleanPath),
      consent_version: data.submission_version,
      submitted_at: submittedAt,
      metadata: {
        request_id: requestId,
        warnings: risk.warnings,
        blocked_sample_storage: risk.blockedSampleStorage,
        client_timestamp: data.client_timestamp ?? null,
        form_version: SOURCE_SUBMISSION_VERSION,
      },
    });
    const submittedSourceId = sourceRows[0]?.id ?? null;

    if (submittedSourceId && (sampleFile || sampleText || data.url_list || data.sample_notes)) {
      await insertLeadFlowRow("source_uploads", {
        submitted_source_id: submittedSourceId,
        upload_type: sampleFile ? "file_sample" : "pasted_sample",
        file_name: sampleFile?.name ?? null,
        mime_type: sampleFile?.type || null,
        file_size_bytes: sampleFile?.size ?? null,
        storage_status: risk.blockedSampleStorage ? "metadata_only_blocked" : "metadata_only",
        sample_text: risk.blockedSampleStorage ? null : sampleText,
        url_list: data.url_list ? data.url_list.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 200) : [],
        notes: data.sample_notes || null,
        blocked_reason: risk.blockedSampleStorage ? risk.flags.join(",") : null,
        created_by_contributor_id: contributorId,
        metadata: {
          request_id: requestId,
          text_preview_included: Boolean(sampleText && !risk.blockedSampleStorage),
        },
      });
    }

    if (submittedSourceId) {
      await insertLeadFlowRow("source_reviews", {
        submitted_source_id: submittedSourceId,
        action: "submitted",
        from_status: null,
        to_status: reviewStatus,
        risk_level: risk.riskLevel,
        reviewer_type: "system",
        notes: risk.warnings.join("\n").slice(0, 2000) || null,
        metadata: {
          request_id: requestId,
          flags: risk.flags,
        },
      });

      await insertLeadFlowRow("audit_log", {
        actor_type: "public_contributor",
        action: "source_submission.created",
        object_schema: "leadflow",
        object_table: "submitted_sources",
        object_id: submittedSourceId,
        before_redacted: {},
        after_redacted: {
          review_status: reviewStatus,
          risk_level: risk.riskLevel,
          flags: risk.flags,
        },
        details: {
          request_id: requestId,
          source_type: data.source_type,
          vertical: data.vertical,
        },
        ip_hash: ipHash,
        user_agent_hash: userAgentHash,
      });
    }

    await insertEvent("source_submission_completed", data, risk.riskLevel, {
      submitted_source_id: submittedSourceId,
      review_status: reviewStatus,
      persisted: true,
      flag_count: risk.flags.length,
    });
    if (data.origin_type === "partner_owned" || data.payout_interest || data.partnership_interest) {
      await insertEvent("partner_source_submitted", data, risk.riskLevel, {
        submitted_source_id: submittedSourceId,
        review_status: reviewStatus,
        partner_origin: data.origin_type === "partner_owned",
        payout_interest: data.payout_interest,
        partnership_interest: data.partnership_interest,
      });
    }
    if (sampleFile) {
      await insertEvent("source_file_uploaded", data, risk.riskLevel, {
        submitted_source_id: submittedSourceId,
        storage_status: risk.blockedSampleStorage ? "metadata_only_blocked" : "metadata_only",
        file_size_bucket: sampleFile.size > 1_000_000 ? "large" : sampleFile.size > 100_000 ? "medium" : "small",
      });
    }
    if (risk.flags.length) {
      await insertEvent("source_submission_flagged", data, risk.riskLevel, {
        submitted_source_id: submittedSourceId,
        flag_count: risk.flags.length,
      });
    }

    return NextResponse.json({
      ok: true,
      persisted: true,
      submission: sourceRows[0],
      reviewStatus,
      riskLevel: risk.riskLevel,
      flags: risk.flags,
      warnings: risk.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source submission failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
