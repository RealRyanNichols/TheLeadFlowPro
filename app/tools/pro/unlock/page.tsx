import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { KeyRound } from "lucide-react";
import UnlockForm from "./UnlockForm";

export const metadata: Metadata = {
  title: "Restore your Pro Kit access | The LeadFlow Pro",
  description:
    "Open a kit you already bought on a new phone or a different computer. Paste the key from your receipt, or have it sent again.",
  robots: { index: false, follow: true },
};

export default function ProUnlockPage() {
  return (
    <main className="cb-page">
      <section className="cb-band">
        <div className="cb-shell pro-unlock-shell">
          <span className="pro-unlock-icon">
            <KeyRound aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="cb-eyebrow">Already bought it</p>
          <h1 className="cb-h1">Open your kit here too.</h1>
          <p className="cb-lead">
            Kits unlock in the browser they were bought in. On a new phone, a different computer, or after
            clearing your history, this is how you get back in. There is no account and no password.
          </p>

          <Suspense fallback={null}>
            <UnlockForm />
          </Suspense>

          <div className="pro-unlock-help">
            <h2>If that does not work</h2>
            <ul>
              <li>
                Use the exact email address the card receipt went to. That is the one the key is tied to.
              </li>
              <li>
                If you have a login here with that same email, just{" "}
                <Link href="/login">sign in</Link> and your kits unlock on their own.
              </li>
              <li>
                Still stuck? Email <a href="mailto:hello@theleadflowpro.com">hello@theleadflowpro.com</a> or
                text (903) 500-8898 and it will be sorted out by hand.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
