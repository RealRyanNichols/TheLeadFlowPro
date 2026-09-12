"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Mail, MessageSquare, Send } from "lucide-react";
import type { Message, MessagePurpose } from "@/lib/hq/types";
import { hqPost } from "./api";

// Write, read it, change it, send it. Nothing goes out until the owner
// presses send, and the consent line is said out loud before the draft is
// written, not after the send fails.

type Props = {
  leadId: string;
  leadName: string;
  hasPhone: boolean;
  hasEmail: boolean;
  consentSms: boolean;
  unsubscribed: boolean;
  smsConnected: boolean;
};

const PURPOSES: { value: Exclude<MessagePurpose, "inbound">; label: string }[] = [
  { value: "text_back", label: "Answer them right now" },
  { value: "follow_up", label: "Follow up" },
  { value: "quote_follow_up", label: "Chase a quote" },
  { value: "email_reply", label: "Reply by email" },
  { value: "review_ask", label: "Ask for a review" },
  { value: "reschedule", label: "Reschedule" },
  { value: "custom", label: "Write it myself" },
];

export default function MessageComposer(props: Props) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<Exclude<MessagePurpose, "inbound">>("follow_up");
  const [customChannel, setCustomChannel] = useState<"sms" | "email">(props.hasPhone ? "sms" : "email");
  const [customBody, setCustomBody] = useState("");
  const [draft, setDraft] = useState<Message | null>(null);
  const [note, setNote] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const channel = draft?.channel ?? (purpose === "custom" ? customChannel : purpose === "email_reply" ? "email" : props.hasPhone ? "sms" : "email");
  const smsBlocked = channel === "sms" && (!props.consentSms || props.unsubscribed || !props.smsConnected || !props.hasPhone);
  const emailBlocked = channel === "email" && !props.hasEmail;

  async function writeDraft() {
    setBusy(true);
    setError("");
    setSent(false);
    const result = await hqPost("draft_message", {
      lead_id: props.leadId,
      purpose,
      ...(purpose === "custom" ? { body: customBody, channel: customChannel } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const message = result.data.message as Message | undefined;
    if (!message) {
      setError("The draft came back empty. Try again.");
      return;
    }
    setDraft(message);
    setBody(message.body);
    setNote(typeof result.data.note === "string" ? result.data.note : "");
  }

  async function send() {
    if (!draft) return;
    setBusy(true);
    setError("");
    const result = await hqPost("send_message", { message_id: draft.id, body });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
    setDraft(null);
    setBody("");
    setNote("");
    setCustomBody("");
    router.refresh();
  }

  return (
    <section className="hq-card">
      <h2 className="text-lg font-black text-[var(--heading)]">Send {props.leadName || "them"} a message</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Pick what this message is for, read what it wrote, change anything you want, then send it.</p>

      <div className="mt-4 grid gap-4">
        <div>
          <label className="hq-label" htmlFor="composer-purpose">
            What is this message for
          </label>
          <select
            id="composer-purpose"
            className="hq-select"
            value={purpose}
            onChange={(e) => {
              setPurpose(e.target.value as Exclude<MessagePurpose, "inbound">);
              setDraft(null);
              setError("");
              setSent(false);
            }}
          >
            {PURPOSES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {purpose === "custom" && (
          <>
            <fieldset>
              <legend className="hq-label">Send it as</legend>
              <div className="flex flex-wrap gap-2">
                {(["sms", "email"] as const).map((c) => (
                  <label key={c} className="hq-btn hq-btn-sm cursor-pointer">
                    <input
                      type="radio"
                      name="composer-channel"
                      className="h-4 w-4"
                      checked={customChannel === c}
                      onChange={() => setCustomChannel(c)}
                    />
                    {c === "sms" ? "Text" : "Email"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="hq-label" htmlFor="composer-custom">
                What do you want to say
              </label>
              <textarea id="composer-custom" className="hq-textarea" value={customBody} onChange={(e) => setCustomBody(e.target.value)} />
            </div>
          </>
        )}

        {channel === "sms" && !props.hasPhone && (
          <p className="hq-note">This lead has no phone number, so a text cannot go out. Add one above or send an email instead.</p>
        )}
        {channel === "sms" && props.hasPhone && props.unsubscribed && (
          <p className="hq-error">
            <AlertTriangle aria-hidden="true" className="mr-1 inline h-4 w-4" />
            This person replied STOP. Do not text them again. Call them instead.
          </p>
        )}
        {channel === "sms" && props.hasPhone && !props.unsubscribed && !props.consentSms && (
          <p className="hq-error">
            <AlertTriangle aria-hidden="true" className="mr-1 inline h-4 w-4" />
            This person has not said it is fine to text them, so a text will not send. Call them, or send an email. Once they text you first, or you tick
            the consent box on this lead, texting opens up.
          </p>
        )}
        {channel === "sms" && props.hasPhone && props.consentSms && !props.unsubscribed && !props.smsConnected && (
          <p className="hq-note">No text line is connected yet, so this will not send as a text. Connect OpenPhone or Twilio in Settings.</p>
        )}
        {emailBlocked && <p className="hq-note">This lead has no email address, so an email cannot go out.</p>}

        {!draft && (
          <div>
            <button type="button" className="hq-btn" onClick={writeDraft} disabled={busy || (purpose === "custom" && !customBody.trim())}>
              {busy ? "Writing..." : "Write the draft"}
            </button>
          </div>
        )}

        {draft && (
          <div className="grid gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
            <p className="flex items-center gap-2 hq-eyebrow">
              {draft.channel === "sms" ? <MessageSquare aria-hidden="true" className="h-4 w-4" /> : <Mail aria-hidden="true" className="h-4 w-4" />}
              Draft {draft.channel === "sms" ? "text" : "email"}
            </p>
            {note && <p className="text-sm text-[var(--muted)]">{note}</p>}
            {draft.subject && (
              <p className="text-sm font-bold text-[var(--heading)]">
                Subject: {draft.subject}
              </p>
            )}
            <div>
              <label className="hq-label" htmlFor="composer-body">
                The message
              </label>
              <textarea id="composer-body" className="hq-textarea" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="pro-buy-button" onClick={send} disabled={busy || smsBlocked || emailBlocked || !body.trim()}>
                <Send aria-hidden="true" className="h-4 w-4" />
                {busy ? "Sending..." : draft.channel === "sms" ? "Send the text" : "Send the email"}
              </button>
              <button type="button" className="hq-btn" onClick={() => { setDraft(null); setError(""); }}>
                Throw it away
              </button>
            </div>
          </div>
        )}

        {error && <p className="hq-error">{error}</p>}
        {sent && <p className="hq-ok">Sent. It is on the timeline below.</p>}
      </div>
    </section>
  );
}
