/**
 * Lightweight QR-code SVG generator (no dependencies).
 * Uses Google's chart-API fallback for reliability if you'd rather host server-side,
 * but here we render via the public goqr.me API client-side at request time.
 *
 * For an offline / self-hosted version, install `qrcode` and swap in.
 */
export function qrSvgUrl(data: string, size = 320): string {
  const encoded = encodeURIComponent(data);
  // public, no-key QR generator. For prod you can swap to `npm i qrcode` + render server-side.
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=0a1124&color=ffffff&qzone=2&format=svg`;
}
