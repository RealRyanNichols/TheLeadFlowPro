"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// The conversation with one lead, laid out like a phone: their messages on the
// left, Ryan's on the right, oldest at the top.
//
// Sending goes through /api/admin/lead-message because the Quo and Resend keys
// are server-side. Inbound texts arrive from the Quo webhook; "Log a reply"
// covers anything that came in another way (a call, a DM, an email reply) so
// the whole conversation stays on the lead instead of scattered across apps.

export type LeadMsg = {
  id: string;
  direction: "out" | "in";
  channel: "sms" | "email" | "note";
  body: string;
  author: string | null;
  delivered: boolean;
  error: string | null;
  created_at: string;
};

function time(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const CHANNEL_LABEL: Record<string, string> = {
  sms: "Text",
  email: "Email",
  note: "Logged",
};

export default function LeadThread({
  leadId,
  initialMessages,
  canText,
  hasEmail,
}: {
  leadId: string;
  initialMessages: LeadMsg[];
  canText: boolean;
  hasEmail: boolean;
}) {
  const [messages, setMessages] = useState<LeadMsg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [logging, setLogging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view, the way a messages app does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const channel = canText ? "Text" : hasEmail ? "Email" : null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");

    if (logging) {
      // Their reply, captured by hand. Never sends anything.
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("lead_messages")
        .insert({ lead_id: leadId, direction: "in", channel: "note", body, delivered: true })
        .select()
        .single();
      if (err) setError(err.message);
      else if (data) {
        setMessages((m) => [...m, data as LeadMsg]);
        setDraft("");
      }
      setBusy(false);
      return;
    }

    try {
      const r = await fetch("/api/admin/lead-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, body }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Could not send.");
      } else {
        setMessages((m) => [...m, j.message as LeadMsg]);
        setDraft("");
        if (!j.delivered) {
          setError(
            j.error
              ? `Saved to the thread, but the provider rejected it: ${j.error}`
              : "Saved to the thread, but it did not send.",
          );
        }
      }
    } catch {
      setError("Could not reach the server.");
    }
    setBusy(false);
  }

  return (
    <div className="card !p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Conversation
        </h2>
        {channel ? (
          <span className="rounded-full bg-[var(--accent-tint)] px-2.5 py-1 text-[11px] font-bold text-[var(--blue)]">
            Sends as {channel.toLowerCase()}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--warn-tint)] px-2.5 py-1 text-[11px] font-bold text-warn">
            No consented channel
          </span>
        )}
      </div>

      <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Nothing yet. Send the first message and it lands on their phone or in their
            inbox. Their replies show up here.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.direction === "out";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${mine ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                    mine
                      ? "rounded-br-sm bg-[var(--blue)] text-white"
                      : "rounded-bl-sm bg-[var(--fill-3)] text-[var(--text)]"
                  }`}
                >
                  {m.body}
                </div>
                <p className="mt-1 text-[11px] text-[var(--quiet)]">
                  {CHANNEL_LABEL[m.channel] ?? m.channel} · {time(m.created_at)}
                  {mine && !m.delivered && (
                    <span className="ml-1 font-bold text-[var(--danger)]">not delivered</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] px-3 py-2 text-xs text-[var(--danger)]"
        >
          {error}
        </p>
      )}

      <form onSubmit={send} className="mt-4">
        <textarea
          className="input text-sm"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={3000}
          placeholder={
            logging
              ? "What did they say? This only records it, nothing is sent."
              : channel
                ? `Write a message. It goes out as ${channel.toLowerCase()}.`
                : "No consented channel. You can still log what was said."
          }
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              checked={logging}
              onChange={(e) => setLogging(e.target.checked)}
            />
            Log their reply instead of sending
          </label>
          <button
            type="submit"
            className="btn-primary !px-4 !py-2 text-sm"
            disabled={busy || (!logging && !channel)}
          >
            {busy ? "Sending" : logging ? "Log it" : "Send"}
          </button>
        </div>
        {!canText && hasEmail && !logging && (
          <p className="mt-2 text-[11px] text-[var(--quiet)]">
            Going by email because there is no phone number with SMS consent on this lead.
          </p>
        )}
      </form>
    </div>
  );
}
