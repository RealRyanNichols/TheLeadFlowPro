// src/app/solutions/mortgage/page.tsx — sales page for Mortgage OS
import Link from "next/link";
import {
  ArrowRight, Bot, ShieldCheck, Timer, Users, FileText, Megaphone,
  Building2, HeartHandshake, Check, Phone, Mail, Sparkles,
} from "lucide-react";
import MortgagePrequalWidget from "@/components/MortgagePrequalWidget";
import { MORTGAGE_PLANS, MORTGAGE_ADDONS, MORTGAGE_ONETIME, VERTICALS, LOAN_TYPE_ORDER } from "@/lib/mortgage";

export const metadata = {
  title: "Mortgage OS — The LeadFlow Pro",
  description:
    "One system that replaces your CRM, dialer, compliance scanner, content engine, and rate-watch tool. Built for independent mortgage originators.",
};

const PROBLEMS = [
  { n: 1, p: "First-touch latency", cost: "$3–5k per lost deal ×30–60/mo", fix: "Flo Inbox", icon: Timer },
  { n: 2, p: "Lead cost inflation", cost: "$15–30k/mo on mid-funnel waste", fix: "Direct Lead Engine", icon: Megaphone },
  { n: 3, p: "Doc collection friction", cost: "$500–1,500 per file in LO time", fix: "Doc Chaser", icon: FileText },
  { n: 4, p: "Compliance audit risk", cost: "$50k+ per violation", fix: "Compliance Guard", icon: ShieldCheck },
  { n: 5, p: "Past-client retention", cost: "$2–5k per lost re-close", fix: "Rate-Watch Reactivation", icon: Bot },
  { n: 6, p: "Realtor partner decay", cost: "30–40% of purchase volume", fix: "Partner Portal", icon: Users },
  { n: 7, p: "FTHB nurture leak", cost: "15–25% of potential book", fix: "FTHB Drip", icon: HeartHandshake },
  { n: 8, p: "Content drought", cost: "Starves soft pipeline", fix: "Flo Content Engine", icon: Sparkles },
];

const MODULES = [
  {
    n: 1, t: "Flo Inbox", s: "AI First-Touch Desk",
    body: "Every inbound lead gets a human-sounding text and email in under 90 seconds, 24/7. Qualifies loan type, FICO band, timeline, state. Scores A/B/C/D and drops on your phone with one tap to call.",
  },
  {
    n: 2, t: "Direct Lead Engine", s: "Own your funnel",
    body: "Compliance-reviewed Meta and Google creatives per loan type per state. Public-record triggers: divorces, probates, FSBOs, 62-birthday pre-list. QR codes for open houses, embedded widget for partner sites.",
  },
  {
    n: 3, t: "Doc Chaser", s: "Full file in under 21 days",
    body: "Per-loan-type checklist fires at first touch. Plaid for bank statements, The Work Number for VVOE, DocuSign for e-sigs. AI-written 48h nudges that sound human and don't violate TCPA.",
  },
  {
    n: 4, t: "Compliance Guard", s: "Every send scanned",
    body: "RESPA §8, TILA LE-3-day + CD-3-day, ECOA AAN, TCPA consent log, SAFE NMLS stamp, HMDA/fair-lending export, GLBA encryption, state overlays (TX A6, CA/NY/FL/IL/OH/GA). Green ships. Yellow asks. Red blocks.",
  },
  {
    n: 5, t: "Rate-Watch Reactivation", s: "Pay zero for the next closing",
    body: "Daily MBS monitor vs. every past client's quoted rate. Flo fires a message the moment their rate drops 25 bps. Typical book reactivates 1–3% per cycle — pure-margin closings off zero ad spend.",
  },
  {
    n: 6, t: "Partner Portal", s: "Keep realtors active without lifting a finger",
    body: "Co-branded landing pages per agent. 60-second seller net-sheets. Buyer affordability calculators. Monthly market updates. Preferred-Partner drip for anyone sending 3+ deals.",
  },
  {
    n: 7, t: "Flo Content Engine", s: "Daily social + email, in your voice",
    body: "Daily rate update to past clients. Weekly FTHB education post. Monthly rate-drop blast. Just-Closed celebration posts. Every piece scanned by Compliance Guard before it leaves the queue.",
  },
];

const VENDORS = [
  { t: "Title &amp; Escrow", b: "Co-branded seller nets, order status, e-sig on title docs." },
  { t: "Homeowner's Insurance", b: "Instant binder ordering, dec-page collection for loan file." },
  { t: "Appraisal / AMC", b: "Auto-order post-Intent-to-Proceed, turn-time radar." },
  { t: "DPA Counselors", b: "Warm-handoff queue for sub-620 and FTHB borrowers." },
  { t: "Real-Estate Attorneys", b: "E-docs + closing packet routing in attorney-close states." },
];

