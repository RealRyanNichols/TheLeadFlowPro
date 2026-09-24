import type { Metadata } from "next";
import Link from "next/link";
import { COST_LIMIT_LINE, FILTER_LINE, PARTIAL_WRITE_LINE, POST_CREATOR, POST_CREATOR_DISCLAIMER, SPEND_PAUSE_LINE } from "@/lib/postCreator/product";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import { planAllowanceLine } from "../copy";

// Post Creator purchase terms. Every allowance, price, and grace period is
// read from lib/postCreator/product.ts (through planAllowanceLine in
// ../copy.ts, which reads aiLimitsFor), so these terms say
// exactly what the write route meters, per plan, and what checkout charges.
// The commitments here are the ones already live for Chase Sheet (a
// seven-day first-purchase refund, and the one payment plan lasting as long
// as the product is offered with 90 days' notice); anything beyond them needs
// Ryan's approval first (docs/decisions-needed.md items 93 and 95).

export const metadata: Metadata = withPublicPageMetadata("/post-creator/terms", {
  title: "Post Creator purchase terms | The LeadFlow Pro",
  description: "What the monthly plan and the one payment plan cover, how AI writing limits work, and what you post yourself.",
});

const H2 = "pt-6 text-[22px] font-extrabold leading-tight text-[var(--heading)]";
// Inline links get vertical padding: it widens the tap target to about 44px
// without changing the line height of the sentence around them.
const LINK = "py-3 font-bold text-[var(--blue)] underline underline-offset-4";

function Email() {
  return (
    <a href={`mailto:${BUSINESS.email.hello}`} className={LINK}>
      {BUSINESS.email.hello}
    </a>
  );
}

export default function PostCreatorTermsPage() {
  return (
    <main className="cb-page">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10 text-[16px] leading-relaxed text-[var(--text)] sm:py-14">
        <p className="cb-eyebrow">{POST_CREATOR.name} purchase terms</p>
        <h1 className="text-[36px] font-black leading-tight tracking-[-0.03em] text-[var(--heading)] sm:text-[44px]">Know what you are buying.</h1>
        <p>
          {POST_CREATOR.name} is sold by {BUSINESS.dbaLine}. These terms cover the two ways to buy it and what happens after. The site&apos;s general{" "}
          <Link href="/terms" className={LINK}>
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className={LINK}>
            privacy policy
          </Link>{" "}
          also apply.
        </p>

        <h2 className={H2}>What you get</h2>
        <p>
          The idea machine and the month planner, with your settings filled in from your saved business profile. AI writing that drafts posts in
          your voice from that profile, for up to three platforms at a time, with two other first lines and a photo idea. Your business profile
          saved to your account so it follows you to every device.
        </p>

        <h2 className={H2}>AI writing allowance</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>{planAllowanceLine("monthly")}</li>
          <li>{planAllowanceLine("lifetime")}</li>
        </ul>
        <p>
          Months and days follow Central time. One AI write is one tap of Write it, for up to {POST_CREATOR.ai.maxPlatformsPerWrite} platforms
          at once. A write that fails, is declined, or comes back unusable does not count, and unused writes do not carry over.{" "}
          {PARTIAL_WRITE_LINE} The tries ceiling counts every try, the ones that fail included, to keep costs fair.
        </p>
        <p>{COST_LIMIT_LINE}</p>
        <p>{SPEND_PAUSE_LINE}</p>
        <p>
          AI writing can also pause while a problem with it, or with the company that runs the AI model, is being fixed. The idea machine and
          the month planner keep working during any pause. Switching AI writing off for good would count as discontinuing {POST_CREATOR.name},
          with the notice described under One payment.
        </p>

        <h2 className={H2}>Monthly plan</h2>
        <p>
          {POST_CREATOR.monthlyLabel}, charged by card through Stripe on the date you start and on the same date each month after, until you
          cancel. Cancel from Settings inside {POST_CREATOR.name}, which opens Stripe&apos;s billing portal. The plan stops at the end of the month
          already paid and is not refunded for the rest of that month. If a renewal fails, the plan stays open for {POST_CREATOR.pastDueGraceDays}{" "}
          days while Stripe retries the card, then closes until a payment goes through.
        </p>

        <h2 className={H2}>One payment</h2>
        <p>
          {POST_CREATOR.lifetimeLabel}, charged once by card through Stripe. Nothing renews and there is nothing to cancel. It includes the AI
          writing allowance above for as long as {POST_CREATOR.name} is offered by The LeadFlow Pro. If it is ever discontinued, AI writing
          included, you will get at least 90 days&apos; notice by email. If you buy it while a monthly plan is running, the monthly plan stops
          renewing, so you are not charged for both, and AI writing keeps the monthly allowance through the end of the calendar month in which
          your last paid monthly period ends. A monthly plan whose renewal did not go through is cancelled right away instead, so the card is
          not tried again.
        </p>

        <h2 className={H2}>Refunds</h2>
        <p>
          Email <Email /> within seven days of a first purchase and it will be refunded in full. A refund or a card dispute closes the plan, and
          on the monthly plan the subscription is cancelled so it does not renew. Renewal months on the monthly plan are not refunded; cancel
          before the renewal date instead.
        </p>

        <h2 className={H2}>What you post yourself</h2>
        <p>{POST_CREATOR_DISCLAIMER}</p>
        <p>
          You are the author and publisher of every post. Check every draft for accuracy, fill in the bracketed parts with true details, and
          follow each platform&apos;s rules and the advertising laws where you work. {POST_CREATOR.name} never posts, messages, or emails anyone
          for you.
        </p>

        <h2 className={H2}>What the drafts are</h2>
        <p>Free drafts come from templates. AI drafts come from an AI model run by Anthropic.</p>
        <p>{FILTER_LINE}</p>

        <h2 className={H2}>Opening {POST_CREATOR.name} and your key</h2>
        <p>
          After payment, {POST_CREATOR.name} opens in the browser you bought it in the first time you arrive from checkout, if the email you paid
          with had no {POST_CREATOR.name} account before, and only within a day of checkout. A key is emailed to the address you paid with. That
          email and key open {POST_CREATOR.name} on any device. Anyone holding them can use your AI writes and see your profile, so treat the key
          like a password. When a new purchase is made on an email that already has {POST_CREATOR.name}, every device is signed out and the key
          opens it again.
        </p>

        <h2 className={H2}>Your data</h2>
        <p>
          Your email, plan, and business profile are stored in The LeadFlow Pro&apos;s database so your devices see the same thing. For each AI
          request we keep the time, the size, the cost, and whether it worked, but not the draft text. To write a draft, your profile, the idea,
          and your note are sent to Anthropic, the company that runs the AI model, only to write that draft. The free idea machine runs in your
          browser, and nothing you type into it is sent to us; like the rest of the site, its page counts visits and button taps. Saved ideas and
          drafts stay in your browser. Email <Email /> to delete your account.
        </p>

        <h2 className={H2}>No promises about results</h2>
        <p>
          No reach, followers, leads, sales, or other result is promised or implied. {POST_CREATOR.name} helps you decide what to post and drafts
          it; what happens after you post is up to your audience.
        </p>

        <h2 className={H2}>Questions</h2>
        <p>
          Email <Email /> or text {BUSINESS.phone.display}.
        </p>
        <p>
          <Link href={POST_CREATOR.path} className={`${LINK} inline-flex min-h-[44px] items-center`}>
            Back to {POST_CREATOR.name}
          </Link>
        </p>
      </div>
    </main>
  );
}
