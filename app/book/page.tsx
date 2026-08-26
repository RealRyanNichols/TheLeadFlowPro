import BookForm from "./BookForm";
import { Suspense } from "react";
import { Check } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";

export const metadata = {
  title: "Book a Call | The LeadFlow Pro",
  description:
    "Thirty minutes. Your next three moves. Tell me about your business and what you are paying to rent your platform.",
  alternates: { canonical: "https://www.theleadflowpro.com/book" },
};

export default function BookPage() {
  return (
    <main className="cb-page">
      <SiteHero
        compact
        eyebrow="A working conversation"
        mutedTitle="Bring the real business."
        title="Leave with the next three moves."
        body="Tell Ryan what you sell, where leads arrive, what you rent, and what keeps falling through. The call is for mapping the next move, not a generic sales presentation."
        media={{
          src: "/images/offer-v2/website-launch-approval-path.webp",
          alt: "A secure website build moving through review, approval, and launch",
          kicker: "Map. Review. Decide.",
          caption: "One clear path before anybody builds.",
        }}
        primary={{ href: "#book-form", label: "Tell Ryan about the business" }}
        secondary={{ href: "/packages", label: "See the current offer" }}
        trustLine="No guaranteed outcome claims and no pressure to force a larger system into a five-page scope."
      />

      <section id="book-form" className="cb-band sv-form-band scroll-mt-24">
        <div className="cb-shell sv-form-grid">
          <div className="sv-form-intro">
            <p className="cb-eyebrow">What makes the call useful</p>
            <h2 className="cb-h2">Show the leak, the stack, and the decision.</h2>
            <ul className="sv-form-points">
              {[
                "The offer customers are buying now",
                "Where calls, texts, forms, and DMs land",
                "The software bill and manual handoffs behind the work",
                "The deadline or decision you are trying to make",
              ].map((point) => (
                <li key={point}>
                  <Check aria-hidden="true" className="h-5 w-5" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="sv-form-card">
            <Suspense>
              <BookForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
