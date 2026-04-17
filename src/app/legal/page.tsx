import Link from "next/link";
import { ShieldCheck, FileText, Lock, RotateCcw, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Legal · Terms, Privacy & Refund — The LeadFlow Pro",
  description:
    "The short version: we're fair, we protect your data, and we refund within 14 days if LeadFlow Pro isn't right for you.",
};

const LAST_UPDATED = "April 17, 2026";
const ENTITY = "REAL RYAN NICHOLS LLC";
const CONTACT_EMAIL = "support@theleadflowpro.com";

export default function LegalPage() {
  return (
    <main className="relative">
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      <div className="container py-12 md:py-20 max-w-3xl mx-auto">
        <div className="text-center mb-10 md:mb-14 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 text-xs font-semibold mb-4">
            <ShieldCheck className="h-4 w-4" /> Plain-English legal
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Legal, <span className="funnel-text">the short version</span>
          </h1>
          <p className="mt-3 text-ink-300">
            No 50-page scroll. Everything that actually matters, in four short sections.
          </p>
          <p className="mt-2 text-xs text-ink-300">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-6 md:space-y-8 animate-fade-up">
          <Section
            icon={<RotateCcw className="h-5 w-5" />}
            title="Refund policy — 14 days, no questions"
            id="refund"
          >
            <p>
              Every paid plan includes a <strong className="text-white">14-day money-back guarantee</strong>.
              Email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              within 14 days of your first charge and we refund the full amount — no forms, no survey,
              no friction.
            </p>
            <p>
              Cancel anytime in one click from the billing page. Your plan stays active until the
              end of the current period; you are not charged again.
            </p>
            <p className="text-ink-300 text-sm">
              Boosters (one-time credit top-ups) are non-refundable once the credits have been spent.
              Unused boosters are refunded on request within 14 days of purchase.
            </p>
          </Section>

          <Section
            icon={<Lock className="h-5 w-5" />}
            title="Privacy — what we do with your data"
            id="privacy"
          >
            <p>
              We collect only what we need to run LeadFlow Pro for you: your email, any business
              info you enter, leads you bring into the platform, and usage data so we can improve
              the product.
            </p>
            <p>
              <strong className="text-white">We don't sell your data. Ever.</strong> We don't rent it,
              license it, or hand it to advertisers. Your leads belong to you.
            </p>
            <p>
              Payment details are handled by Stripe — we never see or store your card number. Auth
              may use Google, Facebook, or X (Twitter) OAuth, which means those providers verify
              your identity and hand us a session token; nothing more.
            </p>
            <p>
              You can request a full export or deletion of your account data at any time by
              emailing{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We honor the request within 30 days.
            </p>
          </Section>

          <Section
            icon={<FileText className="h-5 w-5" />}
            title="Terms of service — what you agree to"
            id="terms"
          >
            <p>
              By using LeadFlow Pro you agree to use it for lawful business purposes only. No spam
              blasts to non-consenting recipients, no scraping in violation of third-party terms,
              no harassment, no phishing — the stuff you'd expect.
            </p>
            <p>
              We provide the service "as is." The tools are powerful, but you run your business —
              you're responsible for how you use what we give you. We're not liable for indirect
              damages (lost profits, lost leads due to outages, etc.) beyond what you paid us in
              the last 90 days.
            </p>
            <p>
              We may update the service, adjust pricing, or change features. For pricing changes on
              existing plans we give at least 30 days notice. You can cancel any time before then
              and the change doesn't affect you.
            </p>
            <p>
              These terms are governed by the laws of the <strong className="text-white">State of Texas,
              United States</strong>. If we ever have a dispute we can't settle directly, it goes to
              arbitration in Texas — but first, email us and we'll genuinely try to fix it.
            </p>
          </Section>

          <Section
            icon={<MapPin className="h-5 w-5" />}
            title="Company info"
            id="company"
          >
            <p>
              LeadFlow Pro is operated by <strong className="text-white">{ENTITY}</strong>, a Texas
              limited liability company.
            </p>
            <p>
              <strong className="text-white">Contact:</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-ink-300 text-sm">
              This page is written in plain language for readability. It is not a substitute for
              formal legal counsel. If you have specific legal questions about using LeadFlow Pro
              for your business, consult a licensed attorney in your jurisdiction.
            </p>
          </Section>
        </div>

        <div className="mt-12 md:mt-16 text-center animate-fade-up">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold text-base text-slate-900 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 shadow-[0_0_24px_rgba(251,146,60,0.4)] hover:scale-[1.02] active:scale-95 transition"
          >
            <ShieldCheck className="h-5 w-5" />
            Start free — backed by a 14-day guarantee
          </Link>
          <p className="mt-3 text-xs text-ink-300">
            Questions?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:underline">
              <Mail className="inline h-3 w-3 mr-1" />
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({
  icon,
  title,
  id,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 md:p-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 p-2">
          {icon}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3 text-ink-100 leading-relaxed">{children}</div>
    </section>
  );
}
