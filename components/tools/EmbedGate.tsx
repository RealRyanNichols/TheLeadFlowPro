"use client";

// The trade: the tool is free to use here, free to embed on their site, but
// the embed code unlocks only after they tell us who they are. The embed is an
// iframe served from our domain, so the code stays ours and every embed is a
// live backlink plus a lead in the CRM.

import { useState } from "react";
import { Code2, Copy, Check, Gift } from "lucide-react";

export default function EmbedGate({
  toolSlug,
  toolName,
  embedHeight,
}: {
  toolSlug: string;
  toolName: string;
  embedHeight: number;
}) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const snippet = `<iframe src="https://www.theleadflowpro.com/embed/${toolSlug}" width="100%" height="${embedHeight}" style="border:0;border-radius:16px;max-width:720px" title="${toolName} — free from The LeadFlow Pro" loading="lazy"></iframe>`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        business_name: form.get("business_name"),
        email: form.get("email"),
        website_url: form.get("website_url"),
        interest: "done_for_you",
        goals: `FREE TOOL EMBED: ${toolName}. They are adding it to their website.`,
        marketing_email_consent: form.get("marketing_email_consent") === "on",
        sms_consent: false,
        diagnostic: {
          version: 1,
          source: "tools_embed",
          tool: toolSlug,
          next_action: `Embedded ${toolName}. Follow up: what else could their site do?`,
        },
      }),
    });
    if (!res.ok) {
      setError("That did not go through. Try again in a second.");
      setSending(false);
      return;
    }
    setUnlocked(true);
  }

  async function copy() {
    await navigator.clipboard.writeText(snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mt-8 rounded-2xl border border-sky-400/30 bg-sky-500/[0.06] p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <Gift className="h-6 w-6 text-sky-300" />
        <h3 className="text-lg font-black text-white">
          Want this on YOUR website? Take it. Free.
        </h3>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Copy one line of code, paste it into your site, and this tool runs on your
        page forever. No charge, no catch, no maintenance — we host it. Just tell me
        who you are so I know whose site it is living on.
      </p>

      {!open && !unlocked && (
        <button type="button" onClick={() => setOpen(true)} className="button-primary mt-5">
          <Code2 aria-hidden="true" className="h-4 w-4" />
          Get My Free Embed Code
        </button>
      )}

      {open && !unlocked && (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="form-field">
            <span>Your name *</span>
            <input name="full_name" required maxLength={200} />
          </label>
          <label className="form-field">
            <span>Business name *</span>
            <input name="business_name" required maxLength={200} />
          </label>
          <label className="form-field">
            <span>Email *</span>
            <input name="email" type="email" required maxLength={200} />
          </label>
          <label className="form-field">
            <span>Your website</span>
            <input name="website_url" maxLength={300} placeholder="Where will it live?" />
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-400 sm:col-span-2">
            <input type="checkbox" name="marketing_email_consent" defaultChecked className="mt-0.5" />
            <span>
              Email me when new free tools drop. Unsubscribe anytime.
            </span>
          </label>
          {error && <p className="form-error sm:col-span-2">{error}</p>}
          <button type="submit" className="button-primary sm:col-span-2" disabled={sending}>
            {sending ? "Unlocking..." : "Unlock My Embed Code"}
          </button>
        </form>
      )}

      {unlocked && (
        <div className="mt-5">
          <p className="text-sm font-bold text-emerald-300">
            It is yours. Paste this anywhere in your site&apos;s HTML:
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-xs leading-relaxed text-sky-200">
              {snippet}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm font-bold text-white hover:border-sky-400/50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Works on WordPress, Wix, Squarespace, Shopify, GoDaddy — anywhere that
            accepts HTML. Need a hand putting it in? Text me: (903) 500-8898.
          </p>
        </div>
      )}
    </div>
  );
}
