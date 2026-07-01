import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  FileSearch,
  LockKeyhole,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  auditEvents,
  intakeTools,
  machineMetrics,
  machinePaths,
  machineRules,
  phase3Milestones,
  reviewGates,
  routingModes
} from "@/lib/phase3-machine";

export function LeadFlowMachine() {
  return (
    <main className="pb-28">
      <section className="buyer-signal-hero relative isolate overflow-hidden border-b border-white/10 py-12 md:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_8%,rgba(35,184,255,0.16),transparent_32%),radial-gradient(circle_at_82%_14%,rgba(255,154,31,0.15),transparent_30%),linear-gradient(135deg,#030711_0%,#070c18_52%,#101008_100%)]" />
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.76fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-cyan-100">
                <DatabaseZap className="h-4 w-4" />
                Phase 3 machine
              </div>
              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.94] tracking-normal text-white md:text-7xl">
                Build useful tools.
                <span className="mt-3 block bg-gradient-to-r from-cyan-200 via-white to-accent-200 bg-clip-text text-transparent">
                  Turn answers into reviewed buyer signals.
                </span>
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100 md:text-xl">
                The LeadFlow machine solves a problem first, captures permitted signal, scores intent, checks suppression, attaches source proof, and routes the next action through a review gate.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <MachineCta href="/problem-intake" eventName="phase3_machine_problem_intake_click" label="Start problem intake" primary />
                <MachineCta href="/marketplace" eventName="phase3_machine_marketplace_click" label="Open marketplace" />
                <MachineCta href="/submit-source" eventName="phase3_machine_submit_source_click" label="Submit source" />
              </div>
            </div>

            <div className="lead-shell p-5">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Operating spine</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Solve, score, review, route.</h2>
                </div>
                <ShieldCheck className="h-7 w-7 text-lead-400" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {machineMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-3xl font-black text-white">{metric.value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{metric.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-lead-400/25 bg-lead-400/10 p-4 text-sm leading-6 text-ink-100">
                <strong className="block text-lead-300">Review gate first.</strong>
                No buyer receives a raw private dump. The machine sells trusted intent, proof, and permitted routes.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-ink-950/80 py-10 md:py-14">
        <div className="container">
          <div className="grid gap-4 lg:grid-cols-3">
            {machinePaths.map((path) => (
              <Link
                key={path.title}
                href={path.href}
                className="group lead-panel flex min-h-64 flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.055]"
                data-conversion-event={path.eventName}
                data-conversion-cta={path.cta}
                data-conversion-source-page="/machine"
                data-conversion-destination={path.href}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={toneClass(path.tone)}>
                    <path.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-ink-500 transition group-hover:translate-x-1 group-hover:text-accent-300" />
                </div>
                <h2 className="mt-5 text-2xl font-black text-white">{path.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink-200">{path.body}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-extrabold uppercase tracking-wide text-accent-300">
                  {path.cta}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container">
          <SectionHeader
            eyebrow="Problem-solving intake stack"
            title="Each tool gives value immediately and creates a safe signal."
            body="The tools ask practical adult questions, produce a score or map, then decide whether the result belongs in one seller routing, named seller routing, or anonymous aggregate insight."
          />
          <div className="mt-8 grid gap-3 lg:grid-cols-2">
            {intakeTools.map((tool, index) => (
              <article key={tool.title} className="lead-shell p-5">
                <div className="grid gap-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-start">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                    <span className="text-sm font-black">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-accent-300">{tool.vertical}</p>
                    <h3 className="mt-1 text-xl font-black text-white">{tool.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-200">{tool.purpose}</p>
                  </div>
                  <Link
                    href={tool.route}
                    className="btn-ghost justify-center px-3 py-2 text-xs sm:min-w-28"
                    data-conversion-event="homepage_tool_entry_click"
                    data-conversion-cta={tool.title}
                    data-conversion-source-page="/machine"
                    data-conversion-destination={tool.route}
                  >
                    Open
                  </Link>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoBlock label="Data collected" value={tool.collected} />
                  <InfoBlock label="Output" value={tool.output} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-ink-900/45 py-14 md:py-20">
        <div className="container">
          <SectionHeader
            eyebrow="Routing logic"
            title="The buyer route follows what the person expected."
            body="No highest-bidder-only routing. The release path is based on consent scope, named seller selection, entitlement, suppression state, and whether the product is personal or aggregated."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {routingModes.map((mode) => (
              <article key={mode.mode} className="lead-shell p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-lead-400/25 bg-lead-400/10 text-lead-300">
                    <mode.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.66rem] font-black uppercase tracking-wider text-ink-300">
                    {mode.mode}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-black text-white">{mode.title}</h3>
                <div className="mt-5 space-y-3">
                  <InfoBlock label="Expectation" value={mode.consumerExpectation} />
                  <InfoBlock label="Buyer access" value={mode.buyerAccess} />
                  <InfoBlock label="Release gate" value={mode.releaseGate} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container">
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Review and compliance gates</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">The machine is only valuable if the data can be trusted.</h2>
              <p className="mt-5 text-base leading-7 text-ink-200 md:text-lg">
                Phase 3 keeps privacy controls in the product surface instead of hiding them in policy pages. Every score, route, export, deletion, and suppression state should be auditable.
              </p>
              <div className="mt-6 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5">
                <div className="flex items-center gap-3 text-cyan-100">
                  <LockKeyhole className="h-5 w-5" />
                  <strong>Safe default</strong>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-100">
                  Credentials or database service access missing means architecture, UI, schema contract, and TODOs only. No hidden production writes.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {reviewGates.map((gate) => (
                <article key={gate.title} className="lead-panel min-h-44 p-5">
                  <gate.icon className="h-6 w-6 text-lead-400" />
                  <h3 className="mt-4 text-xl font-black text-white">{gate.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-200">{gate.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-ink-900/45 py-14 md:py-20">
        <div className="container">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr] xl:items-start">
            <div className="lead-shell p-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <FileSearch className="h-6 w-6 text-accent-300" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Audit trail</p>
                  <h2 className="text-2xl font-black text-white">Every major action gets an event.</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {auditEvents.map((event) => (
                  <div key={event} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold text-ink-100">
                    {event}
                  </div>
                ))}
              </div>
            </div>
            <div className="lead-shell p-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Sparkles className="h-6 w-6 text-lead-300" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Build plan</p>
                  <h2 className="text-2xl font-black text-white">MVP to Phase 3 without losing control.</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {phase3Milestones.map((milestone) => (
                  <div key={milestone.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-accent-300">{milestone.label}</p>
                    <h3 className="mt-1 text-lg font-black text-white">{milestone.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-200">{milestone.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container">
          <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(35,184,255,0.12),rgba(255,154,31,0.12))] p-6 md:p-10">
            <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr] xl:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">Non-negotiables</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">The machine sells trusted intent, not hidden identity dossiers.</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {machineRules.map((rule) => (
                  <div key={rule} className="lead-panel flex min-h-24 gap-3 p-4 text-sm leading-6 text-ink-100">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-lead-400" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MachineCta href="/marketplace" eventName="phase3_machine_final_marketplace_click" label="Open marketplace" primary />
              <MachineCta href="/privacy-center" eventName="phase3_machine_privacy_center_click" label="Privacy center" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MachineCta({
  href,
  eventName,
  label,
  primary = false
}: {
  href: string;
  eventName: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${primary ? "btn-accent" : "btn-ghost"} text-base`}
      data-conversion-event={eventName}
      data-conversion-cta={label}
      data-conversion-source-page="/machine"
      data-conversion-destination={href}
    >
      {label}
      {primary ? <ArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">{body}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/55 p-3">
      <p className="text-[0.66rem] font-black uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}

function toneClass(tone: "lead" | "cyan" | "accent") {
  if (tone === "lead") return "flex h-12 w-12 items-center justify-center rounded-lg border border-lead-400/25 bg-lead-400/10 text-lead-300";
  if (tone === "accent") return "flex h-12 w-12 items-center justify-center rounded-lg border border-accent-300/25 bg-accent-300/10 text-accent-300";
  return "flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200";
}