export default function MortgagePage() {
  return (
    <main className="relative">
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      {/* ═══ HERO ═══ */}
      <section className="container max-w-6xl mx-auto pt-10 md:pt-16 pb-8 md:pb-12">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-200 text-xs uppercase tracking-widest">
              <Building2 className="h-3.5 w-3.5" /> Mortgage OS
            </div>
            <h1 className="mt-3 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              The operating system for <span className="funnel-text">independent mortgage originators.</span>
            </h1>
            <p className="mt-5 text-xl text-ink-100 max-w-2xl leading-relaxed">
              One system that replaces your CRM, dialer, LOS-adjacent nurture, compliance scanner, content engine,
              and rate-watch tool. Built for the solo LO doing 3–40 loans a month — and every team stacking on top.
            </p>

            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                "Under-90-second AI first touch, 24/7",
                "RESPA / TILA / ECOA / TCPA baked in",
                "Plaid + VVOE + DocuSign in the flow",
                "Rate-Watch reactivation for every past client",
                "Partner Portal for realtors and title",
                "10 verticals — each with its own Flo voice",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-ink-100">
                  <Check className="h-4 w-4 mt-0.5 text-emerald-300" /> {b}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition"
              >
                See pricing <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services/mortgage-audit"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 hover:border-cyan-300 px-5 py-2.5 text-sm font-semibold text-cyan-200 hover:text-white transition"
              >
                Get a $397 Mortgage Audit
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-ink-300">
              Retail LO commission on a $350k purchase ≈ $3,500–$5,000. Mortgage Pro breaks even at <span className="text-white font-semibold">1 extra deal every 8 months.</span>
            </p>
          </div>

          {/* Widget */}
          <div className="animate-fade-up">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> Try it — the widget your borrowers will see
            </div>
            <MortgagePrequalWidget loDisplayName="your Mortgage OS LO" />
          </div>
        </div>
      </section>

      {/* ═══ PROBLEMS ═══ */}
      <section className="container max-w-6xl mx-auto py-10 md:py-14 animate-fade-up">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-extrabold">The 8 things bleeding your book every month.</h2>
          <p className="mt-3 text-ink-200">Every module in Mortgage OS solves one of these. If a problem isn't on this list, we don't build for it yet.</p>
        </div>
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROBLEMS.map((p) => {
            const I = p.icon;
            return (
              <div key={p.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-300/40 transition">
                <div className="flex items-center gap-2 text-cyan-300 text-xs uppercase tracking-widest">
                  <I className="h-4 w-4" /> Problem #{p.n}
                </div>
                <div className="mt-2 font-bold text-white">{p.p}</div>
                <div className="mt-1 text-xs text-rose-300/80">Costs: {p.cost}</div>
                <div className="mt-3 text-xs inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 px-2 py-0.5">
                  <Check className="h-3 w-3" /> Fixed by {p.fix}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ MODULES ═══ */}
      <section className="container max-w-6xl mx-auto py-10 md:py-14 animate-fade-up">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-extrabold">Seven modules. One login. Zero 2 a.m. CRM work.</h2>
          <p className="mt-3 text-ink-200">Buy the whole OS or enable modules one at a time. Every module is a shipped product — not a roadmap.</p>
        </div>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <div key={m.n} className="rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-widest text-cyan-300">Module {m.n}</div>
              <h3 className="mt-1 text-xl font-extrabold text-white">{m.t}</h3>
              <div className="text-sm text-ink-300 mb-2">{m.s}</div>
              <p className="text-sm text-ink-100 leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ VERTICALS ═══ */}
      <section className="container max-w-6xl mx-auto py-10 md:py-14 animate-fade-up">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-extrabold">Ten verticals. Ten different Flo voices.</h2>
          <p className="mt-3 text-ink-200">
            A generic CRM treats every lead like a row. Mortgage is ten different businesses in a trench coat. Every vertical gets its own qualifier questions, doc checklist, drip, and tone-matched Flo so the system never says "paystubs" to a 1099 borrower.
          </p>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOAN_TYPE_ORDER.map((t) => {
            const v = VERTICALS[t];
            return (
              <div key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-bold text-white">{v.label}</div>
                <div className="text-xs text-ink-300 mt-1">{v.blurb}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-200">
                  <div>Close: {v.closeDays[0]}–{v.closeDays[1]}d</div>
                  <div>Per deal: ${v.perDealUsd[0].toLocaleString()}–${v.perDealUsd[1].toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ VENDOR PARTNERS ═══ */}
      <section className="container max-w-6xl mx-auto py-10 md:py-14 animate-fade-up">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-extrabold">The same platform for your vendor partners.</h2>
          <p className="mt-3 text-ink-200">Title, insurance, appraisal, DPA, and attorneys plug into the same system — without separate logins, separate tools, or separate fees.</p>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VENDORS.map((v) => (
            <div key={v.t} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-bold text-white">{v.t}</div>
              <div className="text-xs text-ink-200 mt-1" dangerouslySetInnerHTML={{ __html: v.b }} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="container max-w-6xl mx-auto py-10 md:py-14 animate-fade-up">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-extrabold">Pricing — one OS, four plans.</h2>
          <p className="mt-3 text-ink-200">Existing LeadFlow Pro Agency + Enterprise members get 30% off any plan below.</p>
        </div>
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(MORTGAGE_PLANS).map((p) => (
            <div key={p.slug} className={`rounded-2xl border p-5 ${p.slug === "pro" ? "border-cyan-300 bg-cyan-400/5" : "border-white/10 bg-white/[0.03]"}`}>
              {p.slug === "pro" && (
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-1">Most popular</div>
              )}
              <div className="text-sm text-ink-300 uppercase tracking-widest">{p.name}</div>
              <div className="mt-1 text-3xl font-extrabold text-white">
                ${p.priceMonthly}<span className="text-base text-ink-300">/mo</span>
              </div>
              {p.perLeadFee && (
                <div className="text-[11px] text-ink-300 mt-0.5">+ ${p.perLeadFee}/lead routed</div>
              )}
              <div className="mt-2 text-xs text-ink-300">
                {p.seats === "unlimited" ? "Unlimited seats" : `${p.seats} seat${p.seats === 1 ? "" : "s"}`}
                {" · "}
                {p.activeLeads === "unlimited" ? "Unlimited active leads" : `${p.activeLeads.toLocaleString()} active leads`}
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-100">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-emerald-300" /> {h}
                  </li>
                ))}
              </ul>
              <Link
                href={`/api/checkout?sku=mortgage-${p.slug}`}
                className={`mt-5 inline-flex w-full justify-center items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                  p.slug === "pro" ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950" : "border border-cyan-400/40 hover:border-cyan-300 text-cyan-200 hover:text-white"
                } transition`}
              >
                Start {p.name} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-bold text-white">Add-ons (recurring)</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {MORTGAGE_ADDONS.map((a) => (
                <li key={a.slug} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                  <span className="text-ink-100">{a.name}</span>
                  <span className="font-bold text-white">${a.priceMonthly}/mo</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">One-time services</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {MORTGAGE_ONETIME.map((o) => (
                <li key={o.slug} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                  <span className="text-ink-100">{o.name}</span>
                  <span className="font-bold text-white">${o.price}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="container max-w-4xl mx-auto py-10 md:py-14 animate-fade-up">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">Questions LOs actually ask.</h2>
        <div className="mt-6 space-y-3">
          {[
            { q: "Does this replace my LOS?", a: "No. Mortgage OS sits in front of your LOS (Encompass, Arive, LendingPad). We qualify + collect + nurture until a file is ready to hand off. Phase 3 adds deep LOS sync." },
            { q: "Is it compliant in my state?", a: "National baseline: RESPA §8, TILA (LE 3-day + CD 3-day), ECOA Reg B (AAN in 30 days), TCPA consent logging, SAFE Act NMLS stamping, GLBA encryption. State overlays included: TX A6 / 12-day cooling off, plus CA, NY, FL, IL, OH, GA. Need a state we haven't listed? It's a 1-week add." },
            { q: "What if my brokerage uses Total Expert or Bonzo already?", a: "We coexist. Our launch config can run side-by-side — Flo Inbox on new leads only while your current sequences run to existing contacts. Most LOs turn the old tool off after 30 days when they see the close-rate delta." },
            { q: "Are the leads ours or yours?", a: "100% yours. Every lead generated through your Direct Lead Engine or embedded widget is your property, exportable any time in standard CSV + Encompass format." },
            { q: "What's the 14-day guarantee?", a: "If you're not closing more files or saving LO time within 14 days, we refund the month and help you export. We'd rather lose a fight than bleed a bad fit." },
          ].map((f, i) => (
            <details key={i} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <summary className="cursor-pointer font-semibold text-white flex items-center justify-between">
                {f.q}
                <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-ink-100 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="container max-w-3xl mx-auto pb-16 text-center animate-fade-up">
        <h2 className="text-3xl md:text-4xl font-extrabold">Close more loans. Keep your nights back.</h2>
        <p className="mt-3 text-ink-200">Start with a $397 Mortgage Audit, or skip the audit and launch Pro this week.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/services/mortgage-audit" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 hover:border-cyan-300 px-5 py-2.5 text-sm font-semibold text-cyan-200 hover:text-white transition">
            <Phone className="h-4 w-4" /> Book the $397 audit
          </Link>
          <Link href="/api/checkout?sku=mortgage-pro" className="inline-flex items-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition">
            <Mail className="h-4 w-4" /> Start Mortgage Pro — $497/mo
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-ink-400">14-day money-back on every recurring plan. Cancel online in one click.</p>
      </section>
    </main>
  );
}
