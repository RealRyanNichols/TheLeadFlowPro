import { NURTURE_CAMPAIGN } from "@/lib/nurture";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// A content or recipient change that intentionally creates a different email
// request must bump this version. Resend rejects the same key with a different
// payload, which is safer than silently delivering two versions of one step.
export const NURTURE_SEQUENCE_VERSION = "v1";

// Resend retains idempotency keys for 24 hours. Stop automated retries one
// hour early so clock drift cannot replay an ambiguous request after the
// provider has forgotten its key.
export const NURTURE_RESEND_SAFE_WINDOW_MS = 23 * 60 * 60 * 1000;

// One slow provider request must not consume the entire 60-second cron run and
// starve the remaining leads. A timed-out request stays pending and is retried
// with the same provider key on the next hourly run.
export const NURTURE_PROVIDER_TIMEOUT_MS = 5_000;

export type NurtureResendPayload = {
  from: string;
  reply_to: string;
  to: string[];
  subject: string;
  text: string;
  headers: Record<string, string>;
};

export type NurtureDeliveryResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function nurtureEmailIdempotencyKey(leadId: string, step: number): string {
  const key = `nurture-${NURTURE_CAMPAIGN}-${NURTURE_SEQUENCE_VERSION}-${leadId}-${step}`;
  if (key.length > 256) throw new Error("Nurture idempotency key exceeds Resend's limit");
  return key;
}

export function nurtureRetryWindowExpired(firstAttemptAt: string | null, nowMs = Date.now()): boolean {
  const firstAttemptMs = firstAttemptAt ? Date.parse(firstAttemptAt) : Number.NaN;
  return (
    !Number.isFinite(firstAttemptMs) ||
    nowMs - firstAttemptMs >= NURTURE_RESEND_SAFE_WINDOW_MS
  );
}

function providerError(raw: string, status: number): string {
  if (!raw) return `Resend returned HTTP ${status}`;
  try {
    const body = JSON.parse(raw) as { message?: unknown; name?: unknown };
    const code = typeof body.name === "string" ? `${body.name}: ` : "";
    const message = typeof body.message === "string" ? body.message : raw;
    return `Resend returned HTTP ${status}: ${code}${message}`.slice(0, 1000);
  } catch {
    return `Resend returned HTTP ${status}: ${raw}`.slice(0, 1000);
  }
}

export async function sendNurtureEmail(
  resendKey: string,
  idempotencyKey: string,
  payload: NurtureResendPayload,
  fetchImpl: FetchLike = fetch,
): Promise<NurtureDeliveryResult> {
  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(NURTURE_PROVIDER_TIMEOUT_MS),
    });
    const raw = await response.text().catch(() => "");
    if (!response.ok) return { ok: false, error: providerError(raw, response.status) };

    let providerMessageId: string | null = null;
    if (raw) {
      try {
        const body = JSON.parse(raw) as { id?: unknown };
        providerMessageId = typeof body.id === "string" ? body.id : null;
      } catch {
        // A 2xx is authoritative even if the optional response body is not JSON.
      }
    }
    return { ok: true, providerMessageId };
  } catch (error) {
    return {
      ok: false,
      error: `Resend request failed: ${error instanceof Error ? error.message : "unknown error"}`.slice(
        0,
        1000,
      ),
    };
  }
}
