"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { TLFP_CREDITS, TLFP_PACKS, packBonusPercent } from "@/lib/tlfpCredits";
import { usd } from "@/lib/site/prices";
import { BUSINESS } from "@/lib/site/business";

// The three packs. The browser sends a pack id and, for a visitor who is not
// logged in, the email the credits should go to. Price and credit count are
// never sent: /api/checkout reads both from lib/tlfpCredits.ts.

export default function TlfpPacks({ loginEmail }: { loginEmail: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(packId: string) {
    setError(null);
    const to = loginEmail ?? email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setError("Enter the email the credits should go to.");
      return;
    }
    setBusy(packId);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: TLFP_CREDITS.purchaseKind, pack: packId, email: to }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 501) {
        setError(`Card checkout is not switched on yet. Text ${BUSINESS.phone.display} and Ryan will set it up by hand.`);
        return;
      }
      if (!r.ok || !j.url) {
        setError(typeof j.error === "string" ? j.error : "Could not start checkout.");
        return;
      }
      window.location.href = j.url;
    } catch {
      setError("Could not start checkout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {TLFP_PACKS.map((pack, index) => {
          const featured = index === 1;
          return (
            <div
              key={pack.id}
              className={`relative flex flex-col rounded-2xl border p-5 ${
                featured
                  ? "border-[var(--blue)] shadow-[0_22px_60px_#1240e824]"
                  : "border-[var(--line)]"
              }`}
              style={{
                background: featured
                  ? "linear-gradient(165deg, var(--accent-tint), var(--panel) 55%)"
                  : "var(--panel)",
              }}
            >
              {featured ? (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-[var(--blue)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Most picked
                </span>
              ) : null}
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">{pack.name}</p>
              <p className="mt-2 text-4xl font-black text-[var(--heading)]">
                {pack.credits.toLocaleString("en-US")}
                <span className="ml-1 text-base font-bold text-[var(--muted)]">credits</span>
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--green)]">
                for {usd(pack.priceUsd)}. That is {packBonusPercent(pack)}% more than you paid.
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">{pack.blurb}</p>
              <button
                type="button"
                onClick={() => buy(pack.id)}
                disabled={busy !== null}
                className={`${featured ? "btn-primary" : "btn-ghost"} mt-5 w-full disabled:opacity-60`}
              >
                {busy === pack.id ? "Opening checkout..." : `Buy the ${pack.name.toLowerCase()}`}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {loginEmail ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Credits go to <strong className="text-[var(--heading)]">{loginEmail}</strong>, the account you are logged in with.
        </p>
      ) : (
        <div className="mt-5 grid gap-2 sm:max-w-md">
          <label htmlFor="tlfp-email" className="text-sm font-bold text-[var(--heading)]">
            Email the credits should go to
          </label>
          <input
            id="tlfp-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="min-h-12 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-4 text-base text-[var(--heading)] outline-none focus:border-[var(--blue)]"
          />
          <p className="text-xs text-[var(--quiet)]">
            Log in with this same email afterwards to see and spend the balance. Already have a login? Sign in first and skip this box.
          </p>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
