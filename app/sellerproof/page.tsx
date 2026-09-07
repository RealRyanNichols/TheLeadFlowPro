import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  FolderCheck,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { DISCLAIMER, SELLERPROOF } from "@/lib/sellerproof/packet";
import styles from "./sellerproof.module.css";

const title = "SellerProof: Chargeback Evidence Packets | The LeadFlow Pro";
const description =
  "Organize a chargeback response, timeline, and evidence index before your deadline. Preview free. Export one packet for $49. You review and submit it yourself.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/sellerproof" },
  openGraph: {
    title,
    description,
    url: "/sellerproof",
    images: [{ url: "/sellerproof/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/sellerproof/opengraph-image"],
  },
};
const included = [
  "A plain-English response draft from your facts",
  "A timeline with dates and source references",
  "An evidence index for your original records",
  "A checklist that flags missing information",
  "A printable document you can save as PDF",
  "A private backup to restore this packet and access",
];
const faqs = [
  [
    "Will SellerProof win my chargeback?",
    "No outcome is guaranteed. SellerProof organizes the information you enter. Your payment provider and the relevant decision-maker review the dispute; this tool does not decide it.",
  ],
  [
    "What does the $49 purchase cover?",
    "One dispute packet tied to the payment provider, order reference, dispute reference, amount, and currency you entered. You can revise its statement, timeline, and evidence and export again. There is no subscription. This purchase is separate from LeadFlow Pro Kits and their bundle.",
  ],
  [
    "Does it upload my files or connect to Stripe?",
    "No. You enter factual notes and an index of your records. SellerProof does not read or merge your original files or connect to your processor account. You attach those files yourself when submitting. Stripe is used only to securely collect the $49 purchase payment.",
  ],
  [
    "Can I use it for digital products or services?",
    "Yes. Choose physical goods, a digital product, a service, or a subscription. The checklist changes with that choice so you can focus on relevant records, such as delivery, usage, completion, or cancellation.",
  ],
  [
    "How do I get the PDF?",
    "After a verified purchase and your final review, download the printable HTML packet. Open it and choose Print, then Save as PDF. Review your provider's current file rules before uploading.",
  ],
  [
    "Where is my evidence saved?",
    "Your draft is kept in this browser tab. Download a private backup before closing it. Entries are processed on our server for checkout and paid export but are not stored in our database. Original files stay with you. Keep downloaded packets and backups private.",
  ],
  [
    "What if I lose access or the export fails?",
    "Restore your private backup to reopen the same packet and verify its purchase. If that fails, contact The LeadFlow Pro with your receipt. Do not purchase again to fix an access problem.",
  ],
];
export default function SellerProofPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topline}>
          <span className={styles.wordmark}>
            <ShieldCheck aria-hidden="true" />
            Seller<span>Proof</span>
          </span>
          <span>Available through The LeadFlow Pro</span>
        </div>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              A CHARGEBACK. A DEADLINE. A CLEAR RESPONSE.
            </p>
            <h1>
              Your records are scattered.
              <br />
              <span>Your response shouldn't be.</span>
            </h1>
            <p className={styles.heroBody}>
              Turn receipts, messages, delivery details, and activity records
              into an evidence packet a reviewer can follow.
            </p>
            <div className={styles.actions}>
              <Link href="/sellerproof/build" className={styles.primary}>
                Build your free preview{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                href="/sellerproof/sample"
                className={styles.lightButton}
                target="_blank"
                rel="noreferrer"
              >
                See a sample packet
              </a>
            </div>
            <p className={styles.heroFine}>
              Free to organize and review. $49 to export one dispute packet.
              <br />
              No subscription. You review and submit it yourself.
            </p>
          </div>
          <div
            className={styles.document}
            aria-label="Illustration of a SellerProof packet"
          >
            <div className={styles.docTop}>
              <ShieldCheck size={22} aria-hidden="true" />
              <span>SellerProof / PACKET PREVIEW</span>
            </div>
            <p className={styles.docTitle}>One organized record.</p>
            <p className={styles.docSub}>
              From the first payment to your final review.
            </p>
            {[
              ["01", "Response draft", "Your facts, in a clear order"],
              [
                "02",
                "Source timeline",
                "What happened, when, and where it is documented",
              ],
              [
                "03",
                "Evidence index",
                "A reference for each supporting record",
              ],
              [
                "04",
                "Missing information",
                "The gaps to check before submitting",
              ],
            ].map(([n, h, p]) => (
              <div className={styles.docRow} key={n}>
                <span>{n}</span>
                <div>
                  <strong>{h}</strong>
                  <p>{p}</p>
                </div>
                <Check size={17} aria-hidden="true" />
              </div>
            ))}
            <div className={styles.docFooter}>
              <Timer size={16} aria-hidden="true" />
              Your provider's actual deadline. No invented countdown.
            </div>
          </div>
        </section>
        <div className={styles.platforms}>
          <span>For sellers using</span>
          <strong>Stripe</strong>
          <strong>Shopify</strong>
          <strong>PayPal</strong>
          <strong>Square</strong>
          <span>or another payment provider</span>
        </div>
        <section className={styles.section}>
          <p className={styles.eyebrow}>FROM EVIDENCE TO RESPONSE</p>
          <h2>Get the facts into a form people can follow.</h2>
          <div className={styles.threeCards}>
            {[
              {
                Icon: ClipboardList,
                title: "1. Enter the dispute",
                body: "Add the payment details, the stated reason, and the deadline shown in your provider dashboard.",
              },
              {
                Icon: FolderCheck,
                title: "2. Organize your sources",
                body: "Describe what each record shows. Put events in order. See which useful evidence is still missing.",
              },
              {
                Icon: FileText,
                title: "3. Review and export",
                body: "Read the free preview, unlock one packet for $49, and save it as a PDF. Submit it with your original evidence.",
              },
            ].map(({ Icon, title: h, body }) => (
              <article className={styles.card} key={h}>
                <Icon aria-hidden="true" />
                <h3>{h}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.offer} id="pricing">
          <div>
            <p className={styles.eyebrow}>ONE DISPUTE. ONE PURCHASE.</p>
            <h2>
              Build it first.
              <br />
              Pay when you're ready to export.
            </h2>
            <p>
              See the draft and missing-evidence checklist before you spend
              anything. Your $49 purchase covers the printable packet for that
              dispute.
            </p>
            <ul>
              {included.map((x) => (
                <li key={x}>
                  <Check size={18} aria-hidden="true" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.priceCard}>
            <ShieldCheck size={38} aria-hidden="true" />
            <h3>Single Evidence Packet</h3>
            <div className={styles.largePrice}>
              ${SELLERPROOF.priceCents / 100}
              <span> USD</span>
            </div>
            <p>One payment. No renewal.</p>
            <Link href="/sellerproof/build" className={styles.primary}>
              Start with a free preview{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className={styles.fine}>
              Original files are not uploaded or merged. You attach them through
              your provider. This tool does not submit disputes or connect to
              your merchant account.
            </p>
            <p className={styles.fine}>{DISCLAIMER}</p>
          </div>
        </section>
        <section className={styles.section}>
          <p className={styles.eyebrow}>CLEAR EXPECTATIONS</p>
          <h2>Know what you're buying.</h2>
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
          <ShieldCheck aria-hidden="true" />
          <h2>Start with the records you already have.</h2>
          <p>Make the timeline clear. Identify the gaps. Review every word.</p>
          <Link className={styles.primary} href="/sellerproof/build">
            Build your free preview <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <p className={styles.fine}>{DISCLAIMER}</p>
        </section>
        <div className={styles.legalLinks}>
          <Link href="/sellerproof/terms">Purchase terms</Link>
          <Link href="/sellerproof/privacy">Privacy & evidence handling</Link>
          <Link href="/contact">Get help</Link>
        </div>
      </div>
    </main>
  );
}
