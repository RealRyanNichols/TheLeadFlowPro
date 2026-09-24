import * as db from "@/lib/chaseSheet/db";
import { isResponse, json, readBody, requireSheet, sameOrigin } from "@/lib/chaseSheet/server";

export const runtime = "nodejs";

/** Save the business profile: name, owner, trade, tone, start window, time zone. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  let body: Record<string, unknown>;
  try {
    body = await readBody(request, 8000);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const profile = await db.saveProfile(sheet.client, sheet.email, db.parseProfile({ ...sheet.account.profile, ...body }));
  return json({ ok: true, profile });
}
