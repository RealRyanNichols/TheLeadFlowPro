import "server-only";
import { NextResponse } from "next/server";
import { BUSINESS } from "@/lib/site/business";
import { getEntitlement, type Entitlement } from "./accessServer";
import { todayIn } from "./cadence";
import * as db from "./db";
import type { Account } from "./types";

// Shared plumbing for /api/chase-sheet/*. Every route answers with no-store,
// every mutation checks the request came from this site, and every data route
// starts by proving who is asking and that they are still entitled.

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const requestHost = request.headers.get("host") ?? new URL(request.url).host;
    return host === requestHost || origin === BUSINESS.siteUrl;
  } catch {
    return false;
  }
}

export async function readBody(request: Request, max = 120_000): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > max) throw new Error("Too much data");
  const parsed = raw ? JSON.parse(raw) : {};
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
}

export type SheetRequest = {
  client: db.Db;
  account: Account;
  email: string;
  today: string;
  entitlement: Entitlement;
};

/**
 * The account behind this request, or the response that says why not. With
 * `allowLapsed`, an account whose plan ended still gets through (so a former
 * subscriber can always export their own quotes).
 */
export async function requireSheet(options: { allowLapsed?: boolean } = {}): Promise<SheetRequest | NextResponse> {
  const entitlement = await getEntitlement();
  if (!entitlement.email) return json({ error: "Open your sheet with the email and key from your receipt." }, 401);
  if (entitlement.reason === "unconfigured") return json({ error: "The sheet is not switched on yet." }, 503);
  if (!entitlement.account || (!entitlement.entitled && !options.allowLapsed)) {
    return json({ error: "This sheet is not active. Restart the plan to keep chasing.", reason: entitlement.reason }, 402);
  }
  const client = db.serviceDb();
  if (!client) return json({ error: "The sheet is not switched on yet." }, 503);
  return {
    client,
    account: entitlement.account,
    email: entitlement.email,
    today: todayIn(entitlement.account.profile.timezone),
    entitlement,
  };
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
