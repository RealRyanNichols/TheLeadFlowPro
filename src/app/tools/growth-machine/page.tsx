import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Database,
  FileText,
  Lock,
  MousePointerClick,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { createSeoMetadata } from "@/lib/seo-metadata";
import { AutomatedGrowthTool } from "./AutomatedGrowthTool";

export const revalidate = 300;

export const metadata = createSeoMetadata({
  title: "Automated Growth Tools | The LeadFlow Pro",
  description:
    "Put in business data and get an automated lead-flow, follow-up, content, automation, and analytics readout with paid report and document unlocks.",
  path: "/tools/growth-machine",
  imageTitle: "The LeadFlow Pro Growth Machine",
  imageSubtitle: "Self-serve lead-flow tools, data readouts, automation maps, and paid report unlocks.",
});

const OUTPUTS = [
  "Free growth snapshot",
  "Locked lead leak report",
  "Follow-up script pack",
  "Automation blueprint",
  "Dashboard field map",
  "Export-ready action plan",
];

export default function GrowthMachinePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader
        activePath="/action-menu"
        primaryAction={{
          href: "/tools/growth-machine#tool",
          label: "Run free snapshot",
          mobileDescription: "Enter business data and see the first readout.",
          Icon: Bot,
        }}
        secondaryAction={{
          href: "/action-menu",
          label: "Buy menu",
          mobileDescription: "See every self-serve tool path.",
          Icon: MousePointerClick,
          muted: true,
        }}
      />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 16% 18%, rgba(35,184,255,0.25), transparent 30%), radial-gradient(circle at 84% 14%, rgba(255,154,31,0.18), transparent 28%)",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <Link
              href="/action-menu"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to action menu
            </Link>

            <div className="mt-7 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-100">
                  <Bot className="h-3.5 w-3.5" />
                  No human bottleneck
                </div>
                <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Put your business data in. Get the machine readout back.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  This is the direction: tools that keep working whether Ryan is available or not.
                  The user enters rough business data, gets a useful free snapshot, then unlocks
                  the remaining report, scripts, automation map, and export when the missing pieces
                  become obvious.
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                  No guaranteed leads, sales, revenue, ROAS, follower growth, or ad approval. The
                  tool gives a structured readout, practical documents, and clearer next steps.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-slate-950/30">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  <Database className="h-4 w-4" />
                  What the site should sell
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {OUTPUTS.map((output, index) => (
                    <div
                      key={output}
                      className="rounded-2xl border border-white/10 bg-slate-950/68 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-white">{output}</span>
                        {index === 0 ? (
                          <ShieldCheck className="h-4 w-4 text-cyan-200" />
                        ) : (
                          <Lock className="h-4 w-4 text-accent-200" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tool" className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff8f1_0%,#eef9ff_52%,#ffffff_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <AutomatedGrowthTool />
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
            <BottomCard
              Icon={FileText}
              title="Documents, not opinions"
              body="The money is in the report, script pack, checklist, map, and export the owner can use."
            />
            <BottomCard
              Icon={Zap}
              title="Charge at the value point"
              body="Give enough free signal to prove the tool works, then lock the document they need next."
            />
            <BottomCard
              Icon={Bot}
              title="Built to run without a human"
              body="The operating logic becomes the product. The buyer gets output without waiting on a call."
            />
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function BottomCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof Bot;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
      <Icon className="h-6 w-6 text-cyan-200" />
      <h2 className="mt-4 text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
