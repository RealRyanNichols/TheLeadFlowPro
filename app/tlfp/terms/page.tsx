import type { Metadata } from "next";
import Link from "next/link";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";
import { TLFP_CREDITS, TLFP_EARN_RULES, TLFP_FOUNDING, TLFP_FOUNDING_TIERS, TLFP_PACKS, foundingStartLabel, foundingTier } from "@/lib/tlfpCredits";

export const metadata: Metadata = withPublicPageMetadata(TLFP_CREDITS.termsPath, {
  title: "TLFP Credits terms | The LeadFlow Pro",
  description:
    "What a TLFP Credit is, how credits are earned and bought, how they are spent, and the limits: no cash value, not transferable, redeemable only with The LeadFlow Pro.",
});

// The Founding 100 opens on TLFP_FOUNDING.startsAt (lib/tlfpCredits.ts), set
// to the merge date; these terms were updated the same day.
const FOUNDING_START = foundingStartLabel();
const UPDATED = FOUNDING_START;

export default function TlfpTermsPage() {
  return (
    <main className="bg-[var(--page)] text-[var(--text)]">
      <article className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
        <Link href={TLFP_CREDITS.path} className="text-sm font-bold text-[var(--blue)] underline-offset-2 hover:underline">
          ← {TLFP_CREDITS.name}
        </Link>
        <p className="eyebrow mt-6">Program terms</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--heading)] sm:text-4xl">TLFP Credits terms</h1>
        <p className="mt-2 text-sm text-[var(--quiet)]">Last updated {UPDATED}. The site's <Link href="/terms" className="underline">general terms</Link> also apply.</p>

        <div className="prose-lfp mt-8 space-y-6 text-[var(--muted)]">
          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">1. What a credit is</h2>
            <p className="mt-2">
              A TLFP Credit is store credit issued by {BUSINESS.name} ({BUSINESS.legalName}). One credit can be applied to {usd(1)} of
              services sold on {BUSINESS.siteUrl.replace("https://www.", "")} or invoiced by {BUSINESS.name}. That is the whole
              thing. A credit is not money, not a currency, not a security, not an investment, and not a claim on the business.
              It has no cash value and cannot be redeemed for cash, exchanged, sold, or traded anywhere.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">2. Whose credits they are</h2>
            <p className="mt-2">
              Credits belong to the email address they were earned or bought under. They cannot be moved to another person or
              another email. Log in with that email to see and spend them. If you need the email on the account corrected, contact{" "}
              {BUSINESS.email.hello} from the address on the account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">3. Earning credits</h2>
            <p className="mt-2">
              Credits are earned only for the actions below, at these amounts, and only once per action, and through the{" "}
              {TLFP_FOUNDING.name} in section 4:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {TLFP_EARN_RULES.map((rule) => (
                <li key={rule.id}>
                  <strong className="text-[var(--heading)]">{rule.label}:</strong>{" "}
                  {typeof rule.credits === "number" ? `${rule.credits} credits.` : `${rule.percentOfPurchase}% of the referred buyer's first paid purchase, in credits.`}{" "}
                  {rule.how}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Referral credits are paid on a first purchase only, never on your own purchases, and only when the buyer arrived
              through your link within the last {TLFP_CREDITS.referralCookieDays} days. We may withhold or reverse referral credits
              on a purchase that is refunded, disputed, or that we reasonably believe was made to game the program. We never pay
              credits for reviews.
            </p>
          </section>

          <section id="founding" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-[var(--heading)]">4. {TLFP_FOUNDING.name}</h2>
            <p className="mt-2">
              The first {TLFP_FOUNDING.seats} distinct email addresses whose first qualifying paid purchase clears on or after{" "}
              {FOUNDING_START} each get one numbered founding seat. Seats are handed out in the order the payments clear, one per
              email, and a seat number is never reissued. When seat {TLFP_FOUNDING.seats} is taken the program is closed to new
              seats. An email that already paid us before {FOUNDING_START} for a build, a website, the training, a retainer, or
              anything else of {usd(foundingTier("build").minPaidCents / 100)} or more (credit packs aside) is an existing client
              and does not take a seat. A qualifying purchase, and the founding credits it posts once to the seat, is:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {TLFP_FOUNDING_TIERS.map((tier) => (
                <li key={tier.id}>
                  <strong className="text-[var(--heading)]">{tier.label}:</strong>{" "}
                  {tier.id === "build"
                    ? `a payment of ${usd(tier.minPaidCents / 100)} or more toward a build, a website package, a one time agency scope, a Tool Studio build (bought on its own or with a monthly menu, counted at the build's own price), or an invoice from ${BUSINESS.name}: ${tier.oneTimeCredits.toLocaleString("en-US")} credits.`
                    : tier.id === "learn"
                      ? `The ChatGPT Operator course or Operator Academy all access: ${tier.oneTimeCredits} credits.`
                      : `a paid month of a monthly agency retainer: ${tier.monthlyCredits} credits for that month, and for every later paid month.`}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Each seat carries one founding bonus, set by the purchase that claims it. Later purchases earn the rebate and the
              monthly credits below, never a second bonus.
            </p>
            <p className="mt-2">
              A seat holder also earns {TLFP_FOUNDING.rebatePercent}% of the amount paid in money on every later paid purchase, and on
              the one that claimed the seat, as credits, rounded down to whole credits. Any seat holder who pays a month of a monthly
              agency retainer earns the monthly credits for that month. Credits applied at checkout are not money paid and earn
              nothing. Credit packs never claim a seat and never earn the rebate.
            </p>
            <p className="mt-2">
              Founding credits are earned credits and follow every rule here, including the balance limit in section 7: an award
              that would cross the limit is reduced or declined, and is not paid later. If the purchase behind a founding award is
              fully refunded, reversed, or disputed, the award is removed, which can take a balance below zero; if a dispute closes
              in our favour it is put back. A dispute inquiry that moves no money changes nothing. The seat stays with the email that claimed it. We may change or end the rebate and the
              monthly credits for the future under section 8.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">5. Buying credits</h2>
            <p className="mt-2">Credit packs are sold in US dollars through Stripe at these fixed amounts:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {TLFP_PACKS.map((pack) => (
                <li key={pack.id}>
                  <strong className="text-[var(--heading)]">{pack.name}:</strong> {usd(pack.priceUsd)} for {pack.credits} credits.
                </li>
              ))}
            </ul>
            <p className="mt-2">
              A pack is a prepayment for services, not a deposit, not a loan, and not an investment. Credits from a pack are posted
              to the email used at checkout. If a pack payment is refunded, reversed, or disputed, the credits it added are removed,
              which can take a balance below zero until it is settled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">6. Spending credits</h2>
            <p className="mt-2">
              Credits apply at checkout on the offers marked as accepting them, and on invoices where {BUSINESS.name} agrees to apply
              them. Credits are applied before any card charge; the card covers the remainder, if any. Credits applied to a checkout
              are held while that checkout is open and returned if it expires unpaid. A purchase paid partly or fully with credits
              is refunded, if at all, under the same terms as any other purchase; refunded credits are returned as credits, not cash.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">7. Limits</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                A balance never exceeds {TLFP_CREDITS.maxBalance.toLocaleString("en-US")} credits. An award or purchase that would
                cross that line is reduced or declined.
              </li>
              <li>Purchased credits do not expire.</li>
              <li>
                Earned credits currently do not expire. We may introduce an expiry of not less than 24 months from the date earned,
                with at least 30 days notice by email before any credit expires.
              </li>
              <li>Holder perks apply while the balance is at or above {TLFP_CREDITS.holderThreshold} credits and stop when it is not.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">8. Changes and mistakes</h2>
            <p className="mt-2">
              We can change the earning rules, pack sizes, perks, and these terms for the future by posting the change here.
              Credits already on an account keep their value of {usd(1)} in services. If credits are posted in error, we correct
              the ledger and tell you. Every movement on your balance is visible on your account page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">9. Questions</h2>
            <p className="mt-2">
              Email {BUSINESS.email.hello} or text {BUSINESS.phone.display}. A real person answers.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
