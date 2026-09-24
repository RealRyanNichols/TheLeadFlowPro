import { apiError, isResponse, json, requirePostCreator, sameOrigin, withClearedCookie } from "@/lib/postCreator/server";
import { buildSessionView } from "@/lib/postCreator/session";

// The buyer app in one read: the plan, whether it is entitled today, the
// saved profile, what is left of this month's AI writes, and whether AI
// writing and sales are on. A lapsed plan still gets its session (with
// entitled false), so the app can say why and offer billing.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pc = await requirePostCreator({ allowLapsed: true });
  if (isResponse(pc)) return pc;
  try {
    return json(await buildSessionView(pc.client, pc.entitlement, process.env, new Date()));
  } catch (error) {
    console.error("Post Creator session failed:", error instanceof Error ? error.message : "unknown error");
    return apiError("server_error", "Something broke on our side. Try again in a minute.", 500);
  }
}

/** Sign out of this device. Other devices stay signed in; the key from the receipt opens it again. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return apiError("forbidden", "Open Post Creator from theleadflowpro.com and try again.", 403);
  return withClearedCookie(json({ ok: true }));
}
