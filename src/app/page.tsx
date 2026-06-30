import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Binary,
  Building2,
  CircleDollarSign,
  CheckCircle2,
  DatabaseZap,
  Layers3,
  LockKeyhole,
  MousePointerClick,
  Radar,
  Route,
  Search,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TrendingUp,
  UserRoundSearch
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LeadBrainVisual } from "@/components/site/LeadBrainVisual";

const sourceGroups = [
  {
    icon: UserRoundSearch,
    title: "Adult pain and intent signals",
    body: "Answers from adults about what hurts, what they keep searching, what they almost buy, and what would move them.",
    points: ["18+ only", "Pain and intent tags", "Noise filter"]
  },
  {
    icon: Building2,
    title: "Business and service assets",
    body: "Local service routes, vendor books, appointment demand, operator lists, public directories, and operating opportunities.",
    points: ["Submitted lead sources", "Local market category", "Buyer inquiry route"]
  },
  {
    icon: ShoppingCart,
    title: "Ecommerce stores and operator accounts",
    body: "Stores, product catalogs, marketplace accounts, SKU maps, traffic clues, vendor opportunities, and niche buyer demand.",
    points: ["Catalog and platform tags", "Source proof notes", "Growth or neglect signal"]
  },
  {
    icon: Binary,
    title: "AI tools, SaaS, sites, and domains",
    body: "Software products, app directories, content sites, domains, communities, launch pages, pricing, integrations, and founder signals.",
    points: ["Use-case map", "Stack and integration tags", "Launch or traffic movement"]
  },
  {
    icon: Radar,
    title: "Datasets and demand signals",
    body: "Submitted databases, public-source lead lists, buyer-intent feeds, creator channels, newsletter audiences, and market maps.",
    points: ["Intent phrases", "Proof of source", "Sample records"]
  }
];

const profileFields = [
  "Public source links",
  "Source proof",
  "Lead-source context",
  "Buyer-intent tags",
  "Contact-route hints",
  "Lead confidence score",
  "Last-seen timestamp",
  "Suppression status"
];

const workflow = [
  {
    icon: Search,
    title: "Ask what actually hurts",
    body: "Start with the problem they will answer honestly: what costs time, money, customers, confidence, clarity, or momentum."
  },
  {
    icon: Tags,
    title: "Attach proof and tags",
    body: "Every profile is labeled by category, market, source, proof, confidence, buyer use case, price path, and suppression rules."
  },
  {
    icon: Layers3,
    title: "Build the source profile",
    body: "The system turns source notes and public facts into one source-backed page with samples, warnings, open questions, and next step."
  },
  {
    icon: TrendingUp,
    title: "Score the opportunity",
    body: "Proof, intent, freshness, source depth, buyer demand, and compliance status become a plain-English reason to buy, list, watch, or reject."
  },
  {
    icon: DatabaseZap,
    title: "Route the deal",
    body: "Publish the lead-source profile, price the package fairly, collect inquiries, send payment links, route qualified handoffs, or create a managed lead workspace."
  }
];

const products = [
  {
    title: "Signal Intake",
    price: "Start free",
    body: "A sharp intake for adults who want something solved, compared, found, fixed, automated, or matched.",
    bullets: ["18+ only", "Pain and intent score", "Noise filter"]
  },
  {
    title: "Verified Package",
    price: "From $99",
    body: "An enhanced lead-source profile with score, sample records, source proof, buyer-use notes, and cleaner positioning.",
    bullets: ["Verification checklist", "Featured marketplace placement", "Scored lead profile"]
  },
  {
    title: "Managed Lead Workspace",
    price: "Custom",
    body: "A reviewed workspace for sensitive datasets, serious buyers, larger lists, and higher-value lead sources.",
    bullets: ["Qualified buyer review", "Private samples and proof", "Invoice or handoff workflow"]
  }
];

const buyerProducts = [
  {
    title: "Starter lead drop",
    price: "$49-$149",
    body: "A narrow source-backed list for buyers who need a first batch, not a bloated file.",
    points: ["50-500 records", "Source links", "Confidence labels"]
  },
  {
    title: "Verified profile pack",
    price: "$99-$499",
    body: "Reviewed lead-source profiles with proof notes, buyer-use context, and suppression status.",
    points: ["Sample rows", "Proof review", "Buyer-fit notes"]
  },
  {
    title: "Weekly demand drop",
    price: "$75-$350/wk",
    body: "Recurring fresh signals for a niche, geography, source lane, or buyer problem.",
    points: ["Freshness pass", "New signals", "Review queue"]
  },
  {
    title: "Managed data room",
    price: "Custom",
    body: "Higher-value data, larger volumes, private samples, and qualified handoff workflows.",
    points: ["Scoped access", "Invoice path", "Review before release"]
  }
];

