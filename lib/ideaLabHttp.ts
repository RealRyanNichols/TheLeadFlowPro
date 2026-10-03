/** Next can normalize request.url to localhost behind a proxy; use the actual
 * Host header, without accepting a client-supplied forwarded host. */
export function ideaLabSameOrigin(request: Request): boolean {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    const host = request.headers.get("host") ?? new URL(request.url).host;
    const protocol =
      request.headers.get("x-forwarded-proto") ??
      new URL(request.url).protocol.replace(":", "");
    return (
      !origin.username &&
      !origin.password &&
      origin.host.toLowerCase() === host.toLowerCase() &&
      origin.protocol === `${protocol}:`
    );
  } catch {
    return false;
  }
}
