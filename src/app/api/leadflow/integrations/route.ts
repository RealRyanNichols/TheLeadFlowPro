import { NextResponse } from "next/server";
import { z } from "zod";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_STATUSES,
  runBuyerIntegration,
  saveBuyerIntegration,
  updateBuyerIntegrationStatus,
} from "@/lib/leadflow-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IntegrationSchema = z.object({
  action: z.enum(["create", "update", "test", "run", "pause", "resume", "delete"]),
  integrationId: z.string().trim().optional(),
  provider: z.enum(INTEGRATION_PROVIDERS).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  status: z.enum(INTEGRATION_STATUSES).optional(),
  webhookUrl: z.string().trim().max(500).optional(),
  webhookSecret: z.string().trim().max(500).optional(),
  webhookSecretHeaderName: z.string().trim().max(80).optional(),
  eventType: z.string().trim().max(80).optional(),
  fieldMapping: z.record(z.unknown()).optional(),
  allowedListingIds: z.array(z.string().trim()).optional(),
  allowedVerticals: z.array(z.string().trim()).optional(),
  deliverySettings: z.record(z.unknown()).optional(),
  listingId: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const parsed = IntegrationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid integration request." }, { status: 400 });
  }

  const body = parsed.data;
  if (body.action === "create" || body.action === "update") {
    if (!body.provider || !body.name) {
      return NextResponse.json({ error: "Provider and integration name are required." }, { status: 400 });
    }
    const result = await saveBuyerIntegration({
      integrationId: body.integrationId || null,
      provider: body.provider,
      name: body.name,
      status: body.status,
      webhookUrl: body.webhookUrl || null,
      webhookSecret: body.webhookSecret || null,
      webhookSecretHeaderName: body.webhookSecretHeaderName || null,
      eventType: body.eventType || null,
      fieldMapping: body.fieldMapping,
      allowedListingIds: body.allowedListingIds,
      allowedVerticals: body.allowedVerticals,
      deliverySettings: body.deliverySettings,
    });
    if (!result.ok) return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
    return NextResponse.json({ ok: true, integration: result.integration, message: result.message }, { status: result.status });
  }

  if (!body.integrationId) {
    return NextResponse.json({ error: "Integration id is required." }, { status: 400 });
  }

  if (body.action === "test" || body.action === "run") {
    const result = await runBuyerIntegration({
      integrationId: body.integrationId,
      runType: body.action === "test" ? "test" : "manual",
      listingId: body.listingId || null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
    return NextResponse.json({ ok: true, run: result.run, message: result.message }, { status: result.status });
  }

  const status = body.action === "pause" ? "paused" : body.action === "resume" ? "active" : "revoked";
  const result = await updateBuyerIntegrationStatus({
    integrationId: body.integrationId,
    status,
  });
  if (!result.ok) return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
  return NextResponse.json({ ok: true, integration: result.integration, message: result.message }, { status: result.status });
}
