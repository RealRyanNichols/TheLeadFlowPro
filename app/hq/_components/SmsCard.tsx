"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, ShieldAlert } from "lucide-react";
import type { Connection } from "@/lib/hq/types";
import { hqPost } from "./api";
import CopyButton from "./CopyButton";

// The text line. One at a time: connecting OpenPhone drops Twilio and the
// other way round, because two lines answering the same customer is worse
// than none. The key or token is checked against the provider before it is
// saved, so a typo fails here instead of failing silently at 6am.
//
// Incoming texts arrive at a webhook address of their own. It is shown once,
// when the line is connected or when it is regenerated, because that address
// is what lets a caller say "this customer texted us", so it stays private.

export default function SmsCard({ connection, hasSmsToken }: { connection: Connection | null; hasSmsToken: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<"openphone" | "twilio">("openphone");
  const [secret, setSecret] = useState("");
  const [webhookKey, setWebhookKey] = useState("");
  const [from, setFrom] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const connectedFrom = connection ? String((connection.config as Record<string, unknown>).from ?? "") : "";
  const signed = connection ? (connection.config as Record<string, unknown>).signed === true : false;

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setBusy("connect");
    setError("");
    const result = await hqPost("connect_sms", {
      kind,
      secret,
      from,
      ...(kind === "twilio" ? { account_sid: accountSid } : {}),
      ...(kind === "openphone" && webhookKey ? { webhook_key: webhookKey } : {}),
    });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSecret("");
    setWebhookKey("");
    setFrom("");
    setAccountSid("");
    const url = result.data.sms_webhook_url;
    setWebhookUrl(typeof url === "string" ? url : null);
    router.refresh();
  }

  async function regenerate() {
    setBusy("regen");
    setError("");
    const result = await hqPost("regenerate_sms_token");
    setBusy("");
    setConfirming(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const url = result.data.sms_webhook_url;
    setWebhookUrl(typeof url === "string" ? url : null);
    router.refresh();
  }

  async function disconnect() {
    if (!connection) return;
    setBusy("disconnect");
    setError("");
    const result = await hqPost("disconnect", { kind: connection.kind });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setWebhookUrl(null);
    router.refresh();
  }

  return (
    <section className="hq-card">
      <div className="flex items-center gap-2">
        <MessageSquare aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h3 className="text-lg font-black text-[var(--heading)]">Your text line</h3>
      </div>

      {connection ? (
        <>
          <p className="mt-2 text-sm text-[var(--text)]">
            Connected: {connection.label}
            {connectedFrom ? ` sending from ${connectedFrom}` : ""}.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Texts to this number become leads, and the instant text back and alert texts send from it.
            {connection.kind === "openphone" && !signed ? " Add the webhook signing key when you reconnect and every incoming text is verified, not just addressed." : ""}
          </p>
          {connection.last_error && <p className="hq-error mt-3">Last error from the provider: {connection.last_error}</p>}

          {webhookUrl ? (
            <div className="mt-4 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] p-4">
              <p className="flex items-center gap-2 text-sm font-black text-[var(--heading)]">
                <ShieldAlert aria-hidden="true" className="h-4 w-4 text-[var(--warn)]" /> Your incoming text address. This is the only time it is shown.
              </p>
              <code className="hq-code mt-2">{webhookUrl}</code>
              <div className="mt-2">
                <CopyButton value={webhookUrl} label="Copy the address" />
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {connection.kind === "openphone"
                  ? "OpenPhone: Settings, then Webhooks, then add one for message.received with this address."
                  : "Twilio: Phone Numbers, your number, then set the incoming message webhook to this address (HTTP POST)."}
              </p>
            </div>
          ) : (
            <p className="hq-note mt-4">
              {hasSmsToken
                ? "The incoming text address was shown when the line was connected. Regenerate it to see it again; that turns the old one off."
                : "Connect the line to get your incoming text address."}
            </p>
          )}

          {error && <p className="hq-error mt-3">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {confirming ? (
              <>
                <button type="button" className="hq-btn" disabled={busy !== ""} onClick={regenerate}>
                  {busy === "regen" ? "Making a new one..." : "Yes, make a new address"}
                </button>
                <button type="button" className="hq-btn" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="hq-btn" disabled={busy !== ""} onClick={() => setConfirming(true)}>
                Regenerate the text address
              </button>
            )}
            <button type="button" className="hq-btn" disabled={busy !== ""} onClick={disconnect}>
              {busy === "disconnect" ? "Disconnecting..." : "Disconnect this line"}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={connect}>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Connect the number you already text customers from. Without it, Autopilot answers by email and tells you to call. One line at a time.
          </p>

          <fieldset className="mt-4">
            <legend className="hq-label">Who runs your line</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "openphone", label: "OpenPhone" },
                  { value: "twilio", label: "Twilio" },
                ] as const
              ).map((option) => (
                <label key={option.value} className="hq-btn cursor-pointer">
                  <input type="radio" name="sms-kind" className="h-4 w-4" checked={kind === option.value} onChange={() => setKind(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {kind === "twilio" && (
              <div className="sm:col-span-2">
                <label className="hq-label" htmlFor="sms-sid">
                  Twilio account SID
                </label>
                <input id="sms-sid" className="hq-input" value={accountSid} onChange={(e) => setAccountSid(e.target.value)} placeholder="AC..." />
                <p className="mt-1 text-xs text-[var(--muted)]">Starts with AC and is 34 characters. It is on your Twilio console home page.</p>
              </div>
            )}
            <div>
              <label className="hq-label" htmlFor="sms-secret">
                {kind === "openphone" ? "OpenPhone API key" : "Twilio auth token"}
              </label>
              <input id="sms-secret" className="hq-input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
              <p className="mt-1 text-xs text-[var(--muted)]">
                {kind === "openphone"
                  ? "OpenPhone settings, then Integrations, then API. Copy the key."
                  : "Twilio console home page, under Account Info. Reveal the auth token and copy it."}
              </p>
            </div>
            <div>
              <label className="hq-label" htmlFor="sms-from">
                The number it sends from
              </label>
              <input id="sms-from" className="hq-input" type="tel" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="(903) 555-0142" />
              <p className="mt-1 text-xs text-[var(--muted)]">Has to be a number on that account.</p>
            </div>
            {kind === "openphone" && (
              <div className="sm:col-span-2">
                <label className="hq-label" htmlFor="sms-webhook-key">
                  OpenPhone webhook signing key (recommended)
                </label>
                <input id="sms-webhook-key" className="hq-input" type="password" value={webhookKey} onChange={(e) => setWebhookKey(e.target.value)} autoComplete="off" />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  When you create the message.received webhook in OpenPhone it shows a signing key. Paste it here and every incoming text is checked against
                  it. You can add it later by reconnecting.
                </p>
              </div>
            )}
          </div>

          {error && <p className="hq-error mt-4">{error}</p>}

          <div className="mt-4">
            <button type="submit" className="hq-btn" disabled={busy !== "" || !secret || !from}>
              {busy === "connect" ? "Checking with them..." : "Connect the line"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Your key is encrypted before it is stored and is never shown back to you or to your assistant.
          </p>
        </form>
      )}
    </section>
  );
}
