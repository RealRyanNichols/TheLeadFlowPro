"use client";

// The Time Back funnel configurator. Two dials (days, posts per day), one
// live price from lib/timeback.ts, add-ons, a one-time $97 downsell, then
// CRM capture -> Stripe checkout. Prices are recomputed server-side in
// /api/checkout, so this UI can never charge a number the catalog does not.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleCheck, Lock, X } from "lucide-react";
import {
  CONTENT_DAYS,
  CONTENT_PER_DAY,
  DOWNSELL,
  EMAIL_SERIES,
  EXTRAS,
  FIRST_EMAIL_DISCOUNT,
  PLATFORMS,
  priceContent,
  priceOrder,
} from "@/lib/timeback";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export default function TimeBackFunnel() {
  const [daysIdx, setDaysIdx] = useState(0);
  const [perDayIdx, setPerDayIdx] = useState(0);
  const [platforms, setPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [emailSeries, setEmailSeries] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [downsell, setDownsell] = useState(false);
  const [showDownsell, setShowDownsell] = useState(false);
  const downsellOffered = useRef(false);
  const [sending, setSending] = useState(false);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = CONTENT_DAYS[daysIdx];
  const perDay = CONTENT_PER_DAY[perDayIdx];
  const contentPrice = priceContent(days, perDay) ?? 0;
  const totalPosts = days * perDay;

  const priced = useMemo(
    () =>
      priceOrder({
        downsell,
        days: downsell ? undefined : days,
        perDay: downsell ? undefined : perDay,
        emailSeries,
        extras,
      }),
    [downsell, days, perDay, emailSeries, extras],
  );
  const total = priced?.total ?? 0;

  // One honest exit offer: if the cursor leaves the top of the page before
  // they have started checkout, show the $97 starter once. Never again after.
  useEffect(() => {
    function onLeave(e: MouseEvent) {
      if (e.clientY > 8 || downsellOffered.current || sending) return;
      downsellOffered.current = true;
      setShowDownsell(true);
    }
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => document.documentElement.removeEventListener("mouseleave", onLeave);
  }, [sending]);

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function acceptDownsell() {
    setDownsell(true);
    setEmailSeries(null);
    setExtras([]);
    setShowDownsell(false);
    document.getElementById("tb-checkout")?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    if (!priced) {
      setError("Pick a package first.");
      setSending(false);
      return;
    }
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number before choosing call or text consent.");
      setSending(false);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const notes = String(form.get("notes") ?? "").trim();
    const chosenPlatforms = downsell
      ? platforms
      : platforms.length
        ? platforms
        : ["facebook"];

    // 1) CRM first. If Stripe is abandoned, the order still exists.
    let res: Response;
    try {
      res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          business_name: form.get("business_name"),
          email,
          phone: phone || null,
          interest: "done_for_you",
          goals: [
            "TIME BACK FUNNEL ORDER.",
            ...priced.lines.map((l) => `${l.label}: ${fmt(l.amount)}.`),
            `Total: ${fmt(priced.total)}.`,
            `Platforms: ${chosenPlatforms.join(", ")}.`,
            notes ? `Notes: ${notes}` : "",
          ]
            .filter(Boolean)
            .join(" "),
          best_contact_method: phone ? "text" : "email",
          sms_consent: smsConsent,
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          diagnostic: {
            version: 1,
            source: "time_back_funnel",
            selection: {
              downsell,
              days: downsell ? DOWNSELL.days : days,
              per_day: downsell ? DOWNSELL.perDay : perDay,
              email_series: emailSeries,
              extras,
              platforms: chosenPlatforms,
            },
            total_usd: priced.total,
            next_action:
              "Time Back funnel order. Confirm payment in Stripe, then send the delivery intake and the no-passwords access invite steps.",
          },
        }),
      });
    } catch {
      setError("Could not reach the order intake. Check the connection and try again.");
      setSending(false);
      return;
    }
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}) as { error?: string })).error ??
          "The order did not go through. Please try again.",
      );
      setSending(false);
      return;
    }
    window.fbq?.("track", "Lead");
    window.fbq?.("track", "InitiateCheckout", { value: priced.total, currency: "USD" });

    // 2) Stripe hosted checkout, priced server-side from the same catalog.
    try {
      const co = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "timeback_order",
          downsell,
          days,
          per_day: perDay,
          email_series: emailSeries,
          extras,
          platforms: chosenPlatforms,
          email,
        }),
      });
      if (co.ok) {
        const j = await co.json();
        if (j.url) {
          window.location.href = j.url;
          return;
        }
      }
      setPayNotice(
        "Card checkout could not start. Your order is locked in, and a secure payment link for " +
          fmt(priced.total) +
          " will be in your inbox within one business day.",
      );
    } catch {
      setPayNotice(
        "Card checkout could not start. Your order is locked in, and a secure payment link for " +
          fmt(priced.total) +
          " will be in your inbox within one business day.",
      );
    }
    setSending(false);
  }

  const emailDiscounted = !downsell;
  const inputCls =
    "w-full rounded-xl border border-[var(--line-strong)] bg-white px-4 py-3 text-[15px] text-[var(--text)] outline-none focus:border-[var(--blue)]";
  const cardCls = "rounded-2xl border border-[var(--line-strong)] bg-white p-6";

  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 pb-20">
      {/* Step 1 — the two dials */}
      <section className={cardCls} id="tb-build">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--blue)]">
          Step 1 · Pick your workload
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-[var(--heading)]">
          How much posting do you want off your plate?
        </h2>
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_280px]">
          <div className="grid gap-7">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--text)]">
                How many days? <span className="text-[var(--blue)]">{days} days</span>
              </span>
              <input
                type="range"
                min={0}
                max={CONTENT_DAYS.length - 1}
                step={1}
                value={daysIdx}
                onChange={(e) => {
                  setDaysIdx(Number(e.target.value));
                  setDownsell(false);
                }}
                aria-label="Number of days"
              />
              <span className="flex justify-between text-xs text-[var(--quiet)]">
                {CONTENT_DAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--text)]">
                Posts per day? <span className="text-[var(--blue)]">{perDay} a day</span>
              </span>
              <input
                type="range"
                min={0}
                max={CONTENT_PER_DAY.length - 1}
                step={1}
                value={perDayIdx}
                onChange={(e) => {
                  setPerDayIdx(Number(e.target.value));
                  setDownsell(false);
                }}
                aria-label="Posts per day"
              />
              <span className="flex justify-between text-xs text-[var(--quiet)]">
                {CONTENT_PER_DAY.map((p) => (
                  <span key={p}>{p}</span>
                ))}
              </span>
            </label>
            <div className="grid gap-2">
              <span className="text-sm font-bold text-[var(--text)]">Where do we post it?</span>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const on = platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatforms((cur) => toggle(cur, p.id))}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold ${
                        on
                          ? "border-[var(--blue)] bg-[var(--accent-tint)] text-[var(--blue)]"
                          : "border-[var(--line-strong)] text-[var(--muted)]"
                      }`}
                    >
                      {on ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-[var(--quiet)]">
                Same price across platforms. We spread your posts where your customers are.
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-6 text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--quiet)]">
              {downsell ? "Starter" : `${totalPosts} posts, done and scheduled`}
            </span>
            <span className="mt-2 text-5xl font-extrabold text-[var(--heading)]">
              {fmt(downsell ? DOWNSELL.price : contentPrice)}
            </span>
            <span className="mt-2 text-sm text-[var(--muted)]">
              {downsell
                ? `${DOWNSELL.days} days x ${DOWNSELL.perDay} posts a day`
                : `about ${fmt(Math.round(contentPrice / totalPosts))} per post, one-time`}
            </span>
            {downsell ? (
              <button
                type="button"
                className="mt-3 text-sm font-bold text-[var(--blue)] underline"
                onClick={() => setDownsell(false)}
              >
                Switch back to the full packages
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Step 2 — automations */}
      <section className={cardCls}>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--blue)]">
          Step 2 · Add the follow-up that closes
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-[var(--heading)]">
          Want the follow-up automated too?
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Posting gets attention. Follow-up turns it into money. Pick an email series length and
          we write it, wire it, and turn it on inside your own account.
        </p>
        {emailDiscounted ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-1.5 text-sm font-bold text-[var(--green)]">
            <CircleCheck className="h-4 w-4" aria-hidden="true" />
            First email series {Math.round(FIRST_EMAIL_DISCOUNT * 100)}% off with any content
            package
          </p>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setEmailSeries(null)}
            className={`rounded-xl border p-4 text-left text-sm font-bold ${
              emailSeries === null
                ? "border-[var(--blue)] bg-[var(--accent-tint)]"
                : "border-[var(--line-strong)]"
            }`}
          >
            No email series yet
          </button>
          {EMAIL_SERIES.map((s) => {
            const cut = emailDiscounted ? Math.round(s.price * (1 - FIRST_EMAIL_DISCOUNT)) : s.price;
            const on = emailSeries === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setEmailSeries(on ? null : s.id)}
                className={`rounded-xl border p-4 text-left ${
                  on ? "border-[var(--blue)] bg-[var(--accent-tint)]" : "border-[var(--line-strong)]"
                }`}
              >
                <span className="block text-sm font-bold text-[var(--text)]">{s.label}</span>
                <span className="mt-1 block text-sm text-[var(--muted)]">
                  {emailDiscounted ? (
                    <>
                      <s className="text-[var(--quiet)]">{fmt(s.price)}</s>{" "}
                      <b className="text-[var(--green)]">{fmt(cut)}</b>
                    </>
                  ) : (
                    <b>{fmt(s.price)}</b>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {EXTRAS.map((x) => {
            const on = extras.includes(x.id);
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setExtras((cur) => toggle(cur, x.id))}
                className={`rounded-xl border p-4 text-left ${
                  on ? "border-[var(--blue)] bg-[var(--accent-tint)]" : "border-[var(--line-strong)]"
                }`}
              >
                <span className="block text-sm font-bold text-[var(--text)]">
                  {x.label} · {fmt(x.price)}
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">{x.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3 — order + checkout */}
      <section className={cardCls} id="tb-checkout">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--blue)]">
          Step 3 · Lock it in
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-[var(--heading)]">Your order</h2>
        <ul className="mt-4 grid gap-2">
          {(priced?.lines ?? []).map((l) => (
            <li
              key={l.label}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] pb-2 text-sm"
            >
              <span className="text-[var(--muted)]">{l.label}</span>
              <b className="text-[var(--text)]">{fmt(l.amount)}</b>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-4 pt-1 text-base">
            <span className="font-bold text-[var(--text)]">Total, one-time</span>
            <b className="text-2xl font-extrabold text-[var(--heading)]">{fmt(total)}</b>
          </li>
        </ul>
        {payNotice ? (
          <p className="mt-4 rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] p-4 text-sm font-bold text-[var(--green)]">
            {payNotice}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="full_name" required placeholder="Your name" className={inputCls} />
              <input name="business_name" placeholder="Business name" className={inputCls} />
              <input
                name="email"
                type="email"
                required
                placeholder="Email"
                className={inputCls}
              />
              <input name="phone" type="tel" placeholder="Mobile number" className={inputCls} />
            </div>
            <textarea
              name="notes"
              rows={2}
              placeholder="Anything we should know? (optional)"
              className={inputCls}
            />
            <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" name="sms_consent" className="mt-1" />
              <span>
                You may call or text me about this order from (903) 500-8898. Reply STOP any time.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" name="marketing_email_consent" className="mt-1" />
              <span>Send me your marketing emails. Unsubscribe any time.</span>
            </label>
            {error ? <p className="text-sm font-bold text-[var(--danger)]">{error}</p> : null}
            <button
              type="submit"
              disabled={sending || !priced}
              className="btn-primary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-6 text-base font-extrabold disabled:opacity-60"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              {sending ? "Starting secure checkout..." : `Pay ${fmt(total)} and start`}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-xs text-[var(--quiet)]">
              Secure card checkout by Stripe. Work happens in YOUR accounts, which you grant
              through official partner access. We never ask for your passwords.
            </p>
            {!downsell ? (
              <button
                type="button"
                className="justify-self-start text-sm font-bold text-[var(--quiet)] underline"
                onClick={() => {
                  downsellOffered.current = true;
                  setShowDownsell(true);
                }}
              >
                Not ready for a full package?
              </button>
            ) : null}
          </form>
        )}
      </section>

      {/* The one-time downsell */}
      {showDownsell ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Starter offer"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--line-strong)] bg-white p-7">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-extrabold text-[var(--heading)]">
                Not ready? Try {DOWNSELL.days} days for {fmt(DOWNSELL.price)}.
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowDownsell(false)}
                className="text-[var(--quiet)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {DOWNSELL.label} Written in your voice, scheduled in your accounts. If it feels like
              a vacation, come back for the month.
            </p>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={acceptDownsell} className="btn-primary min-h-[48px] rounded-xl px-5 font-extrabold">
                Give me the {fmt(DOWNSELL.price)} starter
              </button>
              <button
                type="button"
                onClick={() => setShowDownsell(false)}
                className="min-h-[44px] rounded-xl border border-[var(--line-strong)] px-5 text-sm font-bold text-[var(--muted)]"
              >
                No thanks, keep the full packages
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
