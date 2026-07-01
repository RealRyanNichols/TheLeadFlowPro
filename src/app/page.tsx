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
import { PreferenceSignalLab } from "@/components/site/PreferenceSignalLab";
import { SignalConversionDock } from "@/components/site/SignalConversionDock";

const sourceGroups = [
  {
    icon: UserRoundSearch,
    title: "Perfect-fit answers",
    body: "Adults describe the house, car, meal, trip, boat, community, money target, routine, business fix, or next move they actually want.",
    points: ["18+ only", "Preference tags", "Instant map"]
  },
  {
    icon: Building2,
    title: "Local context and timing",
    body: "The tool learns where the answer needs to exist, how soon the visitor wants it, and what real-world limits matter.",
    points: ["Location clue", "Timeline", "Local need"]
  },
  {
    icon: ShoppingCart,
    title: "Product and shopping intent",
    body: "Vehicles, food, drinks, tools, stores, products, boats, vacations, and other choices become structured demand signals.",
    points: ["Budget comfort", "Style fit", "Dealbreakers"]
  },
  {
    icon: Binary,
    title: "Personal recommendation logic",
    body: "Each click tightens the map: best match, best value, fastest option, what to ignore, and what to do next.",
    points: ["Best match", "Fastest option", "Shortlist"]
  },
  {
    icon: Radar,
    title: "Demand signal layer",
    body: "The useful business data is the pattern behind the tool: what people want, what they reject, and when they are ready.",
    points: ["Intent phrase", "Market category", "Follow-up route"]
  }
];

const profileFields = [
  "Category intent",
  "Budget comfort",
  "Timeline",
  "Style preference",
  "Location clue",
  "Dealbreakers",
  "Fit score",
  "Follow-up route"
];

const workflow = [
  {
    icon: Search,
    title: "Ask what perfect means",
    body: "Start with a question people already care about: perfect house, car, meal, vacation, boat, church/community, income target, business fix, or life fit."
  },
  {
    icon: Tags,
    title: "Turn answers into tags",
    body: "Budget, timing, style, location, must-haves, dealbreakers, and category become structured preference signals."
  },
  {
    icon: Layers3,
    title: "Give a map immediately",
    body: "The visitor gets a shortlist path, next move, tradeoffs, and what to ignore before any sales pitch happens."
  },
  {
    icon: TrendingUp,
    title: "Score the intent",
    body: "Specific answers score higher because they reveal urgency, budget comfort, taste, constraints, and likely next action."
  },
  {
    icon: DatabaseZap,
    title: "Route the next click",
    body: "Save the map, answer deeper questions, request help, share it, or return later to build another perfect-fit profile."
  }
];

const products = [
  {
    title: "Perfect Vehicle Builder",
    price: "Free map",
    body: "A fast way to describe the vehicle someone wants, how they will use it, what they can spend, and what kills the deal.",
    bullets: ["Use case", "Budget comfort", "Dealer/search clues"]
  },
  {
    title: "Perfect Home Finder",
    price: "Free map",
    body: "A home-fit map for location, timing, style, space, payment comfort, and the non-negotiables that actually matter.",
    bullets: ["Must-haves", "Local context", "Search filters"]
  },
  {
    title: "Perfect Taste, Trip, Boat, Community, Money, and Life Maps",
    price: "Repeat-use tools",
    body: "Small tools people can use over and over for food, vacation, outdoor choices, community fit, business needs, money goals, routines, hobbies, and choices.",
    bullets: ["Instant result", "Saveable profile", "Return path"]
  }
];

const buyerProducts = [
  {
    title: "Preference heat map",
    price: "Aggregated",
    body: "A category-level view of what people are trying to build, buy, avoid, or solve.",
    points: ["Category demand", "Budget bands", "Timing"]
  },
  {
    title: "Saved intent profile",
    price: "Opt-in",
    body: "A saved first-party profile for a person who asked for follow-up, recommendations, or a map by email.",
    points: ["Opt-in route", "Fit score", "Need stated"]
  },
  {
    title: "Weekly trend report",
    price: "Reviewed",
    body: "A clean report showing what categories are heating up, which constraints repeat, and where demand is forming.",
    points: ["Fresh signals", "Repeated patterns", "No sensitive targeting"]
  },
  {
    title: "Partner recommendation lane",
    price: "Qualified",
    body: "A reviewed route for matching people to useful offers, providers, products, or tools after they ask for help.",
    points: ["Relevant match", "Consent route", "Review before release"]
  }
];

const fairRateRules = [
  "The visitor gets a map before LeadFlow asks them to save anything.",
  "Saved answers must come from adults and stay tied to a clear follow-up route.",
  "Use aggregated patterns for market demand and reviewed opt-in profiles for follow-up.",
  "Premium value belongs to qualified intent, freshness, specificity, and relevance.",
  "No buyer gets minors' data, private addresses, medical data, financial account data, or protected-trait targeting.",
  "Suppression, opt-out, and do-not-contact status must travel with any usable signal."
];

