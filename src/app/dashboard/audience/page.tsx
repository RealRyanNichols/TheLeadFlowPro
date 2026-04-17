import { Target, Users, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";

// Audience analysis is a derived product: Flo needs real leads + real
// ad/social engagement before she can say anything meaningful about the
// personas buying from you. Until that data exists, this page is honest
// zeros and a single clear next step: connect the sources.

export default function AudiencePage() {
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

      {/* Primary CTA — connect lead sources */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-white shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">
              Flo needs real leads before she can find your audience
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
