import Link from "next/link";
import { Plus, PlayCircle, PauseCircle, CircleDashed, Workflow } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MOCK_AUTOMATIONS } from "@/lib/mock-data";
import { SoonButton } from "@/components/ui/SoonButton";
import { DemoBanner } from "@/components/dashboard/DemoBanner";

const TEMPLATES = [
  { name: "5-day lead nurture",    desc: "SMS day 0, 1, 3, 5 + a video on day 2", icon: "🔥" },
  { name: "Cold lead re-engage",   desc: "GIF + text after 14 days of silence",   icon: "❄️" },
  { name: "Post-appointment ask",  desc: "Thank-you GIF + Google review request", icon: "⭐" },
  { name: "Birthday + anniversary", desc: "Auto SMS + offer on the day",          icon: "🎂" }
];

export default function AutomationsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <DemoBanner>
        The automations and run counts below are samples. Your account starts
        with zero automations — pick a template and wire it up to see your
        own numbers.
      </DemoBanner>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">Automations</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            QUO-style follow-up, <span className="funnel-text">simpler</span>
          </h1>
          <p className="mt-2 text-ink-300">
            You design the sequence. We fire it on schedule. You stay in control.
          </p>
        </div>
        <SoonButton variant="primary">
          <Plus className="h-4 w-4" /> New automation
        </SoonButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active automations" value="2" />
        <StatCard label="Runs this month"    value="74" delta={18.6} />
        <StatCard label="Leads recovered"    value="21" delta={42.0} highlight />
      </div>

      {/* user's automations */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Your automations</h2>
        <div className="space-y-3">
          {MOCK_AUTOMATIONS.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-4 sm:p-5 flex items-start gap-4 flex-wrap sm:flex-nowrap">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 flex items-center justify-center text-white shrink-0">
                <Workflow className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">{a.name}</h3>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-ink-400 mt-1">Trigger: {a.trigger.replace(/_/g, " ")}</p>
                <p className="text-xs text-ink-300 mt-2">
                  {a.runsThisMonth} runs this month · {a.leadsRecovered} leads recovered
                </p>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <SoonButton size="xs" className="flex-1 sm:flex-initial">Edit</SoonButton>
                <SoonButton size="xs" className="flex-1 sm:flex-initial">
                  {a.status === "active" ? <><PauseCircle className="h-3.5 w-3.5" /> Pause</> :
                   a.status === "draft"  ? <><PlayCircle  className="h-3.5 w-3.5" /> Activate</> :
                                            <><PlayCircle  className="h-3.5 w-3.5" /> Resume</>}
                </SoonButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* templates */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Start from a template</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-5 transition flex flex-col">
              <div className="text-3xl">{t.icon}</div>
              <h3 className="mt-3 text-base font-bold text-white">{t.name}</h3>
              <p className="mt-1 text-xs text-ink-200 flex-1">{t.desc}</p>
              <SoonButton size="xs" className="mt-3 w-full">Use template</SoonButton>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-400 text-center">
        Already on QUO, GoHighLevel, or Twilio? <Link href="/dashboard/settings" className="text-cyan-400 hover:underline">Connect them</Link> — we sync without ripping anything out.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 text-[11px]"><PlayCircle className="h-3 w-3" /> Active</span>;
  if (status === "draft")
    return <span className="stat-pill bg-white/5 text-ink-300 border border-white/10 text-[11px]"><CircleDashed className="h-3 w-3" /> Draft</span>;
  return <span className="stat-pill bg-accent-500/15 text-accent-400 border border-accent-500/30 text-[11px]"><PauseCircle className="h-3 w-3" /> Paused</span>;
}
