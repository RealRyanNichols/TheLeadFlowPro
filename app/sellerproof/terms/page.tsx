import type { Metadata } from "next";
import Link from "next/link";
import styles from "../sellerproof.module.css";
export const metadata: Metadata = {
  title: "SellerProof purchase terms",
  alternates: { canonical: "/sellerproof/terms" },
};
export default function Terms() {
  return (
    <main className={styles.page}>
      <article className={`${styles.shell} ${styles.legal}`}>
        <Link href="/sellerproof">← SellerProof</Link>
        <h1>One packet. Clear expectations.</h1>
        <p>
          SellerProof is offered through The LeadFlow Pro. The site's{" "}
          <Link href="/terms">general terms</Link> also apply.
        </p>
        <h2>What your $49 buys</h2>
        <p>
          One payment in USD unlocks a printable packet for one dispute, bound
          to the payment provider, order reference, dispute reference, amount,
          and currency entered at checkout. You can revise the supporting
          statement, timeline, and evidence for that dispute and export again.
          There is no subscription or automatic renewal. SellerProof is separate
          from the Pro Kits catalog and bundle. Hosted access and signed backups
          are available for one year from purchase; downloaded HTML and PDF
          files can be kept.
        </p>
        <h2>What you receive</h2>
        <p>
          The packet includes your response draft, timeline, evidence index,
          missing-information notes, and review checklist. The download is HTML
          that you can print or save as PDF using your browser. It contains your
          entered text, not the original files named in the index. You are
          responsible for attaching those original records separately.
        </p>
        <h2>Your review and submission</h2>
        <p>
          SellerProof is a document-organization tool. It is not a law firm,
          payment processor, bank, or card network. It does not verify evidence
          authenticity, decide disputes, provide legal advice, guarantee an
          outcome, or submit anything for you. Confirm the actual deadline, time
          zone, permitted formats, and evidence requirements in your own
          provider dashboard. You are responsible for the truth and accuracy of
          your entries and for submitting them on time.
        </p>
        <h2>Support and billing problems</h2>
        <p>
          If payment succeeds but your export does not work, keep your draft and
          receipt and contact us. Do not pay again to solve an access problem.
          We will investigate access, duplicate charges, or delivery problems
          and address any refund request under the site's terms and applicable
          requirements. A dispute outcome is not a SellerProof delivery result.
        </p>
        <h2>Keep your records</h2>
        <p>
          Download a private backup before closing the builder. Keep your
          exported packet and the original evidence securely. Review our{" "}
          <Link href="/sellerproof/privacy">evidence-handling details</Link>{" "}
          before entering sensitive information.
        </p>
        <p>
          <Link href="/contact">Get help from The LeadFlow Pro</Link>
        </p>
      </article>
    </main>
  );
}
