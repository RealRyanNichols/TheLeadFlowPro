import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Inbox, Plug, Sparkles, Workflow } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  // Signup collects name + businessName, so those aren't enough — gate on
  // onboardedAt, which only flips after the questionnaire is submitted.
  if (!user.onboardedAt) redirect("/dashboard/onboarding");

  const greetingName = user.name?.split(" ")[0] || "there";

  // Real counts from the user's own data. Nothing is seeded, so brand-new
  // accounts see clean zeros until they (or their chatbot) actually do work.
  const [leadCount, recentLeads, connectedSocials, automationCount] = await Promise.all([
    prisma.lead.count({ where: { userId: user.id } }),
    prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, notes: true, createdAt: true }
    }),
    prisma.socialAccount.count({ where: { userId: user.id } }),
    prisma.automation.count({ where: { userId: user.id, status: "active" } })
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">
          Welcome, {greetingName}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          {user.businessName || "Your workspace"}{" "}
          <span className="funnel-text">— clean slate</span>
        </h1>
        <p className="mt-2 text-sm text-ink-300 max-w-xl">
          Your numbers fill in as leads come through, socials connect, and
          playbooks run. No fake data — what you see here is what you've done.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads this month"  value={String(leadCount)} />
        <StatCard label="Connected socials" value={`${connectedSocials} of 5`} />
        <StatCard label="Active automations" value={String(automationCount)} />
        <StatCard label="Ad spend (MTD)"    value="$0" sub="Connect an ad account to track" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white">Set up your workspace</h2>
          <p className="text-sm text-ink-300">
            Four quick wires and the dashboard starts lighting up on its own.
          </p>
          <div className="grid gap-3">
            <SetupRow
              icon={Plug}
              title="Connect your social accounts"
              hint="Instagram, TikTok, Facebook, X, YouTube — we'll pull real followers + engagement."
              href="/dashboard/social"
              cta="Connect"
            />
            <SetupRow
              icon={Inbox}
              title="Open your lead inbox"
              hint="Missed-call text-back + web form → every lead shows up here, tagged by source."
              href="/dashboard/leads"
              cta="Open inbox"
            />
            <SetupRow
              icon={Workflow}
              title="Turn on your first automation"
              hint="Pick one missed-call text-back script and flip it live. Takes 2 minutes."
              href="/dashboard/automations"
              cta="Browse"
            />
            <SetupRow
              icon={Sparkles}
              title="Generate your first insight"
              hint="Once we have data, AI surfaces your highest-leverage next move."
              href="/dashboard/insights"
              cta="Preview"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Recent leads</h3>
              <Link href="/dashboard/leads" className="text-xs text-cyan-400 hover:underline">
                Open inbox →
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <p className="text-sm text-ink-400">
                No leads yet. They'll appear here as soon as someone calls,
                texts, or fills out a form.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentLeads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{l.name || "New lead"}</p>
                      <p className="text-xs text-ink-400 truncate">{l.notes || "—"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupRow({
  icon: Icon, title, hint, href, cta
}: {
  icon: any; title: string; hint: string; href: string; cta: string;
}) {
  return (
    <Link
      href={href}
      className="glass rounded-xl p-4 flex items-start gap-3 hover:border-cyan-500/30 transition group"
    >
      <span className="h-9 w-9 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-ink-400 mt-0.5">{hint}</p>
      </div>
      <span className="text-xs text-cyan-400 shrink-0 inline-flex items-center gap-0.5 group-hover:underline">
        {cta} <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
