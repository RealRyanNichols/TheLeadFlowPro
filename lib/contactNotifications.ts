import type { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "contact_notifications";
const SAFE_WINDOW = 23 * 60 * 60 * 1000;
const RETRIES = [1, 5, 15, 60, 180, 360];
type EmailPayload = {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
};
export type ContactNotification = {
  message_id: string;
  snapshot: { visitor_name: string; visitor_email: string; body: string };
  email_payload: EmailPayload | null;
  status: "pending" | "sent" | "failed";
  attempt_count: number;
  next_attempt_at: string;
  created_at: string;
};
type Result = "sent" | "pending" | "failed" | "claimed";
export type ContactNotificationStore = {
  get(id: string): Promise<ContactNotification | null>;
  claim(
    row: ContactNotification,
    payload: EmailPayload,
    now: Date,
  ): Promise<ContactNotification | null>;
  finish(
    row: ContactNotification,
    values: Record<string, unknown>,
  ): Promise<void>;
  pending(now: Date, limit: number): Promise<ContactNotification[]>;
};

export function contactNotificationStore(
  db: SupabaseClient,
): ContactNotificationStore {
  return {
    async get(id) {
      const r = await db
        .from(TABLE)
        .select("*")
        .eq("message_id", id)
        .maybeSingle();
      if (r.error) throw new Error("Contact notification lookup failed");
      return r.data as ContactNotification | null;
    },
    async claim(row, payload, now) {
      const r = await db
        .from(TABLE)
        .update({
          attempt_count: row.attempt_count + 1,
          next_attempt_at: new Date(now.getTime() + 5 * 60_000).toISOString(),
          email_payload: payload,
        })
        .eq("message_id", row.message_id)
        .eq("status", "pending")
        .eq("attempt_count", row.attempt_count)
        .lte("next_attempt_at", now.toISOString())
        .select("*")
        .maybeSingle();
      if (r.error) throw new Error("Contact notification claim failed");
      return r.data as ContactNotification | null;
    },
    async finish(row, values) {
      const r = await db
        .from(TABLE)
        .update(values)
        .eq("message_id", row.message_id)
        .eq("status", "pending")
        .eq("attempt_count", row.attempt_count)
        .select("message_id")
        .maybeSingle();
      if (r.error || !r.data)
        throw new Error("Contact notification status could not be saved");
    },
    async pending(now, limit) {
      const r = await db
        .from(TABLE)
        .select("*")
        .eq("status", "pending")
        .lte("next_attempt_at", now.toISOString())
        .order("next_attempt_at")
        .limit(limit);
      if (r.error) throw new Error("Contact notification queue unavailable");
      return (r.data ?? []) as ContactNotification[];
    },
  };
}

function payloadFor(row: ContactNotification): EmailPayload {
  if (row.email_payload) return row.email_payload;
  const { visitor_name, visitor_email, body } = row.snapshot;
  return {
    from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
    to: [
      process.env.LEADFLOW_NOTIFY_EMAIL?.trim() || "hello@theleadflowpro.com",
    ],
    reply_to: visitor_email,
    subject: `CONTACT: ${visitor_name.replace(/[\r\n]/g, " ").slice(0, 200)}`,
    text: [
      `From: ${visitor_name} <${visitor_email}>`,
      "",
      body,
      "",
      "Ryan owns this inquiry. Reply to this email to answer them directly.",
      "Inbox: https://www.theleadflowpro.com/admin/messages",
    ].join("\n"),
  };
}

export async function deliverContactNotification(
  store: ContactNotificationStore,
  id: string,
  options: { now?: () => Date; send?: typeof fetch; apiKey?: string } = {},
): Promise<Result> {
  const row = await store.get(id);
  if (!row) throw new Error("Contact message has no alert job");
  if (row.status !== "pending") return row.status;
  const now = (options.now ?? (() => new Date()))();
  // Respect an active sender's lease, including its seventh/final attempt.
  // Another worker must not mark that in-flight accepted email as failed.
  if (Date.parse(row.next_attempt_at) > now.getTime()) return "claimed";
  const age = now.getTime() - Date.parse(row.created_at);
  // Never retry an ambiguous provider result outside its 24-hour dedupe window.
  if (!Number.isFinite(age) || age >= SAFE_WINDOW || row.attempt_count >= 7) {
    await store.finish(row, {
      status: "failed",
      last_error:
        "Automatic retry window ended. Check the provider and follow up in the inbox.",
    });
    return "failed";
  }
  const claimed = await store.claim(row, payloadFor(row), now);
  if (!claimed) return "claimed";
  let providerId: string | null = null;
  let failure = "Email provider unavailable";
  try {
    const key = options.apiKey ?? process.env.RESEND_API_KEY?.trim();
    if (!key) throw new Error("Email delivery is not configured");
    const response = await (options.send ?? fetch)(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `contact-${claimed.message_id}-owner-v1`,
        },
        body: JSON.stringify(claimed.email_payload),
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!response.ok)
      failure = `Email provider rejected the alert (HTTP ${response.status})`;
    else {
      const data = await response.json().catch(() => null);
      if (
        typeof data?.id === "string" &&
        data.id.length > 0 &&
        data.id.length <= 200
      )
        providerId = data.id;
      else failure = "Email provider did not confirm a message ID";
    }
  } catch {
    // Provider bodies/errors may include customer data or authorization details.
    // Only a fixed diagnostic is persisted or logged.
    failure = "Email delivery could not be confirmed; retry scheduled";
  }
  if (providerId) {
    // Keep this outside the provider try/catch. A failed DB write leaves the
    // lease pending; the next attempt uses the exact same payload and key.
    await store.finish(claimed, {
      status: "sent",
      sent_at: now.toISOString(),
      provider_message_id: providerId,
      last_error: null,
    });
    return "sent";
  }
  const terminal = claimed.attempt_count >= 7;
  await store.finish(claimed, {
    status: terminal ? "failed" : "pending",
    last_error: failure,
    next_attempt_at: new Date(
      now.getTime() + RETRIES[Math.min(claimed.attempt_count - 1, 5)] * 60_000,
    ).toISOString(),
  });
  return terminal ? "failed" : "pending";
}

export async function retryContactNotifications(db: SupabaseClient) {
  const store = contactNotificationStore(db);
  const rows = await store.pending(new Date(), 12);
  const summary = {
    checked: rows.length,
    sent: 0,
    pending: 0,
    failed: 0,
    claimed: 0,
  };
  for (let i = 0; i < rows.length; i += 4) {
    await Promise.all(
      rows.slice(i, i + 4).map(async (row) => {
        const result = await deliverContactNotification(store, row.message_id);
        summary[result] += 1;
      }),
    );
  }
  return summary;
}
