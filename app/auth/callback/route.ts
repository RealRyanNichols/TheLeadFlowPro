import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authDestination, safeAuthNext } from "@/lib/authRedirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeAuthNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const failure = () => {
    const destination = new URL("/login", url.origin);
    destination.searchParams.set("auth_error", "link_expired");
    if (next === "/account/password")
      destination.searchParams.set("mode", "reset");
    else if (next) destination.searchParams.set("next", next);
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  if (!code || url.searchParams.has("error")) return failure();

  try {
    const supabase = await createClient();
    // Complete the PKCE exchange and persist the cookies before entering SSR pages.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return failure();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    // A recovery session must reach its password form even if profile lookup fails.
    const destination =
      next === "/account/password"
        ? next
        : profileError
          ? "/login?auth_error=workspace_unavailable"
          : authDestination(profile?.role, next);
    const response = NextResponse.redirect(new URL(destination, url.origin));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return failure();
  }
}
