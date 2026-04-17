import Link from "next/link";
import { PhoneIncoming, Bot, MessageSquare, Calendar, DollarSign, ArrowRight } from "lucide-react";

const STAGES = [
  {
    icon: PhoneIncoming,
    title: "You attract a lead",
    body: "Use our playbooks to know where to fish. Call, text, form, DM, ad click — it lands in your inbox.",
    tint: "from-cyan-400 to-brand-500",
    href: "/dashboard/leads"
  },
  {
    icon: Bot,
    title: "AI chatbot answers fast",
    body: "Trained on your scripts. Answers FAQs, qualifies, books — in your voice, instantly.",
    tint: "from-cyan-500 to-brand-600",
    href: "/dashboard/chatbot"
  },
  {
    icon: MessageSquare,
    title: "Nurture sequence runs",
    body: "Your videos, your GIFs, your story — sent at the right moment to build know-like-trust.",
    tint: "from-brand-500 to-accent-500",
    href: "/dashboard/automations"
  },
  {
    icon: Calendar,
    title: "They ask for the meeting",
    body: "By the time you talk, they already trust you. Hot leads book; cold leads keep nurturing.",
    tint: "from-accent-500 to-accent-400",
    href: "/dashboard/leads"
  },
  {
    icon: DollarSign,
    title: "Relationship turns into revenue",
    body: "And it's tracked back to the original source so you double down on what works.",
    tint: "from-accent-400 to-lead-400",
    href: "/dashboard/insights"
  }
];

export function AutomationFlow() {
  return (
    <section id="automations" className="py-12 md:py-24 border-y border-white/5 bg-ink-900/40">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-6 md:mb-16">
          <p className="text-cyan-400 text-xs md:text-sm font-semibold uppercase tracking-wider mb-2 md:mb-3">
            Your Lead-to-Sale Toolkit
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold">
            You drive the sale.{" "}
            <span className="funnel-text">We hand you the tools.</span>
          </h2>
          <p className="mt-3 md:mt-5 text-ink-200 text-base md:text-lg">
            LeadFlow Pro doesn't close deals for you — you do. We give you the AI
            chatbot, the follow-up sequences, the videos, the GIFs, and the playbooks
            so you spend time on conversations that matter.
          </p>
        </div>

        <div className="grid gap-3 md:gap-4 md:grid-cols-5 items-stretch">
          {STAGES.map((s, i) => (
            <div key={s.title} className="relative">
              <Link
                href={s.href}
                className="glass rounded-2xl p-4 md:p-5 h-full flex flex-col hover:border-cyan-500/40 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 md:block">
                  <div
                    className={`inline-flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.tint} text-white shadow-lg shrink-0`}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="md:mt-3 text-xs uppercase tracking-wider text-ink-400 font-semibold">
                    Step {i + 1}
                  </div>
                </div>
                <h3 className="mt-2 md:mt-1 text-base font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-200 leading-relaxed flex-1">
                  {s.body}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
              {i < STAGES.length - 1 && (
                <ArrowRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-cyan-400/60 h-5 w-5 z-10" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 md:mt-12 glass rounded-3xl p-5 md:p-8 grid md:grid-cols-3 gap-4 md:gap-6 items-center">
          <div className="md:col-span-2">
            <h3 className="text-xl md:text-2xl font-bold text-white">
              Already using QUO, GoHighLevel, or Twilio?
            </h3>
            <p className="mt-2 text-sm md:text-base text-ink-200">
              LeadFlow Pro plugs straight in. We pull the lead data, layer AI insights
              on top, and sync your automations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {["QUO", "GoHighLevel", "Twilio", "Zapier", "Make.com"].map((t) => (
              <span
                key={t}
                className="stat-pill bg-white/5 border border-white/10 text-ink-100"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
