import type { Metadata } from "next";
import Link from "next/link";
import CustomDepositForm from "./CustomDepositForm";

export const metadata: Metadata = {
  title: "Custom Project Deposit | The LeadFlow Pro",
  description: "Pay the deposit amount shown in an approved LeadFlow Pro scope.",
  robots: { index: false, follow: false },
};

export default function CustomDepositPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Approved custom scope</p>
          <h1 className="cb-h1">
            <em>Use the number in writing.</em>
            Keep the payment tied to the work.
          </h1>
          <p className="cb-hero-lead">
            Existing clients: pay only the deposit amount in your approved written scope. This page does not purchase a new 90-day campaign. If you do not have a written amount, discuss the campaign before paying.
          </p>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell cb-deposit-grid">
          <div>
            <p className="cb-eyebrow">Before you pay</p>
            <h2 className="cb-h2 cb-heading">Match the scope, amount and business.</h2>
            <p className="cb-lead">
              Looking for a new 90-day campaign?{" "}
              <Link className="cb-textlink" href="/pricing">
                Review the 90-day campaign and request your scope
              </Link>
              .
            </p>
          </div>
          <CustomDepositForm />
        </div>
      </section>
    </main>
  );
}
