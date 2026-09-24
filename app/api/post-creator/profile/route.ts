import * as db from "@/lib/postCreator/db";
import { profileIsReady, validateProfileInput } from "@/lib/postCreator/profile";
import { BodyError, apiError, isResponse, json, readBody, requirePostCreator, sameOrigin } from "@/lib/postCreator/server";

// Save the business profile the writer works from. The whole profile is sent
// and replaces the saved one. The first field that is too long or wrong comes
// back by name, with the message the form shows under it.

export const runtime = "nodejs";

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return apiError("forbidden", "Open Post Creator from theleadflowpro.com and try again.", 403);
  const pc = await requirePostCreator();
  if (isResponse(pc)) return pc;
  let body: Record<string, unknown>;
  try {
    body = await readBody(request, 8000);
  } catch (error) {
    const status = error instanceof BodyError ? error.status : 400;
    const message = error instanceof BodyError ? error.message : "Something in that request was off. Reload the page and try again.";
    return apiError(status === 413 ? "too_large" : "bad_request", message, status);
  }
  const checked = validateProfileInput(body.profile);
  if (!checked.ok) return apiError("bad_request", checked.error, 400, { field: checked.field });
  try {
    const profile = await db.saveProfile(pc.client, pc.email, checked.profile);
    return json({ ok: true, profile, ready: profileIsReady(profile) });
  } catch (error) {
    console.error("Post Creator profile save failed:", error instanceof Error ? error.message : "unknown error");
    return apiError("server_error", "Could not save right now. Try again in a minute.", 503);
  }
}
