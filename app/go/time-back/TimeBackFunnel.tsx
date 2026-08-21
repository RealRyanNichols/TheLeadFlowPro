"use client";

// The Time Back funnel configurator, dark glass edition. Two dials, one live
// price, add-ons sold on outcomes, a one-time $97 downsell, and a sticky
// total bar so the buy button is never off screen. All logic mirrors
// lib/timeback.ts and /api/checkout recomputes every total server-side.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Lock, X } from "lucide-react";
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

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Rolls a displayed dollar amount toward its target with requestAnimationFrame
// so price changes read as a dial turning, not a number teleporting. Honors
// prefers-reduced-motion by snapping straight to the target.
function useCountUp(target: number, ms = 450) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    if (prefersReducedMotion()) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(from + (target - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

// One visual language for everything clickable: a bordered card that lights
// up blue when selected and shows a check. Nothing decorative shares it.
function cardCls(selected: boolean) {
  return `relative rounded-xl border p-4 text-left transition-colors cursor-pointer ${
    selected
      ? "tb-card-on"
      : "border-[var(--cb-hair-ink)] bg-[#ffffff08] hover:border-[#ffffff45]"
  }`;
}

function CheckMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border ${
        on
          ? "border-[var(--cb-blue-soft)] bg-[var(--cb-blue-soft)] text-[#0a1220]"
          : "border-[#ffffff45] bg-transparent"
      }`}
    >
      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

function StepTag({ n, label }: { n: string; label: string }) {
  return (
    <p className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cb-blue)] text-sm font-extrabold text-white shadow-[0_0_18px_#1240e880]">
        {n}
      </span>
      <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--cb-cyan)]">
        {label}
      </span>
    </p>
  );
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
  const perPost = contentPrice / totalPosts;
  const entryRate = 297 / 21;

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

  // Animated readouts: the hero price and the running total roll to their
  // new value, and the sticky bar button swells with glow once per change.
  const shownPanelPrice = useCountUp(downsell ? DOWNSELL.price : contentPrice);
  const shownTotal = useCountUp(total);
  const [pulseKey, setPulseKey] = useState(0);
  const prevTotal = useRef(total);
  useEffect(() => {
    if (prevTotal.current === total) return;
    prevTotal.current = total;
    if (prefersReducedMotion()) return;
    setPulseKey((k) => k + 1);
  }, [total]);

  useEffect(() => {
    // Touch devices have no mouse to exit with. There, the same "about to
    // leave" signal is a decisive scroll back up after getting deep into the
    // page. Either path offers the starter exactly once.
    if (window.matchMedia("(pointer: coarse)").matches) {
      let deepest = 0;
      function onScroll() {
        if (downsellOffered.current || sending) return;
        const y = window.scrollY;
        if (y >= deepest) {
          deepest = y;
          return;
        }
        if (deepest > 900 && deepest - y > 400) {
          downsellOffered.current = true;
          setShowDownsell(true);
        }
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
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
    const chosenPlatforms = platforms.length ? platforms : ["facebook"];

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
            version: 2,
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

  const inputCls =
    "w-full rounded-xl border border-[#ffffff2e] bg-[#ffffff0f] px-4 py-3 text-[15px] text-[var(--cb-on-ink)] placeholder:text-[#8b97ad] outline-none focus:border-[var(--cb-blue-soft)]";
  const panelCls =
    "tb-panel-glass rounded-[26px] border border-[var(--cb-hair-ink)] bg-[var(--cb-ink-2)] p-6 sm:p-8";

  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-5 px-4 pb-32">
      {/* Step 1 — the two dials */}
      <section className={panelCls} id="tb-build" data-tbr>
        <StepTag n="1" label="Pick your workload" />
        <h2 className="mt-4 text-2xl font-extrabold text-[var(--cb-on-ink)] sm:text-3xl">
          How much posting comes off your plate?
        </h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-8">
            <label className="grid gap-3">
              <span className="flex items-baseline justify-between text-sm font-bold text-[var(--cb-on-ink)]">
                <span>How many days?</span>
                <span className="text-lg font-extrabold text-[var(--cb-cyan)]">{days} days</span>
              </span>
              <input
                type="range"
                min={0}
                max={CONTENT_DAYS.length - 1}
                step={1}
                value={daysIdx}
                className="tb-range"
                onChange={(e) => {
                  setDaysIdx(Number(e.target.value));
                  setDownsell(false);
                }}
                aria-label="Number of days"
              />
              <span className="flex justify-between text-xs font-bold text-[#8b97ad]">
                {CONTENT_DAYS.map((d) => (
                  <span key={d} className={d === days ? "text-[var(--cb-cyan)]" : ""}>
                    {d}
                  </span>
                ))}
              </span>
            </label>
            <label className="grid gap-3">
              <span className="flex items-baseline justify-between text-sm font-bold text-[var(--cb-on-ink)]">
                <span>Posts per day?</span>
                <span className="text-lg font-extrabold text-[var(--cb-cyan)]">{perDay} a day</span>
              </span>
              <input
                type="range"
                min={0}
                max={CONTENT_PER_DAY.length - 1}
                step={1}
                value={perDayIdx}
                className="tb-range"
                onChange={(e) => {
                  setPerDayIdx(Number(e.target.value));
                  setDownsell(false);
                }}
                aria-label="Posts per day"
              />
              <span className="flex justify-between text-xs font-bold text-[#8b97ad]">
                {CONTENT_PER_DAY.map((p) => (
                  <span key={p} className={p === perDay ? "text-[var(--cb-cyan)]" : ""}>
                    {p}
                  </span>
                ))}
              </span>
            </label>
            <div className="grid gap-2">
              <span className="text-sm font-bold text-[var(--cb-on-ink)]">Where do we post it?</span>
              <div className="grid grid-cols-3 gap-2" data-tbr-group>
                {PLATFORMS.map((p) => {
                  const on = platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatforms((cur) => toggle(cur, p.id))}
                      className={`${cardCls(on)} px-3 py-3 pr-9 text-sm font-bold text-[var(--cb-on-ink)]`}
                    >
                      {p.label}
                      <CheckMark on={on} />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-[#8b97ad]">
                Same price across all three. We spread your posts where your customers are.
              </span>
            </div>
          </div>
          <div className="tb-grad-border tb-price-hero flex flex-col items-center justify-center rounded-[20px] p-6 text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#8b97ad]">
              {downsell ? "Starter week" : `${totalPosts} posts, written + scheduled`}
            </span>
            <span className="mt-2 text-6xl font-extrabold tracking-tight text-white [font-variant-numeric:tabular-nums] [text-shadow:0_0_30px_#5b87ff66]">
              {fmt(shownPanelPrice)}
            </span>
            <span className="mt-2 text-sm font-bold text-[var(--cb-cyan)]">
              {downsell
                ? `${DOWNSELL.days} days x ${DOWNSELL.perDay} posts a day`
                : `about ${fmt(Math.round(perPost))} per post, one-time`}
            </span>
            {!downsell && perPost < entryRate - 0.5 ? (
              <span className="mt-2 rounded-lg bg-[#146c3433] px-3 py-1 text-xs font-bold text-[#7ee2a1]">
                Volume rate: {fmt(Math.round((entryRate - perPost) * totalPosts))} less than the
                entry rate
              </span>
            ) : !downsell ? (
              <span className="mt-2 text-xs text-[#8b97ad]">
                Slide up. The per-post price drops.
              </span>
            ) : (
              <button
                type="button"
                className="mt-3 text-sm font-bold text-[var(--cb-cyan)] underline"
                onClick={() => setDownsell(false)}
              >
                Back to full packages
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Step 2 — sell the follow-up */}
      <section className={panelCls} data-tbr>
        <StepTag n="2" label="Turn the attention into money" />
        <h2 className="mt-4 text-2xl font-extrabold text-[var(--cb-on-ink)] sm:text-3xl">
          Posts get you seen. Follow-up gets you paid.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[#a8b4c8]">
          Most businesses lose the lead AFTER the post works. These automations catch them. One
          closed job usually covers everything on this page.
        </p>
        {!downsell ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#146c3433] px-4 py-2 text-sm font-bold text-[#7ee2a1]">
            <Check className="h-4 w-4" aria-hidden="true" />
            Your first email series is {Math.round(FIRST_EMAIL_DISCOUNT * 100)}% off with any
            content package
          </p>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-tbr-group>
          {EMAIL_SERIES.map((s) => {
            const discounted = !downsell;
            const cut = discounted
              ? Math.round(s.price * (1 - FIRST_EMAIL_DISCOUNT))
              : s.price;
            const on = emailSeries === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setEmailSeries(on ? null : s.id)}
                className={`${cardCls(on)} pr-10`}
              >
                {s.id === "email_7" ? (
                  <span className="absolute -top-2 left-3 rounded bg-[var(--cb-cyan)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#0a1220]">
                    Most added
                  </span>
                ) : null}
                <span className="block text-sm font-extrabold text-[var(--cb-on-ink)]">
                  {s.label}
                </span>
                <span className="mt-1 block text-xs text-[#a8b4c8]">
                  A sales email a day for {s.days} days, written once, selling for months.
                </span>
                <span className="mt-2 block text-sm">
                  {discounted ? (
                    <>
                      <s className="text-[#8b97ad]">{fmt(s.price)}</s>{" "}
                      <b className="text-[#7ee2a1]">{fmt(cut)}</b>{" "}
                      <span className="text-xs font-bold text-[#7ee2a1]">
                        save {fmt(s.price - cut)}
                      </span>
                    </>
                  ) : (
                    <b className="text-[var(--cb-on-ink)]">{fmt(s.price)}</b>
                  )}
                </span>
                <CheckMark on={on} />
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3" data-tbr-group>
          {EXTRAS.map((x) => {
            const on = extras.includes(x.id);
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setExtras((cur) => toggle(cur, x.id))}
                className={`${cardCls(on)} pr-10`}
              >
                <span className="block text-sm font-extrabold text-[var(--cb-on-ink)]">
                  {x.label}
                </span>
                <span className="mt-1 block text-xs text-[#a8b4c8]">{x.desc}</span>
                <span className="mt-2 block text-sm font-extrabold text-[var(--cb-on-ink)]">
                  {fmt(x.price)}
                </span>
                <CheckMark on={on} />
              </button>
            );
          })}
        </div>
      </section>

      {/* What happens after you pay */}
      <section className="grid gap-3 sm:grid-cols-3" data-tbr-group>
        {[
          ["Pay in 60 seconds", "Secure Stripe checkout. Card, Apple Pay, Google Pay."],
          [
            "Approve access, no passwords",
            "You get official partner invites for your accounts. Click approve. We never see a password.",
          ],
          [
            "It goes live within 5 business days",
            "Posts written in your voice, scheduled on your calendar, automations switched on. You get a walkthrough.",
          ],
        ].map(([title, body], i) => (
          <div
            key={title}
            className="rounded-[20px] border border-[var(--cb-hair-ink)] bg-[#ffffff08] p-5 shadow-[inset_0_1px_0_#ffffff10]"
          >
            <span className="text-2xl font-extrabold text-[var(--cb-cyan)]">{i + 1}</span>
            <h3 className="mt-1 text-sm font-extrabold text-[var(--cb-on-ink)]">{title}</h3>
            <p className="mt-1 text-xs text-[#a8b4c8]">{body}</p>
          </div>
        ))}
      </section>

      {/* Step 3 — order + checkout */}
      <section className={panelCls} id="tb-checkout" data-tbr>
        <StepTag n="3" label="Lock it in" />
        <h2 className="mt-4 text-2xl font-extrabold text-[var(--cb-on-ink)] sm:text-3xl">
          Your order
        </h2>
        <ul className="mt-4 grid gap-2">
          {(priced?.lines ?? []).map((l) => (
            <li
              key={l.label}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--cb-hair-ink)] pb-2 text-sm"
            >
              <span className="text-[#a8b4c8]">{l.label}</span>
              <b className="text-[var(--cb-on-ink)]">{fmt(l.amount)}</b>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-4 pt-1 text-base">
            <span className="font-bold text-[var(--cb-on-ink)]">Total, one-time</span>
            <b className="text-3xl font-extrabold text-white [font-variant-numeric:tabular-nums] [text-shadow:0_0_24px_#5b87ff66]">
              {fmt(shownTotal)}
            </b>
          </li>
        </ul>
        {payNotice ? (
          <p className="mt-4 rounded-xl bg-[#146c3433] p-4 text-sm font-bold text-[#7ee2a1]">
            {payNotice}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="full_name" required placeholder="Your name" className={inputCls} />
              <input name="business_name" placeholder="Business name" className={inputCls} />
              <input name="email" type="email" required placeholder="Email" className={inputCls} />
              <input name="phone" type="tel" placeholder="Mobile number" className={inputCls} />
            </div>
            <textarea
              name="notes"
              rows={2}
              placeholder="Anything we should know? (optional)"
              className={inputCls}
            />
            <label className="flex items-start gap-2 text-sm text-[#a8b4c8]">
              <input type="checkbox" name="sms_consent" className="mt-1 accent-[#5b87ff]" />
              <span>
                You may call or text me about this order from (903) 500-8898. Reply STOP any time.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[#a8b4c8]">
              <input
                type="checkbox"
                name="marketing_email_consent"
                className="mt-1 accent-[#5b87ff]"
              />
              <span>Send me your marketing emails. Unsubscribe any time.</span>
            </label>
            {error ? <p className="text-sm font-bold text-[#ff8a8a]">{error}</p> : null}
            <button
              type="submit"
              disabled={sending || !priced}
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-[var(--cb-blue)] px-6 text-base font-extrabold text-white shadow-[0_0_36px_#1240e880] transition hover:bg-[var(--cb-blue-deep)] disabled:opacity-60"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              {sending ? "Starting secure checkout..." : `Pay ${fmt(total)} and start`}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-xs text-[#8b97ad]">
              Secure card checkout by Stripe. Everything we build lives in YOUR accounts, granted
              through official partner access. We never ask for a password.
            </p>
            {!downsell ? (
              <button
                type="button"
                className="justify-self-start text-sm font-bold text-[#8b97ad] underline"
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

      {/* Sticky total bar — the buy button never leaves the screen */}
      {!payNotice ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--cb-hair-ink)] bg-[#0a1220f2] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3">
            <div className="leading-tight">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-[#8b97ad]">
                {downsell
                  ? "Starter week"
                  : `${days} days · ${perDay}/day · ${platforms.length || 1} platform${(platforms.length || 1) > 1 ? "s" : ""}`}
              </span>
              <span className="block text-xl font-extrabold text-white [font-variant-numeric:tabular-nums]">
                {fmt(shownTotal)}
              </span>
            </div>
            <button
              key={pulseKey}
              type="button"
              onClick={() =>
                document.getElementById("tb-checkout")?.scrollIntoView({ behavior: "smooth" })
              }
              className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[var(--cb-blue)] px-5 text-sm font-extrabold text-white shadow-[0_0_28px_#1240e880] ${
                pulseKey > 0 ? "tb-btn-pulse" : ""
              }`}
            >
              Start my build
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {/* The one-time downsell */}
      {showDownsell ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Starter offer"
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[20px] border border-[#5b87ff59] bg-[var(--cb-ink-2)] p-7 shadow-[inset_0_1px_0_#ffffff1f,0_0_80px_#1240e866]">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-extrabold text-[var(--cb-on-ink)]">
                Not ready? Try {DOWNSELL.days} days for {fmt(DOWNSELL.price)}.
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowDownsell(false)}
                className="text-[#8b97ad]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm text-[#a8b4c8]">
              {DOWNSELL.label} Written in your voice, scheduled in your accounts. If it feels like
              a vacation, come back for the month.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={acceptDownsell}
                className="min-h-[48px] rounded-xl bg-[var(--cb-blue)] px-5 font-extrabold text-white shadow-[0_0_28px_#1240e880]"
              >
                Give me the {fmt(DOWNSELL.price)} starter
              </button>
              <button
                type="button"
                onClick={() => setShowDownsell(false)}
                className="min-h-[44px] rounded-xl border border-[var(--cb-hair-ink)] px-5 text-sm font-bold text-[#a8b4c8]"
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
