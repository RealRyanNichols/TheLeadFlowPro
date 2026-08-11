import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "The Work | The LeadFlow Pro",
  description:
    "Eight live properties. Real sites, real businesses, real receipts. Every one of them is running right now. Click any of them. Check me.",
};

type Site = {
  url: string;
  name: string;
  tag: string;
  what: string;
  ogImage: string;
  ogFit?: "cover" | "contain";
  tagline: string;
  detail: string;
  modules: string[];
  bar: string;
  tagClass: string;
  hover: string;
  whatClass: string;
};

const SITES: Site[] = [
  {
    url: "https://realryannichols.com",
    name: "RealRyanNichols.com",
    tag: "Media Platform",
    what: "Independent media platform and evidence archive",
    ogImage: "/og/portfolio/realryannichols.jpg",
    tagline:
      "Faith, fatherhood, building, and the long road of healing in public. Written from his own front porch, on a domain he owns.",
    detail:
      "A full publishing machine nobody can switch off: long form articles, a searchable archive with 1,568+ case profiles, public records, intake forms, an AI assistant trained on the owner's own writing, and a store. When the platforms throttled the story, the story got its own platform.",
    modules: ["Publishing engine", "Searchable archive", "AI assistant", "Tip line", "Store", "SMS alerts"],
    bar: "from-red-500 to-orange-400",
    tagClass: "border-red-400/40 bg-red-500/10 text-red-300",
    hover: "hover:border-red-400/50 hover:shadow-[0_0_28px_rgba(248,113,113,0.25)]",
    whatClass: "text-red-300",
  },
  {
    url: "https://www.premierdentalacademyoflongview.com",
    name: "Premier Dental Academy of Longview",
    tag: "School + Software",
    what: "Dental assistant school running its own enrollment",
    ogImage: "/og/portfolio/premier-dental.jpg",
    tagline:
      "The only RDA program in East Texas that lets students train on real practice management software before their first office.",
    detail:
      "A real East Texas school running applications, enrollment with payment plans and buy now pay later, an interactive tuition planner, free training simulators as the top of the funnel, career tools, and a hiring partner directory. Every inquiry captured, every student record in its own database.",
    modules: ["Enrollment funnel", "Payment plans", "Tuition planner", "Training simulators", "Career tools", "Employer directory"],
    bar: "from-teal-400 to-cyan-300",
    tagClass: "border-teal-400/40 bg-teal-500/10 text-teal-300",
    hover: "hover:border-teal-400/50 hover:shadow-[0_0_28px_rgba(45,212,191,0.25)]",
    whatClass: "text-teal-300",
  },
  {
    url: "https://www.theleadflowpro.com",
    name: "TheLeadFlowPro.com",
    tag: "Funnel + CRM",
    what: "This site. The proof you are standing on.",
    ogImage: "/og/portfolio/theleadflowpro.jpg",
    tagline:
      "Guided system mapping, lead capture, client dashboards, admin CRM, course delivery, first party analytics, and ad tracking. All owned, all in one place.",
    detail:
      "The page you are reading runs on the exact stack we build for clients: code in GitHub, hosting on Vercel, data in Supabase. Every visit is tracked in our own database. Every lead lands in our own CRM with the full diagnostic attached. The bill is about the cost of a lunch.",
    modules: ["Guided intake", "Admin CRM", "Client dashboards", "Training portal", "First party analytics", "Ad tracking"],
    bar: "from-sky-400 to-blue-500",
    tagClass: "border-sky-400/40 bg-sky-500/10 text-sky-300",
    hover: "hover:border-sky-400/50 hover:shadow-glow-blue",
    whatClass: "text-sky-300",
  },
  {
    url: "https://repwatchr.com",
    name: "RepWatchr.com",
    tag: "SaaS Product",
    what: "Public officials, on the record",
    ogImage: "/og/portfolio/repwatchr.jpg",
    tagline:
      "16,783 official profiles and 59,054 sourced records. Votes, money trails, scorecards, and accountability packets voters can inspect and share.",
    detail:
      "A full software product shipped on the same stack: a searchable officials database across every level of government, voting records, campaign finance lookups, scorecards, a packet builder, and paid research tiers. Proof this goes far beyond brochure websites. This is real software a business can own.",
    modules: ["Searchable database", "Official profiles", "Source chains", "Scorecards", "Packet builder", "Research tiers"],
    bar: "from-violet-400 to-fuchsia-400",
    tagClass: "border-violet-400/40 bg-violet-500/10 text-violet-300",
    hover: "hover:border-violet-400/50 hover:shadow-glow-violet",
    whatClass: "text-violet-300",
  },
  {
    url: "https://gideonhq.com",
    name: "GideonHQ.com",
    tag: "Marketplace Platform",
    what: "Sell almost anything. Keep 99%.",
    ogImage: "/og/portfolio/gideonhq.jpg",
    tagline:
      "Gideon Commerce: the seller first marketplace and operating system built around a flat 1% platform fee.",
    detail:
      "A commerce platform with listings, auctions, offers, branded storefronts, an AI listing builder, a live fee calculator, cross listing exports, QR verified local pickup, and seller trust systems. The kind of build the big platforms say a small team cannot ship. It is live.",
    modules: ["Marketplace listings", "Auctions + offers", "AI listing builder", "Fee calculator", "Seller storefronts", "QR pickup"],
    bar: "from-emerald-400 to-lime-300",
    tagClass: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    hover: "hover:border-emerald-400/50 hover:shadow-glow-mint",
    whatClass: "text-emerald-300",
  },
  {
    url: "https://faretta.legal",
    name: "Faretta.legal",
    tag: "Legal Resource",
    what: "Texas pro se help + investigative reporting",
    ogImage: "/og/portfolio/faretta.jpg",
    tagline:
      "Flat fee case help from $5 motion skeletons to $497 done for you trial binders, a free AI legal assistant, and live case files documented in real time.",
    detail:
      "Productized legal help with a clear flat fee ladder, a free AI entry point that recommends the right service, evidence and witness intake, supporter tiers with a live donation feed, and a member dashboard. Proof that a focused offer catalog beats a vague services page.",
    modules: ["Flat fee catalog", "AI assistant", "Evidence intake", "Supporter tiers", "Member dashboard", "Live case files"],
    bar: "from-amber-400 to-yellow-300",
    tagClass: "border-amber-400/40 bg-amber-500/10 text-amber-300",
    hover: "hover:border-amber-400/50 hover:shadow-glow-amber",
    whatClass: "text-amber-300",
  },
  {
    url: "https://www.donandpatti.com",
    name: "DonAndPatti.com",
    tag: "Mission + Nonprofit",
    what: "Medical mission platform with giving and archives",
    ogImage: "/og/portfolio/donandpatti.jpg",
    tagline:
      "Free medical mission clinics in Belize, preaching, and local community ministry. Medical care for the body. Hope for the soul.",
    detail:
      "A complete mission platform: sponsor a 60 cent pair of reading glasses or give monthly, watch live funding progress bars, browse a 509 photo archive across five countries, log in to the Mission Partners hub, and read the Open Book page where every dollar in and out is posted. Trust built in public.",
    modules: ["Sponsorship checkout", "Progress bars", "Photo archive", "Partners hub", "Open Book ledger", "Prayer intake"],
    bar: "from-cyan-400 to-teal-500",
    tagClass: "border-cyan-400/40 bg-cyan-500/10 text-cyan-300",
    hover: "hover:border-cyan-400/50 hover:shadow-[0_0_28px_rgba(34,211,238,0.25)]",
    whatClass: "text-cyan-300",
  },
  {
    url: "https://www.lonestartotalwash.com",
    name: "LoneStarTotalWash.com",
    tag: "Local Service Business",
    what: "Fleet and pressure washing across East Texas",
    ogImage: "/og/portfolio/lonestar.jpg",
    tagline:
      "We wash your fleet. Any size. Mobile service, free quotes, fully insured. From fleets to front porches, we wash it all.",
    detail:
      "A local service business put online right: what they do, what it costs, proof of finished jobs, and a free quote request that reaches them instantly. Commercial and residential pressure washing from service trucks to full-size oilfield equipment, trailers, and semis, plus buildings, parking lots, sidewalks, rooftops, drive-throughs, and dumpster pads.",
    modules: ["Free quote intake", "Public price list", "Jobs completed gallery", "Click to call", "Mobile-first design", "Social tie-in"],
    bar: "from-red-500 to-orange-400",
    tagClass: "border-red-400/40 bg-red-500/10 text-red-300",
    hover: "hover:border-red-400/50 hover:shadow-[0_0_28px_rgba(248,113,113,0.25)]",
    whatClass: "text-red-300",
  },
];

