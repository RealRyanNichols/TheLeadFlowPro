import ContactForm from "./ContactForm";
import { Check, Phone } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";

export const metadata = {
  title: "Contact | The LeadFlow Pro",
  description: "Send a message. I read every one myself.",
};

export default function ContactPage() {
  return (
    <main className="cb-page">
      <SiteHero
        compact
        eyebrow="Ask it straight"
        mutedTitle="No ticket queue."
        title="Send Ryan the real question."
        body="Question about a Website Launch, a larger system, training, or whether the offer fits your business? Send the context. Ryan reads every message himself."
        media={{
          src: "/images/homepage-v2/connected-company-hero.webp",
          alt: "A connected company operating system with multiple business signals feeding one core",
          kicker: "One message",
          caption: "Route the question to the right next move.",
        }}
        primary={{ href: "#contact-form", label: "Send the question" }}
        secondary={{ href: "tel:+19035008898", label: "Call or text (903) 500-8898", external: true }}
        trustLine="No list selling. No fake urgency. A direct answer from the operator."
      />

      <section id="contact-form" className="cb-band sv-form-band scroll-mt-24">
        <div className="cb-shell sv-form-grid">
          <div className="sv-form-intro">
            <p className="cb-eyebrow">Before you send it</p>
            <h2 className="cb-h2">The useful context fits in three lines.</h2>
            <ul className="sv-form-points">
              {[
                "What the business sells and who buys it",
                "What is broken, slow, disconnected, or costing you time",
                "What you want a customer or team member to do next",
              ].map((point) => (
                <li key={point}>
                  <Check aria-hidden="true" className="h-5 w-5" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="tel:+19035008898">
                <Phone aria-hidden="true" className="h-4 w-4" />
                Call or text (903) 500-8898
              </a>
            </div>
          </div>
          <div className="sv-form-card">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
