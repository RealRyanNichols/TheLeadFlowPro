import Link from "next/link";
import {
  BookOpen, Inbox, Bot, Workflow, Sparkles, IdCard, ArrowRight
} from "lucide-react";

export const metadata = {
  title: "Preview every tool — The LeadFlow Pro",
  description:
    "See exactly what LeadFlow Pro looks like in action. Real UI, demo data, no signup."
};

const TOOLS = [
  {
    slug: "playbooks",
    icon: BookOpen,
    title: "Playbooks",
    summary: "Step-by-step plays for common situations — fill a slow week, recover no-shows, double review count. Each move branches the next based on what actually happened.",
    tease: "6 ready-to-run playbooks"
  },
  {
    slug: "leads",
    icon: Inbox,
    title: "Lead Inbox",
    summary: "Every call, text, form, and DM in one place. Status, source, hot-lead timer, and the next suggested move for each — no more flipping between 5 apps.",
    tease: "Filter by status + source"
  },
  {
    slug: "chatbot",
    icon: Bot,
    title: "AI Chatbot",
    summary: "Answers FAQs and qualifies leads 24/7 in your voice. Trained on your scripts, your hours, your pricing. Hands off to you when someone's ready to book.",
    tease: "Website + SMS + DMs"
  },
  {
    slug: "automations",
    icon: Workflow,
    title: "Automations",
    summary: "Missed-call text-back, new-lead nurture, cold-lead re-engage. Set them once, they run forever. Live stats on how many leads each one is recovering.",
    tease: "Pre-built + fully editable"
  },
  {
    slug: "insights",
    icon: Sparkles,
    title: "AI Insights",
    summary: "Claude analyzes your leads, ads, and social engagement weekly — then hands you a ranked list of exactly what to do next. No charts to read. Just moves to make.",
    tease: "Ranked by revenue impact"
  },
  {
    slug: "card",
    icon: IdCard,
    title: "FlowCard",
    summary: "A one-link page that puts every way to reach you on one screen — social, phone, website, booking. QR code included. Instagram-bio friendly.",
    tease: "Public page + analytics"
  }
];

export default function PreviewIndexPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
          Interactive preview
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-white">
          Click any tool. <span className="funnel-text">Poke around.</span>
        </h1>
        <p className="mt-3 text-sm sm:text-lg text-ink-200 max-w-2xl mx-auto">
          This isn't a video or a screenshot. These are the real pages —
          the same code you'll use — filled with demo data. No signup required.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Link
            key={t.slug}
            href={`/preview/${t.slug}`}
            className="glass rounded-2xl p-5 sm:p-6 hover:border-cyan-500/40 active:scale-[0.99] transition group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <t.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{t.title}</h2>
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-semibold bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">
                    {t.tease}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink-300">{t.summary}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                  Preview it <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
