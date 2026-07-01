import { NextResponse } from "next/server";
import { z } from "zod";
import { LEADFLOW_WIDGET_EVENT_NAMES } from "@/lib/leadflow-widget-definitions";
import { recordWidgetEvent } from "@/lib/leadflow-widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const WidgetEventSchema = z.object({
  widgetId: z.string().trim().min(2).max(120),
  eventName: z.enum(LEADFLOW_WIDGET_EVENT_NAMES),
  anonymousUserId: z.string().trim().max(140).optional().default(""),
  sourceDomain: z.string().trim().max(220).optional().default(""),
  pageUrl: z.string().trim().max(1200).optional().default(""),
  properties: z.record(z.unknown()).optional().default({}),
});

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function sourceDomainFromRequest(req: Request, body: { pageUrl?: string; sourceDomain?: string }) {
  try {
    const pageUrl = new URL(body.pageUrl || "");
    return pageUrl.hostname || body.sourceDomain || req.headers.get("origin") || req.headers.get("referer") || "";
  } catch {
    return body.sourceDomain || req.headers.get("origin") || req.headers.get("referer") || "";
  }
}

export async function POST(req: Request) {
  const parsed = WidgetEventSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid widget event." },
      { status: 400, headers: corsHeaders },
    );
  }

  const sourceDomain = sourceDomainFromRequest(req, parsed.data);
  const result = await recordWidgetEvent({
    ...parsed.data,
    sourceDomain,
    userAgent: req.headers.get("user-agent"),
    ipAddress: clientIp(req),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true, persisted: result.persisted }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
