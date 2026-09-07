/** Navigation only. Server layouts and database policies still enforce access. */
export function safeAuthNext(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  // Reject browser URL normalization tricks and encoded external destinations.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded))
      return null;
    const url = new URL(value, "https://auth.internal");
    if (url.origin !== "https://auth.internal") return null;
    if (
      ["/login", "/logout", "/auth"].some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
      )
    )
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function homeForRole(role: string | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "sales") return "/admin/sales";
  return "/dashboard";
}

export function authDestination(
  role: string | null | undefined,
  requested?: string | null,
): string {
  const home = homeForRole(role);
  const next = safeAuthNext(requested);
  if (!next) return home;
  const path = new URL(next, "https://auth.internal").pathname;
  const salesPath =
    path === "/admin/sales" ||
    path.startsWith("/admin/sales/") ||
    path === "/sales" ||
    path.startsWith("/sales/");
  if (salesPath && role !== "admin" && role !== "sales") return home;
  if (
    !salesPath &&
    (path === "/admin" || path.startsWith("/admin/")) &&
    role !== "admin"
  )
    return home;
  return next;
}

export function authCallbackPath(next?: string | null): string {
  const destination = safeAuthNext(next);
  return destination
    ? `/auth/callback?next=${encodeURIComponent(destination)}`
    : "/auth/callback";
}
