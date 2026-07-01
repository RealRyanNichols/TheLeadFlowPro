import Link from "next/link";
import { ArrowRight, BadgeCheck, Filter, ShieldCheck } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata = {
  title: "Buy Lead Signals | The LeadFlow Pro",
  description: "Buy source-backed buyer signals with intent scoring, confidence labels, suppression controls, and review-gated access."
};

const filters = [
  "Industry",
  "Location",
  "Buyer type",
  "Source type",
  "Confidence score",
  "Freshness",
  "Price range",
  "Exclusive or shared"
];

const packs = [
  {
    title: "Ecommerce Vendor Signal Pack",
    category: "Ecommerce",
    score: "87",
    records: "4,800 sample set",
    buyer: "Agency, product sourcer, marketplace operator",
    proof: "Sample rows, public source links, platform tags",
    status: "Review-gated"
  },
  {
    title: "Local Service Route Pack",
    category: "Local services",
    score: "79",
    records: "1,250 sample set",
    buyer: "Contractor, agency, local operator",
    proof: "Directory source, submitted route, category tags",
    status: "Inquiry open"
  },
  {
    title: "AI Tool Launch Watchlist",
    category: "AI and SaaS",
    score: "82",
    records: "680 signal set",
    buyer: "SaaS agency, integration builder, automation shop",
    proof: "Launch post, pricing page, traffic clue",
    status: "Watchlist"
  }
];

export default function BuyLeadsPage() {
  return (
    <>
      <Header />
      <main className="pb-24">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_10%,rgba(35,184,255,0.16),transparent_32%),linear-gradient(135deg,#030711,#090d18_55%,#111008)] py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Buy lead signals</p>
                <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.96] text-white md:text-7xl">
                  Buy lead signals with proof attached.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-100">
                  No mystery spreadsheets. No recycled junk. No trust me bro data. Every profile shows source context, category, score, confidence, suppression status, and why the opportunity exists.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/marketplace" className="btn-accent text-base">
                    Open The Marketplace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/contact" className="btn-ghost text-base">
                    Request Buyer Access
                  </Link>
                </div>
              </div>

              <div className="lead-shell p-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                    <Filter className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Buyer filters</p>
                    <h2 className="text-2xl font-black text-white">Choose the list you can actually use.</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {filters.map((filter) => (
                    <div key={filter} className="flex min-h-14 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-ink-100">
                      <BadgeCheck className="h-4 w-4 shrink-0 text-lead-400" />
                      {filter}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">Available signal packs</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Start with reviewed samples, then request access.</h2>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {packs.map((pack) => (
                <article key={pack.title} className="lead-shell flex min-h-96 p-5">
                  <div className="flex w-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-cyan-300">{pack.category}</p>
                        <h3 className="mt-2 text-2xl font-black text-white">{pack.title}</h3>
                      </div>
                      <div className="rounded-lg border border-lead-400/25 bg-lead-400/10 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-lead-300">Score</p>
                        <p className="text-2xl font-black text-white">{pack.score}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-ink-100">
                      <SignalLine label="Records" value={pack.records} />
                      <SignalLine label="Best buyer" value={pack.buyer} />
                      <SignalLine label="Proof" value={pack.proof} />
                      <SignalLine label="Status" value={pack.status} />
                    </div>
                    <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
                      <Link href="/marketplace" className="btn-ghost justify-center text-sm">Request Sample</Link>
                      <Link href="/contact" className="btn-accent justify-center text-sm">Buy Access</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "Source context stays attached.",
                "Suppression status travels with the record.",
                "Reviewed release beats mystery volume."
              ].map((rule) => (
                <div key={rule} className="lead-panel flex min-h-28 gap-3 p-5 text-sm leading-6 text-ink-100">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SignalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 leading-6">{value}</p>
    </div>
  );
}
