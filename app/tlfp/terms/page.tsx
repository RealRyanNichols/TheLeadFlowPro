import type { Metadata } from "next";
import Link from "next/link";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";
import { TLFP_CREDITS, TLFP_EARN_RULES, TLFP_PACKS } from "@/lib/tlfpCredits";

export const metadata: Metadata = withPublicPageMetadata(TLFP_CREDITS.termsPath, {
  title: "TLFP Credits terms | The LeadFlow Pro",
  description:
    "What a TLFP Credit is, how credits are earned and bought, how they are spent, and the limits: no cash value, not transferable, redeemable only with The LeadFlow Pro.",
});

const UPDATED = "September 23, 2026";

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
            <p className="mt-2">Credits are earned only for the actions below, at these amounts, and only once per action:</p>
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

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">4. Buying credits</h2>
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
            <h2 className="text-xl font-bold text-[var(--heading)]">5. Spending credits</h2>
            <p className="mt-2">
              Credits apply at checkout on the offers marked as accepting them, and on invoices where {BUSINESS.name} agrees to apply
              them. Credits are applied before any card charge; the card covers the remainder, if any. Credits applied to a checkout
              are held while that checkout is open and returned if it expires unpaid. A purchase paid partly or fully with credits
              is refunded, if at all, under the same terms as any other purchase; refunded credits are returned as credits, not cash.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">6. Limits</h2>
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
            <h2 className="text-xl font-bold text-[var(--heading)]">7. Changes and mistakes</h2>
            <p className="mt-2">
              We can change the earning rules, pack sizes, perks, and these terms for the future by posting the change here.
              Credits already on an account keep their value of {usd(1)} in services. If credits are posted in error, we correct
              the ledger and tell you. Every movement on your balance is visible on your account page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--heading)]">8. Questions</h2>
            <p className="mt-2">
              Email {BUSINESS.email.hello} or text {BUSINESS.phone.display}. A real person answers.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
