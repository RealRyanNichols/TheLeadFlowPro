import Link from "next/link";
import { ArrowRight, CheckCircle2, DatabaseZap, MousePointerClick, Route, Workflow } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata = {
  title: "Build My Lead Machine | The LeadFlow Pro",
  description: "Build the website, AI agent, forms, automations, dashboards, follow-up, ads, and routing your business needs to catch leads."
};

const systems = [
  {
    title: "Website Money Leak Checker",
    purpose: "Find where your page loses buyers.",
    data: "URL, CTA, conversion path, problem areas"
  },
  {
    title: "Business Signal Score",
    purpose: "Score the lead machine you already have.",
    data: "Website, ads, CRM, missed calls, speed"
  },
  {
    title: "AI Automation Readiness Score",
    purpose: "Find the work an AI agent should handle first.",
    data: "Business type, tasks, volume, budget"
  },
  {
    title: "Lead Leak Audit",
    purpose: "See where inquiries are leaking.",
    data: "Industry, follow-up, budget, pain"
  }
];

const buildSteps = [
  "Capture the attention you already paid for.",
  "Route every form, call, comment, DM, and quiz answer into one review path.",
  "Score the signal before the follow-up window closes.",
  "Give the owner a dashboard that shows the next conversation."
];

export default function BuildMySystemPage() {
  return (
    <>
      <Header />
      <main className="pb-24">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_8%,rgba(255,154,31,0.18),transparent_32%),linear-gradient(135deg,#030711,#080c17_56%,#0f1210)] py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.86fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Build my lead machine</p>
                <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.96] text-white md:text-7xl">
                  Catch the attention you already have.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-100">
                  Your phone rings. Your form gets filled out. Somebody comments. Somebody sends a DM. Then nobody follows up fast enough. That is what we fix.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/problem-intake" className="btn-accent text-base">
                    Start the Build Intake
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/machine"
                    className="btn-ghost text-base"
                    data-conversion-event="build_system_machine_click"
                    data-conversion-cta="View the Machine"
                    data-conversion-source-page="/build-my-system"
                    data-conversion-destination="/machine"
                  >
                    View the Machine
                  </Link>
                  <Link href="/contact" className="btn-ghost text-base">
                    Talk Through My System
                  </Link>
                </div>
              </div>

              <div className="lead-shell p-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-400/10 text-accent-300">
                    <DatabaseZap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Machine parts</p>
                    <h2 className="text-2xl font-black text-white">Forms, AI, ads, routing, dashboard.</h2>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {buildSteps.map((step) => (
                    <div key={step} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-lead-400" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Problem-solving tools</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Use tools that diagnose the leak and collect the signal.</h2>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-4">
              {systems.map((system) => (
                <article key={system.title} className="lead-panel flex min-h-72 flex-col p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-white">{system.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-200">{system.purpose}</p>
                  <div className="mt-auto rounded-lg border border-white/10 bg-ink-950/55 p-3 text-xs leading-5 text-ink-300">
                    <span className="block font-bold uppercase tracking-wider text-ink-500">Data collected</span>
                    {system.data}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Workflow, title: "Intake", body: "Forms and quizzes that ask the questions buyers already care about." },
                { icon: Route, title: "Routing", body: "Follow-up paths for one seller, selected sellers, or anonymous insights." },
                { icon: DatabaseZap, title: "Console", body: "A review desk for scores, source proof, status, and next action." }
              ].map((item) => (
                <div key={item.title} className="lead-shell p-5">
                  <item.icon className="h-6 w-6 text-accent-300" />
                  <h3 className="mt-4 text-2xl font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-200">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
