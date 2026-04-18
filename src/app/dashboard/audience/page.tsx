import { Target, Users, MapPin, Clock, Wand2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SoonButton } from "@/components/ui/SoonButton";
import { DemoBanner } from "@/components/dashboard/DemoBanner";

const PERSONAS = [
  {
    name: "The 'Been Meaning To' Neighbor",
    pct: 38,
    age: "32–50",
    geo: "Within 20mi",
    motive: "Has put off the job for months or years. A recent event (season change, trip, milestone) is finally pushing them to book.",
    where: "Instagram (Reels), Facebook local groups",
    msg: "Real before/afters from neighbors their age. Financing or straight pricing. Friendly, no pressure."
  },
  {
    name: "The 'Need It Today' Local",
    pct: 27,
    age: "25–60",
    geo: "Within 10mi",
    motive: "Something broke or stopped working. Will book whoever answers the phone fastest.",
    where: "Google Search, Google & Apple Maps",
    msg: "'Same-day service.' Phone number front and center. Speed beats polish."
  },
  {
    name: "The 'Doing My Research' Buyer",
    pct: 21,
    age: "28–55",
    geo: "Within 30mi",
    motive: "Bigger job. Reads reviews, watches YouTube, comparison-shops 2–4 local options before calling.",
    where: "Google reviews, YouTube, TikTok how-to content",
    msg: "Long-form video. Walk through the process and the price. Show your face, build trust."
  },
  {
    name: "Other / unclear",
    pct: 14,
    age: "Mixed",
    geo: "Mixed",
    motive: "—",
    where: "—",
    msg: "Not enough data yet."
  }
];

export default function AudiencePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <DemoBanner setupHref="/dashboard/social" setupLabel="Connect socials">
        These personas are a sample so you know the shape of this page. Claude
        needs your socials connected + real leads flowing before it can detect
        the buyers you actually have.
      </DemoBanner>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">Target Audience</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Who actually buys from you — <span className="funnel-text">not who you think</span>
          </h1>
          <p className="mt-2 text-ink-300">
            Claude analyzes your leads, ad data, and social engagement to find the real
            patterns. Then tells you exactly where to find more of them.
          </p>
        </div>
        <SoonButton variant="primary">
          <Wand2 className="h-4 w-4" /> Re-run analysis
        </SoonButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Personas detected" value="3" />
        <StatCard label="Highest-value persona" value="38%" sub="The 'Finally Fixing It' Mom" highlight />
        <StatCard label="Underserved persona"   value="The Pro" sub="You spend 8% of ads on her" />
      </div>

      <div className="space-y-4">
        {PERSONAS.map((p) => (
          <div key={p.name} className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-white shrink-0">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{p.name}</h3>
                  <p className="text-xs text-ink-400">{p.pct}% of your leads</p>
                </div>
              </div>
              <span className="stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs">
                {p.pct}%
              </span>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
              <Stat icon={Users} label="Age" value={p.age} />
              <Stat icon={MapPin} label="Geography" value={p.geo} />
              <Stat icon={Clock} label="Where they hang out" value={p.where} />
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <Block label="Why they buy" body={p.motive} />
              <Block label="Message that hits" body={p.msg} accent />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

function Block({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return (
    <div className={"rounded-xl p-3 border " + (accent ? "bg-accent-500/5 border-accent-500/20" : "bg-white/5 border-white/10")}>
      <p className={"text-[10px] uppercase tracking-wider font-semibold " + (accent ? "text-accent-400" : "text-ink-400")}>{label}</p>
      <p className="text-sm text-ink-100 mt-1">{body}</p>
    </div>
  );
}
