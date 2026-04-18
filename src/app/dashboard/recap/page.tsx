"use client";
import Link from "next/link";
import {
  Mail, TrendingUp, DollarSign, Flame, Target, ArrowRight,
  CheckCircle2, Clock, Sparkles, Send, Calendar
} from "lucide-react";
import { MOCK_LEADS, MOCK_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { DemoBanner } from "@/components/dashboard/DemoBanner";

type LeadStatus = typeof MOCK_LEADS[number]["status"];

const STATUS_STEPS: { id: LeadStatus; label: string }[] = [
  { id: "new",        label: "New" },
  { id: "contacted",  label: "Contacted" },
  { id: "nurturing",  label: "Nurturing" },
  { id: "qualified",  label: "Qualified" },
  { id: "booked",     label: "Booked" },
  { id: "won",        label: "Won" }
];

function stepsLeft(status: LeadStatus): number {
  const idx = STATUS_STEPS.findIndex((s) => s.id === status);
  if (idx === -1) return STATUS_STEPS.length - 1;
  return Math.max(0, STATUS_STEPS.length - 1 - idx);
}

function nextMove(status: LeadStatus): string {
  switch (status) {
    case "new":        return "Send your intro text — aim for a reply in under 5 minutes.";
    case "contacted":  return "Ask one specific question about what they're trying to solve.";
    case "nurturing":  return "Send a short video or GIF with a clear next step.";
    case "qualified":  return "Offer 2–3 booking times. Remove the back-and-forth.";
    case "booked":     return "Send a prep text morning-of. Confirm and reduce no-shows.";
    case "won":        return "Ask for the review + referral within 24 hours of service.";
    default:           return "Follow up.";
  }
}

// Weekly summary derived from mock leads + fake history
const weekLeads = MOCK_LEADS;
const potentialRevenue = weekLeads
  .filter((l) => l.status !== "won")
  .reduce((sum, l) => sum + l.estValue, 0);
const wonRevenue = weekLeads
  .filter((l) => l.status === "won")
  .reduce((sum, l) => sum + l.estValue, 0);
const hotLeads = weekLeads.filter((l) => l.status === "new" || l.status === "qualified");
const stalledLeads = weekLeads.filter((l) => l.status === "nurturing" || l.status === "contacted");

export default function RecapPage() {
  return (
    <div className="max-w-4xl space-y-5">
      <DemoBanner setupHref="/dashboard/leads" setupLabel="Open lead inbox">
        This is a sample of the Monday recap email. The leads, dollar amounts,
        and moves are placeholders — your real recap assembles once you have
        actual leads flowing through the inbox.
      </DemoBanner>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-cyan-400" /> Weekly recap
          </h1>
          <p className="text-sm text-ink-300 mt-1">
            Here's the email we'll send you every Monday morning. Money waiting, moves to make, and exactly how many steps until each dollar lands.
          </p>
        </div>
        <Link href="/dashboard/settings#notifications" className="btn-ghost text-xs py-2 px-3">
          Tune schedule
        </Link>
      </div>

      {/* Email preview frame */}
      <div className="glass-strong rounded-2xl overflow-hidden border border-cyan-500/20">
        <div className="bg-ink-950/80 border-b border-white/5 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <Mail className="h-3.5 w-3.5" />
            <span>From: recap@theleadflowpro.com</span>
          </div>
          <span className="stat-pill bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px]">
            Preview · won't send until Monday
          </span>
        </div>

        <div className="p-5 sm:p-8 bg-ink-950/40 space-y-6">
          {/* Greeting */}
          <div>
            <p className="text-xs text-ink-400 uppercase tracking-wider">Week of Apr 13 – 19, 2026</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {MOCK_USER.name}, here's what's sitting in your pipeline.
            </h2>
          </div>

          {/* Headline numbers */}
          <div className="grid gap-3 sm:grid-cols-3">
            <HeadlineStat
              icon={<DollarSign className="h-4 w-4 text-accent-400" />}
              value={`$${potentialRevenue.toLocaleString()}`}
              label="Potential revenue waiting"
              tone="accent"
            />
            <HeadlineStat
              icon={<CheckCircle2 className="h-4 w-4 text-lead-400" />}
              value={`$${wonRevenue.toLocaleString()}`}
              label="Closed this week"
              tone="lead"
            />
            <HeadlineStat
              icon={<Flame className="h-4 w-4 text-red-400" />}
              value={hotLeads.length.toString()}
              label="Hot leads still open"
              tone="red"
            />
          </div>

          {/* Plain-English summary */}
          <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-sm text-ink-100 leading-relaxed">
                You have{" "}
                <span className="text-white font-semibold">${potentialRevenue.toLocaleString()}</span>{" "}
                in potential deals sitting in your pipeline right now.{" "}
                <span className="text-white font-semibold">{hotLeads.length} hot leads</span> need a reply in the next 24 hours or they'll go cold.{" "}
                If you run the moves below, we project an additional{" "}
                <span className="text-accent-400 font-semibold">
                  ~${Math.round(potentialRevenue * 0.35).toLocaleString()}
                </span>{" "}
                could close this week.
              </p>
            </div>
          </div>

          {/* The pipeline — steps to money */}
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-cyan-400" /> Money-by-lead — steps until each dollar lands
            </h3>
            <div className="space-y-2">
              {weekLeads
                .filter((l) => l.status !== "won")
                .sort((a, b) => b.estValue - a.estValue)
                .map((l) => {
                  const left = stepsLeft(l.status);
                  const idx = STATUS_STEPS.findIndex((s) => s.id === l.status);
                  const progress = ((idx + 1) / STATUS_STEPS.length) * 100;
                  return (
                    <div key={l.id} className="glass rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{l.name}</p>
                          <p className="text-[11px] text-ink-400">{l.notes}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-accent-400">${l.estValue.toLocaleString()}</p>
                          <p className="text-[10px] text-ink-400">{left} step{left === 1 ? "" : "s"} to go</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-accent-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-2 flex items-start gap-2 text-xs">
                        <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0 mt-0.5" />
                        <p className="text-ink-200">{nextMove(l.status)}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Hot lane */}
          {hotLeads.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Flame className="h-4 w-4 text-red-400" /> Do these first — hot leads
              </h3>
              <div className="space-y-2">
                {hotLeads.map((l) => (
                  <Link
                    key={l.id}
                    href={`/dashboard/leads/${l.id}`}
                    className="glass rounded-xl p-3 border border-red-500/20 flex items-start gap-3 hover:border-red-500/40 transition"
                  >
                    <span className="h-9 w-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                      <Flame className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{l.name} — ${l.estValue.toLocaleString()} potential</p>
                      <p className="text-xs text-ink-300 mt-0.5">{nextMove(l.status)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-400 shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stalled */}
          {stalledLeads.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-accent-400" /> Rekindle these — stalled mid-pipeline
              </h3>
              <div className="space-y-2">
                {stalledLeads.map((l) => (
                  <Link
                    key={l.id}
                    href={`/dashboard/leads/${l.id}`}
                    className="glass rounded-xl p-3 border border-accent-500/20 flex items-center gap-3 hover:border-accent-500/40 transition"
                  >
                    <span className="h-9 w-9 rounded-lg bg-accent-500/10 text-accent-400 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{l.name}</p>
                      <p className="text-[11px] text-ink-400 truncate">{l.notes}</p>
                    </div>
                    <span className="text-xs font-semibold text-accent-400 shrink-0">${l.estValue.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Weekly moves */}
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-lead-400" /> Three moves to put money in your pocket this week
            </h3>
            <ol className="space-y-3 text-sm text-ink-100">
              <Move num={1}>
                Clear the <span className="text-red-400 font-semibold">{hotLeads.length} hot lead{hotLeads.length === 1 ? "" : "s"}</span> above first.
                Each one replied in under 5 minutes converts at 4–9×. Projected value:{" "}
                <span className="text-accent-400 font-semibold">
                  ~${Math.round(hotLeads.reduce((s, l) => s + l.estValue, 0) * 0.45).toLocaleString()}
                </span>.
              </Move>
              <Move num={2}>
                Send a video or GIF to each stalled lead (
                <Link href="/dashboard/scripts" className="text-cyan-400 underline">use Script L1 — the 45-second video bump</Link>
                ). Replies double when the bump offers value instead of checking in.
              </Move>
              <Move num={3}>
                Ask your 3 most recent <span className="text-lead-400 font-semibold">Won</span> customers for a Google review (
                <Link href="/dashboard/scripts" className="text-cyan-400 underline">Script T1</Link>
                ). Every new review lifts ad click-through by 2–4%.
              </Move>
            </ol>
          </div>

          {/* Footer CTA */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2 justify-between items-center">
            <p className="text-xs text-ink-400">
              You'll get this every Monday at 7 AM in your timezone.
            </p>
            <div className="flex gap-2">
              <Link href="/dashboard/leads" className="btn-accent text-xs py-2 px-3">
                <Send className="h-3.5 w-3.5" /> Open lead inbox
              </Link>
              <Link href="/dashboard/playbooks" className="btn-ghost text-xs py-2 px-3">
                <Calendar className="h-3.5 w-3.5" /> Run a playbook
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeadlineStat({ icon, value, label, tone }: {
  icon: React.ReactNode; value: string; label: string; tone: "accent" | "lead" | "red";
}) {
  const border =
    tone === "accent" ? "border-accent-500/20" :
    tone === "lead"   ? "border-lead-500/20"   : "border-red-500/20";
  return (
    <div className={cn("glass rounded-xl p-4 border", border)}>
      <div className="flex items-center gap-2">{icon}<p className="text-xs text-ink-300">{label}</p></div>
      <p className="text-2xl font-extrabold text-white mt-1">{value}</p>
    </div>
  );
}

function Move({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500 to-accent-500 text-ink-950 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </span>
      <p className="flex-1">{children}</p>
    </li>
  );
}
