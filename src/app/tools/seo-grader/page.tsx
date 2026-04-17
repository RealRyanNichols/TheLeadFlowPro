import Link from "next/link";
import { ArrowLeft, Search, Zap, Eye } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { SeoGraderForm } from "./SeoGraderForm";

export const metadata = {
  title: "Free SEO Grader — The LeadFlow Pro",
  description:
    "Grade any local-business website on 14 on-page SEO signals in under 10 seconds. Free, no signup. Get a clear A–F grade plus the exact fixes that'll move you up.",
  openGraph: {
    title: "Free SEO Grader — The LeadFlow Pro",
    description:
      "Grade any local-business website in 10 seconds. A–F score + the exact fixes that'll move you up. Free, no signup.",
    type: "website"
  }
};

export default function SeoGraderPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
        <div className="container h-16 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-ink-300 hover:text-white inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-promo-glow" />
          <div className="absolute inset-0 -z-10 bg-grid-fade" />
          <div className="container pt-10 pb-6 md:pt-14 md:pb-8 text-center">
            <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold">
              Free tool · No signup
            </p>
            <h1 className="mt-2 text-3xl md:text-5xl font-extrabold text-white">
              How does your site stack up on <span className="funnel-text">Google?</span>
            </h1>
            <p className="mt-3 text-sm md:text-lg text-ink-200 max-w-2xl mx-auto">
              Paste your website. We'll grade it on the 14 on-page SEO signals that
              actually move the needle for local businesses — and tell you exactly
              what to fix first.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs md:text-sm text-ink-300">
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-cyan-400" /> ~10 seconds</span>
              <span className="flex items-center gap-1.5"><Search className="h-4 w-4 text-cyan-400" /> 14 checks</span>
              <span className="flex items-center gap-1.5"><Eye className="h-4 w-4 text-cyan-400" /> Plain-English fixes</span>
            </div>
          </div>
        </section>

        <section className="container pb-16">
          <div className="max-w-3xl mx-auto">
            <SeoGraderForm />
          </div>
        </section>

        <section className="container pb-16">
          <div className="max-w-3xl mx-auto glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white">What we check</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm text-ink-200">
              <Group
                title="On-page basics"
                items={["Page title tag + length", "Meta description + length", "H1 heading", "Canonical URL"]}
              />
              <Group
                title="Social sharing"
                items={["Open Graph tags (FB / iMessage)", "Twitter / X card"]}
              />
              <Group
                title="Technical"
                items={["HTTPS", "Mobile viewport", "Favicon", "Structured data (JSON-LD)", "Indexing / robots"]}
              />
              <Group
                title="Content"
                items={["Content length", "Image alt text coverage", "Internal links"]}
              />
            </div>
            <p className="mt-5 text-xs text-ink-400">
              This is the 80/20 set — the stuff Google actually weights for local
              searches. Our paid SEO tier adds weekly scans, competitor comparison,
              Core Web Vitals, full-site crawls, and a fix queue you can just work
              through one at a time.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-ink-950/70">
        <div className="container py-6 text-center text-xs text-ink-400">
          Free forever. Built by <Link href="/" className="text-cyan-400 hover:underline">The LeadFlow Pro</Link>.
        </div>
      </footer>
    </div>
  );
}

function Group({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i} className="text-sm text-ink-100">— {i}</li>
        ))}
      </ul>
    </div>
  );
}
