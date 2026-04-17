import Link from "next/link";
import {
  Inbox, Sparkles, Target, Megaphone, BarChart3, Users, Bot, Workflow,
  PhoneForwarded, BookOpen, Video, Heart, ArrowRight
} from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Lead-Getting Playbooks",
    body: "Step-by-step plays that branch based on what you actually do. Pick a move, confirm it, watch the next options rewrite themselves around your new reality.",
    href: "/dashboard/playbooks"
  },
  {
    icon: Heart,
    title: "Know-Like-Trust Builder",
    body: "Scripts and sequences that move strangers to fans. Build the relationship before you ever pitch.",
    href: "/dashboard/automations"
  },
  {
    icon: Video,
    title: "Video + GIF Response Library",
    body: "Send the right video at the right moment. GIFs that get replies. A library of responses proven to make people answer back.",
    href: "/dashboard/media"
  },
  {
    icon: Inbox,
    title: "Lead Inbox",
    body: "Every call, text, form fill, and DM in one place. Stop losing leads to scattered notifications.",
    href: "/dashboard/leads"
  },
  {
    icon: Bot,
    title: "AI Chatbot Responder",
    body: "Claude-powered chatbot answers questions, qualifies leads, and books appointments 24/7 — using your voice, your scripts, your videos.",
    href: "/dashboard/chatbot"
  },
  {
    icon: Workflow,
    title: "Automated Nurture Sequences",
    body: "Drip SMS + email that you design. We give you the templates; you put your face, your voice, your story behind them.",
    href: "/dashboard/automations"
  },
  {
    icon: PhoneForwarded,
    title: "Missed-Call Text-Back",
    body: "Phone rang while you were busy? An instant text goes out. Lead never feels ignored. Conversation stays alive.",
    href: "/dashboard/leads/missed-call"
  },
  {
    icon: Sparkles,
    title: "AI Strengths & Weaknesses",
    body: "Plug in your social accounts. Claude analyzes what's working, what's not, and what to fix this week.",
    href: "/dashboard/insights"
  },
  {
    icon: Target,
    title: "Real Target Audience",
    body: "Not who you think buys from you — who actually does. Cross-platform audience analysis in one report.",
    href: "/dashboard/audience"
  },
  {
    icon: Megaphone,
    title: "Ad Copy Generator",
    body: "Hooks, headlines, and full ad scripts. Built from your data, not generic templates.",
    href: "/dashboard/ad-copy"
  },
  {
    icon: BarChart3,
    title: "Ad Performance Intelligence",
    body: "Import Meta, Google, TikTok ad data. See cost-per-lead, what creative hits, what to kill.",
    href: "/dashboard/insights"
  },
  {
    icon: Users,
    title: "Follower & Engagement Tracking",
    body: "All five major platforms. Daily growth, top posts, when your audience is online.",
    href: "/dashboard/social"
  }
];

export function Features() {
  return (
    <section id="features" className="py-12 md:py-24">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-cyan-400 text-xs md:text-sm font-semibold uppercase tracking-wider mb-2 md:mb-3">
            One dashboard. Every tool you need to grow.
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold">
            All your data — and the <span className="funnel-text">next move</span> beside it
          </h2>
          <p className="mt-3 md:mt-5 text-ink-200 text-base md:text-lg">
            You shouldn't have to log into 8 apps to know what's working. LeadFlow Pro
            is the melting pot — leads, ads, social, and AI sitting side by side, with
            a clear "next move" recommendation on every screen.
          </p>
        </div>

        <div className="mt-8 md:mt-16 grid gap-3 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="glass rounded-2xl p-4 md:p-6 hover:border-cyan-500/40 transition group block active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 md:block">
                <div className="inline-flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition shrink-0">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-white md:mt-4">
                  {f.title}
                </h3>
              </div>
              <p className="mt-2 md:mt-2 text-sm text-ink-200 leading-relaxed">{f.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:gap-2 transition-all">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
