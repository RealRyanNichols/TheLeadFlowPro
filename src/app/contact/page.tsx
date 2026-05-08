// src/app/contact/page.tsx — mobile-first contact command center.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Route,
  ShieldCheck,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { OpenChatButton } from "@/components/site/OpenChatButton";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Contact Ryan Nichols — The LeadFlow Pro",
  description:
    "Choose the fastest way to move forward with The LeadFlow Pro: start the router, book the 10-minute call, ask Faretta AI, text, or email Ryan.",
  path: "/contact",
  imageTitle: "Contact Ryan Nichols",
  imageSubtitle: "Start the router, book the call, ask the AI, text, or email.",
});

const RYAN_EMAIL = "theflashflash24@gmail.com";
const PHONE_DISPLAY = "(903) 345-8990";
const PHONE_HREF = "+19033458990";

function mailto(subject: string, body = "") {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `mailto:${RYAN_EMAIL}?${params.toString()}`;
}

const CONTEXT_BODY =
  "Hi Ryan,\n\nBusiness/account:\n\nWhat I need built or fixed:\n\nBudget range I am considering:\n\nTimeline:\n\nBest next step:\n\n";

const SHOULD_USE = [
  {
    Icon: Route,
    title: "Start with the router",
    body: "Best first move if you are not sure which paid offer fits. It routes you by problem, budget, and urgency.",
    href: "/start",
    cta: "Pick my service",
  },
  {
    Icon: Calendar,
    title: "Book the 10-minute call",
    body: "Best if you are a serious buyer and can explain the business, the account, and the stuck decision fast.",
    href: "/book",
    cta: "Pick a call window",
  },
  {
    Icon: Mail,
    title: "Email context",
    body: "Best if you need to send links, screenshots, a longer explanation, or a team member into the thread.",
    href: mailto("LeadFlow Pro — serious inquiry", CONTEXT_BODY),
    cta: "Email Ryan",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/contact" />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full opacity-45 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-36 -left-24 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:py-12 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                Contact Ryan
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Do not wander.{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  Pick the next move.
                </span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
                If you are ready to move, use the router or book the call. If you need an answer
                before you choose, ask Faretta AI. If there is context I need to see, text or email
                it cleanly.
              </p>
              <div className="mt-5 rounded-2xl border border-cyan-200 bg-white/75 p-4 text-sm leading-relaxed text-slate-700 shadow-sm backdrop-blur">
                The first goal is simple: figure out whether this is a 10-minute fit check, a lower
                paid entry, or a bigger 30/60/90-day buildout.
              </div>
            </div>

            <div id="contact-options" className="lg:col-span-3">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Contact command panel
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-950">
                      Choose one. I will route from there.
                    </div>
                  </div>
                  <span className="hidden rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 sm:inline-flex">
                    Mobile first
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <QuickLink
                    href="/start"
                    Icon={Route}
                    label="Start the router"
                    body="Best path if you want the site to tell you what to do next."
                    primary
                  />
                  <QuickLink
                    href="/book"
                    Icon={Calendar}
                    label="Book the 10-min call"
                    body="A fit check for serious buyers. No long free coaching."
                    accent
                  />
                  <OpenChatButton className="group flex min-h-[112px] flex-col rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white">
                      <Bot className="h-5 w-5" />
                    </span>
                    <span className="mt-3 text-sm font-bold text-slate-950">Ask Faretta AI</span>
                    <span className="mt-1 text-xs leading-relaxed text-slate-600">
                      Opens the site assistant for package fit, pricing, and next-step questions.
                    </span>
                  </OpenChatButton>
                  <QuickLink
                    href={`sms:${PHONE_HREF}`}
                    Icon={MessageSquareText}
                    label="Text Ryan"
                    body={`${PHONE_DISPLAY}. Use this when the context is short.`}
                  />
                  <QuickLink
                    href={mailto("LeadFlow Pro — serious inquiry", CONTEXT_BODY)}
                    Icon={Mail}
                    label="Email Ryan"
                    body={RYAN_EMAIL}
                  />
                  <QuickLink
                    href={`tel:${PHONE_HREF}`}
                    Icon={Phone}
                    label="Call Ryan"
                    body="Use sparingly. The 10-minute call is the cleaner lane."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, #f6f9ff 0%, #fff8f1 100%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              Fastest path
            </div>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Use the lane that matches where you are right now.
            </h2>
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {SHOULD_USE.map((item) => (
                <PathCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:py-14 lg:grid-cols-3">
          <InfoCard
            Icon={CheckCircle2}
            title="Send the useful context"
            body="Business name, account links, current offer, budget range, timeline, and the one decision you need made. That beats a long vague message."
          />
          <InfoCard
            Icon={ShieldCheck}
            title="No fake promises"
            body="I will tell you what I think the next move is. I do not guarantee specific followers, leads, sales, or revenue."
          />
          <InfoCard
            Icon={MapPin}
            title="East Texas, remote everywhere"
            body="Virtual work is normal. Local travel can be discussed when it makes sense and the client covers travel."
          />
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
          <div
            aria-hidden
            className="absolute -top-28 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
          />
          <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:py-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready means ready to choose.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Start with the router if you want the cleanest path. Book the call if you already know
              this deserves Ryan's time.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/25 hover:bg-accent-600"
              >
                Pick my service <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/15"
              >
                Book the 10-min call
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function QuickLink({
  href,
  Icon,
  label,
  body,
  primary,
  accent,
}: {
  href: string;
  Icon: LucideIcon;
  label: string;
  body: string;
  primary?: boolean;
  accent?: boolean;
}) {
  const classes = primary
    ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
    : accent
      ? "border-accent-400 bg-accent-500 text-white hover:bg-accent-600"
      : "border-slate-200 bg-white text-slate-950 hover:border-cyan-300 hover:bg-cyan-50/50";

  return (
    <Link
      href={href}
      className={`group flex min-h-[112px] flex-col rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 ${classes}`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          primary || accent ? "bg-white/15 text-white" : "bg-slate-950 text-white"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 text-sm font-bold">{label}</span>
      <span className={`mt-1 text-xs leading-relaxed ${primary || accent ? "text-white/80" : "text-slate-600"}`}>
        {body}
      </span>
    </Link>
  );
}

function PathCard({
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
      className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
    >
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-700 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 group-hover:text-cyan-800">
        {cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function InfoCard({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
