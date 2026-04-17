import {
  Inbox, Sparkles, Target, Megaphone, BarChart3, Users, Bot, Workflow,
  PhoneForwarded, BookOpen, Video, Heart
} from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Lead-Getting Playbooks",
    body: "Step-by-step plays for getting new leads in your industry. We don't promise leads — we hand you the exact map to go find them."
  },
  {
    icon: Heart,
    title: "Know-Like-Trust Builder",
    body: "Scripts and sequences that move strangers to fans. Build the relationship before you ever pitch."
  },
  {
    icon: Video,
    title: "Video + GIF Response Library",
    body: "Send the right video at the right moment. GIFs that get replies. A library of responses proven to make people answer back."
  },
  {
    icon: Inbox,
    title: "Lead Inbox",
    body: "Every call, text, form fill, and DM in one place. Stop losing leads to scattered notifications."
  },
  {
    icon: Bot,
    title: "AI Chatbot Responder",
    body: "Claude-powered chatbot answers questions, qualifies leads, and books appointments 24/7 — using your voice, your scripts, your videos."
  },
  {
    icon: Workflow,
    title: "Automated Nurture Sequences",
    body: "Drip SMS + email that you design. We give you the templates; you put your face, your voice, your story behind them."
  },
  {
    icon: PhoneForwarded,
    title: "Missed-Call Text-Back",
    body: "Phone rang while you were busy? An instant text goes out. Lead never feels ignored. Conversation stays alive."
  },
  {
    icon: Sparkles,
    title: "AI Strengths & Weaknesses",
    body: "Plug in your social accounts. Claude analyzes what's working, what's not, and what to fix this week."
  },
  {
    icon: Target,
    title: "Real Target Audience",
    body: "Not who you think buys from you — who actually does. Cross-platform audience analysis in one report."
  },
  {
    icon: Megaphone,
    title: "Ad Copy Generator",
    body: "Hooks, headlines, and full ad scripts. Built from your data, not generic templates."
  },
  {
    icon: BarChart3,
    title: "Ad Performance Intelligence",
    body: "Import Meta, Google, TikTok ad data. See cost-per-lead, what creative hits, what to kill."
  },
  {
    icon: Users,
    title: "Follower & Engagement Tracking",
    body: "All five major platforms. Daily growth, top posts, when your audience is online."
  }
];

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
            One dashboard. Every tool you need to grow.
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            All your data — and the <span className="funnel-text">next move</span> beside it
          </h2>
          <p className="mt-5 text-ink-200 text-lg">
            You shouldn't have to log into 8 apps to know what's working. LeadFlow Pro
            is the melting pot — leads, ads, social, and AI sitting side by side, with
            a clear "next move" recommendation on every screen. You decide. You execute.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 hover:border-cyan-500/30 transition group"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-200 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
