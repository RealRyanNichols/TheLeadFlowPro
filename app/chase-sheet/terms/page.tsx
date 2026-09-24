import type { Metadata } from "next";
import Link from "next/link";
import { CHASE_SHEET, CHASE_SHEET_DISCLAIMER } from "@/lib/chaseSheet/product";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import styles from "../chase-sheet.module.css";

export const metadata: Metadata = withPublicPageMetadata(CHASE_SHEET.termsPath, {
  title: `${CHASE_SHEET.name} purchase terms | The LeadFlow Pro`,
  description: "What the monthly plan and the one-time purchase cover, how cancellation works, and what you send yourself.",
});

export default function ChaseSheetTermsPage() {
  return (
    <main className={styles.page}>
      <div className={`${styles.shell} ${styles.legal}`}>
        <p className={styles.eyebrow}>{CHASE_SHEET.name} purchase terms</p>
        <h1>Know what you are buying.</h1>
        <p>
          {CHASE_SHEET.name} is sold by {BUSINESS.dbaLine}. These terms cover the two ways to buy it and what happens after. The site&rsquo;s general{" "}
          <Link href="/terms" className={styles.textlink}>
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className={styles.textlink}>
            privacy policy
          </Link>{" "}
          also apply.
        </p>

        <h2>What you get</h2>
        <p>
          Access to the sheet at {BUSINESS.siteUrl}
          {CHASE_SHEET.appPath}: a place to record the quotes you have sent, a daily list of which ones to follow up and in what order, follow-up messages and call scripts written from your business profile and the trade library you choose, replies to common objections, and a ledger that adds up your own quotes. Trade libraries and messages added after your purchase are included on both plans.
        </p>

        <h2>The monthly plan</h2>
        <p>
          {CHASE_SHEET.monthlyLabel}, charged by card through Stripe on the date you start and on the same date each month after, until you cancel. Cancel from the Settings tab inside the sheet, which opens Stripe&rsquo;s billing portal; the plan stops at the end of the month already paid and is not refunded for the remainder. If a renewal fails, the sheet stays open for {CHASE_SHEET.pastDueGraceDays} days while Stripe retries the card, then locks until a payment goes through. A locked sheet keeps your quotes; restarting the plan reopens them.
        </p>

        <h2>The one-time purchase</h2>
        <p>
          {CHASE_SHEET.lifetimeLabel}, charged once by card through Stripe. Nothing renews and there is nothing to cancel. Access lasts for as long as {CHASE_SHEET.name} is offered by The LeadFlow Pro. If it were ever discontinued, you would be given at least ninety days&rsquo; notice and a way to export your quotes. If you buy the one-time plan while a monthly plan is running, the monthly plan is set to end at the close of its paid month so you are not charged for both.
        </p>

        <h2>Refunds</h2>
        <p>
          Email {BUSINESS.email.hello} within seven days of a first purchase and it will be refunded in full. A refund or a card dispute closes the sheet. Renewal months on the monthly plan are not refunded; cancel before the renewal date instead.
        </p>

        <h2>What you send yourself</h2>
        <p>{CHASE_SHEET_DISCLAIMER}</p>
        <p>
          Because every message goes from your own phone or email, you are the sender. Send only to people who gave you their number or address in the course of asking you for a quote, honor any request to stop, and follow the laws that apply to business messages where you operate. The sheet spaces its touches so no customer gets two asks in a row and nothing is scheduled on a Sunday; the decision to send each one is yours.
        </p>

        <h2>Access and the key</h2>
        <p>
          After payment the sheet opens in the browser you bought it in, and a key is emailed to the address you paid with. That email and key open the same sheet on any device. Anyone holding them can see and change your quotes, so treat the key like a password. Sign out of a shared device from the Settings tab.
        </p>

        <h2>Your data</h2>
        <p>
          The quotes you enter are stored in The LeadFlow Pro&rsquo;s database under your email so your devices see the same sheet. They are used only to run your sheet. Nobody at The LeadFlow Pro contacts your customers, and your list is never shared or sold. You can download every quote as a spreadsheet at any time from the Ledger tab, and you can ask for your account and quotes to be deleted by emailing {BUSINESS.email.hello}.
        </p>

        <h2>No promises about results</h2>
        <p>
          The calculator on the sales page runs on numbers you type in. No close rate, revenue, or outcome is promised or implied. {CHASE_SHEET.name} organizes and writes your follow-up; whether a customer says yes is between you and them.
        </p>

        <p className={styles.fine}>
          Questions: {BUSINESS.email.hello} or text {BUSINESS.phone.display}.{" "}
          <Link href={CHASE_SHEET.path} className={styles.textlink}>
            Back to {CHASE_SHEET.name}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
