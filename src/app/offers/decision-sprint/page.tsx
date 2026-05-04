// src/app/offers/decision-sprint/page.tsx
// First dedicated offer sales page — proof-of-concept for the templated layout.
// Once Ryan approves this layout, every other offer gets a sister page using
// the same structure with offer-specific data.

import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Check, Clock, Compass, FileText,
  ShieldCheck, Sparkles, Target, TrendingUp, Trophy, X as XIcon, Zap,
} from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";

export const metadata = {
  title: "90-Minute Decision Sprint — $97 · The LeadFlow Pro",
  description:
    "One stuck business decision unpacked in 90 minutes with Ryan Nichols. Written one-pager delivered within 24 hours. Pricing, hires, offers, market moves — get the call made by tomorrow morning.",
};

const RYAN_EMAIL = "theflashflash24@gmail.com";

export default function DecisionSprintPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />

      {/* HERO */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs uppercase tracking-widest text-cyan-700">
                <Compass className="h-3.5 w-3.5" /> Tier 1 · One-time · Lowest-friction 1:1 with Ryan
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-950 leading-tight">
                One stuck decision.{" "}
                <span className="bg-gradient-to-r from-brand-700 to-cyan-500 bg-clip-text text-transparent">
                  90 minutes. Done by tomorrow.
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-700 leading-relaxed">
                A focused 90-minute working session with Ryan on <strong>one specific decision</strong> that's
                been stuck for weeks. Not a discovery call. Not a coaching session. A working session
                with a written one-pager in your inbox by tomorrow morning.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`mailto:${RYAN_EMAIL}?subject=${encodeURIComponent("Buy: 90-Minute Decision Sprint $97")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Buy now — $97 <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
                >
                  Free 10-min call first
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Stripe Payment Link drops in here once products are live. For now, email lock-in
                with same-day reply.
              </p>
            </div>

            {/* Price card */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
                <div className="text-xs uppercase tracking-widest text-slate-500">Price</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-slate-950 tabular-nums">$97</span>
                  <span className="text-sm text-slate-500">one-time</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-600" />90-min private video call</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-600" />Live shared working doc</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-600" />Written one-pager within 24 hours</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-600" />Recording delivered same day</li>
                </ul>
                <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  <ShieldCheck className="inline h-3.5 w-3.5 mr-1 text-lead-600" />
                  Texas-law engagement letter + mutual NDA. Cancel/reschedule with 24hr notice.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY BUY */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">Why buy this</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            Most owners stay stuck on one decision for weeks. That's a bigger cost than you think.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Reason
              icon={Clock}
              title="The cost of staying stuck"
              body="Every week a decision sits on your desk, the underlying problem compounds. A pricing decision delayed 4 weeks usually costs more than the entire business audit + working session combined."
            />
            <Reason
              icon={Target}
              title="Why $97 not $497"
              body="This isn't a strategic engagement. It's one decision, fully unpacked, with a written recommendation. Priced to be a no-brainer for owners who just need a sharp second brain on a single call."
            />
            <Reason
              icon={Zap}
              title="Why 90 min not 60 min"
              body="60 minutes is enough to talk about a decision. 90 minutes is enough to actually MAKE the decision — surface every constraint, weigh every trade-off, and end with the call written down."
            />
          </div>
        </div>
      </section>

      {/* WHAT HAPPENS WHEN YOU BUY */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">What happens when you buy</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            The full timeline, start to finish.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Step n="1" minutes="0 min" title="Pay & schedule" body="Stripe checkout. You pick a slot from Ryan's calendar within the next 5 business days." />
            <Step n="2" minutes="24 hrs before" title="Pre-call note" body="You email Ryan a 1-paragraph note on what the decision is, the options on the table, and what you've already tried." />
            <Step n="3" minutes="90 min" title="The call" body="Live video. Shared doc open. Ryan asks the questions, you bring the context, we land on the call together." />
            <Step n="4" minutes="24 hrs after" title="Written one-pager" body="The recommendation + 3 reasons + next 3 actions. PDF + editable Notion / Google Doc. Recording attached." />
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR / NOT FOR */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">Save us both time</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Are you the right buyer for this?
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <FitBlock
              tone="lead"
              title="Buy this if"
              items={[
                "You have one specific decision that's been stuck for 2+ weeks",
                "You can describe the decision in one sentence",
                "You're willing to do 5 minutes of pre-work (the 1-paragraph note)",
                "You're a real operator with a real business — not just kicking tires",
                "You'll act on the recommendation within 30 days, even if you disagree with it",
              ]}
            />
            <FitBlock
              tone="rose"
              title="Don't buy this if"
              items={[
                "You don't actually have a decision yet — you have 'general questions'",
                "You want a 90-minute coaching session on ten different topics",
                "You want guarantees about which option will work best",
                "You're shopping consultants for the lowest price",
                "You're hoping a $97 call will replace a real strategic engagement",
              ]}
            />
          </div>
        </div>
      </section>

      {/* COST OF NOT BUYING */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="text-xs uppercase tracking-widest text-amber-700 mb-2">The math</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            What it costs to NOT buy this.
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <CostBlock
              tone="amber"
              title="If you stay stuck"
              big="$1,200+"
              sub="Median weekly opportunity cost of one delayed pricing/hire/offer decision (4 weeks at ~$300/wk impact). And that's before the team morale hit, the lost momentum, and the 'should we just keep doing what we're doing' default."
            />
            <CostBlock
              tone="lead"
              title="If you buy this"
              big="$97"
              sub="One time. 90 minutes. A written recommendation in your inbox. Even if you disagree with the call, you've eliminated the option you didn't pick — and that alone is worth the price."
            />
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">Why trust Ryan with the call</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            I make these calls in my own businesses every week.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ProofTile big="75K+" label="Followers built from zero across 5 platforms" />
            <ProofTile big="5" label="Companies founded — LeadFlow Pro, RepWatchr, Faretta.Legal, Faretta.AI, Wholesale Universe" />
            <ProofTile big="10+ yr" label="Years operating in social, ads, sales, lead gen" />
            <ProofTile big="1" label="Premier Dental Academy of Longview — built website, student/admin tools, ran ads" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">Common questions</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Before you book.
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FAQ q="What if my decision isn't really 'one' decision?" a="Then you book the $497 Business Audit instead. The Decision Sprint is for one stuck thing. The Audit is for the whole business." />
            <FAQ q="Can I get a refund if I disagree with the recommendation?" a="No. You're paying for the working session and the written recommendation, not for the recommendation matching what you wanted to hear. Refunds available within 24 hours of paying if scheduling falls through." />
            <FAQ q="Will Ryan record the call?" a="Yes. Recording delivered same day. You own it forever." />
            <FAQ q="What if I need a follow-up?" a="Book another sprint, or apply the $97 toward a $497 Audit if you do that within 30 days." />
            <FAQ q="What does the pre-call note look like?" a="A paragraph: what's the decision, what are the options, what have you tried, what's pulling you toward each option. ~5 min of writing." />
            <FAQ q="Texas-law NDA?" a="Yes. Mutual. Sample available before payment if you ask." />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            One decision. 90 minutes. By tomorrow morning, it's made.
          </h2>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`mailto:${RYAN_EMAIL}?subject=${encodeURIComponent("Buy: 90-Minute Decision Sprint $97")}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Buy now — $97 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-accent-600"
            >
              Free 10-min call first
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Real Ryan Nichols LLC · Texas-governed under mutual NDA. We do not promise specific
            outcomes — we deliver the working session and the written recommendation described
            above.
          </p>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

/* ─── Components ──────────────────────────────────────────────── */

function Reason({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, minutes, title, body }: { n: string; minutes: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">{n}</span>
        <span className="text-[10px] uppercase tracking-widest text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">{minutes}</span>
      </div>
      <div className="mt-3 font-semibold text-slate-950">{title}</div>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function FitBlock({ tone, title, items }: { tone: "lead" | "rose"; title: string; items: string[] }) {
  const styles = tone === "lead"
    ? "border-lead-300 bg-lead-50"
    : "border-rose-300 bg-rose-50";
  const Icon = tone === "lead" ? Check : XIcon;
  const iconColor = tone === "lead" ? "text-lead-600" : "text-rose-600";
  return (
    <div className={`rounded-2xl border p-6 ${styles}`}>
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-widest font-semibold ${tone === "lead" ? "bg-lead-100 text-lead-800" : "bg-rose-100 text-rose-800"}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2 text-slate-700">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CostBlock({ tone, title, big, sub }: { tone: "amber" | "lead"; title: string; big: string; sub: string }) {
  const ring = tone === "amber" ? "ring-amber-200 border-amber-300 bg-amber-50" : "ring-lead-200 border-lead-300 bg-lead-50";
  const bigColor = tone === "amber" ? "text-amber-700" : "text-lead-700";
  return (
    <div className={`rounded-2xl border ring-1 p-6 shadow-sm ${ring}`}>
      <div className="text-xs uppercase tracking-widest text-slate-600">{title}</div>
      <div className={`mt-2 text-5xl font-bold tabular-nums ${bigColor}`}>{big}</div>
      <p className="mt-3 text-sm text-slate-700 leading-relaxed">{sub}</p>
    </div>
  );
}

function ProofTile({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl sm:text-4xl font-bold text-slate-950 tabular-nums">{big}</div>
      <div className="mt-2 text-sm text-slate-600 leading-snug">{label}</div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-950">{q}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{a}</p>
    </div>
  );
}
