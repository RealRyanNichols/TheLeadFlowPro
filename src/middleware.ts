// src/middleware.ts
// Single gate: the internal review console at /dashboard is admin-only.
//   1. Not logged in  -> redirect to /login (with callbackUrl back to the page).
//   2. Logged in, not an admin -> redirect to the public home page.
// Everything else on the site is public. The dashboard layout also enforces
// this server-side; the middleware is defense-in-depth on the edge.

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminEmail } from "@/lib/admin-identity";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const isAdmin = isAdminEmail(typeof token.email === "string" ? token.email : null);
  if (!isAdmin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
