import Link from "next/link";
import { PhoneCall, MessageSquare, Wallet, Inbox, Bot, Workflow, Sparkles, QrCode, BookOpen } from "lucide-react";
import { FunnelMark } from "./Logo";
import { HeroTicker } from "./HeroTicker";

const QUICK_TOOLS = [
  { icon: BookOpen,  label: "Playbooks",  href: "/dashboard/playbooks" },
  { icon: Inbox,     label: "Leads",      href: "/dashboard/leads" },
  { icon: Bot,       label: "Chatbot",    href: "/dashboard/chatbot" },
  { icon: Workflow,  label: "Automations",href: "/dashboard/automations" },
  { icon: Sparkles,  label: "Insights",   href: "/dashboard/insights" },
  { icon: QrCode,    label: "FlowCard",   href: "/dashboard/card" }
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* cosmic glow background, mirrors promo cards */}
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      <div className="container pt-6 pb-10 md:pt-10 md:pb-20 text-center">
        <div className="flex justify-center mb-3 md:mb-4 animate-fade-up">
          <HeroTicker />
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight animate-fade-up">
          THE <span className="funnel-text">LEADFLOW</span> PRO
        </h1>

        <div className="mt-3 md:mt-4 spectrum-line animate-fade-up" />

        {/* Top-of-page CTAs — interact immediately, no scroll required */}
        <div className="mt-4 md:mt-5 flex flex-wrap justify-center gap-2 md:gap-3 animate-fade-up">
          <Link href="/signup" className="btn-accent text-sm py-2.5 px-4">
            Start free — no card needed
          </Link>
          <Link href="#features" className="btn-ghost text-sm py-2.5 px-4">
            See every tool
          </Link>
        </div>

        {/* Tap straight into a tool */}
        <div className="mt-4 md:mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-2xl mx-auto animate-fade-up">
          {QUICK_TOOLS.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="glass rounded-xl p-2.5 flex flex-col items-center gap-1 hover:border-cyan-500/40 active:scale-95 transition"
            >
              <t.icon className="h-4 w-4 text-cyan-400" />
              <span className="text-[11px] font-semibold text-ink-100">{t.label}</span>
            </Link>
          ))}
        </div>

        <p className="mt-5 md:mt-6 text-lg md:text-2xl text-ink-100 max-w-2xl mx-auto animate-fade-up">
          If your business gets calls, texts, or online leads,{" "}
          <span className="text-white font-semibold">this is for you.</span>
        </p>
        <p className="mt-2 md:mt-3 text-sm md:text-lg text-ink-300 max-w-2xl mx-auto animate-fade-up">
          Most businesses are losing money without realizing it.
        </p>

        {/* three pillars: matches promo card icon row */}
        <div className="mt-6 md:mt-8 grid grid-cols-3 gap-3 md:gap-12 max-w-2xl mx-auto animate-fade-up">
          <Pillar icon={<PhoneCall className="h-6 w-6 md:h-10 md:w-10" />} label="No Missed Calls" />
          <Pillar icon={<MessageSquare className="h-6 w-6 md:h-10 md:w-10" />} label="No Missed Texts" />
          <Pillar icon={<Wallet className="h-6 w-6 md:h-10 md:w-10" />} label="No Missed Revenue" />
        </div>

        <p className="mt-6 md:mt-8 text-sm md:text-lg text-white font-semibold tracking-wide animate-fade-up">
          TURN ATTENTION INTO CONVERSATIONS, AUTOMATE FOLLOW-UP, CLOSE MORE SALES
        </p>
        <p className="mt-3 md:mt-4 text-sm md:text-lg text-cyan-300 font-semibold animate-fade-up">
          We show you the data and the next moves to make.
        </p>
        <p className="mt-2 md:mt-3 text-sm md:text-base text-ink-300 max-w-2xl mx-auto animate-fade-up">
          We don't promise you leads. We don't make the calls for you. We hand you the
          tools, the data, and the play — you go run it.
        </p>

        <div className="mt-5 md:mt-8 flex flex-wrap justify-center gap-3 animate-fade-up">
          <Link href="/signup" className="btn-accent text-base">
            Start free — no card needed
          </Link>
          <Link href="#how" className="btn-ghost text-base">
            See how it works
          </Link>
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
    <div className="flex flex-col items-center gap-3">
      <div className="text-cyan-400 drop-shadow-[0_0_12px_rgba(92,208,255,0.55)]">
        {icon}
      </div>
      <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-ink-100">
        {label}
      </p>
    </div>
  );
}
