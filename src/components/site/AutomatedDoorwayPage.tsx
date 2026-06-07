import Link from "next/link";
import { ArrowRight, Bot, Database, FileText, Lock, MessageSquareText, Route } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";

type AutomatedDoorwayPageProps = {
  activePath: string;
  eyebrow: string;
  title: string;
  body: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const DOORWAY_OUTPUTS = [
  {
    title: "Free snapshot",
    body: "The visitor enters rough business data and gets a useful score before paying.",
    Icon: Bot,
  },
  {
    title: "$47 report",
    body: "Full growth snapshot, ranked leak list, first-fix checklist, and CTA angle.",
    Icon: FileText,
  },
  {
    title: "$90 kit",
    body: "Follow-up scripts for calls, forms, DMs, slow replies, and no-shows.",
    Icon: MessageSquareText,
  },
  {
    title: "$197 document",
    body: "Lead leak report with math, source trail, dashboard fields, and fix order.",
    Icon: Lock,
  },
  {
    title: "$250 map",
    body: "Automation blueprint, input-output logic, account handoff, and build checklist.",
    Icon: Route,
  },
  {
    title: "Growth OS",
    body: "The bigger owned system: dashboards, signal memory, routing, reports, and unlock paths.",
    Icon: Database,
  },
];

export function AutomatedDoorwayPage({
  activePath,
  eyebrow,
  title,
  body,
  primaryHref = "/tools/growth-machine#tool",
  primaryLabel = "Run free snapshot",
  secondaryHref = "/action-menu",
  secondaryLabel = "See paid unlocks",
}: AutomatedDoorwayPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LightHeader
        activePath={activePath}
        primaryAction={{
          href: primaryHref,
          label: "Run tool",
          mobileDescription: "Enter business data and get the free snapshot.",
          Icon: Bot,
        }}
        secondaryAction={{
          href: secondaryHref,
          label: "Unlocks",
          mobileDescription: "Reports, scripts, maps, and Growth OS paths.",
          Icon: Lock,
          muted: true,
        }}
      />

      <main>
        <section className="relative overflow-hidden border-b border-cyan-300/15">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 18% 16%, rgba(35,184,255,0.28), transparent 32%), radial-gradient(circle at 86% 10%, rgba(255,154,31,0.18), transparent 30%), linear-gradient(180deg,#020617 0%,#07111f 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.11]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125,211,252,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.16) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Bot className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">{body}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  {primaryLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={secondaryHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  {secondaryLabel} <Lock className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-300/15 bg-white/[0.055] p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2">
                {DOORWAY_OUTPUTS.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <item.Icon className="h-5 w-5 text-cyan-200" />
                    <h2 className="mt-3 text-base font-black text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}
