"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, Check, LockKeyhole, RotateCcw } from "lucide-react";
import {
  MONTHLY_MENU,
  priceToolStudio,
  TOOL_BUILDS,
  type MonthlyMenuId,
  type ToolBuildId,
} from "@/lib/toolStudio";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function money(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

function card(on: boolean) {
  return `relative w-full rounded-2xl border p-5 text-left transition ${
    on
      ? "border-cyan-300 bg-cyan-300/10 shadow-[inset_0_0_0_1px_rgba(103,232,249,.18)]"
      : "border-white/10 bg-[#0b172b] hover:border-cyan-300/40"
  }`;
}

export default function ToolStudioFunnel() {
  const [buildId, setBuildId] = useState<ToolBuildId>("tool_funnel");
  const [monthly, setMonthly] = useState<MonthlyMenuId[]>([]);
  const [adSpend, setAdSpend] = useState(500);
  const [costPerLead, setCostPerLead] = useState(25);
  const [closeRate, setCloseRate] = useState(20);
  const [saleValue, setSaleValue] = useState(500);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const priced = useMemo(
    () => priceToolStudio({ buildId, monthlyIds: monthly }),
    [buildId, monthly],
  );

  const leads = Math.floor(adSpend / Math.max(costPerLead, 1));
  const sales = Math.floor(leads * (closeRate / 100));
  const projectedRevenue = sales * saleValue;

  function toggleMonthly(id: MonthlyMenuId) {
    setMonthly((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priced) return;
    setSending(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number before choosing call or text consent.");
      setSending(false);
      return;
    }
    if (monthly.length > 0 && form.get("monthly_terms") !== "on") {
      setError("Confirm the monthly renewal terms before starting recurring checkout.");
      setSending(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const selectionText = [
      priced.build ? `${priced.build.name}: ${money(priced.build.priceUsd)} one time.` : "",
      ...priced.monthly.map((item) => `${item.name}: ${money(item.priceUsd)}/month.`),
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const intake = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          business_name: form.get("business_name"),
          email,
          phone: phone || null,
          website_url: form.get("website_url"),
          interest: "company_os",
          desired_modules: ["forms_tools", "website_funnels", "email_automation"],
          budget_range: priced.renewsMonthlyUsd
            ? `${money(priced.renewsMonthlyUsd)}/month selected`
            : `${money(priced.dueTodayUsd)} one time`,
          goals: `TOOL STUDIO ORDER. ${selectionText} Tool idea: ${String(form.get("tool_idea") ?? "").trim()}`,
          best_contact_method: phone ? "text" : "email",
          sms_consent: smsConsent,
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          diagnostic: {
            version: 1,
            source: "tool_studio",
            build_id: buildId,
            monthly_ids: monthly,
            due_today_usd: priced.dueTodayUsd,
            renews_monthly_usd: priced.renewsMonthlyUsd,
            next_action:
              "Confirm Stripe payment, then send the Tool Studio intake and lock the written inputs, outputs, revisions, and exclusions.",
          },
        }),
      });
      if (!intake.ok) {
        const body = (await intake.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "The build request could not be saved.");
      }

      window.fbq?.("track", "Lead");
      window.fbq?.("track", "InitiateCheckout", {
        value: priced.dueTodayUsd,
        currency: "USD",
      });

      const checkout = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "tool_studio",
          build_id: buildId,
          monthly_ids: monthly,
          email,
        }),
      });
      const checkoutBody = (await checkout.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (checkout.ok && checkoutBody.url) {
        window.location.href = checkoutBody.url;
        return;
      }
      setNotice(
        `Your build request is saved. Card checkout did not open, so I will send the secure ${money(
          priced.dueTodayUsd,
        )} checkout link after I verify the selection.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request did not go through.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="build-menu" className="border-t border-white/10 bg-[#081225] py-16 lg:py-24">
      <div className="mx-auto grid w-[min(1180px,calc(100%-32px))] gap-14">
        <header className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">
            Product + price discovery
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.045em] text-white sm:text-6xl">
            Pick the smallest build that can prove the idea.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">
            The point is not to underprice the work or make you buy a giant system too early.
            It is to get one useful thing live, measure it, and build the next layer from real
            customer behavior.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3" aria-label="Tool build options">
          {TOOL_BUILDS.map((build) => {
            const on = build.id === buildId;
            return (
              <button
                key={build.id}
                type="button"
                className={card(on)}
                aria-pressed={on}
                onClick={() => setBuildId(build.id)}
              >
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full border border-white/30">
                  {on ? <Check className="h-4 w-4 text-cyan-300" aria-hidden="true" /> : null}
                </span>
                {build.tag ? (
                  <span className="text-[11px] font-black uppercase tracking-[.16em] text-cyan-300">
                    {build.tag}
                  </span>
                ) : null}
                <h3 className="mt-2 pr-10 text-2xl font-black text-white">{build.name}</h3>
                <p className="mt-2 text-4xl font-black tracking-tight text-white">
                  {money(build.priceUsd)}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">{build.description}</p>
                <p className="mt-4 border-t border-white/10 pt-4 text-sm font-bold leading-6 text-slate-200">
                  {build.bestFor}
                </p>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-300">
                  {build.includes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-400">
                  Scope boundary: {build.boundary}
                </p>
              </button>
            );
          })}
        </div>

        <section className="grid gap-7 rounded-[28px] border border-cyan-300/20 bg-[#050b19] p-6 lg:grid-cols-[.9fr_1.1fr] lg:p-9">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">
              Live example
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-white">
              Lead math calculator
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This is the kind of simple, useful interaction that keeps people on a page and
              helps them make a decision. The projection is an estimate, not a promise.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Monthly ad spend", adSpend, setAdSpend, 100, 5000, 100, "$"],
                ["Estimated cost per lead", costPerLead, setCostPerLead, 5, 200, 5, "$"],
                ["Estimated close rate", closeRate, setCloseRate, 1, 80, 1, "%"],
                ["Average sale value", saleValue, setSaleValue, 50, 10000, 50, "$"],
              ].map(([label, value, setter, min, max, step, unit]) => (
                <label key={String(label)} className="grid gap-2 text-sm font-bold text-slate-300">
                  <span>{String(label)}</span>
                  <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3">
                    {unit === "$" ? <span className="text-slate-500">$</span> : null}
                    <input
                      className="min-h-11 w-full bg-transparent text-white outline-none"
                      type="number"
                      min={Number(min)}
                      max={Number(max)}
                      step={Number(step)}
                      value={Number(value)}
                      onChange={(event) =>
                        (setter as React.Dispatch<React.SetStateAction<number>>)(
                          Math.max(Number(min), Number(event.target.value) || Number(min)),
                        )
                      }
                    />
                    {unit === "%" ? <span className="text-slate-500">%</span> : null}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="grid content-center gap-3 rounded-2xl border border-white/10 bg-[#0b172b] p-6">
            <BarChart3 className="h-7 w-7 text-cyan-300" aria-hidden="true" />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <p className="rounded-xl bg-white/5 p-4">
                <span className="block text-xs uppercase tracking-wider text-slate-500">Estimated leads</span>
                <strong className="mt-1 block text-3xl text-white">{leads}</strong>
              </p>
              <p className="rounded-xl bg-white/5 p-4">
                <span className="block text-xs uppercase tracking-wider text-slate-500">Estimated sales</span>
                <strong className="mt-1 block text-3xl text-white">{sales}</strong>
              </p>
            </div>
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                Modeled gross revenue
              </span>
              <strong className="mt-1 block text-4xl text-white">{money(projectedRevenue)}</strong>
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                Before costs. Real results depend on targeting, offer, sales process, margin, and follow-up.
              </span>
            </p>
          </div>
        </section>

        <section>
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">
              Optional monthly build menu
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Pre-order what you want worked next month.
            </h3>
            <p className="mt-4 leading-7 text-slate-400">
              Choose only the recurring work you want. Checkout charges the first month today
              and renews on the same calendar date. Submit changes at least three business days
              before renewal. Nothing new is added without approval.
            </p>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {MONTHLY_MENU.map((item) => {
              const on = monthly.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={card(on)}
                  aria-pressed={on}
                  onClick={() => toggleMonthly(item.id)}
                >
                  <span className="flex items-start justify-between gap-4">
                    <strong className="text-lg text-white">{item.name}</strong>
                    <span className="shrink-0 font-black text-cyan-300">{money(item.priceUsd)}/mo</span>
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-slate-400">{item.description}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-slate-400">
            <RotateCcw className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            Already subscribed? Use the <Link className="font-bold text-cyan-300 underline" href="/go/tools/manage">next-month change form</Link>.
          </p>
        </section>

        <section className="grid gap-8 rounded-[28px] border border-cyan-300/30 bg-[#0b172b] p-6 lg:grid-cols-[.72fr_1.28fr] lg:p-9">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Your build</p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-white">Lock the next step.</h3>
            <div className="mt-6 grid gap-3 text-sm">
              {priced?.build ? (
                <p className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <span>{priced.build.name}</span><strong className="text-white">{money(priced.build.priceUsd)}</strong>
                </p>
              ) : null}
              {priced?.monthly.map((item) => (
                <p key={item.id} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <span>{item.name}</span><strong className="text-white">{money(item.priceUsd)}/mo</strong>
                </p>
              ))}
            </div>
            <p className="mt-6 flex items-end justify-between gap-3">
              <span className="text-sm uppercase tracking-wider text-slate-500">Due today</span>
              <strong className="text-4xl text-white">{money(priced?.dueTodayUsd ?? 0)}</strong>
            </p>
            {priced?.renewsMonthlyUsd ? (
              <p className="mt-2 text-right text-sm font-bold text-cyan-300">
                Then {money(priced.renewsMonthlyUsd)}/month until canceled or changed
              </p>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-300">
                Your name *
                <input name="full_name" autoComplete="name" required maxLength={200} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-300">
                Business name
                <input name="business_name" autoComplete="organization" maxLength={200} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-300">
                Email *
                <input name="email" type="email" autoComplete="email" required maxLength={200} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-300">
                Mobile phone
                <input name="phone" type="tel" autoComplete="tel" maxLength={50} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-300 sm:col-span-2">
                Current website or main profile
                <input name="website_url" inputMode="url" maxLength={300} placeholder="Website, Facebook page, or none yet" className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              What should the tool help your customer decide or do? *
              <textarea name="tool_idea" required rows={4} maxLength={1200} className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:border-cyan-300" />
            </label>
            <label className="flex gap-3 text-xs leading-5 text-slate-400">
              <input type="checkbox" name="sms_consent" className="mt-1 h-4 w-4 accent-blue-600" />
              If I provided a mobile number, The LeadFlow Pro may call or text me about this request and project updates. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out.
            </label>
            <label className="flex gap-3 text-xs leading-5 text-slate-400">
              <input type="checkbox" name="marketing_email_consent" className="mt-1 h-4 w-4 accent-blue-600" />
              Send me occasional LeadFlow tools, articles, and launch updates by email. I can unsubscribe at any time.
            </label>
            {monthly.length > 0 ? (
              <label className="flex gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-slate-300">
                <input type="checkbox" name="monthly_terms" required className="mt-1 h-4 w-4 accent-blue-600" />
                I authorize {money(priced?.renewsMonthlyUsd ?? 0)} to renew monthly on the same calendar date until canceled or changed. I will submit menu changes at least three business days before renewal. After a renewal is charged and that month's work begins, the paid service period is non-refundable except where law requires otherwise.
              </label>
            ) : null}
            {error ? <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-300">{error}</p> : null}
            {notice ? <p className="rounded-xl bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">{notice}</p> : null}
            <button disabled={sending} type="submit" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-black uppercase tracking-wider text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
              {sending ? "Saving Your Build..." : `Continue to Secure Checkout | ${money(priced?.dueTodayUsd ?? 0)}`}
              {!sending ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
            <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Stripe handles card details. Written scope controls production. Paid third-party costs and work outside the selected scope require separate approval. By continuing, you agree to the <Link className="underline" href="/terms">Terms</Link> and <Link className="underline" href="/privacy">Privacy Policy</Link>.
            </p>
          </form>
        </section>
      </div>
    </section>
  );
}

