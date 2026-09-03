"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, KeyRound, Mail } from "lucide-react";

// Restore access on another device.
//
// Two paths: paste the key from the receipt, or ask for the keys to be sent
// again. The email path answers the same way whether or not anything was
// found, so nobody can use this form to discover which addresses have bought.

export default function UnlockForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ names: string[]; next: string } | null>(null);
  const [sent, setSent] = useState(false);

  // The receipt carries a one tap link with both values already filled in.
  useEffect(() => {
    const e = params.get("email");
    const k = params.get("key");
    if (e) setEmail(e);
    if (k) setKey(k);
  }, [params]);

  const claim = params.get("claim");
  const claimNote =
    claim === "unpaid"
      ? "That checkout was not completed, so nothing was charged and nothing was unlocked."
      : claim === "notfound"
        ? "We could not match that checkout to a kit. If you were charged, paste your key below or ask for it again."
        : claim === "unavailable"
          ? "Card payment is not fully configured yet. If you were charged, email hello@theleadflowpro.com and it will be sorted by hand."
          : claim === "missing"
            ? "That link was missing its checkout reference. Paste your key below instead."
            : null;

  async function submit(mode: "key" | "resend") {
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const r = await fetch("/api/pro/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "key" ? { email, key } : { email }),
      });
      const body = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        names?: string[];
        next?: string;
        sent?: boolean;
        error?: string;
      };
      if (!r.ok) {
        setError(body.error || "That did not work. Check the email and the key.");
        return;
      }
      if (body.sent) {
        setSent(true);
        return;
      }
      setDone({ names: body.names ?? [], next: body.next ?? "/tools/pro" });
      // The cookie is set. Refresh so the server sees it and the kit opens.
      setTimeout(() => router.push(body.next ?? "/tools/pro"), 1400);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="pro-unlock-done" role="status">
        <Check aria-hidden="true" className="h-8 w-8" />
        <h2>Unlocked on this device.</h2>
        <p>
          {done.names.length === 1
            ? `${done.names[0]} is open again.`
            : `${done.names.length} kits are open again: ${done.names.join(", ")}.`}
        </p>
        <p className="pro-unlock-going">Taking you there now.</p>
      </div>
    );
  }

  return (
    <div className="pro-unlock">
      {claimNote ? (
        <p className="pro-unlock-note" role="status">
          {claimNote}
        </p>
      ) : null}

      <form
        className="pro-unlock-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("key");
        }}
      >
        <label className="pro-field">
          <span>The email you paid with</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            maxLength={200}
            placeholder="you@yourbusiness.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="pro-field">
          <span>Your key</span>
          <input
            type="text"
            value={key}
            maxLength={40}
            placeholder="LFP-XXXX-XXXX-XXXX-XXXX"
            spellCheck={false}
            autoCapitalize="characters"
            onChange={(e) => setKey(e.target.value)}
          />
          <small>It is in the receipt email, on the line that says Your key.</small>
        </label>

        {error ? (
          <p role="alert" className="pro-unlock-error">
            {error}
          </p>
        ) : null}
        {sent ? (
          <p role="status" className="pro-unlock-sent">
            If a kit has been bought with that address, the keys are on their way to it now. Check the inbox
            you paid with, including the spam folder.
          </p>
        ) : null}

        <button type="submit" className="pro-buy-button" disabled={busy || !email || !key}>
          <KeyRound aria-hidden="true" className="h-4 w-4" />
          {busy ? "Checking" : "Unlock on this device"}
          {!busy ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
        </button>

        <button
          type="button"
          className="button-secondary pro-unlock-resend"
          disabled={busy || !email}
          onClick={() => void submit("resend")}
        >
          <Mail aria-hidden="true" className="h-4 w-4" />
          Lost the key. Email it to me again
        </button>
      </form>
    </div>
  );
}
