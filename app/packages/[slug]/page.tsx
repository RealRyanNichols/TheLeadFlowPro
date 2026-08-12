import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  ShieldCheck,
} from "lucide-react";
import BuyButton from "@/components/BuyButton";
import PackageOrderForm from "./PackageOrderForm";

// Full sales pages for each package. "See what is included" lands here, the
// pitch is complete, and the visitor can buy, put money down, or send an
// interest form without ever needing Ryan to explain it later.

const TILE = [
  "linear-gradient(135deg,#38bdf8,#2563eb)",
  "linear-gradient(135deg,#a78bfa,#d946ef)",
  "linear-gradient(135deg,#34d399,#0ea371)",
  "linear-gradient(135deg,#fbbf24,#f97316)",
  "linear-gradient(135deg,#f87171,#ef4444)",
  "linear-gradient(135deg,#22d3ee,#3b82f6)",
];

type Pack = {
  slug: string;
  eyebrow: string;
  name: string;
  price: string;
  priceNote: string;
  headline: string;
  sub: string;
  interest: string;
  buyable: boolean;
  included: Array<{ name: string; why: string }>;
  phases: Array<{ title: string; body: string }>;
  proof: Array<{ name: string; what: string; url: string }>;
  faq: Array<{ q: string; a: string }>;
};

