"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { hqPost } from "./api";
import CopyButton from "./CopyButton";
import { formSnippet, leadEndpoint, metaWebhook } from "./snippet";

// The address your own website posts to. The token in it is an address,
// not a password: it sits in your site's source for anyone to read, which
// is why texts use a separate address (see the text line card) and why a
// form post can never turn on consent by itself. Regenerating gives you a
// fresh address and turns the old one off.

export default function WebsiteFormCard({ businessName, inboundToken }: { businessName: string; inboundToken: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string>(inboundToken);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function regenerate() {
    setBusy(true);
    setError("");
    const result = await hqPost("regenerate_inbound_token");
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const fresh = result.data.inbound_token;
    if (typeof fresh === "string") setToken(fresh);
    router.refresh();
  }

  return (
    <section className="hq-card">
      <div className="flex items-center gap-2">
        <Globe aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h3 className="text-lg font-black text-[var(--heading)]">Your website form</h3>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Point the contact form you already have at this address and every submission becomes a lead here, answered in minutes.
      </p>

      <div className="mt-4 grid gap-4">
        <div>
          <p className="hq-eyebrow">Lead endpoint</p>
          <code className="hq-code mt-2">{leadEndpoint(token)}</code>
          <div className="mt-2">
            <CopyButton value={leadEndpoint(token)} label="Copy the address" />
          </div>
        </div>

        <div>
          <p className="hq-eyebrow">Paste this form into your site</p>
          <code className="hq-code mt-2">{formSnippet(token, businessName)}</code>
          <div className="mt-2">
            <CopyButton value={formSnippet(token, businessName)} label="Copy the form" />
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Style it however your site is styled. The field names are what matter. After someone sends it, their browser lands on your thank-you page. The
            hidden field named <code>_hp</code> is a bot trap: leave it empty and hidden.
          </p>
        </div>

        <div>
          <p className="hq-eyebrow">Meta lead ads webhook</p>
          <code className="hq-code mt-2">{metaWebhook(token)}</code>
          <p className="mt-2 text-xs text-[var(--muted)]">
            In your Meta app webhook setup, use this as the callback address. When it asks for a verify token, use the token out of this address, the part
            after /in/ and before /meta. Your Facebook Page must be connected below for its leads to land.
          </p>
        </div>

        <div>
          <p className="hq-eyebrow">Using Zapier or Make instead</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Add a Webhooks step, choose POST, paste the lead endpoint, and send JSON with name, phone, email, service and message. That covers any form
            builder or CRM those tools can read.
          </p>
        </div>
      </div>

      {error && <p className="hq-error mt-4">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {confirming ? (
          <>
            <button type="button" className="hq-btn" disabled={busy} onClick={regenerate}>
              {busy ? "Making a new one..." : "Yes, make a new address"}
            </button>
            <button type="button" className="hq-btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="hq-btn" onClick={() => setConfirming(true)}>
            Regenerate the address
          </button>
        )}
      </div>
      {confirming && (
        <p className="hq-note mt-3">
          This turns off the address you have now. Any form, webhook or Zap pointed at it stops sending until you update them.
        </p>
      )}
    </section>
  );
}
