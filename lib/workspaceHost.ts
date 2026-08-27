/**
 * go.theleadflowpro.com is the LeadFlow Pro Build Workspace.
 *
 * It is the SAME Next.js app and the SAME Vercel project as the public site.
 * It is not a separate host, a separate database, or a redirect to anywhere
 * else. The only difference is what a request to this hostname is allowed to
 * see: the workspace, and the pages required to sign into the workspace.
 *
 * Nothing about this file involves third-party hosting. The workspace is
 * served by the LeadFlow Pro production deployment or it is not served at all.
 */

export const WORKSPACE_HOST = "go.theleadflowpro.com";

/** Where a bare visit to the workspace host lands. */
export const WORKSPACE_HOME = "/admin/sales/delivery";

/**
 * Paths a workspace-host request is allowed to reach directly. Everything
 * else is sent to WORKSPACE_HOME, so the marketing site never renders under
 * the workspace hostname and there is no duplicate public site to index.
 *
 * /login and /account are here because a locked door is useless if the key
 * does not work: the magic-link round trip has to complete on whichever host
 * Pat started on.
 */
const PASSTHROUGH_PREFIXES = [
  "/admin/sales",
  "/sales",
  "/login",
  "/logout",
  "/account",
  "/auth",
  "/api",
  "/_next",
  "/monitoring",
];

/** Files served from /public that a page legitimately asks for by name. */
const PASSTHROUGH_FILES = [
  "/favicon.ico",
  "/robots.txt",
  "/manifest.webmanifest",
];

/**
 * True when this request arrived on the workspace hostname.
 *
 * Accepts an optional override host so a preview deployment can be exercised
 * as the workspace without owning the domain. Set WORKSPACE_HOST_OVERRIDE in
 * a preview environment only; production reads the real hostname.
 */
export function isWorkspaceHost(
  host: string | null | undefined,
  override?: string | null,
): boolean {
  if (!host) return false;
  // Host headers can carry a port, a trailing dot, or mixed case.
  const normalized = host.trim().toLowerCase().replace(/\.$/, "").split(":")[0];
  if (!normalized) return false;
  if (normalized === WORKSPACE_HOST) return true;
  const extra = override?.trim().toLowerCase().replace(/\.$/, "").split(":")[0];
  return Boolean(extra) && normalized === extra;
}

/**
 * Given a path requested on the workspace host, return where it should be
 * sent, or null to let it through untouched.
 */
export function workspaceRedirect(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return WORKSPACE_HOME;
  if (PASSTHROUGH_FILES.includes(pathname)) return null;
  const allowed = PASSTHROUGH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return allowed ? null : WORKSPACE_HOME;
}
