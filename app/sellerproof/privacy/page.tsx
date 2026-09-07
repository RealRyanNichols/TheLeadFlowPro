import type { Metadata } from "next";
import Link from "next/link";
import styles from "../sellerproof.module.css";
export const metadata: Metadata = {
  title: "SellerProof privacy & evidence handling",
  alternates: { canonical: "/sellerproof/privacy" },
};
export default function Privacy() {
  return (
    <main className={styles.page}>
      <article className={`${styles.shell} ${styles.legal}`}>
        <Link href="/sellerproof">← SellerProof</Link>
        <h1>Your records stay under your control.</h1>
        <p>
          These details cover SellerProof through The LeadFlow Pro. The site's{" "}
          <Link href="/privacy">general privacy policy</Link> also applies.
        </p>
        <h2>Drafts and original files</h2>
        <p>
          Your entries are kept in browser session storage for the current tab.
          Closing that tab can remove them. Browser session recovery can
          sometimes retain them, so use Clear draft before leaving a shared
          device. We do not upload, inspect, or store your original documents. A
          filename in the evidence index is a reference for you to attach
          yourself.
        </p>
        <h2>Checkout and export</h2>
        <p>
          Your entries are sent over HTTPS to our server when starting checkout
          or generating a paid export. We validate and process them for that
          request. SellerProof does not save those evidence entries in our
          database, use them to train AI, or send them to an AI provider. Stripe
          receives the purchase amount, an opaque packet ID, and a one-way
          digest that binds the purchase to your dispute. It does not receive
          the evidence entries from SellerProof. Stripe collects payment and
          receipt details directly.
        </p>
        <h2>Access and backups</h2>
        <p>
          A signed, secure access cookie identifies the purchased packet for up
          to one year. A private backup contains your entries and, after
          verification, a purchase recovery key. Anyone with that backup can
          read those entries and may restore its access. Store it securely.
          Delete downloaded backups, HTML packets, and PDFs yourself when no
          longer needed. Clear draft removes the working draft from this tab; it
          does not delete downloaded files or refund a purchase.
        </p>
        <h2>Data to leave out</h2>
        <p>
          Do not enter full payment-card numbers, security codes, bank
          credentials, government identifiers, medical information, or unrelated
          personal details. A card-data check catches some patterns but is not a
          complete redaction tool. Review every entry yourself.
        </p>
        <h2>Analytics and support</h2>
        <p>
          The SellerProof workspace excludes the site's marketing tracking and
          public analytics components. Operational request logs may still record
          route, time, and technical request metadata. SellerProof does not
          intentionally log evidence contents. For access or billing help,{" "}
          <Link href="/contact">contact The LeadFlow Pro</Link> with your
          receipt; do not include your evidence in the public contact form.
        </p>
      </article>
    </main>
  );
}
