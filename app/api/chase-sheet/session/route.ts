import { NextResponse } from "next/server";
import { CHASE_COOKIE, chaseCookieOptions } from "@/lib/chaseSheet/access";
import * as db from "@/lib/chaseSheet/db";
import { accountView } from "@/lib/chaseSheet/plan";
import { isResponse, json, requireSheet, sameOrigin } from "@/lib/chaseSheet/server";
import { buildSheet } from "@/lib/chaseSheet/sheet";

// The whole sheet in one read: the plan, the profile, today's work, every
// quote, every touch. Rebuilt on the server on every request, so what the
// owner sees is always computed from the rows, never from a cached page.

export const runtime = "nodejs";

export async function GET() {
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  const [quotes, touches] = await Promise.all([db.listQuotes(sheet.client, sheet.email), db.listTouches(sheet.client, sheet.email)]);
  return json({
    account: accountView(sheet.account),
    profile: sheet.account.profile,
    today: sheet.today,
    sheet: buildSheet(quotes, touches, sheet.account.profile, sheet.today),
    quotes,
    touches,
  });
}

/** Sign out of this device. The key from the receipt opens it again. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  res.cookies.set(CHASE_COOKIE, "", { ...chaseCookieOptions(), maxAge: 0 });
  return res;
}
