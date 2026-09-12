"use client";

import { useState } from "react";

type Props = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
  resource: string;
  clientName: string;
};

// Approve posts to the approve route, which mints the code and sends the
// browser back to the assistant. Deny sends it back with access_denied so
// the assistant can say so instead of spinning.

export default function ConsentForm(props: Props) {
  const [busy, setBusy] = useState(false);
  const denyUrl = `${props.redirectUri}${props.redirectUri.includes("?") ? "&" : "?"}error=access_denied${props.state ? `&state=${encodeURIComponent(props.state)}` : ""}`;
  return (
    <form method="post" action="/api/hq/oauth/approve" className="mt-8 space-y-3" onSubmit={() => setBusy(true)}>
      <input type="hidden" name="client_id" value={props.clientId} />
      <input type="hidden" name="redirect_uri" value={props.redirectUri} />
      <input type="hidden" name="state" value={props.state} />
      <input type="hidden" name="code_challenge" value={props.codeChallenge} />
      <input type="hidden" name="scope" value={props.scope} />
      <input type="hidden" name="resource" value={props.resource} />
      <button type="submit" disabled={busy} className="pro-buy-button w-full">
        {busy ? "Connecting..." : `Connect ${props.clientName}`}
      </button>
      <a href={denyUrl} className="block min-h-[44px] rounded-lg border border-[var(--line-strong)] px-4 py-3 text-center text-sm font-bold text-[var(--text)]">
        Not now
      </a>
    </form>
  );
}
