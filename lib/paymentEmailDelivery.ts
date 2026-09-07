import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
// Resend retains idempotency keys for 24 hours. A durable sent marker prevents
// later webhook retries; an ambiguous send older than 23 hours requires review
// instead of risking another customer email after provider deduplication ends.
const SAFE_RETRY_MS = 23 * 60 * 60 * 1000;
export async function deliverPaymentEmail(input: {
    supabase: SupabaseClient;
    sessionId: string;
    purpose: string;
    payload: object;
    apiKey: string;
    now?: number;
    fetcher?: typeof fetch;
}) {
    const { supabase, sessionId, purpose, payload, apiKey } = input;
    if (!apiKey?.trim() || !sessionId || !purpose)
        throw new Error("Payment email delivery is not configured");
    const now = input.now ?? Date.now();
    const deliveryKey = createHash("sha256").update(`payment-email:${sessionId}:${purpose}`).digest("hex");
    const body = JSON.stringify(payload);
    const payloadHash = createHash("sha256").update(body).digest("hex");
    const inserted = await supabase.from("payment_email_deliveries").upsert({
        delivery_key: deliveryKey, purpose, stripe_session_id: sessionId,
        first_attempt_at: new Date(now).toISOString(), payload_hash: payloadHash,
    }, { onConflict: "delivery_key", ignoreDuplicates: true });
    if (inserted.error)
        throw new Error("Payment email delivery could not be recorded");
    const loaded = await supabase.from("payment_email_deliveries").select("sent_at,first_attempt_at,payload_hash")
        .eq("delivery_key", deliveryKey).single();
    if (loaded.error || !loaded.data)
        throw new Error("Payment email delivery could not be checked");
    if (loaded.data.sent_at)
        return;
    const started = Date.parse(loaded.data.first_attempt_at);
    if (!Number.isFinite(started) || now - started >= SAFE_RETRY_MS || loaded.data.payload_hash !== payloadHash) {
        throw new Error("Payment email delivery needs review before retrying");
    }
    const response = await (input.fetcher ?? fetch)("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(6000), headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `payment-${deliveryKey}` }, body,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.id !== "string" || !result.id)
        throw new Error("Payment email was not accepted by the provider");
    const marked = await supabase.from("payment_email_deliveries").update({ sent_at: new Date(now).toISOString(), provider_message_id: result.id })
        .eq("delivery_key", deliveryKey).select("delivery_key");
    if (marked.error || !marked.data?.length)
        throw new Error("Payment email acceptance marker could not be saved");
}
