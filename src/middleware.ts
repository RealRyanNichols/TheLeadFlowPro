// src/middleware.ts
// Two-layer gate:
//   1. Auth gate \u2014 if not logged in, redirect to /login (existing behavior).
//   2. Profile gate \u2014 if logged in BUT BrainProfile.completeness < threshold,
//      redirect to /onboarding. (Ryan rule: no tools unlock until the profile is built.)
//
// The /onboarding route itself is always reachable once logged in, so users can
// finish it. The /legal, /pricing, /, /signup, /login, /tools/seo-grader,
// /about, /contact routes are all public and never gated.

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const UNLOCK_THRESHOLD = 80;

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Step 1: auth
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Step 2: profile gate
  // token.brainCompleteness is populated by the NextAuth session callback (see auth.ts).
  // If it's missing (existing sessions from before this change), assume 0 \u2192 gate triggers
  // and the onboarding page API will set it correctly on first save.
  const completeness =
    typeof (token as any).brainCompleteness === "number"
      ? (token as any).brainCompleteness
      : 0;

  // Only gate routes under /dashboard/* and user-scoped APIs.
  // The /onboarding page + /api/onboarding endpoint are explicitly allowed through.
  const path = req.nextUrl.pathname;
  const onboardingAllowed =
    path === "/onboarding" ||
    path.startsWith("/onboarding/") ||
    path.startsWith("/api/onboarding");

  if (!onboardingAllowed && completeness < UNLOCK_THRESHOLD) {
    const url = new URL("/onboarding", req.url);
    url.searchParams.set("why", "profile_required");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/user/:path*",
    "/api/billing-portal/:path*",
    // Also gate /onboarding so unauthed users get pushed to /login first.
    "/onboarding",
    "/onboarding/:path*",
    "/api/onboarding/:path*",
  ],
};
