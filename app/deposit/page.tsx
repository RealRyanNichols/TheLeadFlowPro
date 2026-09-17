import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, HandCoins, Receipt } from "lucide-react";
import DepositForm from "./DepositForm";
import { PRICES, usd } from "@/lib/site/prices";

export const metadata: Metadata = {
  title: "Website Launch Deposit | The LeadFlow Pro",
  description: `Reserve a five-page ${usd(PRICES.websiteLaunchTotal)} Website Launch with a ${usd(PRICES.websiteLaunchDeposit)} deposit. The remaining ${usd(PRICES.websiteLaunchFinal)} is due after approval and before launch.`,
  alternates: { canonical: "https://www.theleadflowpro.com/deposit" },
  robots: { index: false, follow: true },
};

const POINTS = [
  {
    icon: HandCoins,
    title: `One clear ${usd(PRICES.websiteLaunchTotal)} price`,
    body: `The five-page Website Launch is ${usd(PRICES.websiteLaunchTotal)} for the agreed scope: ${usd(PRICES.websiteLaunchDeposit)} to start and ${usd(PRICES.websiteLaunchFinal)} after approval, before launch.`,
  },
  {
    icon: Receipt,
    title: "Two simple payments",
    body: `The first ${usd(PRICES.websiteLaunchDeposit)} reserves the build and opens intake. Once intake begins, it is non-refundable, except where the written agreement or applicable law requires otherwise. The remaining ${usd(PRICES.websiteLaunchFinal)} is due after approval and before launch.`,
  },
  {
    icon: BadgeCheck,
    title: "Working approval checkpoint",
    body: "You review the working site and request revisions inside the agreed scope before the final payment.",
  },
];

export default function DepositPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Product Studio · Website Launch</p>
          <h1 className="cb-h1">
            <em>Reserve the build with {usd(PRICES.websiteLaunchDeposit)}.</em>
            Pay the final {usd(PRICES.websiteLaunchFinal)} after approval.
          </h1>
          <p className="cb-hero-lead">
            Your {usd(PRICES.websiteLaunchDeposit)} deposit opens intake and starts the working site. Review it, request
            revisions inside the agreed scope, and pay the remaining {usd(PRICES.websiteLaunchFinal)} only after you
            approve it and before it launches. Once intake begins, the deposit is
            non-refundable, except where the written agreement or applicable law requires
            otherwise.
          </p>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-deposit-grid">
            <div>
              <p className="cb-eyebrow">How this works</p>
              <h2 className="cb-h2 cb-heading">A fixed price with a real approval point.</h2>
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
                Already have a different amount confirmed in writing?{" "}
                <Link className="cb-textlink" href="/deposit/custom">
                  Use the custom project deposit
                </Link>
                . Otherwise, want to ask a question first?{" "}
                <Link className="cb-textlink" href="/contact">
                  Send a message
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
