import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, HandCoins, Receipt } from "lucide-react";
import DepositForm from "./DepositForm";

// The page Ryan sends when a free build lands and the owner says yes. Until
// this existed the only way to put money down was to pick one of the three
// packages, which does not fit a build that was quoted by real hours.

export const metadata: Metadata = {
  title: "Make a Down Payment | The LeadFlow Pro",
  description:
    "Put a down payment on your build. Credited in full toward the work. Card, Klarna, Afterpay or Affirm where available.",
  alternates: { canonical: "https://www.theleadflowpro.com/deposit" },
  robots: { index: false, follow: true },
};

const POINTS = [
  {
    icon: HandCoins,
    title: "Credited in full",
    body: "Every dollar comes off the price of the build. It is a down payment, not a fee.",
  },
  {
    icon: Receipt,
    title: "Priced by real hours",
    body: "The number you were quoted came from the actual work, never agency math.",
  },
  {
    icon: BadgeCheck,
    title: "You already saw it",
    body: "On the free build offer you look at the finished site first. Money only moves after that.",
  },
];

export default function DepositPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Down payment</p>
          <h1 className="cb-h1">
            <em>You saw it. You want it.</em>
            Let&rsquo;s get it moving.
          </h1>
          <p className="cb-hero-lead">
            Put a down payment on your build. It is credited in full toward the price we
            agreed on, and it is what moves the work from finished preview to your domain,
            your accounts, and your data.
          </p>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-deposit-grid">
            <div>
              <p className="cb-eyebrow">How this works</p>
              <h2 className="cb-h2 cb-heading">No surprises at the payment step.</h2>
              <ul className="cb-receipts cb-receipts--standalone">
                {POINTS.map((p) => (
                  <li key={p.title}>
                    <p.icon aria-hidden="true" className="h-5 w-5" />
                    <span>
                      <strong>{p.title}.</strong> {p.body}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="cb-lead">
                Not what you agreed on, or not sure yet?{" "}
                <Link className="cb-textlink" href="/contact">
                  Send a message first
                </Link>
              </p>
            </div>
            <DepositForm />
          </div>
        </div>
      </section>
    </main>
  );
}