export default function PortfolioPage() {
  return (
    <main>
      <section className="page-hero page-hero-centered">
        <span className="eyebrow">Proof before promise</span>
        <h1>Eight live properties. One reliable core.</h1>
        <p>
          These are not mockups and they are not concept cards. Every property below is a
          real business running right now on a platform it owns. Different industries,
          different jobs, same ownership. Click any of them. Check me.
        </p>
      </section>

      <section className="section-shell pricing-shell !pt-4">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {SITES.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className={`group flex flex-col overflow-hidden rounded-[17px] border border-line bg-white/[0.03] transition ${s.hover}`}
            >
              <div className={`h-1.5 w-full bg-gradient-to-r ${s.bar}`} />
              <div className="relative aspect-[1200/630] w-full overflow-hidden bg-slate-950">
                {/* Live OG image straight from the property itself */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.ogImage}
                  alt={`${s.name} preview`}
                  loading="lazy"
                  className={`h-full w-full transition duration-300 group-hover:scale-[1.02] ${
                    s.ogFit === "contain" ? "object-contain p-8" : "object-cover"
                  }`}
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span
                  className={`self-start rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${s.tagClass}`}
                >
                  {s.tag}
                </span>
                <h2 className="mt-3 text-xl font-bold text-white">{s.name}</h2>
                <p className={`mt-1 text-sm font-semibold ${s.whatClass}`}>{s.what}</p>
                <p className="mt-2 text-sm italic text-slate-400">&ldquo;{s.tagline}&rdquo;</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{s.detail}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.modules.map((m) => (
                    <span
                      key={m}
                      className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-slate-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-bold text-slate-400 group-hover:text-white">
                  Visit the live system
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="final-cta portfolio-cta">
          <div>
            <span className="eyebrow">Everything above is on the menu</span>
            <h2>See something you want? Order it.</h2>
            <p>
              Every system on this page is made of pieces, and every piece is an add-on
              you can pick for your own build. Browse the menu, check what you want, and
              tell me how you want it built.
            </p>
          </div>
          <div>
            <Link className="button-primary" href="/add-ons">
              Browse the Add-On Menu
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" href="/start">
              Map My System
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
