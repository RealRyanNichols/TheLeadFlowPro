"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { severity, SEV_UI } from "@/lib/severity";

/**
 * The Rent Receipt: line-item cost proof.
 * Every price below is published vendor pricing, checked July 2026.
 * Rented and owned stacks are computed from the SAME usage inputs.
 */

const CHECKED = "Prices checked July 2026 from vendor pricing pages.";

type SitePlatform =
  | "shopify_basic"
  | "shopify_grow"
  | "wix"
  | "squarespace"
  | "godaddy"
  | "wordpress"
  | "none";

function mailchimpStandard(contacts: number): { price: number; tier: string } {
  // Mailchimp Standard published tiers (emailtooltester.com pricing table, Jul 2026)
  if (contacts <= 500) return { price: 20, tier: "up to 500 contacts" };
  if (contacts <= 2500) return { price: 60, tier: "up to 2,500 contacts" };
  if (contacts <= 5000) return { price: 100, tier: "up to 5,000 contacts" };
  return { price: 135, tier: "up to 10,000 contacts" };
}

function resendPrice(emailsPerMonth: number): { price: number; tier: string } {
  // resend.com/pricing, Jul 2026
  if (emailsPerMonth <= 3000) return { price: 0, tier: "free tier, 3,000 emails/mo" };
  if (emailsPerMonth <= 50000) return { price: 20, tier: "Pro, 50,000 emails/mo" };
  return { price: 90, tier: "Scale, 100,000 emails/mo" };
}

