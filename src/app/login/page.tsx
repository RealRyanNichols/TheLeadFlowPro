import Link from "next/link";
import { ArrowRight, Mail, Lock, Chrome } from "lucide-react";
import { Logo, FunnelMark } from "@/components/site/Logo";

export const metadata = {
  title: "Log in — The LeadFlow Pro",
  description: "Welcome back. Pick up where your leads left off."
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
        <div className="container h-16 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-ink-300 hover:text-white">
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex-1 grid md:grid-cols-2">
        {/* LEFT — form */}
        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-ink-300">
              Your leads missed you. Let's get back to closing them.
            </p>

            <form className="mt-8 space-y-3" action="/dashboard">
              <label className="block">
                <span className="text-xs text-ink-300 font-semibold">Email</span>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@business.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs text-ink-300 font-semibold">Password</span>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </label>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-ink-300">
                  <input type="checkbox" className="accent-cyan-500" defaultChecked />
                  Remember me
                </label>
                <Link href="/login/forgot" className="text-cyan-400 hover:underline">
                  Forgot?
                </Link>
              </div>

              <button type="submit" className="btn-accent w-full text-sm py-2.5">
                Log in <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[11px] text-ink-400">
              <div className="flex-1 h-px bg-white/10" />
              OR
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="space-y-2">
              <Link href="/dashboard" className="btn-ghost w-full text-sm py-2.5 justify-center">
                <Chrome className="h-4 w-4" /> Continue with Google
              </Link>
            </div>

            <p className="mt-6 text-sm text-ink-300 text-center">
              New here?{" "}
              <Link href="/dashboard" className="text-cyan-400 font-semibold hover:underline">
                Start free — no card needed
              </Link>
            </p>
          </div>
        </section>

        {/* RIGHT — brand panel */}
        <aside className="hidden md:flex relative overflow-hidden items-center justify-center border-l border-white/5">
          <div className="absolute inset-0 bg-promo-glow" />
          <div className="absolute inset-0 bg-grid-fade" />
          <div className="relative text-center px-10">
            <FunnelMark className="h-20 w-20 mx-auto drop-shadow-[0_0_40px_rgba(35,184,255,0.55)]" />
            <p className="mt-6 text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              The LeadFlow Pro
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white leading-tight">
              Every lead. Every move. <span className="funnel-text">One screen.</span>
            </h2>
            <p className="mt-4 text-sm text-ink-200 max-w-sm">
              Playbooks, AI insights, a chatbot that answers at 2am, and a lead
              inbox that never loses a call. Welcome home.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
