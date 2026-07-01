import Link from "next/link";
import { ArrowRight, CircleCheck, Gauge, LockKeyhole } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { InfoCard, LeadFlowSectionHero, SectionHeader } from "@/components/site/LeadFlowSectionPage";
import { leadFlowSections, profileModelFields, signalProducts } from "@/lib/leadflow-sections";
import { leadSignalScoreCategoryDefinitions } from "@/lib/leadflow-scoring";

export const metadata = {
  title: "Lead Profile Model | The LeadFlow Pro",
  description: "What goes into a LeadFlow profile: source proof, confidence score, buyer use case, suppression status, tags, timestamps, and open questions.",
};

const profileSection = leadFlowSections.find((section) => section.href === "/profile-model")!;

const releaseRules = [
  "A profile is not a private dossier.",
  "Source proof and timestamps must stay attached.",
  "Suppression status travels with the record.",
  "Open questions block release until reviewed.",
  "Aggregate insights stay separate from identified lead data.",
  "Raw answers stay hidden when a buyer only has summary access.",
];

export default function ProfileModelPage() {
  return (
    <>
      <Header />
      <main className="pb-24">
        <LeadFlowSectionHero section={profileSection}>
          <aside className="lead-shell p-5">
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Profile anatomy</p>
              <h2 className="mt-1 text-2xl font-black text-white">What buyers can inspect.</h2>
            </div>
            <div className="mt-5 space-y-3">
              {releaseRules.map((rule) => (
                <div key={rule} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
                  <CircleCheck className="mt-1 h-4 w-4 shrink-0 text-lead-400" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </aside>
        </LeadFlowSectionHero>

        <section className="py-14 md:py-20">
          <div className="container">
            <SectionHeader
              eyebrow="Profile fields"
              title="Lead products need proof, context, limits, and unanswered questions."
              body="The profile model is built to make buyer value clear without dumping private raw data or hiding where the signal came from."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profileModelFields.map((field) => (
                <InfoCard key={field.title} icon={field.icon} title={field.title} body={field.body} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02] py-14 md:py-20">
          <div className="container">
            <SectionHeader
              eyebrow="Score model"
              title="Every score has a reason a buyer can read."
              body="LeadFlow scores disclosed fields, proof context, consent status, suppression status, and fit. It does not score minors or use protected traits, private financial account data, health data, or private political identity."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {leadSignalScoreCategoryDefinitions.map((score) => (
                <article key={score.category} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-black text-white">{score.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-300">{score.buyerMeaning}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              <SectionHeader
                eyebrow="Sample model"
                title="A buyer sees the reason to act, not an unreviewed dump."
                body="These samples show the profile shape the marketplace should enforce before a buyer can request access."
              />
              <div className="space-y-4">
                {signalProducts.slice(0, 2).map((product) => (
                  <article key={product.title} className="lead-shell p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-cyan-300">{product.category}</p>
                        <h3 className="mt-2 text-2xl font-black text-white">{product.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-ink-300">{product.buyerUseCase}</p>
                      </div>
                      <div className="rounded-lg border border-lead-400/25 bg-lead-400/10 px-4 py-3 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-lead-300">Confidence</p>
                        <p className="text-xl font-black text-white">{product.confidence}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <ProfileLine label="Source proof" value={product.sourceProof} />
                      <ProfileLine label="Suppression" value={product.suppression} />
                      <ProfileLine label="Freshness" value={product.freshness} />
                      <ProfileLine label="Release mode" value={product.releaseMode} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(35,184,255,0.12),rgba(70,255,169,0.10))] p-6 md:p-10">
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <LockKeyhole className="h-7 w-7 text-cyan-300" />
                  <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">Private controls are part of the product.</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-ink-100">
                    Deletion, do-not-contact, consent scope, scoring opt-out, and named partner access must be fields the system respects, not footer language.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                  <Link href="/privacy-center" className="btn-accent text-base">
                    Privacy Center
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/marketplace" className="btn-ghost text-base">
                    Open Marketplace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}