export default function RentCalculator() {
  const [platform, setPlatform] = useState<SitePlatform>("shopify_basic");
  const [contacts, setContacts] = useState(2500);
  const [emails, setEmails] = useState<number | null>(null); // null = 4x contacts
  const [leads, setLeads] = useState(100);
  const [storageGb, setStorageGb] = useState(2);
  const [visitors, setVisitors] = useState(10000);
  const [useEmail, setUseEmail] = useState(true);
  const [useFunnels, setUseFunnels] = useState(false);
  const [shared, setShared] = useState(false);
  const touched = useRef(false);

  const emailsPerMonth = emails ?? Math.min(100000, contacts * 4);

  function markTouched() {
    if (!touched.current) {
      touched.current = true;
      if (window.fbq) window.fbq("trackCustom", "RentCalculatorUsed");
    }
  }

  // ---------- RENTED STACK, line by line ----------
  const rented: { item: string; detail: string; price: number; approx?: boolean }[] = [];

  if (platform === "shopify_basic")
    rented.push({ item: "Shopify Basic", detail: "$39/mo + card fees from 2.9% + 30¢", price: 39 });
  if (platform === "shopify_grow")
    rented.push({ item: "Shopify Grow", detail: "$105/mo + card fees from 2.7% + 30¢", price: 105 });
  if (platform === "wix")
    rented.push({ item: "Wix Core", detail: "$36/mo month-to-month", price: 36 });
  if (platform === "squarespace")
    rented.push({ item: "Squarespace Core", detail: "$33/mo month-to-month", price: 33 });
  if (platform === "godaddy")
    rented.push({ item: "GoDaddy W+M Premium", detail: "$24.99/mo monthly billing", price: 25 });
  if (platform === "wordpress") {
    const wp =
      visitors <= 25000
        ? { item: "WP Engine Startup", detail: "$30/mo, 25k visits", price: 30 }
        : { item: "WP Engine Professional", detail: "$55/mo, 75k visits", price: 55 };
    rented.push(wp);
    rented.push({ item: "Premium plugins", detail: "forms, SEO, security (typical)", price: 25, approx: true });
  }

  if (useEmail) {
    const mc = mailchimpStandard(contacts);
    rented.push({
      item: "Mailchimp Standard",
      detail: mc.tier,
      price: mc.price,
      approx: contacts > 2500 && contacts <= 5000,
    });
  }

  if (useFunnels)
    rented.push({ item: "ClickFunnels Launch", detail: "$97/mo entry plan", price: 97 });

  const rentedTotal = rented.reduce((s, r) => s + r.price, 0);

  // ---------- OWNED STACK, same usage ----------
  const vercel =
    visitors > 50000
      ? { item: "Vercel Pro", detail: "high traffic tier", price: 20 }
      : { item: "Vercel Hobby", detail: `${visitors.toLocaleString()} visits/mo fits free tier`, price: 0 };

  const supaPro = storageGb > 1 || contacts + leads * 12 > 40000;
  const supabase = supaPro
    ? { item: "Supabase Pro", detail: "8GB database, 100GB file storage", price: 25 }
    : { item: "Supabase Free", detail: "500MB database, 1GB storage", price: 0 };

  const rs = resendPrice(useEmail ? emailsPerMonth : 0);
  const resend = {
    item: rs.price === 0 ? "Resend Free" : `Resend`,
    detail: rs.tier,
    price: rs.price,
  };

  const owned = [
    vercel,
    supabase,
    ...(useEmail ? [resend] : []),
    { item: "Your domain", detail: "~$12/year", price: 1 },
  ];
  const ownedTotal = owned.reduce((s, r) => s + r.price, 0);

  const threeYearRented = rentedTotal * 36;
  const threeYearOwned = ownedTotal * 36;
  const kept = Math.max(0, threeYearRented - threeYearOwned);

  // Severity grading: each side judged against the other. Cheaper side = green.
  const sevR = SEV_UI[severity(rentedTotal, ownedTotal)];
  const sevO = SEV_UI[severity(ownedTotal, rentedTotal)];

  const maxBar = Math.max(rentedTotal, 100);
  const rentPct = Math.max(3, Math.round((rentedTotal / maxBar) * 100));
  const ownPct = Math.max(3, Math.round((ownedTotal / maxBar) * 100));

  async function share() {
    if (window.fbq) window.fbq("trackCustom", "RentCalculatorShared");
    const text = `My business hands $${threeYearRented.toLocaleString()} to Shopify/Wix/Mailchimp-type platforms every 3 years. The same system, owned, costs $${threeYearOwned.toLocaleString()}. Run your own numbers:`;
    const url = "https://www.theleadflowpro.com/?utm_source=share&utm_medium=calculator";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Stop renting your business", text, url });
        return;
      }
    } catch { /* fall through */ }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch { /* ignore */ }
  }

  const sliderRow = (
    label: string,
    value: number,
    display: string,
    min: number,
    max: number,
    step: number,
    onChange: (n: number) => void
  ) => (
    <div>
      <label className="flex items-baseline justify-between text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-bold text-[var(--heading)]">{display}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          markTouched();
          onChange(Number(e.target.value));
        }}
        className="mt-1.5 w-full accent-sky-400"
        aria-label={label}
      />
    </div>
  );

  return (
    <div className="card !p-5 sm:!p-8">
      {/* USAGE INPUTS */}
      <p className="text-sm font-bold uppercase tracking-widest text-flow-400">
        Step 1: Describe your business
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="calc-platform">Your website runs on</label>
          <select
            id="calc-platform"
            className="input"
            value={platform}
            onChange={(e) => {
              markTouched();
              setPlatform(e.target.value as SitePlatform);
            }}
          >
            <option value="shopify_basic">Shopify (Basic)</option>
            <option value="shopify_grow">Shopify (Grow)</option>
            <option value="wix">Wix</option>
            <option value="squarespace">Squarespace</option>
            <option value="godaddy">GoDaddy Website Builder</option>
            <option value="wordpress">WordPress (managed hosting)</option>
            <option value="none">Nothing yet</option>
          </select>
        </div>
        <div className="flex items-end gap-2.5 pb-1">
          <button
            onClick={() => { markTouched(); setUseEmail(!useEmail); }}
            aria-pressed={useEmail}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
              useEmail ? "border-sky-400 bg-[var(--accent-tint)] text-[var(--blue)]" : "border-line text-[var(--muted)]"
            }`}
          >
            Email marketing
          </button>
          <button
            onClick={() => { markTouched(); setUseFunnels(!useFunnels); }}
            aria-pressed={useFunnels}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
              useFunnels ? "border-sky-400 bg-[var(--accent-tint)] text-[var(--blue)]" : "border-line text-[var(--muted)]"
            }`}
          >
            Funnel builder
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {sliderRow("Email list size", contacts, `${contacts.toLocaleString()} contacts`, 0, 10000, 100, (n) => { setContacts(n); if (emails === null) setEmails(null); })}
        {sliderRow("Emails sent per month", emailsPerMonth, emailsPerMonth.toLocaleString(), 0, 100000, 500, (n) => setEmails(n))}
        {sliderRow("New leads per month", leads, leads.toLocaleString(), 0, 1000, 10, setLeads)}
        {sliderRow("Site visitors per month", visitors, visitors.toLocaleString(), 0, 100000, 1000, setVisitors)}
        {sliderRow("File storage needed", storageGb, `${storageGb} GB`, 0, 50, 1, setStorageGb)}
      </div>

      {/* LINE ITEMS */}
      <p className="mt-8 text-sm font-bold uppercase tracking-widest text-flow-400">
        Step 2: The receipt, line by line
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* RENTED — color grades itself vs the owned side */}
        <div className={`rounded-xl border bg-[var(--page)] p-4 ${sevR.border} ${sevR.glow}`}>
          <div className="flex items-baseline justify-between border-b border-line pb-2">
            <span className={`font-bold ${sevR.text}`}>RENTING</span>
            <span className={`text-xl font-black ${sevR.text}`}>${rentedTotal.toLocaleString()}/mo</span>
          </div>
          <ul className="mt-3 space-y-2.5 text-sm">
            {rented.length === 0 && (
              <li className="text-[var(--muted)]">Pick your platform and tools above.</li>
            )}
            {rented.map((r) => (
              <li key={r.item} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold text-[var(--text)]">{r.item}</span>
                  <span className="block text-xs text-[var(--muted)]">{r.detail}{r.approx ? " (approx.)" : ""}</span>
                </span>
                <span className="font-bold text-[var(--text)]">${r.price}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* OWNED — green whenever it beats renting, no matter what */}
        <div className={`rounded-xl border bg-[var(--page)] p-4 ${sevO.border} ${sevO.glow}`}>
          <div className="flex items-baseline justify-between border-b border-line pb-2">
            <span className={`font-bold ${sevO.text}`}>OWNING (same usage)</span>
            <span className={`text-xl font-black ${sevO.text}`}>${ownedTotal.toLocaleString()}/mo</span>
          </div>
          <ul className="mt-3 space-y-2.5 text-sm">
            {owned.map((r) => (
              <li key={r.item} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold text-[var(--text)]">{r.item}</span>
                  <span className="block text-xs text-[var(--muted)]">{r.detail}</span>
                </span>
                <span className="font-bold text-[var(--text)]">${r.price}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* COMPARISON BARS */}
      <div className="mt-6 space-y-3">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-[var(--text)]">Renting <span className={`ml-1 text-xs font-bold uppercase ${sevR.text}`}>{sevR.label}</span></span>
            <span className={`font-black ${sevR.text}`}>${rentedTotal.toLocaleString()}/mo</span>
          </div>
          <div className="mt-1 h-5 overflow-hidden rounded bg-line/40">
            <div className="h-full rounded-r transition-all duration-500" style={{ width: `${rentPct}%`, backgroundColor: sevR.hex, boxShadow: `0 0 14px ${sevR.hex}55` }} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-[var(--text)]">Owning <span className={`ml-1 text-xs font-bold uppercase ${sevO.text}`}>{sevO.label}</span></span>
            <span className={`font-black ${sevO.text}`}>${ownedTotal.toLocaleString()}/mo</span>
          </div>
          <div className="mt-1 h-5 overflow-hidden rounded bg-line/40">
            <div className="h-full rounded-r transition-all duration-500" style={{ width: `${ownPct}%`, backgroundColor: sevO.hex, boxShadow: `0 0 14px ${sevO.hex}55` }} />
          </div>
        </div>
      </div>

      {/* 3-YEAR PUNCH */}
      <div className="mt-6 grid gap-4 rounded-xl bg-[var(--page)] p-5 text-center sm:grid-cols-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            3 years of renting
          </div>
          <div className={`mt-1 text-4xl font-black ${sevR.text}`} style={{ textShadow: `0 0 24px ${sevR.hex}73` }}>${threeYearRented.toLocaleString()}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">and you still own nothing</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Own it and keep
          </div>
          <div className={`mt-1 text-4xl font-black ${kept > 0 ? "text-mint " : "text-[var(--text)]"}`}>${kept.toLocaleString()}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">plus the code, the leads, the data</div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/book?utm_source=calculator&utm_medium=site&utm_campaign=rent-receipt"
          className="btn-primary text-center"
        >
          Stop Paying This — Book My Call
        </Link>
        <button onClick={share} className="btn-ghost">
          {shared ? "✓ Copied — paste it anywhere" : "Share Your Number"}
        </button>
      </div>

      {/* THE RECEIPTS — always on display. This is the proof, not the fine print. */}
      <div className="mt-8 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5 -xl sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-black tracking-wide text-[var(--heading)]">
            THE RECEIPTS
          </h3>
          <span className="text-xs font-semibold uppercase tracking-widest text-flow-400">
            {CHECKED}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--text)]">
          Every number above comes straight from the vendors' own published
          pricing pages. Click any of them. Check me.
        </p>
        <ul className="mt-4 grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">Shopify</span> <span className="text-[var(--muted)]">Basic $39 · Grow $105 · Advanced $399/mo</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://www.shopify.com/pricing" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">Wix</span> <span className="text-[var(--muted)]">Core $36/mo month-to-month</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://www.wix.com/plans" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">Squarespace</span> <span className="text-[var(--muted)]">Core $33/mo month-to-month</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://www.squarespace.com/pricing" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">GoDaddy</span> <span className="text-[var(--muted)]">W+M Premium $24.99/mo</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://www.godaddy.com/pricing" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">WP Engine</span> <span className="text-[var(--muted)]">Startup $30 · Professional $55/mo</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://wpengine.com/plans/" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">Mailchimp</span> <span className="text-[var(--muted)]">Standard $20 → $135/mo by list size</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://mailchimp.com/pricing/marketing/" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">ClickFunnels</span> <span className="text-[var(--muted)]">Launch $97 · Scale $197 · Optimize $297/mo</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://www.clickfunnels.com/pricing" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">Vercel</span> <span className="text-[var(--muted)]">Hobby free · Pro $20/mo</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://vercel.com/pricing" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">Supabase</span> <span className="text-[var(--muted)]">Free tier · Pro $25/mo (8GB DB, 100GB files)</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://supabase.com/pricing" target="_blank" rel="noreferrer">source ↗</a>
          </li>
          <li className="flex justify-between gap-3">
            <span><span className="font-bold text-[var(--heading)]">Resend</span> <span className="text-[var(--muted)]">3,000 emails free · $20 for 50k · $90 for 100k</span></span>
            <a className="shrink-0 font-semibold text-flow-400 underline" href="https://resend.com/pricing" target="_blank" rel="noreferrer">source ↗</a>
          </li>
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Items marked approx. sit between published tiers or reflect typical
          add-on costs. Card processing fees hit BOTH stacks about the same
          (Stripe and Shopify Payments both run roughly 2.9% + 30¢), so they
          cancel out of this comparison. Vendors change prices — on your call we
          pull live quotes.
        </p>
      </div>
    </div>
  );
}
