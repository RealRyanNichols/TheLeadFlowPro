import "server-only";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow, selectLeadFlowRows } from "@/lib/leadflow-data-api";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";
import {
  isSafeLeadFlowEventName,
  normalizeLeadFlowEventName,
  sanitizeLeadFlowEventProperties,
} from "@/lib/leadflow-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EventPayloadSchema = z.object({
  eventName: z.string().trim().min(2).max(120),
  properties: z.record(z.unknown()).optional().default({}),
  anonymousUserId: z.string().trim().min(8).max(120).optional().default(""),
  route: z.string().trim().max(700).optional().default(""),
  sourceUrl: z.string().trim().max(900).optional().default(""),
});

type AnonymousSessionRow = {
  id: string;
  anonymous_user_id: string;
};

const ALLOWED_QUERY_KEYS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);

function hashValue(value: string | null) {
  if (!value) return null;
  const salt = process.env.CONSENT_HASH_SALT || process.env.NEXTAUTH_SECRET || "leadflow-local-event-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function safePath(input: string, fallback = "/") {
  try {
    const url = new URL(input || fallback, "https://www.theleadflowpro.com");
    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (ALLOWED_QUERY_KEYS.has(key)) params.set(key, value.slice(0, 120));
    }
    const query = params.toString();
    return `${url.pathname}${query ? `?${query}` : ""}`.slice(0, 700);
  } catch {
    return fallback;
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

function safeSourceUrl(req: NextRequest, route: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "https://www.theleadflowpro.com";
  return new URL(route, configured).toString().slice(0, 900);
}

async function resolveActor(req: NextRequest) {
  const admin = await getAdminTokenSessionFromRequest(req).catch(() => null);
  if (admin) return { userRole: "admin", authUserId: admin.userId };

  const buyer = await getBuyerAuthState().catch(() => null);
  if (buyer?.authenticated) return { userRole: "buyer", authUserId: buyer.user.id };

  return { userRole: "anonymous", authUserId: null };
}

async function ensureAnonymousSession(input: {
  anonymousUserId: string;
  route: string;
  sourceUrl: string;
  userAgent: string | null;
}) {
  const cleanId = input.anonymousUserId.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 120);
  if (!cleanId || !hasLeadFlowDataApiConfig()) return null;

  const existing = await selectLeadFlowRows<AnonymousSessionRow>("anonymous_sessions", {
    select: "id,anonymous_user_id",
    anonymous_user_id: `eq.${cleanId}`,
    limit: 1,
  }).catch(() => []);
  if (existing[0]?.id) return existing[0].id;

  try {
    const inserted = await insertLeadFlowRow<AnonymousSessionRow>("anonymous_sessions", {
      anonymous_user_id: cleanId,
      source_url: input.sourceUrl,
      source_path: input.route,
      landing_page: input.route,
      user_agent_hash: hashValue(input.userAgent),
      metadata: {
        source: "privacy_safe_event_capture",
      },
    });
    return inserted[0]?.id || null;
  } catch {
    const retry = await selectLeadFlowRows<AnonymousSessionRow>("anonymous_sessions", {
      select: "id,anonymous_user_id",
      anonymous_user_id: `eq.${cleanId}`,
      limit: 1,
    }).catch(() => []);
    return retry[0]?.id || null;
  }
}

export async function POST(req: NextRequest) {
  const parsed = EventPayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, persisted: false, error: "Invalid event payload." }, { status: 400 });
  }

  const eventName = normalizeLeadFlowEventName(parsed.data.eventName);
  if (!isSafeLeadFlowEventName(eventName)) {
    return NextResponse.json({ ok: false, persisted: false, error: "Invalid event name." }, { status: 400 });
  }

  const route = safePath(parsed.data.route || parsed.data.sourceUrl || req.headers.get("referer") || "/");
  const properties = sanitizeLeadFlowEventProperties({
    ...parsed.data.properties,
    route,
  });

  if (!hasLeadFlowDataApiConfig()) {
    return NextResponse.json({ ok: true, persisted: false, mode: "missing_supabase_config" });
  }

  const { userRole, authUserId } = await resolveActor(req);
  const sourceUrl = safeSourceUrl(req, route);
  const anonymousSessionId = await ensureAnonymousSession({
    anonymousUserId: parsed.data.anonymousUserId,
    route,
    sourceUrl,
    userAgent: req.headers.get("user-agent"),
  });

  await insertLeadFlowRow("events", {
    anonymous_session_id: anonymousSessionId,
    event_name: eventName,
    event_type: userRole === "anonymous" ? "anonymous" : userRole,
    route,
    auth_user_id: authUserId,
    user_role: userRole,
    tool_slug: typeof properties.tool_slug === "string" ? properties.tool_slug : null,
    vertical: typeof properties.vertical === "string" ? properties.vertical : null,
    category: typeof properties.category === "string" ? properties.category : null,
    source_url: sourceUrl,
    source_path: route,
    ...utmFromPath(route),
    properties: {
      ...properties,
      user_role: userRole,
      persisted_via: "leadflow_events_api",
    },
  });

  return NextResponse.json({ ok: true, persisted: true });
}