const PACKS: Record<string, Pack> = {
  "system-map": {
    slug: "system-map",
    eyebrow: "Start here",
    name: "System Map",
    price: "$497",
    priceNote: "Pay once. Credited in full toward an approved build.",
    headline: "Know exactly what to build before you spend a real dollar.",
    sub: "A working blueprint of your business: what you have, what leaks, what to build first, and what it should cost. If you move forward with a build, the $497 comes off the price. If you do not, you keep the map.",
    interest: "blueprint",
    buyable: true,
    included: [
      { name: "Full inventory of your current setup", why: "Website, marketplaces, software, phone, social, spreadsheets. Everything on the table, nothing assumed." },
      { name: "Customer path and data flow map", why: "Where leads come from, where they go, and exactly where they fall through the cracks today." },
      { name: "Ownership and handoff audit", why: "What you actually own versus what you rent, and what happens to your business if a platform pulls the plug." },
      { name: "Recommended modules with reasons", why: "Not a menu of everything. The specific pieces your business needs, in order, with why." },
      { name: "Build phases and honest price range", why: "What phase one costs, what can wait, and what you should not pay for at all." },
      { name: "The map is yours either way", why: "Take it to another builder if you want. It is a real deliverable, not a sales trick." },
    ],
    phases: [
      { title: "You buy the map", body: "Checkout takes two minutes. You get a short intake so the call starts warm." },
      { title: "We walk the business", body: "One working session. Your channels, your tools, your leaks, your goals." },
      { title: "You get the blueprint", body: "The full written map: modules, phases, price range, and what to do first, with or without me." },
    ],
    proof: [
      { name: "TheLeadFlowPro.com", what: "This exact process built the site you are on", url: "/portfolio" },
      { name: "Premier Dental Academy", what: "Mapped, then built into a full enrollment system", url: "https://www.premierdentalacademyoflongview.com" },
      { name: "DonAndPatti.com", what: "Mapped, then built into a complete mission platform", url: "https://www.donandpatti.com" },
    ],
    faq: [
      { q: "Is this a sales call in disguise?", a: "No. It is a paid working session with a written deliverable. If the map says you do not need a build, that is what the map says." },
      { q: "What if I already have a website?", a: "Even better. The map tells you what to keep, what to connect, and what to stop paying for." },
      { q: "How fast do I get it?", a: "The session is scheduled within days of purchase and the written map follows the session." },
    ],
  },
  launch: {
    slug: "launch",
    eyebrow: "The connected core",
    name: "LeadFlow Launch",
    price: "$7,500+",
    priceNote: "Scoped from your System Map. Phased payments available.",
    headline: "The owned core a serious business runs on.",
    sub: "Your public site, lead capture, CRM, admin back office, automatic follow-up, and first party analytics. Built on accounts you control, connected so nothing falls through, and live before you pay a dime you are not happy with.",
    interest: "launch_system",
    buyable: false,
    included: [
      { name: "Public site and sales home base", why: "Pages built to capture and convert, not just sit there looking pretty." },
      { name: "Lead capture and guided intake", why: "Forms and guided flows that qualify people before you ever talk to them." },
      { name: "CRM and pipeline", why: "Every inquiry gets a name, source, status, and next action. Nothing depends on memory." },
      { name: "Admin back office", why: "One screen to review, assign, export, and act. Your whole operation in plain sight." },
      { name: "Automatic email follow-up", why: "Every lead answered in seconds and followed up until they respond." },
      { name: "First party analytics and ad tracking", why: "Your traffic and conversions in your own database, wired to your ad accounts." },
      { name: "GitHub, Vercel, and Supabase in your accounts", why: "The code, the hosting, and the data belong to you from day one. Not to me. Not to a platform." },
    ],
    phases: [
      { title: "Map and scope", body: "The $497 System Map confirms modules, phases, and the exact price. It is credited to the build." },
      { title: "The build", body: "I build the whole thing. You watch it come together on a live preview link, not a mockup." },
      { title: "You approve, then you pay", body: "You click through the working system. If you do not like it, you do not pay. If you love it, we go live." },
      { title: "Handoff and training", body: "Accounts in your name, training included, and me one text away." },
    ],
    proof: [
      { name: "TheLeadFlowPro.com", what: "This site is a LeadFlow Launch core, live", url: "/portfolio" },
      { name: "RealRyanNichols.com", what: "Publishing, intake, store, and archive on the same core", url: "https://realryannichols.com" },
      { name: "DonAndPatti.com", what: "Giving engine and member hub on the same core", url: "https://www.donandpatti.com" },
    ],
    faq: [
      { q: "Why is the price a range?", a: "Because businesses are not the same size. The System Map fixes the exact number before anything is built, and it does not move after that." },
      { q: "What do I pay up front?", a: "The $497 map, which is credited. Build payments are phased and the final payment only happens after you approve the working system." },
      { q: "What are the monthly costs after launch?", a: "The stack runs on accounts you own. Typical hosting and database costs are closer to a lunch than a lease. No platform rent." },
    ],
  },
  "industry-os": {
    slug: "industry-os",
    eyebrow: "The full operating system",
    name: "Industry OS",
    price: "$15,000+",
    priceNote: "Scoped from your System Map. Phased payments available.",
    headline: "The system your competitors think only big companies can afford.",
    sub: "Everything in LeadFlow Launch, plus the portals, industry tools, courses, archives, calls, and texts that make your vertical different. This is not a website. It is the operating system your business runs on.",
    interest: "industry_os",
    buyable: false,
    included: [
      { name: "Everything in LeadFlow Launch", why: "The connected core comes standard: site, CRM, back office, follow-up, analytics." },
      { name: "Customer, member, or student portals", why: "People log in and get what they paid for without emailing you to ask." },
      { name: "Industry tools and calculators", why: "Estimators, applications, assessments, and simulators your market actually uses. The tools become your best salesperson." },
      { name: "Courses, training, and archives", why: "Your knowledge delivered as lessons and searchable records. Sellable, repeatable, defensible." },
      { name: "Business calls and texting built in", why: "A shared number, missed call text back, and every conversation in the record." },
      { name: "Payments, plans, and checkout", why: "Deposits, payment plans, subscriptions, and invoices collected without chasing." },
      { name: "Deeper permissions and integrations", why: "Roles, approvals, migrations, and connections to the tools you already run." },
    ],
    phases: [
      { title: "Map and scope", body: "The $497 System Map confirms the vertical pack, the phases, and the exact price. Credited to the build." },
      { title: "Core first, live early", body: "The connected core ships first so the business feels the difference in weeks, not months." },
      { title: "The vertical build", body: "Portals, tools, courses, and archives land phase by phase on the live system." },
      { title: "You approve, then you pay", body: "Same guarantee at every phase. You do not pay for anything you do not like." },
    ],
    proof: [
      { name: "Premier Dental Academy", what: "A full Industry OS: enrollment, payment plans, simulators, career tools", url: "https://www.premierdentalacademyoflongview.com" },
      { name: "RepWatchr", what: "A records platform with 16,783 profiles on the same stack", url: "https://repwatchr.com" },
      { name: "GideonHQ", what: "A full marketplace platform. The ceiling is high", url: "https://gideonhq.com" },
    ],
    faq: [
      { q: "Is my business big enough for this?", a: "If your business has customers, records, and repeat work, an operating system pays for itself. The map tells us honestly if you only need Launch." },
      { q: "How long does it take?", a: "The core goes live in weeks. Vertical phases land on a schedule we set in the map, and you see everything on a live link as it builds." },
      { q: "Can I start smaller and grow into it?", a: "Yes. Launch first, then add Industry OS phases as modules. Nothing gets thrown away because it is all one connected system." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PACKS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = PACKS[slug];
  if (!p) return {};
  return {
    title: `${p.name} — ${p.price} | The LeadFlow Pro`,
    description: `${p.headline} ${p.priceNote}`,
  };
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = PACKS[slug];
  if (!p) notFound();

  return (
    <main className="pb-24">
      {/* HERO */}
      <section className="page-hero page-hero-centered">
        <span className="eyebrow">{p.eyebrow}</span>
        <h1>{p.headline}</h1>
        <p>{p.sub}</p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-extrabold text-[var(--heading)]">{p.name}</span>
            <span className="text-4xl font-black text-[var(--blue)]">{p.price}</span>
          </div>
          <span className="text-sm font-medium text-[var(--muted)]">{p.priceNote}</span>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {p.buyable ? (
            <BuyButton
              kind="system_map"
              label="Buy the System Map — $497"
              className="button-primary"
            />
          ) : (
            <a href="#order" className="button-primary">
              Start My {p.name}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          )}
          <a href="#order" className="button-secondary">
            {p.buyable ? "Ask a question first" : "Send an interest form"}
          </a>
        </div>
        <p className="mt-5 text-sm font-semibold text-[var(--green)]">
          You see the whole thing working before final payment. If you do not like it, you
          do not pay. Fair, right?
        </p>
      </section>

      {/* WHAT YOU GET */}
      <section className="mx-auto mt-4 w-[min(1000px,100%-40px)]">
        <div className="text-center">
          <span className="eyebrow">What you get</span>
          <h2 className="mt-4 text-3xl font-black text-[var(--heading)] sm:text-4xl">
            Everything included. Nothing vague.
          </h2>
        </div>
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
          {p.included.map((item, i) => (
            <div
              key={item.name}
              className="flex items-start gap-3.5 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5"
            >
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] text-[var(--heading)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                style={{ background: TILE[i % TILE.length] }}
              >
                <CircleCheck className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-[15.5px] font-bold text-[var(--heading)]">{item.name}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-[var(--muted)]">
                  {item.why}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT RUNS */}
      <section className="mx-auto mt-16 w-[min(1000px,100%-40px)]">
        <div className="text-center">
          <span className="eyebrow">How it runs</span>
          <h2 className="mt-4 text-3xl font-black text-[var(--heading)] sm:text-4xl">
            No mystery. This is the process.
          </h2>
        </div>
        <div className="mt-8 grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
          {p.phases.map((ph, i) => (
            <div
              key={ph.title}
              className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-[var(--heading)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                style={{ background: TILE[i % TILE.length] }}
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-[16px] font-bold text-[var(--heading)]">{ph.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">{ph.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROOF */}
      <section className="mx-auto mt-16 w-[min(1000px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--green-line)] bg-emerald-500/[0.04] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-6 w-6 text-[var(--green)]" />
            <h2 className="text-xl font-extrabold text-[var(--heading)] sm:text-2xl">
              Already running live. Check me.
            </h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {p.proof.map((pr) => (
              <a
                key={pr.name}
                href={pr.url}
                target={pr.url.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-4 transition hover:border-[var(--green-line)]"
              >
                <span className="block text-[15px] font-bold text-[var(--heading)]">{pr.name}</span>
                <span className="mt-1 block text-[12.5px] text-[var(--muted)]">{pr.what}</span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Full profiles with live links on{" "}
            <Link href="/portfolio" className="font-bold text-[var(--green)] underline">
              The Work
            </Link>
            . Want to hand-pick features instead?{" "}
            <Link href="/add-ons" className="font-bold text-[var(--green)] underline">
              Browse the Add-On Menu
            </Link>
            .
          </p>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="mx-auto mt-16 w-[min(860px,100%-40px)] text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-[var(--blue)]" />
        <h2 className="mt-4 text-3xl font-black text-[var(--heading)]">
          You choose what you want. I build it.
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-[var(--muted)]">
          You tell me how you want it built. I build the whole thing on a platform you
          own: your code, your data, your customer list. You look at it working. If you do
          not like it, you do not pay a dime and we shake hands. If you love it, we go
          live.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-14 w-[min(860px,100%-40px)]">
        <h2 className="text-center text-2xl font-extrabold text-[var(--heading)]">Straight answers</h2>
        <div className="mt-6 space-y-3">
          {p.faq.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5"
            >
              <summary className="cursor-pointer list-none text-[15.5px] font-bold text-[var(--heading)]">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ORDER */}
      <section id="order" className="mx-auto mt-16 w-[min(860px,100%-40px)] scroll-mt-24">
        <PackageOrderForm
          slug={p.slug}
          packageName={p.name}
          price={p.price}
          interest={p.interest}
          buyable={p.buyable}
        />
      </section>
    </main>
  );
}
