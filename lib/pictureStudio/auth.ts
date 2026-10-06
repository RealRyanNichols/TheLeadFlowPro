import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateOrder, databaseReady, rateLimit, workerReady } from "./store";
import { storageReady } from "./storage";
import { PictureError } from "./types";

export const secureHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export function bearer(request: Request): string {
  const value = request.headers.get("authorization") || "";
  if (!value.startsWith("Bearer ")) throw new PictureError("Private access is required.", 401);
  return value.slice(7).trim();
}
export async function customer(request: Request, orderId: string) { return authenticateOrder(orderId, bearer(request)); }
export function admin(request: Request): void {
  const configured = process.env.PICTURE_ADMIN_TOKEN || "";
  if (configured.length < 32) throw new PictureError("Team access is not configured.", 503);
  const supplied = bearer(request);
  if (supplied.length !== configured.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(configured))) throw new PictureError("Team access is required.", 401);
}
export async function throttle(request: Request, purpose: string, limit = 30, seconds = 60): Promise<void> {
  const ip = (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown").split(",")[0].trim().slice(0, 100);
  await rateLimit(`${purpose}:${ip}`, limit, seconds);
}
export function apiError(error: unknown) {
  if (error instanceof PictureError) return NextResponse.json({ error: error.message }, { status: error.status, headers: secureHeaders });
  console.error("Picture studio request failed", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "This request could not be completed. Please try again later." }, { status: 503, headers: secureHeaders });
}
export async function boundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new PictureError("Request is too large.", 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw new PictureError("Request is too large.", 413); } parts.push(value); }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size); let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
export async function jsonBody(request: Request, maxBytes = 16000): Promise<Record<string, unknown>> {
  const bytes = await boundedBody(request, maxBytes);
  try { const result = JSON.parse(new TextDecoder().decode(bytes)); if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error(); return result; }
  catch { throw new PictureError("Use a valid JSON request."); }
}
export async function getPictureStudioReadiness() {
  const enabled = process.env.PICTURE_STUDIO_ENABLED === "true";
  const checks = {
    enabled,
    automation: process.env.PICTURE_AUTOMATION_ENABLED === "true",
    database: await databaseReady(),
    storage: await storageReady(),
    payments: Boolean(process.env.STRIPE_SECRET_KEY && process.env.PICTURE_STRIPE_WEBHOOK_SECRET),
    imageProvider: Boolean(process.env.OPENAI_API_KEY),
    teamAccess: (process.env.PICTURE_ADMIN_TOKEN || "").length >= 32,
    worker: await workerReady(),
  };
  const ready = Object.values(checks).every(Boolean);
  return { ready, configured: enabled && checks.payments && checks.imageProvider && checks.teamAccess, checkoutReady: ready, checks, message: ready ? "The picture studio is accepting orders." : "Automated orders are being prepared. Our team can help through the existing picture packages." };
}
export async function assertCheckoutReady(): Promise<void> {
  if (!(await getPictureStudioReadiness()).checkoutReady) throw new PictureError("Automated checkout is not available yet. Please use the picture packages or contact our team.", 503);
}
