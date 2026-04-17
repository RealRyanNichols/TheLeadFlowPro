import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Paths that an authenticated user can reach even without a completed
// profile. Everything else under /dashboard is gated until the profile
// questionnaire is filled in.
const PROFILE_EXEMPT = [
  "/dashboard/onboarding",
  "/dashboard/settings",
  "/dashboard/profile"
];

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Force new / incomplete accounts through the onboarding questionnaire
  // before they can poke around the rest of the app.
  const path = req.nextUrl.pathname;
  const onDashboard = path.startsWith("/dashboard");
  const exempt = PROFILE_EXEMPT.some((p) => path === p || path.startsWith(p + "/"));
  if (onDashboard && !exempt && token.hasProfile === false) {
    return NextResponse.redirect(new URL("/dashboard/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/user/:path*", "/api/billing-portal/:path*"]
};
