import { Target, Users, Sparkles, ArrowRight, Quote } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { auth } from "@/lib/auth";
import { getBrainContext } from "@/lib/brain";

// Buyer-target analysis derives from real lead and intake data. Until that
// exists, show the user's own description as a starting reference card, plus
// CTAs that feed the LeadFlow marketplace with scored demand.

export default async function AudiencePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/audience");

  const { derived, extras } = await getBrainContext(session.user.id);

  const ideal = derived.idealCustomer;
  const location = derived.locationLine;
  const industry = derived.industryLabel;
  const ageRange = (extras.customerAgeRange as string) || "";
  const radius = (extras.travelRadius as string) || "";
  const objection = (extras.objectionTop as string) || "";
  const differentiator = (extras.whyChooseYou as string) || "";

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">Buyer Targets</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Who actually buys — <span className="funnel-text">and why they move</span>
          </h1>
          <p className="mt-2 text-ink-300">
            LeadFlow scores pain, urgency, public source depth, buyer fit, and
            reachable contact paths so lists are built around signal instead of noise.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Target clusters" value="0" sub="Unlocks after scored records" />
        <StatCard label="Highest-value buyer" value="—" sub="Revealed once demand flows in" />
        <StatCard label="Underserved demand" value="—" sub="Where buyers need supply" />
      </div>

      {/* User's own words — a starting reference card, clearly labelled */}
      {ideal && (
        <div className="glass rounded-2xl p-6 sm:p-8 border border-cyan-400/20">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-white shrink-0">
              <Quote className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-cyan-300">
                Your reference persona — in your own words
              </p>
              <p className="mt-2 text-base text-white leading-relaxed">
                "{ideal}"
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-ink-300">
                <Chip>{industry}</Chip>
                {location && <Chip>{location}</Chip>}
                {ageRange && <Chip>Age: {humanizeAge(ageRange)}</Chip>}
                {radius && <Chip>Radius: {humanizeRadius(radius)}</Chip>}
              </div>
              {(differentiator || objection) && (
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  {differentiator && (
                    <KV label="Why they choose you" body={differentiator} />
                  )}
                  {objection && (
                    <KV label="Top objection to overcome" body={objection} />
                  )}
                </div>
              )}
              <p className="mt-4 text-xs text-ink-400">
                This is your reference target. Once real intake and marketplace data
                flows in, LeadFlow will cluster buyers by pain, urgency, region,
                source depth, and likely purchase path.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary CTA — connect lead sources */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-white shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">
              LeadFlow needs captured demand before it can score buyer targets
            </h2>
            <p className="mt-1 text-sm text-ink-200">
              Buyer targets come from patterns in the people and companies who
              disclose intent, request lists, submit sources, or show public demand.
              Start with one capture lane and the clusters will sharpen from there.
            </p>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              <Link href="/problem-intake" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Capture problem intent <span className="text-ink-400">· pain + urgency</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Link>
              <Link href="/data-marketplace" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Open marketplace <span className="text-ink-400">· buyer requests</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Link>
              <Link href="/dashboard/social" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Source accounts <span className="text-ink-400">· public profiles</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Link>
              <Link href="/dashboard/data-requests" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Review requests <span className="text-ink-400">· scoring + delivery</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* What you'll see here once data is flowing */}
      <div className="rounded-2xl border border-dashed border-white/10 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-cyan-300">
          <Target className="h-4 w-4" />
          <p className="text-[10px] uppercase tracking-widest font-semibold">What this page will look like</p>
        </div>
        <p className="mt-2 text-sm text-ink-200">
          Once demand starts flowing, LeadFlow will show distinct buyer clusters,
          each with region, pain, source trail, likely field requirements,
          urgency, and the list package that is most likely to sell.
        </p>
        <div className="mt-4 grid sm:grid-cols-4 gap-2">
          <Placeholder label="Persona 1" />
          <Placeholder label="Persona 2" />
          <Placeholder label="Persona 3" />
          <Placeholder label="Other" />
        </div>
      </div>
    </div>
  );
}

function humanizeAge(v: string): string {
  if (v === "65_plus") return "65+";
  if (v === "mixed") return "mixed";
  return v.replace("_", "–");
}

function humanizeRadius(v: string): string {
  if (v === "5mi") return "~5 miles";
  if (v === "15mi") return "~15 miles";
  if (v === "30mi") return "~30 miles";
  if (v === "statewide") return "Statewide";
  if (v === "national") return "National";
  return v;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="stat-pill bg-white/5 border border-white/10 text-[11px]">
      {children}
    </span>
  );
}

function KV({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold">{label}</p>
      <p className="mt-1 text-sm text-ink-100">{body}</p>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Users className="h-4 w-4 text-ink-400" />
        </div>
        <p className="text-xs text-ink-400 font-semibold">{label}</p>
      </div>
      <div className="mt-3 h-2 w-2/3 bg-white/5 rounded" />
      <div className="mt-2 h-2 w-1/2 bg-white/5 rounded" />
    </div>
  );
}
