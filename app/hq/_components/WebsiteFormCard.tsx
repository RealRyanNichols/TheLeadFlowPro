"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, ShieldAlert } from "lucide-react";
import { hqPost } from "./api";
import CopyButton from "./CopyButton";
import { formSnippet, leadEndpoint, metaWebhook, smsWebhook } from "./snippet";

// The address your own website posts to. The token in it is the password to
// that address, so it is only ever shown once: at the moment it is made. If
// you did not save it, make a new one. Anything pointed at the old address
// stops working the second you do, which is exactly what you want if the old
// one got out.

export default function WebsiteFormCard({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
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
    setToken(typeof fresh === "string" ? fresh : null);
    router.refresh();
  }

  const shown = token ?? "YOUR_TOKEN";

  return (
    <section className="hq-card">
      <div className="flex items-center gap-2">
        <Globe aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h3 className="text-lg font-black text-[var(--heading)]">Your website form</h3>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Point the contact form you already have at this address and every submission becomes a lead here, answered in minutes.
      </p>

      {token ? (
        <div className="mt-4 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] p-4">
          <p className="flex items-center gap-2 text-sm font-black text-[var(--heading)]">
            <ShieldAlert aria-hidden="true" className="h-4 w-4 text-[var(--warn)]" /> This is the only time the full address is shown. Save it now.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Anything pointed at your old address has stopped working. Update your website form, and your SMS and Meta webhooks if you had them set.
          </p>
        </div>
      ) : (
        <p className="hq-note mt-4">
          The address is hidden because the token in it is a password. Regenerate it to see it again. That makes a new one and turns the old one off.
        </p>
      )}

      <div className="mt-4 grid gap-4">
        <div>
          <p className="hq-eyebrow">Lead endpoint</p>
          <code className="hq-code mt-2">{leadEndpoint(shown)}</code>
          {token && (
            <div className="mt-2">
              <CopyButton value={leadEndpoint(token)} label="Copy the address" />
            </div>
          )}
        </div>

        <div>
          <p className="hq-eyebrow">Paste this form into your site</p>
          <code className="hq-code mt-2">{formSnippet(shown, businessName)}</code>
          {token && (
            <div className="mt-2">
              <CopyButton value={formSnippet(token, businessName)} label="Copy the form" />
            </div>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            Style it however your site is styled. The field names are what matter. After someone sends it, their browser lands on your thank-you page.
          </p>
        </div>

        <div>
          <p className="hq-eyebrow">Text message webhook</p>
          <code className="hq-code mt-2">{smsWebhook(shown)}</code>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Put this in OpenPhone or Twilio as the address for incoming messages. A text from a number you do not know becomes a lead.
          </p>
        </div>

        <div>
          <p className="hq-eyebrow">Meta lead ads webhook</p>
          <code className="hq-code mt-2">{metaWebhook(shown)}</code>
          <p className="mt-2 text-xs text-[var(--muted)]">
            In your Meta app webhook setup, use this as the callback address. When it asks for a verify token, use the token out of this address, the part
            after /in/ and before /meta.
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
            {token ? "Regenerate again" : "Regenerate to see it"}
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
