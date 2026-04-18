import { Target, Users, Sparkles, ArrowRight, Quote } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { auth } from "@/lib/auth";
import { getBrainContext } from "@/lib/brain";

// Audience analysis derives from real lead data. Until that exists, we
// show the user's OWN description of their ideal customer (from
// BrainProfile.idealCustomer) as a starting reference card, plus a
// connect CTA for the integrations that'll feed real persona data in.

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
          <p className="text-cyan-400 text-sm font-semibold">Target Audience</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Who actually buys from you — <span className="funnel-text">not who you think</span>
          </h1>
          <p className="mt-2 text-ink-300">
            Flo analyzes your leads, ad data, and social engagement to find the real
            patterns. Then tells you exactly where to find more of them.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Personas detected" value="0" sub="Unlocks after ~20 real leads" />
        <StatCard label="Highest-value persona" value="—" sub="Revealed once data flows in" />
        <StatCard label="Underserved persona"   value="—" sub="Where you're under-spending vs. demand" />
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
                This is what you told Flo. Once real leads flow in, she'll cluster
                them into data-backed personas — what you wrote here stays as your
                reference.
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
              Flo needs real leads before she can find data-backed personas
            </h2>
            <p className="mt-1 text-sm text-ink-200">
              Personas come from patterns in the people who actually contact you.
              Connect any of the sources below and Flo will start clustering them
              the minute data arrives — usually after around twenty leads.
            </p>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              <Link href="/dashboard/settings" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Connect your phone number <span className="text-ink-400">· SMS + calls</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Link>
              <Link href="/dashboard/settings" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Connect Meta Business <span className="text-ink-400">· Facebook + IG ads/DMs</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Link>
              <Link href="/dashboard/settings" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Connect Google Ads <span className="text-ink-400">· Search + Maps leads</span></span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Link>
              <Link href="/dashboard/settings" className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition">
                <span className="text-sm text-white">Add a lead form <span className="text-ink-400">· Website or landing page</span></span>
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
          Once leads start flowing, Flo will show up to four distinct personas,
          each with age range, geography, where they spend time online, why they
          buy, and the message that tends to land — so you know exactly who to
          target next and how to talk to them.
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
