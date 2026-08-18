import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CircleCheck,
  ShieldCheck,
} from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";
import { WEBSITE_LAUNCH, WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";
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
    eyebrow: "Product Studio · fixed-price launch",
    name: "Website Launch",
    price: WEBSITE_LAUNCH.priceLabel,
    priceNote: WEBSITE_LAUNCH.paymentLabel,
    headline: "A polished business website with a real approval checkpoint.",
    sub: "A conversion-led five-page public experience with lead capture, responsive production, core analytics, deployment, and two focused revision rounds. A $500 deposit starts the work; the remaining $500 is due after approval and before launch.",
    interest: "launch_system",
    buyable: false,
    included: [
      { name: "Conversion map", why: "One goal, one buyer path, and one measurable next action." },
      { name: "Five premium pages", why: "A focused public experience, not a stack of filler pages." },
      { name: "Lead capture and routing", why: "Forms reach the right place with the context needed to follow up." },
      { name: "Responsive production build", why: "Fast, accessible, and deliberate from desktop to phone." },
      { name: "Analytics and deployment", why: "Launch on production infrastructure with the core signals connected." },
      { name: "Two revision rounds", why: "Two focused rounds against the approved scope before launch." },
      { name: "Three premium visual scenes", why: "A founding-rate visual pack that explains the offer, process, or system without a wall of copy." },
    ],
    phases: [
      { title: "Deposit and scope", body: "Pay the $500 deposit, then confirm the audience, goal, five pages, assets, and written scope." },
      { title: "The build", body: "The working five-page experience comes together on a reviewable preview." },
      { title: "Approval checkpoint", body: "Click through the pages, test the forms, and use two revision rounds against the agreed direction." },
      { title: "Final payment and launch", body: "After approval, pay the remaining $500. Then the site moves to the live domain and your accounts." },
    ],
    proof: [
      { name: "TheLeadFlowPro.com", what: "Website Launch proof and connected systems, live", url: "/portfolio" },
      { name: "RealRyanNichols.com", what: "Publishing, intake, store, and archive on an owned stack", url: "https://realryannichols.com" },
      { name: "DonAndPatti.com", what: "Giving engine and member hub on an owned stack", url: "https://www.donandpatti.com" },
    ],
    faq: [
      { q: "What does the Website Launch cost?", a: "The five-page Website Launch is $1,000: $500 to start and $500 after approval, before launch. Funnels, CRM, tools, portals, courses, ads, automation, and other modules are scoped separately." },
      { q: "What do I pay up front?", a: "A $500 deposit reserves the build and opens intake. The remaining $500 is due after you approve the working site and before it launches." },
      { q: "What are the monthly costs after launch?", a: "The stack runs on accounts you own. Hosting and database costs depend on usage and provider pricing; the exact services are documented before launch." },
    ],
  },
  "industry-os": {
    slug: "industry-os",
    eyebrow: "The connected company core",
    name: "Company OS",
    price: "$7,500+",
    priceNote: "Scoped from your System Map. Phased payments available.",
    headline: "The website, CRM, portal, analytics, and operating dashboard in one owned system.",
    sub: "Everything in Website Launch, plus the connected records, customer experience, reporting, and workflows the business needs to operate. Industry-specific tools, courses, archives, calls, and texts are scoped where they belong.",
    interest: "company_os",
    buyable: false,
    included: [
      { name: "Everything in Website Launch", why: "The five-page public foundation, lead capture, analytics, deployment, and revision process." },
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
      { title: "Approval at every phase", body: "Each phase has a written scope, a working review point, and its own approved milestone." },
    ],
    proof: [
      { name: "Premier Dental Academy", what: "A full Company OS: enrollment, payment plans, simulators, career tools", url: "https://www.premierdentalacademyoflongview.com" },
      { name: "RealRyanNichols.com", what: "A publishing system with a searchable archive of 1,568+ case profiles on the owned stack", url: "https://realryannichols.com" },
      { name: "GideonHQ", what: "A full marketplace platform. The ceiling is high", url: "https://gideonhq.com" },
    ],
    faq: [
      { q: "Is my business big enough for this?", a: "If your business has customers, records, and repeat work, an operating system pays for itself. The map tells us honestly if you only need Launch." },
      { q: "How long does it take?", a: "The core goes live in weeks. Vertical phases land on a schedule we set in the map, and you see everything on a live link as it builds." },
      { q: "Can I start smaller and grow into it?", a: "Yes. Launch first, then add Company OS phases as modules. Nothing gets thrown away because it is all one connected system." },
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
    title: `${p.name} | ${p.price} | The LeadFlow Pro`,
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

  const heroMedia =
    p.slug === "launch"
      ? {
          src: "/images/offer-v2/website-launch-approval-path.webp",
          alt: "A secure website build moving through review, approval, and launch",
          kicker: "$500 starts the build",
          caption: "$500 after approval, before launch.",
        }
      : p.slug === "system-map"
        ? {
            src: "/images/homepage-v2/connected-company-hero.webp",
            alt: "A connected business operating core with multiple mapped modules",
            kicker: "Map before build",
            caption: "Dependencies, ownership, and the first release.",
          }
        : {
            src: "/images/offer-v2/premier-operating-system.webp",
            alt: "A connected operating system with website, CRM, payment, portal, and course modules",
            kicker: "The company behind the website",
            caption: "One operating core. Connected modules.",
          };

  return (
    <main className="cb-page pb-24">
      {/* HERO */}
      <SiteHero
        compact
        eyebrow={p.eyebrow}
        mutedTitle={`${p.name} · ${p.price}`}
        title={p.headline}
        body={`${p.sub} ${p.priceNote}`}
        media={heroMedia}
        primary={
          p.slug === "launch"
            ? { href: WEBSITE_LAUNCH_CHECKOUT, label: "Start Website Launch | $500", external: true }
            : { href: "#order", label: p.buyable ? "Get the System Map | $497" : `Map the ${p.name}` }
        }
        secondary={{ href: "#included", label: "See exactly what is included" }}
        trustLine={
          p.slug === "launch"
            ? "Review the working site before the final payment and production launch. Once intake begins, the $500 deposit is non-refundable, except where the written agreement or applicable law requires otherwise."
            : "Written scope, visible dependencies, and working review points before the next approved phase."
        }
      />

      {/* WHAT YOU GET */}
      <section id="included" className="mx-auto mt-14 w-[min(1000px,100%-40px)] scroll-mt-24">
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

      {/* APPROVAL CHECKPOINT */}
      <section className="mx-auto mt-16 w-[min(860px,100%-40px)] text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-[var(--blue)]" />
        <h2 className="mt-4 text-3xl font-black text-[var(--heading)]">
          Working proof at every approval point.
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-[var(--muted)]">
          {p.slug === "launch"
            ? "You review the work on a live preview, against a written scope, before the launch milestone. $500 starts the Website Launch and the remaining $500 is due after approval and before the site goes live."
            : p.slug === "system-map"
              ? "The paid working session produces a written blueprint: modules, dependencies, phases, and price range. You approve any larger engagement separately."
              : "The System Map defines the written scope, phases, ownership, and milestone schedule. Each Company OS phase has a working review point before the next approved milestone."}
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