const fairRateRules = [
  "Price is based on source depth, volume, freshness, confidence, fields, and review time.",
  "Buyers should know what they are paying for before money moves.",
  "Small, useful lists should stay affordable enough for real operators to test.",
  "Premium pricing belongs on verified proof, qualified intent, recurring freshness, or managed review.",
  "No buyer gets private personal records, protected-trait targeting, minors' data, or unreviewed sensitive material.",
  "Suppression and do-not-contact status reduce sellable value and must travel with the data."
];

const conversionMechanics = [
  {
    icon: MousePointerClick,
    title: "One loud next action",
    body: "Primary actions use the warm money color. Secondary actions stay quiet so buyers are not forced to choose between five equal buttons.",
    metric: "High contrast CTA"
  },
  {
    icon: Activity,
    title: "Live score feedback",
    body: "Every form, category, and buyer request shows a score or value signal so people keep moving instead of wondering what happens next.",
    metric: "Instant feedback"
  },
  {
    icon: Route,
    title: "Two clear lanes",
    body: "Visitors self-select fast: add a signal or request buyer data. No generic brochure loop, no buried intake.",
    metric: "Buyer/source split"
  },
  {
    icon: CircleDollarSign,
    title: "Visible price anchors",
    body: "Reasonable starter ranges make the marketplace feel purchasable before a sales call, while high-value data still routes to review.",
    metric: "$49+ entry"
  }
];

const heroSignals = [
  { label: "Pain signal", value: "92", tone: "lead" },
  { label: "Proof depth", value: "7/9", tone: "cyan" },
  { label: "Buyer fit", value: "$149", tone: "accent" }
];

const rules = [
  "Public and permissioned sources only.",
  "Signal intake must stay adult-only and clear about submitted data use.",
  "Every profile keeps source links and timestamps.",
  "No minors, private addresses, sealed records, medical data, financial account data, or protected-trait targeting.",
  "Suppression, opt-out, and do-not-contact status are first-class fields.",
  "Confidence labels separate verified facts, inferred signals, and open questions.",
  "Platform terms, robots controls, and outreach laws must be respected before production collection."
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="pb-28 lg:pb-24">
        <HeroSection />
        <SourceSection />
        <MechanicsSection />
        <ProfileSection />
        <WorkflowSection />
        <ProductSection />
        <FairRateSection />
        <ComplianceSection />
        <FinalCta />
      </main>
      <StickyConversionDock />
      <Footer />
    </>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10">
      <DataBackdrop />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(5,9,24,0.96)_0%,rgba(5,9,24,0.82)_52%,rgba(255,154,31,0.16)_100%)]" />
      <div className="container relative z-10 grid min-h-[calc(100svh-4rem)] min-w-0 items-center gap-8 py-10 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)]">
        <div className="min-w-0 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-200">
            <Radar className="h-4 w-4" />
            Signal, not noise
          </div>
          <h1 className="mt-6 max-w-full break-words text-4xl font-extrabold leading-tight text-white md:text-7xl">
            Build the lead brain around what people actually need solved.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-100 md:text-2xl">
            People reveal value when they say what hurts, what they keep
            searching, what they almost bought, and what would make them act.
            LeadFlow turns those answers into scored, source-backed data products
            buyers can purchase at a fair rate.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/problem-intake" className="btn-accent btn-magnetic w-full text-base sm:w-auto">
              Find the signal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/data-marketplace" className="btn-ghost w-full text-base sm:w-auto">
              Open marketplace
            </Link>
          </div>
          <div className="mt-7 grid max-w-2xl gap-2 sm:grid-cols-3">
            {heroSignals.map((signal) => (
              <div key={signal.label} className={`hero-signal-chip hero-signal-${signal.tone}`}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            <Metric value="18+" label="adult-only intake" />
            <Metric value="2" label="buyer and source paths" />
            <Metric value="$49+" label="starter data products" />
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
      <div className="text-2xl font-extrabold text-white">{value}</div>
      <div className="mt-1 text-sm text-ink-300">{label}</div>
    </div>
  );
}

function DataBackdrop() {
  return (
    <div
      className="absolute inset-0"
      aria-hidden="true"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
        backgroundSize: "44px 44px"
      }}
    />
  );
}

