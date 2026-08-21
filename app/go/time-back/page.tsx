import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, KeyRound, ShieldCheck, Timer } from "lucide-react";
import { WEEKLY_BUILD_SLOTS } from "@/lib/timeback";
import TimeBackFunnel from "./TimeBackFunnel";
import RevealObserver from "./Reveal";

// The destination for the "Time Back" Facebook lead campaign. Mobile-first:
// the first phone screen carries the promise, the price floor, and TWO
// buttons. The week-strip graphic SHOWS the product (a calendar that filled
// itself) instead of describing it.

export const metadata: Metadata = {
  title: "Get Your Time Back From Posting | The LeadFlow Pro",
  description:
    "Pick how many days and how many posts per day. We write it in your voice, schedule it in your accounts, and wire the follow-up. From $297 one-time. No passwords, no monthly seat.",
  alternates: { canonical: "https://www.theleadflowpro.com/go/time-back" },
  robots: { index: false, follow: true },
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Each day's column fills top to bottom, one day after the next, so the
// strip reads as a calendar filling itself. The "Scheduled" stamp lands
// only after the last dot.
function WeekStrip() {
  const lastDotDone = 6 * 0.32 + 2 * 0.11 + 0.5;
  return (
    <div data-tbr className="tb-grad-border tb-price-hero rounded-[20px] p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#35c6f4]">
        Your next 7 days, already done
      </p>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {DAY_LABELS.map((d, col) => (
          <div key={`${d}${col}`} className="grid justify-items-center gap-2">
            <span className="text-[11px] font-extrabold text-[#8b97ad]">{d}</span>
            {[0, 1, 2].map((row) => (
              <span
                key={row}
                className="tb-dot h-3.5 w-3.5 rounded-full bg-[#5b87ff]"
                style={{ "--tb-delay": `${(col * 0.32 + row * 0.11).toFixed(2)}s` } as React.CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center justify-between text-xs font-bold text-[#a8b4c8]">
        <span>21 posts · your voice · your accounts</span>
        <span className="tb-sched text-[#7ee2a1]" style={{ animationDelay: `${lastDotDone.toFixed(2)}s` }}>
          Scheduled ✓
        </span>
      </p>
    </div>
  );
}

export default function TimeBackPage() {
  return (
    <main className="cb-page">
      <style>{`
        /* Week strip: each dot fills once with a pop of glow, then settles
           and breathes very gently. Column by column = day by day. */
        @keyframes tbFill {
          0% { opacity: .16; transform: scale(.5); box-shadow: 0 0 0 #5b87ff00; }
          60% { opacity: 1; transform: scale(1.22); box-shadow: 0 0 14px #5b87ffb3; }
          100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px #5b87ff59; }
        }
        @keyframes tbBreathe {
          0%, 100% { opacity: 1; }
          50% { opacity: .78; }
        }
        .tb-dot {
          opacity: .16;
          transform: scale(.5);
          animation:
            tbFill .5s cubic-bezier(.34,1.4,.5,1) var(--tb-delay, 0s) forwards,
            tbBreathe 5s ease-in-out calc(var(--tb-delay, 0s) + 3.2s) infinite;
        }
        @keyframes tbStamp {
          0% { opacity: 0; transform: translateY(4px) scale(.9); }
          100% { opacity: 1; transform: none; }
        }
        .tb-sched { opacity: 0; animation: tbStamp .45s ease forwards; }
        /* Scroll entrances. Armed by Reveal.tsx only when JS runs and motion
           is welcome; the longhand transition lists keep the stagger on
           opacity/transform without delaying hover color changes. */
        .tb-armed [data-tbr],
        .tb-armed [data-tbr-group] > * {
          opacity: 0;
          transform: translateY(16px);
          transition-property: opacity, transform, border-color, background-color, box-shadow;
          transition-duration: .55s, .55s, .15s, .15s, .3s;
          transition-timing-function: ease, cubic-bezier(.22,.61,.36,1), ease, ease, ease;
        }
        .tb-armed [data-tbr].tb-in,
        .tb-armed [data-tbr-group].tb-in > * { opacity: 1; transform: none; }
        .tb-armed [data-tbr-group].tb-in > :nth-child(2) { transition-delay: .07s, .07s, 0s, 0s, 0s; }
        .tb-armed [data-tbr-group].tb-in > :nth-child(3) { transition-delay: .14s, .14s, 0s, 0s, 0s; }
        .tb-armed [data-tbr-group].tb-in > :nth-child(4) { transition-delay: .21s, .21s, 0s, 0s, 0s; }
        .tb-armed [data-tbr-group].tb-in > :nth-child(5) { transition-delay: .28s, .28s, 0s, 0s, 0s; }
        .tb-armed [data-tbr-group].tb-in > :nth-child(n+6) { transition-delay: .35s, .35s, 0s, 0s, 0s; }
        /* Sticky bar button: one soft swell of glow whenever the total moves. */
        @keyframes tbBtnPulse {
          0% { box-shadow: 0 0 28px #1240e880; }
          45% { box-shadow: 0 0 52px #5b87ffcc; }
          100% { box-shadow: 0 0 28px #1240e880; }
        }
        .tb-btn-pulse { animation: tbBtnPulse .8s ease; }
        @media (prefers-reduced-motion: reduce) {
          .tb-dot, .tb-sched, .tb-btn-pulse { animation: none; }
          .tb-dot, .tb-sched { opacity: 1; transform: none; }
          .tb-armed [data-tbr], .tb-armed [data-tbr-group] > * {
            opacity: 1; transform: none; transition: none;
          }
        }
        /* Depth: the hairline itself carries light. Two-layer background
           draws a gradient border, an inset top edge gives the glass lip,
           and the hero panel gets a faint light wash from above. */
        .tb-grad-border {
          border: 1px solid transparent;
          background:
            linear-gradient(180deg, #16233d, #0d1628) padding-box,
            linear-gradient(165deg, #5b87ff8c, #ffffff24 40%, #1240e880) border-box;
        }
        .tb-price-hero {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          box-shadow: inset 0 1px 0 #ffffff1f, 0 0 50px #1240e83d;
        }
        .tb-price-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: radial-gradient(120% 60% at 50% 0%, #5b87ff2b, transparent 62%);
          pointer-events: none;
        }
        .tb-panel-glass { box-shadow: inset 0 1px 0 #ffffff14, 0 0 60px #1240e81f; }
        .tb-card-on {
          border-color: transparent;
          background:
            linear-gradient(180deg, #1d2c50, #16233f) padding-box,
            linear-gradient(150deg, #5b87ffcc, #5b87ff40 45%, #1240e8b3) border-box;
          box-shadow: inset 0 1px 0 #ffffff1f, 0 0 24px #5b87ff33;
        }
        /* Sliders: a 28px glowing thumb inside a 44px hit target (the
           transparent border is part of the thumb, so fingers get the full
           44px). drop-shadow follows the visible circle, not the hit box. */
        .tb-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 44px;
          margin: 0;
          background: transparent;
          cursor: pointer;
        }
        .tb-range::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 999px;
          background: #ffffff1f;
        }
        .tb-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          box-sizing: border-box;
          height: 44px;
          width: 44px;
          margin-top: -19px;
          border: 8px solid transparent;
          border-radius: 50%;
          background: #5b87ff;
          background-clip: padding-box;
          filter: drop-shadow(0 0 9px #5b87ffb3);
        }
        .tb-range::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: #ffffff1f;
        }
        .tb-range::-moz-range-thumb {
          box-sizing: border-box;
          height: 44px;
          width: 44px;
          border: 8px solid transparent;
          border-radius: 50%;
          background: #5b87ff;
          background-clip: padding-box;
          filter: drop-shadow(0 0 9px #5b87ffb3);
        }
        .tb-range:focus-visible {
          outline: 2px solid #35c6f4;
          outline-offset: 4px;
          border-radius: 12px;
        }
        /* The site's global heading rules paint h1-h3 in ink, which is
           invisible on this dark funnel. Scoped override, spans keep their
           own accent colors. */
        .tb-dark h1, .tb-dark h2, .tb-dark h3 { color: #f4f6fa !important; }
      `}</style>
      <RevealObserver />

      <div className="tb-dark bg-[#0a1220]">
        <section className="px-4 pb-10 pt-10 sm:pt-16">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#35c6f4]">
                You saw the video. This is the next move.
              </p>
              <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
                Get your time back{" "}
                <span className="text-[#5b87ff] [text-shadow:0_0_30px_#5b87ff66]">
                  from posting.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-[#a8b4c8] sm:text-lg">
                3+ posts a day on Facebook, Instagram, and X. Written in your voice, scheduled in
                YOUR accounts, follow-up wired.{" "}
                <b className="text-white">From $297, one-time.</b> No monthly seat to rent.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#tb-build"
                  className="inline-flex min-h-[54px] items-center gap-2 rounded-xl bg-[var(--cb-blue)] px-6 text-base font-extrabold text-white shadow-[0_0_36px_#1240e880] transition hover:bg-[var(--cb-blue-deep)]"
                >
                  Build my package
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="#tb-proof"
                  className="inline-flex min-h-[54px] items-center gap-2 rounded-xl border border-[#ffffff2e] px-6 text-base font-bold text-[#e6ebf4]"
                >
                  See it on a real business
                </a>
              </div>
              <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#ffffff0d] px-3 py-2 text-sm font-bold text-[#a8b4c8]">
                <Timer className="h-4 w-4 text-[#35c6f4]" aria-hidden="true" />
                {WEEKLY_BUILD_SLOTS} build slots open this week. Full week rolls to Monday.
              </p>
            </div>
            <WeekStrip />
          </div>
        </section>

        <TimeBackFunnel />
      </div>

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <h2 className="cb-h2">
            <em>No passwords. Ever.</em>
            The safe agency way to work in your accounts.
          </h2>
          <div data-tbr-group className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: KeyRound,
                title: "You never hand over a password",
                body: "Facebook and Instagram grant us partner access through Meta Business Manager, the official agency door. X uses delegate access. Email platforms give us an invited team seat. You click approve, we get to work.",
              },
              {
                icon: ShieldCheck,
                title: "You can revoke us in one click",
                body: "Partner access is task-level and yours to remove any time. Everything we build lives in YOUR accounts, so if we disappeared tomorrow, you keep all of it. That is the whole point: own your platform.",
              },
              {
                icon: CalendarCheck,
                title: "Built and scheduled, not dumped",
                body: "We do not email you a folder of drafts. Posts go on your calendar, automations get switched on, and you get a walkthrough of exactly what is running and where.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-[var(--line-strong)] bg-white p-6"
              >
                <p.icon className="h-6 w-6 text-[var(--blue)]" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-extrabold text-[var(--heading)]">{p.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cb-band" id="tb-proof">
        <div className="cb-shell">
          <h2 className="cb-h2">
            <em>This is not theory.</em>
            The same system runs real local businesses today.
          </h2>
          <p className="cb-lead">
            Premier Dental Academy of Longview runs on this exact stack: 455 first-party leads
            since May 4, and July ads at a 4.45% click-through rate and 72 cents a click. Premier
            Dental Academy of Longview and The LeadFlow Pro share common ownership, which is why
            we can show you the numbers straight from the account.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="#tb-build">
              Build my package
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See the live systems
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/packages/system-map">
              Want the full picture first? The $497 System Map
            </Link>
          </div>
          <p className="mt-6 text-sm text-[var(--quiet)]">
            Posting more than 10 times a day, or running multiple locations?{" "}
            <Link href="/contact" className="font-bold text-[var(--blue)] underline">
              Book a call
            </Link>{" "}
            and we price it custom.
          </p>
        </div>
      </section>
    </main>
  );
}
