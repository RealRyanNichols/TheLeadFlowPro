import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CircleCheck,
  GraduationCap,
  Handshake,
  Link2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";
import { FREE_BUILD } from "@/lib/freeBuild";
import { LEAD_FOLLOW_UP } from "@/lib/leadFollowUp";
import { TLFP_CREDITS, TLFP_EARN_RULES, TLFP_PACKS, TLFP_PERKS, findPack } from "@/lib/tlfpCredits";
import { getTlfpAccountForCurrentUser } from "@/lib/tlfp";
import TlfpBalanceCard from "@/components/tlfp/TlfpBalanceCard";
import TlfpPacks from "./TlfpPacks";
import TlfpRedeem, { type RedeemOffer } from "./TlfpRedeem";
import CopyLink from "./CopyLink";

export const dynamic = "force-dynamic";

export const metadata: Metadata = withPublicPageMetadata(TLFP_CREDITS.path, {
  title: "TLFP Credits | The LeadFlow Pro",
  description:
    "Store credit for LeadFlow Pro services. Earn credits by finishing courses, showing up, and sending business. Buy packs with a bonus. Spend them on any build.",
  openGraph: {
    title: "Every dollar in comes back bigger.",
    description:
      "TLFP Credits: 1 credit = $1 of LeadFlow Pro services. Earn them, buy them in packs with a bonus, spend them on the next build.",
  },
});

const EARN_ICONS = {
  course_completed: GraduationCap,
  event_attended: CalendarCheck,
  referral_purchase: Handshake,
} as const;

function creditsLabel(rule: (typeof TLFP_EARN_RULES)[number]): string {
  if (typeof rule.credits === "number") return `+${rule.credits}`;
  return `${rule.percentOfPurchase}%`;
}

