import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAndStoreBuyerRequestMatch } from "@/lib/matching/match-buyer-request";

export const runtime = "nodejs";

const requestTypes = ["sample", "access"] as const;

const BuyerRequestSchema = z
  .object({
    requestType: z.enum(requestTypes),
    listingId: z.string().trim().min(3).max(120),
    listingTitle: z.string().trim().min(3).max(180),
    category: z.string().trim().min(2).max(120),
    vertical: z.string().trim().min(2).max(120),
    sourcePath: z.string().trim().min(1).max(260).default("/marketplace"),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(40).optional().default(""),
    company: z.string().trim().min(2).max(160),
    website: z.string().trim().max(240).optional().default(""),
    buyerType: z.string().trim().max(120).optional().default(""),
    industry: z.string().trim().max(120).optional().default(""),
    leadNeed: z.string().trim().max(1400).optional().default(""),
    monthlyBudgetRange: z.string().trim().min(2).max(120),
    speed: z.string().trim().max(120).optional().default(""),
    intendedUse: z.string().trim().max(1600).optional().default(""),
    industryServed: z.string().trim().max(160).optional().default(""),
    geographyServed: z.string().trim().max(160).optional().default(""),
    accessPreference: z.string().trim().max(120).optional().default(""),
    notes: z.string().trim().max(1600).optional().default(""),
    consentAccepted: z.literal(true),
    reviewGatedAccepted: z.boolean().optional().default(false),
  })
  .superRefine((value, context) => {
    if (value.requestType === "access") {
      if (!value.phone) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Phone is required for access review.", path: ["phone"] });
      }
      if (!value.intendedUse || value.intendedUse.length < 12) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Intended use is required for access review.", path: ["intendedUse"] });
      }
      if (!value.industryServed) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Industry served is required for access review.", path: ["industryServed"] });
      }
      if (!value.geographyServed) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Geography served is required for access review.", path: ["geographyServed"] });
      }
      if (!value.accessPreference) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Access preference is required.", path: ["accessPreference"] });
      }
      if (!value.reviewGatedAccepted) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Review-gated agreement is required.", path: ["reviewGatedAccepted"] });
      }
    }

    if (value.requestType === "sample") {
      if (!value.buyerType) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Buyer type is required.", path: ["buyerType"] });
      }
      if (!value.industry) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Industry is required.", path: ["industry"] });
      }
      if (!value.leadNeed || value.leadNeed.length < 12) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Lead need is required.", path: ["leadNeed"] });
      }
      if (!value.speed) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Lead timing is required.", path: ["speed"] });
      }
    }
  });

function hashValue(value: string | null) {
  if (!value) return null;
  const salt = process.env.CONSENT_HASH_SALT || process.env.NEXTAUTH_SECRET || "leadflow-local-request-hash-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function requestIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
}

function cleanPath(path: string) {
  if (!path.startsWith("/marketplace")) return "/marketplace";
  return path.slice(0, 260);
}

function utmFromPath(path: string) {
  const url = new URL(path, "https://www.theleadflowpro.com");
  return {
    utm_source: url.searchParams.get("utm_source")?.slice(0, 120) || null,
    utm_medium: url.searchParams.get("utm_medium")?.slice(0, 120) || null,
    utm_campaign: url.searchParams.get("utm_campaign")?.slice(0, 160) || null,
  };
}

async function insertLeadFlowRow(table: string, row: Record<string, unknown>) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.LEADREP_BUS_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LEADREP_BUS_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { skipped: true as const, reason: "missing_supabase_credentials" };
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      "content-profile": "leadflow",
      "accept-profile": "leadflow",
      prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Buyer request persistence failed: ${response.status}`);
  }

  return { skipped: false as const, data: text ? (JSON.parse(text) as Array<{ id?: string }>) : null };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = BuyerRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid buyer request." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const sourcePath = cleanPath(data.sourcePath);
    const utm = utmFromPath(sourcePath);
    const requestId = crypto.randomUUID();
    const userAgent = req.headers.get("user-agent");
    const requestedAt = new Date().toISOString();

    const filters =
      data.requestType === "access"
        ? {
            accessPreference: data.accessPreference,
            industryServed: data.industryServed,
            geographyServed: data.geographyServed,
            monthlyBudgetRange: data.monthlyBudgetRange,
          }
        : {
            buyerType: data.buyerType,
            industry: data.industry,
            monthlyBudgetRange: data.monthlyBudgetRange,
            speed: data.speed,
          };

    const row = {
      request_type: data.requestType,
      vertical: data.vertical,
      category: data.category,
      buyer_use_case: data.requestType === "access" ? data.intendedUse : data.leadNeed,
      filters,
      status: "submitted",
      review_status: "pending",
      source_url: `https://www.theleadflowpro.com${sourcePath}`,
      source_path: sourcePath,
      ...utm,
      metadata: {
        request_id: requestId,
        listing_id: data.listingId,
        listing_title: data.listingTitle,
        buyer: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          company: data.company,
          website: data.website || null,
        },
        buyer_type: data.buyerType || null,
        industry: data.industry || null,
        industry_served: data.industryServed || null,
        geography_served: data.geographyServed || null,
        access_preference: data.accessPreference || null,
        monthly_budget_range: data.monthlyBudgetRange,
        speed: data.speed || null,
        notes: data.notes || null,
        consent: {
          accepted: data.consentAccepted,
          review_gated_accepted: data.reviewGatedAccepted,
          consent_text:
            "I agree that LeadFlow Pro may review this buyer request and contact me about access to the selected signal product.",
          consent_version: "marketplace-buyer-request-v1",
        },
        proof_controls: {
          public_preview_only: true,
          review_gated_release: true,
          suppression_check_required: true,
          no_sensitive_personal_preview: true,
        },
        hashes: {
          ip_hash: hashValue(requestIp(req)),
          user_agent_hash: hashValue(userAgent),
        },
        requested_at: requestedAt,
      },
    };

    const requestInsert = await insertLeadFlowRow("buyer_requests", row);
    const persisted = !requestInsert.skipped;
    const insertedId = persisted ? requestInsert.data?.[0]?.id : null;

    let matching: unknown = null;

    if (persisted) {
      await insertLeadFlowRow("events", {
        event_name: data.requestType === "access" ? "access_request_submitted" : "sample_request_submitted",
        event_type: "anonymous",
        route: sourcePath,
        user_role: "anonymous",
        tool_slug: "marketplace",
        vertical: data.vertical,
        category: data.category,
        source_url: `https://www.theleadflowpro.com${sourcePath}`,
        source_path: sourcePath,
        ...utm,
        properties: {
          user_role: "anonymous",
          request_id: requestId,
          buyer_request_id: insertedId,
          listing_id: data.listingId,
          request_type: data.requestType,
          persisted: true,
        },
      }).catch(() => null);

      if (insertedId) {
        matching = await runAndStoreBuyerRequestMatch({
          buyerRequestId: insertedId,
          buyerAccountId: null,
        }).catch((error) => ({
          ok: false,
          persisted: false,
          message: error instanceof Error ? error.message : "Buyer matching failed.",
          results: [],
        }));
      }
    }

    return NextResponse.json({
      ok: true,
      persisted,
      requestId: insertedId || requestId,
      mode: persisted ? "supabase" : "placeholder",
      matching,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Buyer request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
