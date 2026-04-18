/**
 * POST /api/inbound/form/[formKey]
 *
 * Public lead-form endpoint. Accepts JSON or url-encoded form data and
 * creates a Lead + inbound "form" Message. formKey is per-user so we
 * never expose userIds in embed code.
 *
 * Accepted fields: name, email, phone, message/notes, service, budget,
 * source_tag (for UTM/landing-page attribution).
 *
 * CORS: open GET/POST — users will embed the form on their own domain.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createLead, logMessage } from "@/lib/leads";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { formKey: string };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const Body = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(4000).optional(),
  service: z.string().trim().max(200).optional(),
  budget: z.string().trim().max(50).optional(),
  source_tag: z.string().trim().max(200).optional(),
});

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request, { params }: Ctx) {
  const user = await prisma.user.findFirst({
    where: { formKey: params.formKey },
    select: { id: true, businessName: true },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "Unknown form" },
      { status: 404, headers: CORS },
    );
  }

  // Accept either JSON or classic form-encoded — whichever the user's
  // embedded form posts.
  let raw: Record<string, unknown> = {};
  const ctype = req.headers.get("content-type") ?? "";
  try {
    if (ctype.includes("application/json")) {
      raw = (await req.json()) as Record<string, unknown>;
    } else {
      const fd = await req.formData();
      fd.forEach((v, k) => {
        raw[k] = typeof v === "string" ? v : String(v);
      });
    }
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Invalid payload" },
      { status: 400, headers: CORS },
    );
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        reason: parsed.error.errors[0]?.message ?? "Invalid fields",
      },
      { status: 400, headers: CORS },
    );
  }

  const p = parsed.data;
  const note = p.notes || p.message || null;

  // Need at least one way to contact them.
  if (!p.email && !p.phone) {
    return NextResponse.json(
      { ok: false, reason: "Please include an email or phone number." },
      { status: 400, headers: CORS },
    );
  }

  const lead = await createLead({
    userId: user.id,
    name: p.name ?? null,
    email: p.email || null,
    phone: p.phone ?? null,
    source: "form",
    notes: note,
    meta: {
      service: p.service,
      budget: p.budget,
      source_tag: p.source_tag,
      ua: req.headers.get("user-agent") ?? undefined,
      referer: req.headers.get("referer") ?? undefined,
    },
  });

  if (note) {
    await logMessage({
      leadId: lead.id,
      direction: "inbound",
      channel: "note",
      body: note,
      sentBy: "web_form",
    });
  }

  return NextResponse.json({ ok: true, id: lead.id }, { headers: CORS });
}
