import Link from "next/link";
import { PhoneCall, MessageSquare, Wallet } from "lucide-react";
import { FunnelMark } from "./Logo";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* cosmic glow background, mirrors promo cards */}
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      <div className="container pt-20 pb-24 md:pt-28 md:pb-32 text-center">
        <div className="flex justify-center mb-6 animate-fade-up">
          <span className="stat-pill bg-white/5 border border-white/10 text-ink-100">
            <span className="h-2 w-2 rounded-full bg-lead-500" />
            Welcome to
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight animate-fade-up">
          THE <span className="funnel-text">LEADFLOW</span> PRO
        </h1>

        <div className="mt-6 spectrum-line animate-fade-up" />

        <p className="mt-8 text-xl md:text-2xl text-ink-100 max-w-2xl mx-auto animate-fade-up">
          If your business gets calls, texts, or online leads,{" "}
          <span className="text-white font-semibold">this is for you.</span>
        </p>
        <p className="mt-3 text-base md:text-lg text-ink-300 max-w-2xl mx-auto animate-fade-up">
          Most businesses are losing money without realizing it.
        </p>

        {/* three pillars: matches promo card icon row */}
        <div className="mt-12 grid grid-cols-3 gap-4 md:gap-12 max-w-2xl mx-auto animate-fade-up">
          <Pillar icon={<PhoneCall className="h-8 w-8 md:h-10 md:w-10" />} label="No Missed Calls" />
          <Pillar icon={<MessageSquare className="h-8 w-8 md:h-10 md:w-10" />} label="No Missed Texts" />
          <Pillar icon={<Wallet className="h-8 w-8 md:h-10 md:w-10" />} label="No Missed Revenue" />
        </div>

        <p className="mt-12 text-base md:text-lg text-white font-semibold tracking-wide animate-fade-up">
          TURN ATTENTION INTO CONVERSATIONS, AUTOMATE FOLLOW-UP, CLOSE MORE SALES
        </p>
        <p className="mt-4 text-base md:text-lg text-cyan-300 font-semibold animate-fade-up">
          We show you the data and the next moves to make.
        </p>
        <p className="mt-3 text-sm md:text-base text-ink-300 max-w-2xl mx-auto animate-fade-up">
          We don't promise you leads. We don't make the calls for you. We hand you the
          tools, the data, and the play — you go run it.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-up">
          <Link href="/signup" className="btn-accent text-base">
            Start free — no card needed
          </Link>
          <Link href="#how" className="btn-ghost text-base">
            See how it works
          </Link>
        </div>

        {/* floating funnel mark */}
        <div className="mt-16 flex justify-center opacity-90 animate-fade-up">
          <FunnelMark className="h-24 w-24 drop-shadow-[0_0_30px_rgba(35,184,255,0.45)]" />
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
