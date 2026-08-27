import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribed | The LeadFlow Pro",
  robots: { index: false, follow: false },
};

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const failed = e === "1";

  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">{failed ? "That link did not work" : "Done"}</p>
          <h1 className="cb-h1">
            {failed ? "I could not find that one." : "You are unsubscribed."}
            <em>
              {failed
                ? "Email hello@theleadflowpro.com and I will take you off by hand."
                : "No more marketing emails from me. That is it, no confirmation step."}
            </em>
          </h1>
          <p className="cb-hero-lead">
            {failed
              ? "The link may have been broken by your email app. Send me a note and I will handle it the same day."
              : "If you ever bought something from me you will still get the emails about that work, because those are not marketing, they are your order. Everything else stops now."}
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--ghost" href="/">
              Back To The Site
            </Link>
            <a className="cb-btn cb-btn--ghost" href="mailto:hello@theleadflowpro.com">
              Email Ryan
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
