import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Check,
  ClipboardList,
  Coins,
  ListChecks,
  MessageSquareReply,
  RotateCcw,
  Send,
  Smartphone,
  SunMedium,
  Wrench,
} from "lucide-react";
import { CHASE_SHEET, CHASE_SHEET_DISCLAIMER } from "@/lib/chaseSheet/product";
import { TONE_OPTIONS } from "@/lib/chaseSheet/messages";
import { TRADES, TRADE_OPTIONS } from "@/lib/chaseSheet/trades";
import { BUSINESS } from "@/lib/site/business";
import BuyButtons, { BuyButton } from "./BuyButtons";
import DemoSequence from "./DemoSequence";
import QuoteLeakCalculator from "./QuoteLeakCalculator";
import styles from "./chase-sheet.module.css";

const title = `Chase Sheet: Every Open Quote, Chased Every Day | The LeadFlow Pro`;
const description = `The follow-up for every quote you send, written for your trade, sent from your own phone with one tap. ${CHASE_SHEET.monthlyLabel} or ${CHASE_SHEET.lifetimeLabel}. Nothing is sent for you.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BUSINESS.siteUrl}${CHASE_SHEET.path}` },
  openGraph: {
    title,
    description,
    url: `${BUSINESS.siteUrl}${CHASE_SHEET.path}`,
    siteName: BUSINESS.name,
    type: "website",
    images: [{ url: `${CHASE_SHEET.path}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title, description, images: [`${CHASE_SHEET.path}/opengraph-image`] },
};

const TRADE_COUNT = TRADES.length - 1;

const faqs: [string, string][] = [
  [
    "What do I get for paying that the free demo does not?",
    "The demo writes the words for one quote, dated from today, and keeps nothing. The sheet keeps every quote you have out with the day you actually sent it, works out who is due each morning and in what order, puts the text or the call one tap away with the words already in it, logs what you sent and whether they answered, re-spaces the next touch when you run late, holds a quote for three days when they reply, carries every objection reply for your trade with the customer's name in it, and keeps a ledger of what the chasing won. The demo is the writing. The sheet is the remembering, the ordering, and the sending.",
  ],
  [
    "Does it send the texts for me?",
    "No, and that is on purpose. You read the message, you tap send, and it goes out from your own phone number in your own name. That means no new number for customers to ignore, no carrier registration, no per-message fees, and no robot texting people who trusted you with a quote. The sheet does the remembering and the writing. You do the sending.",
  ],
  [
    "Does it work on my phone?",
    "Yes. It is a website, so there is nothing to install. Open it on your phone, add it to your home screen, and the morning list is there. The key in your receipt opens the same sheet on any device.",
  ],
  [
    "Is this a CRM?",
    "No. It has one job: every quote you have out gets chased on time, with the right words, until it is won, lost, or honestly closed. If you already run a CRM, this sits beside it. If you do not, this is the part of a CRM most businesses actually needed.",
  ],
  [
    "What if my trade is not on the list?",
    `There are ${TRADE_COUNT} trade libraries today plus a general one that works for any service business. Pick the closest one, and if you want yours written properly, reply to your receipt and tell Ryan what you quote. Libraries added later are included on both plans.`,
  ],
  [
    "Can my office manager use it too?",
    "Yes. The same email and key open the same sheet on their device. One business, one sheet, whoever is doing the chasing that morning.",
  ],
  [
    "What happens if I cancel the monthly plan?",
    "You cancel from inside the sheet, it stops at the end of the paid month, and the sheet locks after that. Export your quotes to a spreadsheet any time before then. The one-payment plan never locks.",
  ],
  [
    "Where are my customers' details kept?",
    "In your sheet, under your email, so your phone and your desk see the same list. Nobody at The LeadFlow Pro contacts your customers, ever, and your list is not shared or sold. You can export it or ask for it to be deleted at any time.",
  ],
  [
    "Is there a guarantee?",
    "No promises about results. The calculator on this page runs on the numbers you type in, and the only thing the sheet guarantees is that no quote of yours goes quiet without you deciding to let it.",
  ],
];

export default function ChaseSheetPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topline}>
          <span className={styles.wordmark}>
            <ListChecks aria-hidden="true" size={26} />
            Chase<span>Sheet</span>
          </span>
          <span>By The LeadFlow Pro, Longview, Texas</span>
        </div>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>The follow-up engine for open quotes</p>
            <h1>
              You sent the quote. Then it went quiet.
              <span>Chase Sheet does the chasing.</span>
            </h1>
            <p className={styles.heroBody}>
              Every quote you have out. Who to chase today, in what order. The exact text to send, written for your trade and the way you talk. One tap, and it goes out from your own phone.
            </p>
            <BuyButtons />
            <p className={styles.heroFine}>
              No app to install. No new phone number. Nothing sent for you. Cancel from inside the sheet.{" "}
              <a href="#demo" className={styles.textlink} style={{ color: "#a9bfff" }}>
                Watch it write your follow-up first.
              </a>
            </p>
          </div>
          <div className={styles.sheetCard} aria-label="An example morning sheet">
            <div className={styles.sheetTop}>
              <span>TODAY&rsquo;S SHEET</span>
              <span>4 to chase</span>
            </div>
            {[
              ["Day 3", "Dana, the roof", "The real conversation. Call, then the voicemail text.", "$8,400"],
              ["Day 1", "Marcus, back fence", "Did it land. One text, no rush.", "$3,250"],
              ["Day 15", "Priya, 4 ton system", "The honest reason. Summer books install slots first.", "$7,900"],
              ["Day 30", "The Hills, deck stain", "Closing the file. The polite last word.", "$1,100"],
            ].map(([day, who, what, amount]) => (
              <div className={styles.sheetRow} key={who}>
                <span className={styles.sheetStep}>{day}</span>
                <div>
                  <strong>{who}</strong>
                  <p>{what}</p>
                </div>
                <span className={styles.sheetAmount}>{amount}</span>
              </div>
            ))}
            <div className={styles.sheetFoot}>
              <span>
                On the sheet today: <strong>$20,650</strong>
              </span>
              <span>Example only</span>
            </div>
          </div>
        </section>

        <div className={styles.strip}>
          <span>Written for</span>
          <strong>Roofers</strong>
          <strong>HVAC</strong>
          <strong>Plumbers</strong>
          <strong>Electricians</strong>
          <strong>Fence</strong>
          <strong>Remodel</strong>
          <strong>Landscaping</strong>
          <strong>Dental</strong>
          <span>and {TRADE_COUNT - 8} more trades</span>
        </div>

        <section className={styles.section}>
          <p className={styles.eyebrow}>The problem</p>
          <h2>The quote is not the sale. The follow-up is.</h2>
          <div className={styles.punch}>
            <p>You quote it. They say they will think about it.</p>
            <p>You get busy. The week goes. So does the job.</p>
            <p>
              <strong>Not because somebody beat your price. Because nobody called.</strong>
            </p>
            <p style={{ marginTop: 18, fontSize: 16, color: "#475569" }}>
              Every trade owner knows this. The pile of quiet quotes is the biggest pile of money in the business, and it is the one nobody has a system for. Chase Sheet is that system. It is the same daily discipline The LeadFlow Pro runs on its own leads every morning, built for your quotes.
            </p>
          </div>
        </section>

        <section className={styles.section} style={{ paddingTop: 0 }}>
          <p className={styles.eyebrow}>How it works</p>
          <h2>Three minutes a morning. Every quote worked.</h2>
          <div className={styles.threeCards}>
            {[
              { Icon: ClipboardList, title: "1. Add the quote", body: "Name, number, what you quoted, the amount, and the day it went out. Twenty seconds on your phone, right after you send it." },
              { Icon: SunMedium, title: "2. Open the sheet", body: "Each morning it tells you who to chase, in what order, and why this touch today. Behind first, biggest money next." },
              { Icon: Send, title: "3. Tap and send", body: "The text is written. The call script is written. Tap, it opens in your own messages with the words already in it, send, mark it done. Next one." },
            ].map(({ Icon, title: h, body }) => (
              <article className={styles.card} key={h}>
                <Icon aria-hidden="true" size={26} />
                <h3>{h}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} style={{ paddingTop: 0 }} id="different">
          <p className={styles.eyebrow}>Why a reminder app is not this</p>
          <h2>A reminder tells you to follow up. This hands you the words.</h2>
          <p className={styles.lead}>
            Anybody can build a list with dates on it. What took the time is everything underneath: the words, the pacing, and the money.
          </p>
          <div className={styles.moat}>
            {[
              { Icon: BookOpenText, title: `${TRADE_COUNT} trade libraries, written by hand`, body: "Every touch is built from your trade's vocabulary, its honest reasons a delay costs, the proof a customer in that trade wants to hear, and a seasonal hook that is true every year. A roof quote and a cleaning quote do not get the same text with the noun swapped." },
              { Icon: Wrench, title: "Seven touches, each with a different job", body: "Did it land. The real conversation. One question. The proof. The honest reason. The schedule call. Closing the file. In three tones, with two versions of the text steps so two customers in the same week never get the same message." },
              { Icon: Coins, title: "The pace follows the money", body: "A small job gets five touches over three weeks. A big, planned job gets seven patient touches over six. An urgent repair gets the same seven, compressed. Nothing on a Sunday, never two asks back to back." },
              { Icon: MessageSquareReply, title: "A reply for every objection", body: "Too expensive. Got a cheaper quote. Need to think. Waiting on insurance. Talk to my spouse. Might do it myself. The sheet carries the reply, in your tone, with the rule behind it, so you answer well instead of fast." },
              { Icon: RotateCcw, title: "Dead quotes get a second life", body: "When the file closes with no answer, the sheet waits three weeks and then six, and reopens it with a reason that fits the season. The quotes you gave up on become the ones you get back." },
              { Icon: Smartphone, title: "Your phone. Your number. Your name.", body: "No new number for customers to ignore. No carrier registration. No per-message fees. No robot. Every message goes out from you, which is the only kind of follow-up a customer actually answers." },
            ].map(({ Icon, title: h, body }) => (
              <div className={styles.moatItem} key={h}>
                <Icon aria-hidden="true" size={22} />
                <div>
                  <strong>{h}</strong>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} style={{ paddingTop: 0 }} id="leak">
          <p className={styles.eyebrow}>Your numbers</p>
          <h2>What the quiet pile is worth to you.</h2>
          <p className={styles.lead}>Four numbers you already know. The math is yours; nothing here is a claim about results.</p>
          <QuoteLeakCalculator />
        </section>

        <section className={styles.section} style={{ paddingTop: 0 }} id="demo">
          <p className={styles.eyebrow}>Try it free</p>
          <h2>Watch it write your follow-up.</h2>
          <p className={styles.lead}>
            Describe one quote. The sheet writes the first three touches for it, in your trade, in your tone, on real dates, and dates the rest. This is the actual engine, not a sample.
          </p>
          <DemoSequence trades={TRADE_OPTIONS} tones={TONE_OPTIONS} />
          <p className={styles.lead} style={{ marginTop: 26 }}>
            The demo writes the words for one quote and forgets it. The sheet remembers every quote you have out, tells you who to chase each morning and in what order, and puts each text one tap from sent.
          </p>
        </section>

        <section className={styles.pricing} id="pricing">
          <p className={styles.eyebrow}>Two ways to pay. One sheet.</p>
          <h2>Less than one quote a year has to come back.</h2>
          <p className={styles.lead}>Pick monthly and cancel any time from inside the sheet, or pay once and never think about it again. Both get every trade library and every message added after.</p>
          <div className={styles.plans}>
            <div className={styles.priceCard}>
              <h3>Monthly</h3>
              <div className={styles.largePrice}>
                {CHASE_SHEET.monthlyLabel.replace("/mo", "")}
                <span>a month</span>
              </div>
              <ul>
                {["The whole sheet: quotes, the morning list, the words, the ledger", "Every trade library, and the ones added later", "Cancel from inside the sheet; stops at the end of the paid month", "Export your quotes any time"].map((x) => (
                  <li key={x}>
                    <Check aria-hidden="true" size={17} />
                    {x}
                  </li>
                ))}
              </ul>
              <BuyButton plan="monthly" label={`Start for ${CHASE_SHEET.monthlyLabel}`} />
            </div>
            <div className={`${styles.priceCard} ${styles.featured}`}>
              <h3>One payment, yours for good</h3>
              <div className={styles.largePrice}>
                {CHASE_SHEET.lifetimeLabel.replace(" once", "")}
                <span>once</span>
              </div>
              <ul>
                {["Everything in monthly, for as long as the sheet exists", "Nothing renews. Nothing to cancel. No card on file", "Pays for itself against five months of the monthly plan", "Every future trade library and message, included"].map((x) => (
                  <li key={x}>
                    <Check aria-hidden="true" size={17} />
                    {x}
                  </li>
                ))}
              </ul>
              <BuyButton plan="lifetime" label={`Pay ${CHASE_SHEET.lifetimeLabel}`} />
            </div>
          </div>
          <p className={styles.fine}>{CHASE_SHEET_DISCLAIMER}</p>
        </section>

        <section className={styles.section}>
          <p className={styles.eyebrow}>Straight answers</p>
          <h2>Know what you are buying.</h2>
          <div className={styles.faq}>
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <p className={styles.eyebrow}>Start tonight</p>
          <h2>Add the quotes you have out right now.</h2>
          <p>Tomorrow morning the sheet hands you the first one. By Friday you will know which of them were never really dead.</p>
          <BuyButtons compact />
          <p className={styles.fine}>
            Already bought it?{" "}
            <Link href={CHASE_SHEET.appPath} className={styles.textlink}>
              Open your sheet
            </Link>
            . Questions first? Text {BUSINESS.phone.display}.
          </p>
        </section>

        <div className={styles.legalLinks}>
          <Link href={CHASE_SHEET.termsPath}>Purchase terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/tools/pro">Pro Kits</Link>
          <Link href="/contact">
            Get help <ArrowRight aria-hidden="true" size={12} style={{ display: "inline" }} />
          </Link>
        </div>
      </div>
    </main>
  );
}
