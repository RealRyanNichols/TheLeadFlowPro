import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { isWorkspaceHost, workspaceRedirect } from "@/lib/workspaceHost";

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

  // go.theleadflowpro.com is the Build Workspace. Same app, same project,
  // same Supabase. It just does not serve the marketing site: anything that
  // is not the workspace or the sign-in round trip goes to the workspace.
  const onWorkspaceHost = isWorkspaceHost(
    request.headers.get("host"),
    process.env.WORKSPACE_HOST_OVERRIDE,
  );
  if (onWorkspaceHost) {
    const destination = workspaceRedirect(requestedPath);
    if (destination && destination !== requestedPath) {
      const url = request.nextUrl.clone();
      url.pathname = destination;
      return NextResponse.redirect(url);
    }
  }

  // Keep the public-facing URL clearly inside the back office. This is not the
  // security boundary (authentication + roles are); it is the canonical URL.
  if (isPath(requestedPath, INTERNAL_SALES_PATH)) {
    const url = request.nextUrl.clone();
    url.pathname = movePath(requestedPath, INTERNAL_SALES_PATH, PUBLIC_SALES_PATH);
    return NextResponse.redirect(url);
  }

  const isSalesWorkspace = isPath(requestedPath, PUBLIC_SALES_PATH);
  const isProtected =
    requestedPath.startsWith("/dashboard") ||
    requestedPath.startsWith("/admin") ||
    requestedPath.startsWith("/training");

  const rewriteUrl = request.nextUrl.clone();
  if (isSalesWorkspace) {
    rewriteUrl.pathname = movePath(requestedPath, PUBLIC_SALES_PATH, INTERNAL_SALES_PATH);
  }

  const makeResponse = () => {
    const res = isSalesWorkspace
      ? NextResponse.rewrite(rewriteUrl, { request })
      : NextResponse.next({ request });
    // The workspace is an internal tool. It should never appear in search.
    if (onWorkspaceHost) res.headers.set("x-robots-tag", "noindex, nofollow");
    return res;
  };

  // Only protected paths need a session read. The matcher below now sees every
  // request so the workspace host can be handled, and calling Supabase on
  // public marketing pages would add a network round trip to each one.
  if (!isProtected && !isSalesWorkspace) return makeResponse();

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
    // Everything except Next internals and static files. The workspace host
    // has to be recognised on every path, including "/", which the previous
    // path-scoped matcher never saw.
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest|json|css|js|woff|woff2|ttf|mp4)$).*)",
  ],
};
