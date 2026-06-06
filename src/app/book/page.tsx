import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Bot, MessageSquareText, MousePointerClick, ShieldCheck } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { OpenChatButton } from "@/components/site/OpenChatButton";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Message First | The LeadFlow Pro",
  description:
    "The LeadFlow Pro now routes visitors through automated purchase, application, and message paths instead of public calendar calls.",
  path: "/book",
  imageTitle: "Message First",
  imageSubtitle: "Automated routing first. Ryan reviews later when needed.",
  noIndex: true,
});

export default function BookPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader
        activePath="/contact"
        primaryAction={{
          href: "/action-menu",
          label: "Open buy menu",
          mobileDescription: "Pick a paid or free next move.",
          Icon: MousePointerClick,
        }}
        secondaryAction={{
          href: "/contact?source=book-retired",
          label: "Leave message",
          mobileDescription: "AI first. Ryan later if needed.",
          Icon: MessageSquareText,
          muted: true,
        }}
      />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_52%,#fff7ed_100%)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <MessageSquareText className="h-3.5 w-3.5" />
                Message first
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                The calendar is not the front door anymore.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                The site now routes people through automated paths first: buy the small thing,
                apply for the audit, request the blueprint, use the assistant, or leave a clean
                message for Ryan to review later.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/action-menu"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  Open buy menu <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact?source=book-retired"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-cyan-400"
                >
                  Leave a message <MessageSquareText className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
              <div className="grid gap-3">
                <RouteCard
                  Icon={MousePointerClick}
                  title="Want to buy or engage now?"
                  body="Use the Buy Menu for the $47 Quick-Look, $197 audit, leaderboard votes, boost messages, Voice topics, and build paths."
                  href="/action-menu"
                  cta="Open buy menu"
                />
                <RouteCard
                  Icon={Bot}
                  title="Need the site to route you?"
                  body="Open the assistant. Keep it short. It should point you to the next click without making you read the whole site."
                  href="/contact?source=book-retired-ai"
                  cta="Open assistant path"
                />
                <RouteCard
                  Icon={ShieldCheck}
                  title="Need Ryan later?"
                  body="Leave a message with the business, link, budget signal, and decision needed. Ryan can review it when the automated path cannot finish the job."
                  href="/contact?source=book-retired-message"
                  cta="Leave message"
                />
              </div>
              <OpenChatButton className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                Ask the assistant <Bot className="h-4 w-4" />
              </OpenChatButton>
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function RouteCard({
  Icon,
  title,
  body,
  href,
  cta,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white hover:shadow-lg"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-3 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-800">
        {cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
