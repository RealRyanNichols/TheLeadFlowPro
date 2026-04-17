import Link from "next/link";
import { ArrowRight, Eye, Sparkles } from "lucide-react";
import { Logo } from "@/components/site/Logo";

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-ink-950">
      {/* Top: preview banner + nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="container h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Logo />
            <span className="hidden sm:inline-flex stat-pill bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Eye className="h-3 w-3" /> Preview mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-ink-300 hover:text-white hidden sm:inline">
              Back to site
            </Link>
            <Link href="/signup" className="btn-accent text-xs py-2 px-3">
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Secondary tease bar */}
        <div className="border-t border-white/5 bg-accent-500/5">
          <div className="container h-9 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-ink-200">
            <Sparkles className="h-3 w-3 text-accent-400 shrink-0" />
            <span className="text-center">
              You're looking at <span className="text-white font-semibold">live demo data</span>.
              Sign up free and this page fills with <span className="text-white font-semibold">your own</span>.
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <main className="p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {children}

          {/* Bottom CTA, shared across every preview */}
          <div className="max-w-4xl mx-auto mt-12 glass-strong rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-promo-glow opacity-40 -z-10" />
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Like what you see? <span className="funnel-text">Start free.</span>
            </h3>
            <p className="mt-2 text-sm text-ink-200 max-w-xl mx-auto">
              No card, no trial timer. Plug in your phone number and your social
              accounts, and this whole dashboard fills with your real leads.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn-accent text-sm py-2.5 px-5">
                Create my free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/tools/seo-grader" className="btn-ghost text-sm py-2.5 px-5">
                Try the free SEO grader
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
