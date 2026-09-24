import { createPublicKey, verify as verifySignature } from "node:crypto";
import { LEADFLOW_META } from "./metaCampaignGuard";

export const ADS_BRAIN = {
  workerId: "leadflow-do-ads-brain-v1",
  requestPath: "/api/ads-brain/pull",
  mode: "observe_only",
  spendLock: true,
  graphVersion: "v26.0",
  maxClockSkewSeconds: 300,
  publicKeyPem: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA6fx1fgM/z5cRUUXKsqJPM7xPeDy4hKXC1s+px5+gO8E=
-----END PUBLIC KEY-----`,
  publicKeySha256: "bd1ae620b843f996cc89187cc61fa19da991dd1fc482b6282a90ddfe20fd54a1",
  identity: {
    businessPortfolioId: LEADFLOW_META.businessPortfolioId,
    adAccountId: LEADFLOW_META.adAccountId,
    pageId: LEADFLOW_META.pageId,
    supabaseProjectRef: LEADFLOW_META.supabaseProjectRef,
  },
} as const;

export type AdsBrainAuthResult =
  | { ok: true; workerId: typeof ADS_BRAIN.workerId }
  | { ok: false; reason: string };

export function adsBrainCanonicalRequest(method: string, pathname: string, timestamp: string): string {
  return `${method.toUpperCase()}\n${pathname}\n${timestamp}`;
}

export function verifyAdsBrainSignature(input: {
  method: string;
  pathname: string;
  workerId: string | null;
  timestamp: string | null;
  signature: string | null;
  nowMs?: number;
  publicKeyPem?: string;
}): AdsBrainAuthResult {
  if (input.workerId !== ADS_BRAIN.workerId) return { ok: false, reason: "unknown worker" };
  if (!input.timestamp || !/^\d{10}$/.test(input.timestamp)) {
    return { ok: false, reason: "invalid timestamp" };
  }
  if (!input.signature || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.signature)) {
    return { ok: false, reason: "invalid signature" };
  }
  if (input.method.toUpperCase() !== "GET" || input.pathname !== ADS_BRAIN.requestPath) {
    return { ok: false, reason: "request is outside the read only contract" };
  }
  const requestTime = Number(input.timestamp) * 1000;
  const now = input.nowMs ?? Date.now();
  if (!Number.isFinite(requestTime) || Math.abs(now - requestTime) > ADS_BRAIN.maxClockSkewSeconds * 1000) {
    return { ok: false, reason: "stale timestamp" };
  }
  try {
    const verified = verifySignature(
      null,
      Buffer.from(adsBrainCanonicalRequest(input.method, input.pathname, input.timestamp)),
      createPublicKey(input.publicKeyPem ?? ADS_BRAIN.publicKeyPem),
      Buffer.from(input.signature, "base64"),
    );
    return verified ? { ok: true, workerId: ADS_BRAIN.workerId } : { ok: false, reason: "signature mismatch" };
  } catch {
    return { ok: false, reason: "signature verification failed" };
  }
}

export function metaLeadCount(actions: unknown): number {
  if (!Array.isArray(actions)) return 0;
  const leadTypes = new Set([
    "lead",
    "onsite_conversion.lead_grouped",
    "onsite_conversion.leadgen_grouped",
    "onsite_conversion.lead",
  ]);
  let total = 0;
  for (const action of actions) {
    if (!action || typeof action !== "object") continue;
    const row = action as { action_type?: unknown; value?: unknown };
    if (!leadTypes.has(String(row.action_type ?? ""))) continue;
    const value = Number(row.value ?? 0);
    if (Number.isFinite(value) && value > 0) total = Math.max(total, Math.round(value));
  }
  return total;
}

export function numericMetric(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
