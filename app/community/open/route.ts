import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  communityReturnPath,
  communitySsoUrl,
  mintCommunityTicket,
  readCommunityConfig,
} from "@/lib/communityTicket";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function goTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303, headers: NO_STORE });
}

/**
 * The door to The Owners Room. Anyone with a LeadFlow Pro login gets in here:
 * signed out, they sign in (or sign up) first and come straight back. Every open
 * signs a fresh one-time ticket, so this link works again and again but a copied
 * room address never signs anyone in twice.
 */
export async function GET(request: NextRequest) {
  const to = communityReturnPath(request.nextUrl.searchParams.get("to"));
  const config = readCommunityConfig();
  if (!config) return goTo(new URL("/", request.url));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `/community/open?to=${encodeURIComponent(to)}`);
    return goTo(login);
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim() !== "") ?? "";
  const ticket = mintCommunityTicket({ id: user.id, email: user.email, name }, config.secret);
  return goTo(communitySsoUrl(config.origin, ticket, to));
}
