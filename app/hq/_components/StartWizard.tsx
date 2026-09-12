"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ShieldAlert } from "lucide-react";
import { HQ_PLAN } from "@/lib/hq/types";
import { hqPost } from "./api";
import CopyButton from "./CopyButton";
import TagInput from "./TagInput";
import { INDUSTRIES, TIMEZONES } from "./options";
import { formSnippet, leadEndpoint } from "./snippet";

// Three screens and you are running. The first one is the only one that is
// required; the other two are the endpoint and the trial, and either can be
// done later from inside HQ.

function guessZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.some((t) => t.value === zone)) return zone;
  } catch {
    /* the browser did not say; Central is the default either way */
  }
  return "America/Chicago";
}

export default function StartWizard({ defaultEmail, then }: { defaultEmail: string; then: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    email: defaultEmail,
    city: "",
    state: "",
    industry: "",
    timezone: guessZone(),
  });
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await hqPost("create_workspace", { ...form, services });
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    const inbound = result.data.inbound_token;
    if (then) {
      router.replace(then);
      return;
    }
    setBusy(false);
    setToken(typeof inbound === "string" ? inbound : "");
    setStep(2);
  }

  async function startTrial() {
    setBusy(true);
    setError("");
    const result = await hqPost("checkout");
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    const url = result.data.url;
    if (typeof url !== "string") {
      setBusy(false);
      setError("Checkout did not come back with an address. Try again, or skip it and start the plan later from Billing.");
      return;
    }
    window.location.href = url;
  }

  return (
    <div>
      <ol className="pro-steps" aria-label="Setup steps">
        {[
          { n: 1, label: "Your business" },
          { n: 2, label: "Your leads" },
          { n: 3, label: "Your trial" },
        ].map((s) => (
          <li key={s.n}>
            <span className="pro-step" aria-current={step === s.n ? "step" : undefined} data-done={step > s.n ? "true" : undefined}>
              <span className="pro-step-num" aria-hidden="true">
                {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <span className="pro-step-label">{s.label}</span>
            </span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <form onSubmit={createWorkspace} className="hq-card mt-5">
          <h2 className="text-xl font-black text-[var(--heading)]">Tell us about the business</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            This is what every message Autopilot writes is built from. Two minutes now saves you rewriting drafts later.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="hq-label" htmlFor="start-name">
                Business name
              </label>
              <input id="start-name" className="hq-input" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="hq-label" htmlFor="start-owner">
                Your name
              </label>
              <input id="start-owner" className="hq-input" value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className="hq-label" htmlFor="start-phone">
                Business phone
              </label>
              <input id="start-phone" className="hq-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(903) 555-0142" />
            </div>
            <div>
              <label className="hq-label" htmlFor="start-email">
                Business email
              </label>
              <input id="start-email" className="hq-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className="hq-label" htmlFor="start-city">
                City
              </label>
              <input id="start-city" className="hq-input" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label className="hq-label" htmlFor="start-state">
                State
              </label>
              <input id="start-state" className="hq-input" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="TX" />
            </div>
            <div>
              <label className="hq-label" htmlFor="start-industry">
                Trade
              </label>
              <select id="start-industry" className="hq-select" value={form.industry} onChange={(e) => set("industry", e.target.value)}>
                <option value="">Pick one</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="hq-label" htmlFor="start-tz">
                Time zone
              </label>
              <select id="start-tz" className="hq-select" value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <TagInput
                id="start-services"
                label="What you do"
                hint="Add a few. The weekly posts rotate through them."
                values={services}
                onChange={setServices}
                placeholder="Water heaters"
              />
            </div>
          </div>

          {error && <p className="hq-error mt-4">{error}</p>}

          <div className="mt-5">
            <button type="submit" className="pro-buy-button" disabled={busy || !form.name.trim()}>
              {busy ? "Setting it up..." : "Create my HQ"} <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <section className="hq-card mt-5">
          <h2 className="text-xl font-black text-[var(--heading)]">Where your leads come in</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            This is your own address. Point your website form at it and every person who fills it in lands in HQ and gets answered.
          </p>

          {token ? (
            <>
              <div className="mt-4 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] p-4">
                <p className="flex items-center gap-2 text-sm font-black text-[var(--heading)]">
                  <ShieldAlert aria-hidden="true" className="h-4 w-4 text-[var(--warn)]" /> Save this now. It is not shown again.
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  The token in the address is a password. If you lose it, Settings can make you a new one, which turns the old one off.
                </p>
              </div>

              <div className="mt-4">
                <p className="hq-eyebrow">Your lead endpoint</p>
                <code className="hq-code mt-2">{leadEndpoint(token)}</code>
                <div className="mt-2">
                  <CopyButton value={leadEndpoint(token)} label="Copy the address" />
                </div>
              </div>

              <div className="mt-4">
                <p className="hq-eyebrow">Or paste this whole form into your site</p>
                <code className="hq-code mt-2">{formSnippet(token, form.name)}</code>
                <div className="mt-2">
                  <CopyButton value={formSnippet(token, form.name)} label="Copy the form" />
                </div>
              </div>
            </>
          ) : (
            <p className="hq-note mt-4">
              Your HQ is created. The lead endpoint did not come back with it, so open Settings once you are in and regenerate it there.
            </p>
          )}

          <p className="hq-note mt-4">
            Texting comes later. When you are ready, connect OpenPhone or Twilio in Settings and Autopilot can text a new lead back in seconds. Until
            then it answers by email and tells you to call.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="pro-buy-button" onClick={() => setStep(3)}>
              Next <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="hq-card mt-5">
          <h2 className="text-xl font-black text-[var(--heading)]">Start your {HQ_PLAN.trialDays} day trial</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            {HQ_PLAN.trialDays} days free, then ${HQ_PLAN.priceUsd} a month. Cancel any time. Autopilot starts working for {form.name || "your business"} the
            moment the trial starts.
          </p>

          {error && <p className="hq-error mt-4">{error}</p>}

          <div className="mt-5 grid gap-3">
            <StartTrial busy={busy} onClick={startTrial} />
            <Link href="/hq" className="hq-btn">
              Skip for now, explore HQ
            </Link>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            If you skip it, HQ stays open and everything you set up is kept, but Autopilot stays paused until you start the plan on the Billing page.
          </p>
        </section>
      )}
    </div>
  );
}

function StartTrial({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" className="pro-buy-button" onClick={onClick} disabled={busy}>
      {busy ? "Opening checkout..." : `Start my ${HQ_PLAN.trialDays} day trial`}
    </button>
  );
}
