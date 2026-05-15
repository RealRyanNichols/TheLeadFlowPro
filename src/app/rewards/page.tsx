import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeDollarSign,
  Brain,
  CheckCircle2,
  LockKeyhole,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { TrackedLink } from "@/components/TrackedLink";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = createSeoMetadata({
  title: "Proof Points Rewards — The LeadFlow Pro",
  description:
    "The LeadFlow Pro reward loop: earn off-chain Proof Points for watching, sharing, asking, and contributing without letting anyone sabotage the site.",
  path: "/rewards",
  imageTitle: "Proof Points Rewards",
  imageSubtitle: "A safer reward loop for watching, sharing, asking, and contributing.",
});

const EARN_ROWS = [
  {
    Icon: Users,
    title: "Stay and study",
    body: "Visible time earns session points. The system learns which pages make people stop, read, and click.",
  },
  {
    Icon: Share2,
    title: "Share the proof board",
    body: "Tracked share links measure click-backs. Platform view counts are imported only when we can verify them.",
  },
  {
    Icon: Brain,
    title: "Ask better questions",
    body: "Questions become private topic signals. We learn what people need without publishing raw private messages.",
  },
  {
    Icon: Sparkles,
    title: "Contribute ideas",
    body: "Useful ideas go into a review queue. Contributors can earn status, credits, or early access without touching production.",
  },
];

const SAFETY_ROWS = [
  "Nobody edits the live site directly. Every contribution is a draft, suggestion, or upload that Ryan approves.",
  "Rewards are off-chain at first. No cash value, no trading, no investor language, and no promise that points will become money.",
  "Accounts get rate limits, identity checks where needed, audit logs, and abuse scoring before contributor features unlock.",
  "Private client files stay private. Public scoreboards show anonymous behavior and aggregate trends, not client details.",
];

const BUILD_ORDER = [
  {
    title: "Proof Points beta",
    body: "Session points, share points, question points, and contributor status. This tests whether rewards actually increase time, clicks, and shares.",
  },
  {
    title: "Contributor vault",
    body: "Users can submit hooks, tool ideas, screenshots, and industry playbooks. Everything lands in admin review first.",
  },
  {
    title: "Client unlocks",
    body: "Points unlock templates, audits, priority review windows, and beta tools. That has business value without becoming a security token.",
  },
  {
    title: "Token decision later",
    body: "If the off-chain loop works, we can evaluate wallet login, partner rewards, or blockchain receipts. We do not start with speculation.",
  },
];

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/rewards" />

      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-28 -top-36 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.52) 0%, transparent 64%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-44 -left-28 h-[520px] w-[520px] rounded-full opacity-45 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.42) 0%, transparent 62%)" }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
              <Trophy className="h-3.5 w-3.5" /> Reward loop blueprint
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              People should win something for helping the site get smarter.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
              The safest first move is not a tradable crypto token. It is an off-chain reward
              system that proves people will stay, share, ask, contribute, and come back because
              the site is useful.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
              <TrackedLink
                href="/pulse"
                event="cta_pulse"
                location="rewards_hero"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              >
                Watch the board <ArrowRight className="h-4 w-4" />
              </TrackedLink>
              <TrackedLink
                href="/stump-ryan"
                event="cta_tool_challenge"
                location="rewards_hero"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
              >
                Stump Ryan
              </TrackedLink>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-brand-950 to-slate-900 p-5 text-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.70)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  Proof Points
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">Off-chain first.</h2>
              </div>
              <div className="rounded-2xl border border-accent-300/20 bg-accent-300/10 px-4 py-3 text-right">
                <div className="text-3xl font-semibold text-accent-100">0</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                  cash value
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ProofMetric label="Earned by" value="actions" />
              <ProofMetric label="Redeemed for" value="access" />
              <ProofMetric label="Public edits" value="never" />
              <ProofMetric label="Token later" value="only if proven" />
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-relaxed text-slate-300">
              This gives the site game mechanics without letting strangers touch production, inflate
              numbers, or create legal problems before the reward loop proves it creates revenue.
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              How people earn
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Reward the behavior that makes the business grow.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {EARN_ROWS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/60 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]"
              >
                <Icon className="h-6 w-6 text-cyan-700" />
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <ShieldCheck className="h-4 w-4" /> Sabotage control
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Contributors can help without getting the keys.
            </h2>
            <p className="mt-4 text-slate-300">
              The contribution layer should feel open, but the system underneath stays locked down:
              review queues, audit logs, rate limits, role gates, and public/private separation.
            </p>
          </div>
          <div className="grid gap-3">
            {SAFETY_ROWS.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-cyan-200" />
                <p className="text-sm leading-relaxed text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              Build order
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Do not start with a coin. Start with proof.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {BUILD_ORDER.map((item, index) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-sm font-bold text-cyan-800">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-slate-50 to-cyan-50/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
              <BadgeDollarSign className="h-4 w-4" /> Money path
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Rewards should push people toward services, not speculation.
            </h2>
          </div>
          <TrackedLink
            href="/start"
            event="cta_start_router"
            location="rewards_bottom"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
          >
            Pick the paid path <ArrowRight className="h-4 w-4" />
          </TrackedLink>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

function ProofMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
