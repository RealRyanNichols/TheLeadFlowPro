import Link from "next/link";
import { redirect } from "next/navigation";
import {
  User, Mail, Phone, MapPin, Building2, Globe, Calendar,
  CheckCircle2, Zap, Trophy, ArrowRight, Pencil
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import { MOCK_KPIS } from "@/lib/mock-data";

export const metadata = { title: "Profile — The LeadFlow Pro" };

// Real activity ships once we're logging events per user. Until then we show
// an empty state so we never invent leads, closings, or social connections
// the user doesn't actually have.
const ACTIVITY: { when: string; label: string; kind: "play" | "win" | "setup" }[] = [];

const BADGES = [
  { icon: Trophy, label: "First close",    hint: "Close your first lead to unlock" },
  { icon: Zap,    label: "Fast responder", hint: "Reply under 2 min to unlock" },
  { icon: CheckCircle2, label: "5 playbooks run", hint: "Run 5 playbooks to unlock" }
];

function memberSince(date?: Date | null): string {
  if (!date) return "New member";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function locationLine(city?: string | null, state?: string | null, zip?: string | null): string {
  const parts = [city, state].filter(Boolean).join(", ");
  if (parts && zip) return `${parts} ${zip}`;
  return parts || zip || "";
}

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/profile");

  const displayName = user.name?.trim() || user.email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();
  const loc = locationLine(user.addressCity, user.addressState, user.addressZip);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header card */}
      <div className="glass rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-promo-glow opacity-40 -z-10" />
        <div className="flex items-start gap-4 flex-wrap">
          <div className="relative shrink-0">
            <span className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-2xl font-extrabold text-ink-950">
              {initial}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
              <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 text-[11px]">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
              <span className="stat-pill bg-accent-500/15 text-accent-400 border border-accent-500/30 text-[11px] capitalize">
                {user.plan} plan
              </span>
            </div>
            <p className="text-sm text-ink-300 mt-1">
              {user.businessName || "Your business"}
              {user.industry ? ` · ${user.industry}` : ""}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">
              Member since {memberSince(user.createdAt)}
              {loc ? ` · ${loc}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/settings" className="btn-ghost text-xs py-2 px-3">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
            <Link href="/dashboard/billing" className="btn-accent text-xs py-2 px-3">
              Manage plan
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Leads this month"    value={String(MOCK_KPIS.newLeadsThisMonth)} accent="cyan" />
        <Stat label="Missed-call saves"   value={String(MOCK_KPIS.missedCallsRecovered)} accent="lead" />
        <Stat label="Avg response (min)"  value={MOCK_KPIS.responseRateMinutes.toFixed(1)} accent="accent" />
        <Stat label="Conversion rate"     value={`${(MOCK_KPIS.conversionRate * 100).toFixed(0)}%`} accent="cyan" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        {/* LEFT — details */}
        <div className="space-y-6 min-w-0">
          <Section title="Contact">
            <Row icon={Mail}     label="Email" value={user.replyToEmail || user.email} />
            <Row icon={Phone}    label="Phone" value={user.phone || "—"} />
            <Row icon={MapPin}   label="Location" value={loc || "—"} />
            <Row icon={Globe}    label="Website" value={user.website || "—"} />
          </Section>

          <Section title="Business">
            <Row icon={Building2} label="Business name" value={user.businessName || "—"} />
            <Row icon={User}      label="Industry"      value={user.industry || "—"} />
            <Row icon={Calendar}  label="Timezone"      value={user.timezone || "America/Chicago"} />
          </Section>

          <Section title="Recent activity">
            {ACTIVITY.length === 0 ? (
              <p className="text-sm text-ink-400">
                Nothing yet. Run your first playbook or book a lead and it'll show up here.
              </p>
            ) : (
              <ul className="space-y-3">
                {ACTIVITY.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={
                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 " +
                      (a.kind === "win"
                        ? "bg-lead-500/15 text-lead-400"
                        : a.kind === "play"
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "bg-white/5 text-ink-200")
                    }>
                      {a.kind === "win"  ? <Trophy className="h-4 w-4" /> :
                       a.kind === "play" ? <Zap className="h-4 w-4" /> :
                                           <CheckCircle2 className="h-4 w-4" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-white">{a.label}</p>
                      <p className="text-xs text-ink-400">{a.when}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* RIGHT — side rail */}
        <aside className="space-y-6">
          <Section title="Badges">
            <div className="space-y-2.5">
              {BADGES.map((b) => (
                <div key={b.label} className="flex items-start gap-2.5">
                  <span className="h-8 w-8 rounded-lg bg-accent-500/15 text-accent-400 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.label}</p>
                    <p className="text-xs text-ink-400">{b.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Quick jump">
            <div className="space-y-2">
              <QuickLink href="/dashboard/settings" label="Account settings" />
              <QuickLink href="/dashboard/billing"  label="Billing & plan" />
              <QuickLink href="/dashboard/card"     label="My FlowCard" />
              <QuickLink href="/dashboard/onboarding" label="Onboarding" />
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
      <span className="text-xs text-ink-400 w-28 shrink-0">{label}</span>
      <span className="text-sm text-white truncate">{value}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "cyan" | "accent" | "lead" }) {
  const color = accent === "cyan" ? "text-cyan-400" : accent === "accent" ? "text-accent-400" : "text-lead-400";
  return (
    <div className="glass rounded-xl p-3">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-ink-400 mt-0.5">{label}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5 text-ink-400" />
    </Link>
  );
}
