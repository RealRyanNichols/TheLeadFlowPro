const CANONICAL_ORIGIN = "https://www.theleadflowpro.com";
const PRODUCTION_HOSTS = [
  "theleadflowpro.com",
  "www.theleadflowpro.com",
  "go.theleadflowpro.com",
];

type OriginRequest = Pick<Request, "url" | "headers">;
type OriginOptions = { trustedHosts?: readonly string[]; production?: boolean };

function hostValue(value: string | null | undefined): string | null {
  if (!value || value.includes(",")) return null;
  const host = value.trim().toLowerCase();
  try {
    const parsed = new URL(`https://${host}`);
    return parsed.host === host && !parsed.username && !parsed.password &&
      parsed.pathname === "/" && !parsed.search && !parsed.hash ? host : null;
  } catch {
    return null;
  }
}

/**
 * Next's self-hosted request URL can use its loopback listen address. Resolve
 * browser-facing URLs from an explicit host allowlist instead. Caddy preserves
 * Host and replaces forwarded headers; neither an arbitrary Host nor a forged
 * forwarded header can become a checkout, sign-in, or email destination here.
 * Add owned preview hosts to LEADFLOW_TRUSTED_HOSTS (comma separated).
 */
export function requestOrigin(request: OriginRequest, options: OriginOptions = {}): string {
  const url = new URL(request.url);
  const trusted = new Set([
    ...PRODUCTION_HOSTS,
    ...(options.trustedHosts ?? (process.env.LEADFLOW_TRUSTED_HOSTS ?? "").split(",")),
    process.env.VERCEL_URL,
  ].map(hostValue).filter((host): host is string => Boolean(host)));
  const hosts = [
    hostValue(request.headers.get("host")),
    hostValue(request.headers.get("x-forwarded-host")),
    hostValue(url.host),
  ];
  const publicHost = hosts.find((host) => host !== null && trusted.has(host));
  if (publicHost) return `https://${publicHost}`;

  if (!(options.production ?? process.env.NODE_ENV === "production")) {
    // Local development must never learn an external destination from a
    // forwarded header. Only the request's own Host/URL can select loopback.
    const local = [hosts[0], hosts[2]].find((host) =>
      host !== null && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host));
    if (local) return `${url.protocol === "https:" ? "https:" : "http:"}//${local}`;
  }
  return CANONICAL_ORIGIN;
}
