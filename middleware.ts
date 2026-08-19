import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

const PUBLIC_SALES_PATH = "/admin/sales";
const INTERNAL_SALES_PATH = "/sales";

function isPath(path: string, base: string) {
  return path === base || path.startsWith(`${base}/`);
}

function movePath(path: string, from: string, to: string) {
  return `${to}${path.slice(from.length)}`;
}

export async function middleware(request: NextRequest) {
  const requestedPath = request.nextUrl.pathname;

  // Keep the public-facing URL clearly inside the back office. This is not the
  // security boundary (authentication + roles are); it is the canonical URL.
  if (isPath(requestedPath, INTERNAL_SALES_PATH)) {
    const url = request.nextUrl.clone();
    url.pathname = movePath(requestedPath, INTERNAL_SALES_PATH, PUBLIC_SALES_PATH);
    return NextResponse.redirect(url);
  }

  const isSalesWorkspace = isPath(requestedPath, PUBLIC_SALES_PATH);
  const rewriteUrl = request.nextUrl.clone();
  if (isSalesWorkspace) {
    rewriteUrl.pathname = movePath(requestedPath, PUBLIC_SALES_PATH, INTERNAL_SALES_PATH);
  }

  const makeResponse = () =>
    isSalesWorkspace
      ? NextResponse.rewrite(rewriteUrl, { request })
      : NextResponse.next({ request });

  let response = makeResponse();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = makeResponse();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    requestedPath.startsWith("/dashboard") ||
    requestedPath.startsWith("/admin") ||
    requestedPath.startsWith("/training");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", requestedPath);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/sales/:path*",
    "/training/:path*",
  ],
};