function HeroVisual() {
  return <LeadBrainVisual />;
}

function MechanicsSection() {
  return (
    <section className="relative py-10 md:py-16">
      <div className="container">
        <div className="conversion-mechanics">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">
              Sticky conversion mechanics
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
              The page should keep asking for the next useful action.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-200 md:text-lg">
              The visual system is built around one job: move adults into signal
              intake, move buyers into data requests, and make fair pricing feel
              clear before a sales call.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            {conversionMechanics.map((item) => (
              <article key={item.title} className="conversion-mechanic-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="mechanic-icon">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span>{item.metric}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StickyConversionDock() {
  return (
    <aside className="sticky-conversion-dock" aria-label="LeadFlow quick actions">
      <div className="dock-inner">
        <div className="dock-proof">
          <span className="lead-live-dot" />
          <div>
            <p>LeadFlow is collecting buyer/source signal</p>
            <span>Adult-only intake. Fair-rate data products. Review-gated release.</span>
          </div>
        </div>
        <div className="dock-metrics">
          <div>
            <strong>$49+</strong>
            <span>starter</span>
          </div>
          <div>
            <strong>2 paths</strong>
            <span>buyer/source</span>
          </div>
          <div>
            <strong>18+</strong>
            <span>adult only</span>
          </div>
        </div>
        <div className="dock-actions">
          <Link href="/problem-intake" className="btn-accent btn-magnetic dock-primary">
            Start intake
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/data-marketplace" className="dock-secondary">
            Request data
          </Link>
        </div>
      </div>
    </aside>
  );
}
function SourceSection() {
  return (
    <section id="data" className="py-16 md:py-24">
      <div className="container">
        <SectionHeader
          eyebrow="What goes into the brain"
          title="Not a single-niche list. A lead brain for every business category."
          body="Use one signal path for any lead source: adult pain-and-intent answers, business owners, ecommerce stores, AI tools, websites, service routes, creator channels, datasets, and public demand signals."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {sourceGroups.map((group) => (
            <article key={group.title} className="lead-panel p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <group.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{group.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-200">{group.body}</p>
                </div>
              </div>
              <ul className="mt-5 grid gap-2 text-sm text-ink-100 sm:grid-cols-3">
                {group.points.map((point) => (
                  <li key={point} className="flex min-h-16 gap-2 rounded-lg border border-white/5 bg-ink-900/60 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lead-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileSection() {
  return (
    <section id="profiles" className="border-y border-white/10 bg-ink-900/45 py-16 md:py-24">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Profiles, not blind dumps
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
              Every lead profile should explain the opportunity in sixty seconds.
            </h2>
            <p className="mt-5 text-base leading-7 text-ink-200 md:text-lg">
              The buyer should not receive a mystery CSV, vague website, or unverified asset.
              They should see what the submitter claims, what the public sources show, what still
              needs verification, and the cleanest path to inquire or buy.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {profileFields.map((field) => (
                <div key={field} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-ink-100">
                  <BadgeCheck className="h-4 w-4 text-lead-400" />
                  {field}
                </div>
              ))}
            </div>
          </div>

          <div className="lead-shell p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-400">Example profile</p>
                <h3 className="mt-1 text-2xl font-extrabold text-white">Ecommerce Vendor Signal Book</h3>
                <p className="mt-1 text-sm text-ink-300">Fictional lead-source profile for product demonstration</p>
              </div>
              <div className="rounded-lg bg-lead-400/10 px-3 py-2 text-sm font-bold text-lead-400">
                87 lead score
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ProfileStat label="Category" value="Dataset" />
              <ProfileStat label="Signal" value="Vendor-fit records" />
              <ProfileStat label="Fit" value="Agency buyer" />
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Why this profile exists</p>
              <p className="mt-2 text-sm leading-6 text-ink-100">
                The submission says the list contains ecommerce brands with public source links,
                platform tags, category labels, and vendor-fit notes. The buyer should see
                sample rows, proof of source, suppression rules, and a clear inquiry route.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <SourceList
                title="Evidence attached"
                items={["Sample rows attached", "Source proof requested", "Source links indexed", "Category tags visible"]}
              />
              <SourceList
                title="Open questions"
                items={["Verify source rights", "Confirm buyer use case", "Check suppression list", "Review platform terms"]}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function SourceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/60 p-4">
      <h4 className="font-bold text-white">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-ink-200">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="py-16 md:py-24">
      <div className="container">
        <SectionHeader
          eyebrow="How it works"
          title="From honest answer to scored lead signal."
          body="The moat is not scraping alone. The moat is pain, intent, proof, tagging, scoring, review, buyer routing, and clean handoff into a sales workflow."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {workflow.map((step, index) => (
            <article key={step.title} className="lead-panel flex min-h-64 flex-col p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-400/10 text-accent-300">
                <step.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Step {index + 1}
              </p>
              <h3 className="mt-2 text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-200">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection() {
  return (
    <section id="access" className="border-y border-white/10 bg-ink-900/45 py-16 md:py-24">
      <div className="container">
        <SectionHeader
          eyebrow="What people buy"
          title="Adult intake, verified package, or managed lead workspace."
          body="LeadFlow keeps the simple intake ladder: collect consented adult problem data, submit the source, verify the evidence, score the opportunity, and route the next action."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.title} className="lead-shell flex min-h-72 p-5">
              <div className="flex min-h-full w-full flex-col">
                <p className="text-sm font-semibold text-cyan-300">{product.price}</p>
                <h3 className="mt-2 text-2xl font-extrabold text-white">{product.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-200">{product.body}</p>
                <ul className="mt-5 space-y-2 text-sm text-ink-100">
                  {product.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lead-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/data-marketplace" className="btn-ghost mt-auto w-full text-sm">
                  Open this path
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FairRateSection() {
  return (
    <section id="fair-rates" className="py-16 md:py-24">
      <div className="container">
        <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr] xl:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Buyer data exchange
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
              Capture the lead signal. Sell the useful data at a fair rate.
            </h2>
            <p className="mt-5 text-base leading-7 text-ink-200 md:text-lg">
              LeadFlow should collect problem intent, source proof, buyer need,
              category, region, freshness, and confidence. Then it should package
              the useful rows into data products a buyer can actually act on.
            </p>
            <div className="mt-6 rounded-lg border border-lead-400/25 bg-lead-400/10 p-5">
              <p className="text-sm font-bold uppercase tracking-wider text-lead-400">
                Fair-rate rule
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-100">
                The price should follow the value: source depth, verified proof,
                intent strength, freshness, volume, field quality, review time,
                and buyer use case. No mystery dumps. No inflated private-profile pricing.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {buyerProducts.map((product) => (
              <article key={product.title} className="lead-shell p-5">
                <p className="text-sm font-extrabold text-accent-300">{product.price}</p>
                <h3 className="mt-2 text-xl font-extrabold text-white">{product.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-200">{product.body}</p>
                <ul className="mt-4 space-y-2 text-sm text-ink-100">
                  {product.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {fairRateRules.map((rule) => (
            <div key={rule} className="lead-panel flex min-h-24 gap-3 p-4 text-sm leading-6 text-ink-100">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-lead-400" />
              <span>{rule}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/data-marketplace" className="btn-accent text-base">
            Request buyer data
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/problem-intake" className="btn-ghost text-base">
            Add a signal
          </Link>
        </div>
      </div>
    </section>
  );
}

function ComplianceSection() {
  return (
    <section id="compliance" className="py-16 md:py-24">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-lead-400/10 text-lead-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-3xl font-extrabold text-white md:text-5xl">
              Strong data product. Clean boundaries.
            </h2>
            <p className="mt-5 text-base leading-7 text-ink-200 md:text-lg">
              The marketplace can be aggressive about collecting adult problem
              and interest signals, plus finding market
              opportunities without becoming a private dossier engine. Make every
              item submitted, public-source, permissioned, confidence-labeled,
              and reviewable before release.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {rules.map((rule) => (
              <div key={rule} className="lead-panel flex min-h-24 gap-3 p-4 text-sm leading-6 text-ink-100">
                <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-white/10 py-16 md:py-24">
      <div className="container">
        <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(35,184,255,0.12),rgba(255,154,31,0.12))] p-6 md:p-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">
                Build the marketplace
              </p>
              <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
                Start with one intake flow. Expand to every lead category.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-100">
                Let adults tell you what they need solved, let users submit sources,
                let buyers request lists, and make LeadFlow the scoring, proof,
                inquiry, and lead-brain layer between them.
              </p>
            </div>
            <Link href="/problem-intake" className="btn-accent w-full text-base md:w-auto">
              Start intake
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">{body}</p>
    </div>
  );
}