export default async function TlfpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref.trim().toUpperCase() : "";
  if (/^[A-Z0-9]{6,12}$/.test(ref)) redirect(`/r/${ref}`);

  const account = await getTlfpAccountForCurrentUser();
  const paidPack = findPack(typeof params.paid === "string" ? params.paid : undefined);
  const cancelled = params.cancelled === "1";
  const referralUrl = account?.referralCode ? `${BUSINESS.siteUrl}/r/${account.referralCode}` : "";

  const redeemOffers: RedeemOffer[] = [
    { kind: "system_map", label: "System Map", priceUsd: PRICES.systemMap, note: "Credited toward the build it maps." },
    ...FREE_BUILD.tiers.map((tier) => ({
      kind: tier.id,
      label: tier.name,
      priceUsd: tier.priceCents / 100,
    })),
    { kind: LEAD_FOLLOW_UP.id, label: LEAD_FOLLOW_UP.name, priceUsd: LEAD_FOLLOW_UP.priceUsd },
    {
      kind: "build_deposit",
      label: "Build down payment",
      priceUsd: PRICES.buildDepositMin,
      body: { amount_usd: PRICES.buildDepositMin },
      note: "The smallest deposit; every dollar credits toward the work.",
    },
  ];

  return (
    <main className="bg-[var(--page)] text-[var(--text)]">
      {/* Hero: copy on the left, the balance card on the right. No dead air under the header. */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-10">
        {paidPack ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-4 text-sm">
            <CircleCheck className="mt-0.5 h-5 w-5 flex-none text-[var(--green)]" aria-hidden="true" />
            <p className="text-[var(--heading)]">
              <strong>Your {paidPack.name.toLowerCase()} is paid.</strong> {paidPack.credits} credits post to the email you used within a
              minute of Stripe clearing it.{" "}
              {account ? "Refresh in a moment and they show below." : "Log in with that same email to see them."}
            </p>
          </div>
        ) : null}
        {cancelled ? (
          <div className="mb-6 rounded-2xl border border-[var(--warn-line)] bg-[var(--warn-tint)] px-4 py-3 text-sm text-[var(--heading)]">
            Checkout closed before payment. Nothing was charged and nothing was held.
          </div>
        ) : null}

        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow">{TLFP_CREDITS.name}</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] text-[var(--heading)] sm:text-5xl">
              Every dollar you put in comes back bigger. Every job you finish earns more.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
              One credit is one dollar of LeadFlow Pro services. Earn them by finishing a course, showing up at a workshop, or
              sending a business that buys. Buy them in packs and get more than you paid for. Spend them on the next build.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#packs" className="btn-primary">
                See the packs
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#earn" className="btn-ghost">
                How to earn them
              </a>
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm text-[var(--muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" aria-hidden="true" />
              Store credit, not a coin. No cash value, not transferable, never traded. Redeem only with The LeadFlow Pro.{" "}
              <Link href={TLFP_CREDITS.termsPath} className="font-bold text-[var(--blue)] underline-offset-2 hover:underline">
                The rules
              </Link>
            </p>
          </div>
          <TlfpBalanceCard account={account} />
        </div>
      </section>

      {/* Packs */}
      <section id="packs" className="scroll-mt-24 border-t border-[var(--line)] bg-[var(--page-soft)]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="eyebrow">Buy a pack</p>
          <h2 className="mt-3 text-3xl font-black text-[var(--heading)]">Pay once. Get more than you paid.</h2>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Three packs, one bonus each. The bigger the pack, the bigger the bonus. Credits land on the email you buy with the
            minute the card clears.
          </p>
          <div className="mt-8">
            <TlfpPacks loginEmail={account?.email ?? null} />
          </div>
        </div>
      </section>

      {/* Earn */}
      <section id="earn" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-12">
        <p className="eyebrow">Earn credits</p>
        <h2 className="mt-3 text-3xl font-black text-[var(--heading)]">Three ways in. None of them cost a dollar.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TLFP_EARN_RULES.map((rule) => {
            const Icon = EARN_ICONS[rule.id];
            return (
              <div key={rule.id} className="card card-hover">
                <div className="flex items-center justify-between gap-3">
                  <span className="feature-icon">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-[var(--green-line)] bg-[var(--green-tint)] px-3 py-1 text-sm font-black text-[var(--green)]">
                    {creditsLabel(rule)}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--heading)]">{rule.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{rule.how}</p>
              </div>
            );
          })}
        </div>

        {/* Referral link */}
        <div className="mt-6 rounded-2xl border border-[var(--accent-line)] p-5" style={{ background: "linear-gradient(135deg, var(--accent-tint), var(--panel) 60%)" }}>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
            <h3 className="text-lg font-bold text-[var(--heading)]">Your referral link</h3>
          </div>
          {account && referralUrl ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-bold text-[var(--heading)]">
                {referralUrl}
              </code>
              <CopyLink value={referralUrl} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              <Link href={`/login?next=${encodeURIComponent(TLFP_CREDITS.path)}`} className="font-bold text-[var(--blue)] underline-offset-2 hover:underline">
                Log in
              </Link>{" "}
              and your link is here. Send it to a business owner. When they make their first purchase, 10% of it lands in your balance.
            </p>
          )}
          <p className="mt-3 text-xs text-[var(--quiet)]">
            The link remembers who sent them for {TLFP_CREDITS.referralCookieDays} days. First purchase only. You cannot refer yourself.
          </p>
        </div>
      </section>

      {/* Spend */}
      <section id="spend" className="scroll-mt-24 border-t border-[var(--line)] bg-[var(--page-soft)]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="eyebrow">Spend credits</p>
          <h2 className="mt-3 text-3xl font-black text-[var(--heading)]">Credits apply first. The card covers the rest.</h2>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Put them on a System Map, a Free Website tier, a follow-up campaign, or a build deposit. When the credits cover the
            whole thing, there is no card at all.
          </p>
          <div className="mt-8">
            {account ? (
              <TlfpRedeem balance={account.balance} offers={redeemOffers} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {redeemOffers.map((offer) => (
                  <li key={offer.kind} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
                    <span className="font-bold text-[var(--heading)]">{offer.label}</span>
                    <span className="text-sm font-black text-[var(--muted)]">{usd(offer.priceUsd)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Time Back, Tool Studio, and anything Ryan quotes by hand: text {BUSINESS.phone.display} and the credits come off the
            invoice.
          </p>
        </div>
      </section>

      {/* Holder perks */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="eyebrow">Hold {TLFP_CREDITS.holderThreshold}+</p>
            <h2 className="mt-3 text-3xl font-black text-[var(--heading)]">A balance is a seat at the table.</h2>
            <p className="mt-3 text-[var(--muted)]">
              Keep {TLFP_CREDITS.holderThreshold} or more on the account and these switch on by themselves. Spend below the line and they
              switch off. No application, no waiting.
            </p>
          </div>
          <ul className="grid gap-3">
            {TLFP_PERKS.map((perk, index) => (
              <li key={perk} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
                <span
                  className="grid h-9 w-9 flex-none place-items-center rounded-lg"
                  style={{
                    background: ["var(--accent-tint)", "var(--green-tint)", "#6d28d914"][index % 3],
                    color: ["var(--blue)", "var(--green)", "var(--violet)"][index % 3],
                  }}
                >
                  {index === 0 ? <Wallet className="h-4 w-4" aria-hidden="true" /> : index === 1 ? <CalendarCheck className="h-4 w-4" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="font-semibold text-[var(--heading)]">{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Rules */}
      <section className="border-t border-[var(--line)] bg-[var(--page-soft)]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="eyebrow">The rules, short</p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {[
              `1 credit = ${usd(1)} of LeadFlow Pro services. Nothing else.`,
              "No cash value. Credits are never paid out, exchanged, or traded.",
              "Not transferable. They stay on the email that earned or bought them.",
              `A balance never passes ${TLFP_CREDITS.maxBalance.toLocaleString("en-US")} credits. Spend some, then buy more.`,
              "Purchased credits do not expire. Earned credits may get a 24-month clock later, with 30 days notice first.",
              "A refunded purchase that was paid with a pack takes the pack's credits back.",
            ].map((line) => (
              <p key={line} className="flex items-start gap-2 text-[var(--muted)]">
                <CircleCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" aria-hidden="true" />
                {line}
              </p>
            ))}
          </div>
          <p className="mt-6 text-sm text-[var(--muted)]">
            Full terms:{" "}
            <Link href={TLFP_CREDITS.termsPath} className="font-bold text-[var(--blue)] underline-offset-2 hover:underline">
              {BUSINESS.siteUrl.replace("https://www.", "")}
              {TLFP_CREDITS.termsPath}
            </Link>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#packs" className="btn-primary">
              Start with the {TLFP_PACKS[0].name.toLowerCase()}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href="/packages" className="btn-ghost">
              See what credits buy
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
