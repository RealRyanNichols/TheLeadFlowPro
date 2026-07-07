// src/app/api/connect/collect/route.ts
//
// Receives events + leads from the /connect.js website embed (cross-origin from
// the buyer's own site, so CORS is open). Two event types:
//   { type: "view", key, url, referrer }              -> pixel / traffic signal
//   { type: "lead", key, name, email, answer, ... }   -> a captured lead
//
// Delivery is config-driven and DB-optional: if LEADFLOW_CONNECT_FORWARD_URL is
// set, each lead is forwarded there (Zapier/Make/webhook/CRM) server-side. With
// no config it validates and acknowledges, so the endpoint is safe to ship now.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function clean(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400, headers: CORS });
  }

  const key = clean(body.key, 80);
  const type = clean(body.type, 16) || "lead";
  if (!key) {
    return NextResponse.json({ ok: false, error: "missing site key" }, { status: 400, headers: CORS });
  }

  // Traffic pixel — record-and-forget. (Wire to analytics/site-pulse when desired.)
  if (type === "view") {
    return NextResponse.json({ ok: true, type: "view", stored: false }, { headers: CORS });
  }

  // Lead capture.
  const email = clean(body.email, 240).toLowerCase();
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "valid email required" }, { status: 422, headers: CORS });
  }

  const lead = {
    site_key: key,
    name: clean(body.name, 120),
    email,
    industry: clean(body.industry, 60),
    question: clean(body.question, 200),
    answer: clean(body.answer, 200),
    source_url: clean(body.url, 500),
    referrer: clean(body.referrer, 500),
    captured_at: clean(body.ts, 40) || new Date().toISOString(),
    source: "leadflow-connect",
  };

  let forwarded = false;
  const forwardUrl = process.env.LEADFLOW_CONNECT_FORWARD_URL;
  if (forwardUrl && /^https?:\/\//.test(forwardUrl)) {
    try {
      const res = await fetch(forwardUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      forwarded = res.ok;
    } catch {
      forwarded = false;
    }
  }

  return NextResponse.json({ ok: true, type: "lead", forwarded }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
