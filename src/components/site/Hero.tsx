import Link from "next/link";
import { PhoneCall, MessageSquare, Wallet, Inbox, Bot, Workflow, Sparkles, QrCode, BookOpen, ArrowRight, AlertTriangle } from "lucide-react";
import { FunnelMark } from "./Logo";
import { HeroTicker } from "./HeroTicker";

const QUICK_TOOLS = [
  { icon: BookOpen,  label: "Playbooks",   href: "/dashboard/playbooks" },
  { icon: Inbox,     label: "Leads",       href: "/dashboard/leads" },
  { icon: Bot,       label: "Chatbot",     href: "/dashboard/chatbot" },
  { icon: Workflow,  label: "Automations", href: "/dashboard/automations" },
  { icon: Sparkles,  label: "Insights",    href: "/dashboard/insights" },
  { icon: QrCode,    label: "FlowCard",    href: "/dashboard/card" }
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* cosmic glow background, mirrors promo cards */}
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      <div className="container pt-2 pb-10 md:pt-4 md:pb-20 text-center">
        <div className="flex justify-center mb-3 md:mb-4 animate-fade-up">
          <HeroTicker />
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight animate-fade-up">
          THE <span className="funnel-text">LEADFLOW</span> PRO
        </h1>

        <div className="mt-3 md:mt-4 spectrum-line animate-fade-up" />

        {/* Top CTAs — interact immediately, no scroll required */}
        <div className="mt-4 md:mt-5 flex flex-wrap justify-center gap-2 md:gap-3 animate-fade-up">
          <Link href="/signup" className="btn-accent text-sm py-2.5 px-4">
            Start free — no card needed
          </Link>
          <Link href="#features" className="btn-ghost text-sm py-2.5 px-4">
            See every tool
          </Link>
        </div>

        {/* Quick-jump tiles — bordered + glowing so mobile reads them as tappable */}
        <div className="mt-4 md:mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-2xl mx-auto animate-fade-up">
          {QUICK_TOOLS.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="rounded-xl border border-cyan-400/30 bg-white/[0.04] p-3 flex flex-col items-center gap-1.5 hover:border-cyan-300 hover:bg-white/[0.08] hover:shadow-[0_0_18px_rgba(34,211,238,0.25)] active:scale-95 transition"
            >
              <t.icon className="h-5 w-5 text-cyan-300" />
              <span className="text-[12px] md:text-[11px] font-semibold text-ink-100">{t.label}</span>
            </Link>
          ))}
        </div>

        {/* Mid-scroll: visual hierarchy + color variance + urgency */}
        <p className="mt-6 md:mt-8 text-lg md:text-2xl text-ink-100 max-w-2xl mx-auto animate-fade-up leading-relaxed">
          If your business gets{" "}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-400/15 text-cyan-200 font-semibold">calls</span>,{" "}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-400/15 text-orange-200 font-semibold">texts</span>, or{" "}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-300/15 text-amber-200 font-semibold">online leads</span>
          {" "}—
          <br className="hidden md:block" />
          <span className="text-white font-bold text-xl md:text-3xl">this is for you.</span>
        </p>

        <p className="mt-3 md:mt-4 text-base md:text-lg text-ink-200 max-w-2xl mx-auto animate-fade-up">
          Most small businesses are{" "}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" /> bleeding $2k–$15k a month
          </span>
          {" "}in missed leads — without realizing it.
        </p>

        {/* three pillars: matches promo card icon row, with border so they read as cards */}
        <div className="mt-6 md:mt-8 grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto animate-fade-up">
          <Pillar icon={<PhoneCall className="h-6 w-6 md:h-10 md:w-10" />} label="No Missed Calls" />
          <Pillar icon={<MessageSquare className="h-6 w-6 md:h-10 md:w-10" />} label="No Missed Texts" />
          <Pillar icon={<Wallet className="h-6 w-6 md:h-10 md:w-10" />} label="No Missed Revenue" />
        </div>

        {/* Mid-scroll CTA — stops the drop-off */}
        <div className="mt-7 md:mt-10 flex flex-col items-center gap-2 animate-fade-up">
          <Link
            href="/tools/seo-grader"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-bold text-base md:text-lg text-slate-900 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 shadow-[0_0_28px_rgba(251,146,60,0.45)] hover:shadow-[0_0_36px_rgba(251,146,60,0.7)] hover:scale-[1.02] active:scale-95 transition"
          >
            See what you're leaving on the table
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <span className="text-xs text-ink-300">Free SEO + lead audit · no signup · honest score in 10 seconds</span>
        </div>

        {/* Tri-color word-art — each outcome gets its own brand color */}
        <p className="mt-8 md:mt-12 text-base md:text-xl font-extrabold tracking-wide animate-fade-up">
          TURN <span className="text-cyan-300">ATTENTION</span>{" "}
          INTO <span className="text-amber-300">CONVERSATIONS</span>,
          <br className="hidden sm:block" />
          AUTOMATE <span className="text-emerald-300">FOLLOW-UP</span>,
          CLOSE MORE <span className="funnel-text">SALES</span>
        </p>

        {/* Concrete example — the claim lands because it's specific */}
        <div className="mt-4 md:mt-5 max-w-xl mx-auto animate-fade-up">
          <p className="text-sm md:text-lg text-cyan-200 font-semibold">
            We show you the data <span className="text-white">— and the next move.</span>
          </p>
          <p className="mt-2 inline-block rounded-lg bg-slate-900/60 border border-cyan-400/20 px-3 py-2 font-mono text-xs md:text-sm text-ink-100">
            Like: <span className="text-amber-200">“Call Jane back before 2pm — she's a $480 lead.”</span>
          </p>
        </div>

        <p className="mt-5 md:mt-6 text-sm md:text-base text-ink-300 max-w-2xl mx-auto animate-fade-up">
          We don't promise you leads. We don't make the calls for you.
          {" "}
          <span className="text-white font-semibold">We hand you the tools, the data, and the play</span>
          {" "}— you go run it.
        </p>

        <div className="mt-5 md:mt-8 flex flex-col items-center gap-2 animate-fade-up">
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-accent text-base">
              Start free — no card needed
            </Link>
            <Link href="#how" className="btn-ghost text-base">
              See how it works
            </Link>
          </div>
          <span className="text-xs text-ink-300">100% free to start · no card, no gimmick · cancel anytime</span>
        </div>

        {/* floating funnel mark */}
        <div className="mt-6 md:mt-10 flex justify-center opacity-90 animate-fade-up">
          <FunnelMark className="h-14 w-14 md:h-24 md:w-24 drop-shadow-[0_0_30px_rgba(35,184,255,0.45)]" />
        </div>
      </div>
    </section>
  );
}

function Pillar({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-400/20 bg-white/[0.03] px-3 py-4 md:py-6 hover:border-cyan-300/50 transition">
      <div className="text-cyan-300 drop-shadow-[0_0_12px_rgba(92,208,255,0.55)]">
        {icon}
      </div>
      <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-ink-100">
        {label}
      </p>
    </div>
  );
}
