import type { Metadata } from "next";
import Link from "next/link";
import { verifyUnsubscribeAny } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Email preferences | The LeadFlow Pro",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; t?: string }>;
}) {
  const { id = "", t = "" } = await searchParams;
  const valid = Boolean(id && t && verifyUnsubscribeAny(id, t));
  const action = `/api/unsubscribe?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`;

  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Email preferences</p>
          <h1 className="cb-h1">
            {valid ? "Stop the business-growth emails?" : "That link is not valid."}
            <em>
              {valid
                ? "One confirmation and future marketing emails stop immediately."
                : "It may have expired or been changed by your email app."}
            </em>
          </h1>
          <p className="cb-hero-lead">
            {valid
              ? "You may still receive messages that are necessary to answer a request or deliver work you purchased."
              : "Email hello@theleadflowpro.com and we will update your preferences by hand."}
          </p>
          <div className="cb-actions">
            {valid ? (
              <form action={action} method="post">
                <button className="cb-btn cb-btn--primary" type="submit">
                  Unsubscribe me
                </button>
              </form>
            ) : (
              <a className="cb-btn cb-btn--primary" href="mailto:hello@theleadflowpro.com">
                Email The LeadFlow Pro
              </a>
            )}
            <Link className="cb-btn cb-btn--ghost" href="/">
              Keep my emails
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
