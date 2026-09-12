import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getHqSession } from "@/lib/hq/session";
import { HQ_PLAN } from "@/lib/hq/types";
import { ManageBillingButton, StartPlanButton } from "../_components/BillingButtons";
import { planBadge, readableDate } from "../_components/plan";

// The plan. What it costs, what state it is in, and the two buttons that
// change it. Both of those hand off to Stripe; nothing about a card is
// handled here.

export const dynamic = "force-dynamic";

const INCLUDED = [
  "Autopilot working every five minutes for your business",
  "Every lead in one inbox: website forms, texts, Meta lead ads, connected apps, or one you add by talking to your assistant",
  "An instant reply in your voice, by text when you have a line connected and they agreed to texts, by email otherwise",
  "A call this person now alert when a lead arrives, and again if nobody answered inside your response target",
  "Follow-ups scheduled and drafted on your own ladder",
  "A morning brief every day and a weekly report",
  "Three posts, one lead ad and one video script drafted every week",
  "The connector for ChatGPT, Claude, Claude Code and Cursor",
];

export default async function HqBillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq/billing");
  if (!session.workspace) redirect("/hq/start");

  const ws = session.workspace;
  const badge = planBadge(ws);
  const cancelled = params.cancelled === "1";
  const trialEnds = readableDate(ws.trial_ends_at, ws.timezone);
  const renews = readableDate(ws.current_period_end, ws.timezone);

  const startLabel =
    ws.plan === "none"
      ? `Start your ${HQ_PLAN.trialDays} day trial`
      : ws.plan === "canceled"
        ? "Restart the plan"
        : ws.plan === "past_due"
          ? "Fix the payment"
          : "Open checkout";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header>
        <p className="hq-eyebrow">Billing</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">{HQ_PLAN.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          ${HQ_PLAN.priceUsd} a month. {HQ_PLAN.trialDays} days free at the start. Cancel any time.
        </p>
      </header>

      {cancelled && (
        <p className="hq-note mt-5">
          You closed checkout before finishing, so nothing was charged and nothing changed. The button below picks it back up where you left it.
        </p>
      )}

      <section className="hq-card mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="hq-eyebrow">Your plan right now</p>
            <p className="mt-2 text-2xl font-black text-[var(--heading)]">{badge.label}</p>
          </div>
          <span className="hq-pill" data-tone={badge.tone === "neutral" ? undefined : badge.tone}>
            {badge.live ? "Autopilot running" : "Autopilot paused"}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="hq-eyebrow">Price</dt>
            <dd className="mt-1 text-sm font-bold text-[var(--heading)]">${HQ_PLAN.priceUsd} a month</dd>
          </div>
          {ws.plan === "trial" && trialEnds && (
            <div>
              <dt className="hq-eyebrow">Trial ends</dt>
              <dd className="mt-1 text-sm font-bold text-[var(--heading)]">{trialEnds}</dd>
            </div>
          )}
          {(ws.plan === "active" || ws.plan === "past_due") && renews && (
            <div>
              <dt className="hq-eyebrow">Next renewal</dt>
              <dd className="mt-1 text-sm font-bold text-[var(--heading)]">{renews}</dd>
            </div>
          )}
        </dl>

        {ws.plan === "past_due" && (
          <p className="hq-error mt-4">
            The last payment did not go through. Autopilot is still running for now. Update the card in Manage billing so it does not stop.
          </p>
        )}
        {ws.plan === "canceled" && (
          <p className="hq-note mt-4">
            Autopilot is off. Your leads, messages and history are all still here and come straight back when you restart.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {(ws.plan === "none" || ws.plan === "canceled" || ws.plan === "past_due") && <StartPlanButton label={startLabel} />}
          {ws.stripe_customer_id && <ManageBillingButton />}
        </div>

        {!ws.stripe_customer_id && ws.plan !== "none" && ws.plan !== "canceled" && (
          <p className="mt-3 text-xs text-[var(--muted)]">A billing account appears here after your first checkout.</p>
        )}
      </section>

      <section className="hq-card mt-6">
        <h2 className="text-lg font-black text-[var(--heading)]">What the ${HQ_PLAN.priceUsd} covers</h2>
        <ul className="mt-3 grid gap-2">
          {INCLUDED.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm leading-relaxed text-[var(--text)]">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="hq-card mt-6">
        <h2 className="text-lg font-black text-[var(--heading)]">Cancelling</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Cancel in Manage billing whenever you want. You keep the plan through the end of the period you already paid for, then Autopilot stops. Your
          leads, messages, notes and content stay in HQ and you can still sign in and read them. Restarting turns everything back on.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Questions about a charge?{" "}
          <Link href="/contact" className="font-bold text-[var(--blue)] hover:underline">
            Send us a message
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