const conversionMechanics = [
  {
    icon: MousePointerClick,
    title: "Useful first click",
    body: "The first click is not 'buy data.' It is 'build my map.' The visitor gets value before LeadFlow asks them to save.",
    metric: "Instant use"
  },
  {
    icon: Activity,
    title: "Live fit score",
    body: "Every answer changes the fit score so the visitor sees why more detail makes the result better.",
    metric: "Score loop"
  },
  {
    icon: Route,
    title: "Next-click ladder",
    body: "Build the map, save it, answer deeper questions, share it, or build another one. Every move teaches the system.",
    metric: "Click path"
  },
  {
    icon: CircleDollarSign,
    title: "Buyer value becomes obvious",
    body: "When buyers see the preference engine, they understand the data without being hard-sold on the homepage.",
    metric: "Demand proof"
  }
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
        <PreferenceSignalLab />
        <SourceSection />
        <MechanicsSection />
        <ProfileSection />
        <WorkflowSection />
        <ProductSection />
        <FairRateSection />
        <ComplianceSection />
        <FinalCta />
      </main>
      <SignalConversionDock
        proofTitle="People are building perfect-fit maps now"
        proofBody="Instant value first. Saved maps become adult-only first-party preference signals."
        metrics={[
          { value: "9", label: "tools" },
          { value: "Now", label: "instant map" },
          { value: "18+", label: "adult only" }
        ]}
        primaryHref="#preference-lab"
        primaryLabel="Build my map"
        primaryEvent="preference_lab_result_click"
        secondaryHref="/problem-intake"
        secondaryLabel="Deep intake"
        secondaryEvent="preference_lab_deep_intake_click"
        sourcePage="/"
      />
      <Footer />
    </>
  );
}

function MechanicsSection() {
  return (
    <section className="relative py-10 md:py-16">
      <div className="container">
        <div className="conversion-mechanics">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">
              Attention mechanics
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
              The page has to help them before it asks for anything.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-200 md:text-lg">
              The mechanism is simple: ask a fun question, produce a useful
              answer, show why details matter, then make saving or sharing the
              map feel like the next natural move.
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

function SourceSection() {
  return (
    <section id="data" className="py-16 md:py-24">
      <div className="container">
        <SectionHeader
          eyebrow="What people use"
          title="A site full of tools people want to click again."
          body="The homepage starts with one preference lab, then expands into useful tools for vehicles, houses, food, trips, money targets, routines, shopping, and real-life decisions."
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
              Preference profiles, not blind forms
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
              Every saved map becomes a clearer picture of what the person wants.
            </h2>
            <p className="mt-5 text-base leading-7 text-ink-200 md:text-lg">
              A person should get something useful first: a recommendation map,
              shortlist, timeline, or next move. LeadFlow gets structured
              preference data only when they choose to save or continue.
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
                <h3 className="mt-1 text-2xl font-extrabold text-white">Perfect Vehicle Build Sheet</h3>
                <p className="mt-1 text-sm text-ink-300">Example of a saved first-party preference profile</p>
              </div>
              <div className="rounded-lg bg-lead-400/10 px-3 py-2 text-sm font-bold text-lead-400">
                87 fit score
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ProfileStat label="Category" value="Dataset" />
              <ProfileStat label="Signal" value="Vehicle intent" />
              <ProfileStat label="Fit" value="Ready this week" />
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Why this profile exists</p>
              <p className="mt-2 text-sm leading-6 text-ink-100">
                The visitor wants a sharp-looking vehicle that fits family weekends,
                towing, and budget comfort. The map stores style, timeline, price
                comfort, local search context, and dealbreakers.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <SourceList
                title="Evidence attached"
                items={["Category selected", "Budget comfort saved", "Timeline attached", "Style tag visible"]}
              />
              <SourceList
                title="Open questions"
                items={["Need exact location", "Need payment ceiling", "Need must-have features", "Need trade-in status"]}
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
          title="From fun question to usable plan to saved signal."
          body="The moat is not scraping alone. The moat is repeated first-party preference capture, useful outputs, scoring, follow-up paths, and clean boundaries around what data can be used."
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
          eyebrow="What people come back for"
          title="Small tools that answer real-life choices fast."
          body="LeadFlow starts with a preference lab and expands into repeatable tools people can use for decisions they already care about."
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
                <Link href="#preference-lab" className="btn-ghost mt-auto w-full text-sm">
                  Build this map
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
              Why buyers will want it
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
              Do not pitch the data first. Let them see the data being created.
            </h2>
            <p className="mt-5 text-base leading-7 text-ink-200 md:text-lg">
              A buyer who watches people build vehicle maps, home maps, taste
              profiles, trip plans, and money targets understands the value
              without a hard sell. The homepage should prove the source of the
              signal by being the tool that creates it.
            </p>
            <div className="mt-6 rounded-lg border border-lead-400/25 bg-lead-400/10 p-5">
              <p className="text-sm font-bold uppercase tracking-wider text-lead-400">
                Fair-rate rule
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-100">
                Sell only lawful, reviewed, permissioned, aggregated, or
                first-party preference signals. Sensitive personal details,
                minors' data, private addresses, medical details, and
                protected-trait targeting do not belong in sellable data.
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
            See the data marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="#preference-lab" className="btn-ghost text-base">
            Build a map
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
