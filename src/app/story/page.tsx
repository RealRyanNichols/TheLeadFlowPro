// src/app/story/page.tsx — Ryan's full origin story.
//
// Five chapters: Apartment / Empire / Loss / Pardon / Rebuild. Each is its
// own visual block, alternating warm-glass and dark-accent for rhythm. Real
// quotes, real story, "reef-barrier" branded language repeated.

import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Compass, Flame, Heart, Sparkles, Trophy,
} from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";

export const metadata = {
  title: "The Story · How I Built It, Lost It, and Got Past the Reef Again — The LeadFlow Pro",
  description:
    "Ryan Nichols' real story: built a multi-million-dollar business from a 3rd-story apartment with a phone, lost it all to 4 years in federal prison for January 6, came home to nothing, and rebuilt with the same playbook he now teaches.",
};

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/story" />

      {/* HERO */}
      <section className="relative overflow-hidden">
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
          className="absolute -top-32 -right-24 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
            <Compass className="h-3.5 w-3.5" /> The Story · Past the Reef
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-slate-950">
            Built it. Lost it.{" "}
            <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
              Got past the reef again.
            </span>
          </h1>
          <p className="mt-5 text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto">
            Five chapters. Real story. Same playbook I now teach. If you're stuck before the reef
            — this is for you.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #f6f9ff 0%, #fff8f1 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.25fr] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Receipts from the work
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                This was not built from a content calendar template.
              </h2>
              <p className="mt-4 leading-relaxed text-slate-700">
                Wholesale Universe, live selling, campaign work, employees, videos, scripts,
                direct-response signs, and the unglamorous back office. The playbook comes from
                operating in public, selling in real time, and learning what makes people stop,
                click, ask, and buy.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                No employee names are published here. These are used as proof of operator history,
                not as customer testimonials.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StoryPhoto
                src="/images/ryan-wholesale-universe-owner.jpg"
                alt="Ryan Nichols standing inside the Wholesale Universe warehouse"
                label="Wholesale Universe owner"
              />
              <StoryPhoto
                src="/images/ryan-live-content-work-1.jpg"
                alt="Ryan Nichols working on live sales content"
                label="Live content work"
              />
              <StoryPhoto
                src="/images/ryan-cmon-man-marketing.jpg"
                alt="Ryan Nichols holding a C'mon Man marketing ice breaker sign"
                label="Direct, human marketing"
              />
              <StoryPhoto
                src="/images/ryan-campaign-team-cinco-2025.jpg"
                alt="Ryan Nichols with a campaign team photo from Cinco de Mayo 2025"
                label="2025 campaign trail"
              />
              <StoryPhoto
                src="/images/ryan-presidential-pardon.jpg"
                alt="Certificate of Pardon for Ryan Taylor Nichols"
                label="Presidential pardon"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 1 — APARTMENT */}
      <Chapter
        n="01"
        Icon={Compass}
        eyebrow="Chapter One · The apartment"
        title="A phone. A two-bedroom. Zero followers."
        body={
          <>
            <p>
              I started with what most people start with — <strong className="text-slate-950">a phone and an idea</strong>.
              Third-story two-bedroom apartment. No team, no funding, no audience. The whole operation
              fit on a kitchen table.
            </p>
            <p className="mt-3">
              I posted. Nothing happened. I posted again. Still nothing. The first 90 days felt like
              shouting into a vent. <strong className="text-slate-950">That's the reef barrier</strong> — the
              early invisible stretch every operator either crosses or quits at.
            </p>
            <p className="mt-3">
              I crossed it because I'd already decided, before the algorithm ever cared, that the only
              two outcomes were "still posting" or "still posting."
            </p>
          </>
        }
        tone="warm"
      />

      {/* CHAPTER 2 — EMPIRE (dark accent) */}
      <Chapter
        n="02"
        Icon={Trophy}
        eyebrow="Chapter Two · The empire"
        title="Multi-million-dollar business, run from the same kitchen table."
        body={
          <>
            <p>
              The reef breaks all at once. A few posts hit. Then a thousand. Then the right one
              found the right person, and that person bought, and they told two people, and the
              algorithm noticed — and from there the curve went from flat to vertical.
            </p>
            <p className="mt-3">
              I built a multi-million-dollar business. Not in a glass office tower. Not with a hired
              army. Same phone, same apartment for years, then a real office, then teams, then more
              brands. <strong className="text-slate-950">It worked because I refused to quit before the reef.</strong>
            </p>
            <p className="mt-3">
              I thought the climb was the hard part. I was wrong about which mountain was waiting next.
            </p>
          </>
        }
        tone="dark"
      />

      {/* CHAPTER 3 — LOSS */}
      <Chapter
        n="03"
        Icon={Flame}
        eyebrow="Chapter Three · The loss"
        title="Four years in federal prison for January 6."
        body={
          <>
            <p>
              I went to federal prison for <strong className="text-slate-950">four years</strong> for my
              involvement in January 6, 2021. That's the line. I'm not going to dress it up and I'm
              not going to hide it.
            </p>
            <p className="mt-3">
              I lost the businesses. I lost the accounts. I lost the routines, the team, the email
              list, the calendar — most of it. The empire I'd built brick by brick disappeared while
              I was sitting somewhere I couldn't get to it.
            </p>
            <p className="mt-3">
              <strong className="text-slate-950">I had time to think.</strong> About what I'd done right,
              what I'd done wrong, and what I'd do differently if I ever got another shot. I wrote a
              lot of it down. Most of it is in the playbooks I sell today.
            </p>
          </>
        }
        tone="warm"
      />

      {/* CHAPTER 4 — PARDON (dark accent) */}
      <Chapter
        n="04"
        Icon={BadgeCheck}
        eyebrow="Chapter Four · Pardoned"
        title="Walked out the gate with my phone and the followers I had left."
        body={
          <>
            <p>
              I was pardoned. The official record cleared. The personal record didn't — that one I
              carry. <strong className="text-slate-950">I came home to nothing.</strong> Just a phone, a
              dwindling follower count, and the same skill set that built the first empire.
            </p>
            <p className="mt-3">
              Most people would've taken a job. I respect anyone who takes that path. It wasn't mine.
              I'd been to the bottom and back once before — I knew exactly what the rebuild looked
              like because I'd done it the first time without knowing.
            </p>
            <p className="mt-3">
              <strong className="text-slate-950">This time I knew where the reef was.</strong>
            </p>
          </>
        }
        tone="dark"
      />

      {/* CHAPTER 5 — REBUILD */}
      <Chapter
        n="05"
        Icon={Sparkles}
        eyebrow="Chapter Five · The rebuild"
        title="75K+ followers. 6 companies. Same playbook. This time I get to teach it."
        body={
          <>
            <p>
              I'm rebuilding right now. <strong className="text-slate-950">75,000+ followers across X,
              Facebook, YouTube, Instagram, and TikTok.</strong> Six companies founded — The LeadFlow
              Pro, RepWatchr, Faretta.Legal, Faretta.AI, Wholesale Universe, Rescue The Universe.
              One client I'm publicly proud of (Premier Dental Academy of Longview), and counting.
            </p>
            <p className="mt-3">
              Every method I'm rebuilding with is a method I now teach. The hooks, the cadence, the
              cross-platform stacking, the website that takes payments, the funnel that doesn't drop
              leads. <strong className="text-slate-950">All of it.</strong>
            </p>
            <p className="mt-3">
              This site is where I package it for you so you don't have to learn it the hard way like
              I did. The reef is real. The crossing is faster when someone who's been across it twice
              is in your boat.
            </p>
          </>
        }
        tone="warm"
      />

      {/* OPERATING BELIEF + CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-300/40 bg-accent-300/10 px-3 py-1 text-xs uppercase tracking-widest text-accent-200 font-semibold">
            <Heart className="h-3.5 w-3.5" /> My operating belief
          </div>
          <p className="mt-5 text-2xl sm:text-3xl font-semibold leading-snug">
            Any product, backed with consistency and a website that takes payments,{" "}
            <span className="bg-gradient-to-r from-accent-300 to-cyan-300 bg-clip-text text-transparent">
              will
            </span>{" "}
            take off — if you don't quit before you get past{" "}
            <span className="bg-gradient-to-r from-accent-300 to-cyan-300 bg-clip-text text-transparent">
              the reef barrier.
            </span>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <Link
              href="/tiers"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              I have to work with you. Show me how. <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-600"
            >
              Get me past my reef
            </Link>
            <Link
              href="/offers/decision-sprint"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              $90 for 90 minutes
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Real Ryan Nichols LLC · Texas-governed under mutual NDA on every paid engagement. We do
            not promise specific outcomes — what we deliver is the work product, the strategic
            direction, and the reporting described in each package.
          </p>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

/* ─── Chapter component ──────────────────────────────────────── */

function StoryPhoto({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
      <div className="aspect-[4/3] bg-slate-100">
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
      <div className="p-4 text-sm font-semibold text-slate-950">{label}</div>
    </div>
  );
}

function Chapter({
  n, Icon, eyebrow, title, body, tone,
}: {
  n: string;
  Icon: any;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  tone: "warm" | "dark";
}) {
  if (tone === "dark") {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16">
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:gap-10 md:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 backdrop-blur p-4 shadow-2xl shadow-black/30">
                <span className="text-4xl font-bold text-cyan-300 tabular-nums">{n}</span>
                <Icon className="h-6 w-6 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-cyan-300 font-semibold">{eyebrow}</div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">{title}</h2>
              <div className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">{body}</div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="relative overflow-hidden border-y border-slate-200">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #fff8f1 0%, #f6f9ff 50%, #fff8f1 100%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:gap-10 md:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5">
              <span className="text-4xl font-bold text-brand-700 tabular-nums">{n}</span>
              <Icon className="h-6 w-6 text-brand-700" />
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-cyan-700 font-semibold">{eyebrow}</div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-slate-950">
              {title}
            </h2>
            <div className="mt-5 text-base sm:text-lg text-slate-700 leading-relaxed">{body}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
