import Link from "next/link";
import BookForm from "../book/BookForm";
import { Suspense } from "react";

export const metadata = {
  title: "Own Your Platform | The LeadFlow Pro",
  description:
    "Stop paying Shopify, Wix, WordPress, and AWeber every month. Get your site, funnel, and dashboard built on a stack you own. Book your call.",
  openGraph: { images: [{ url: "/og/go.png", width: 1200, height: 630 }] },
};

// Ad landing page: one message, one action. Built for Facebook and Google traffic.
export default function GoPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        {/* LEFT: the pitch */}
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-flow-400">
            For business owners tired of monthly fees
          </p>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
            What you pay Shopify and Wix every year could buy you a platform you{" "}
            <span className="text-flow-400">own forever.</span>
          </h1>
          <ul className="mt-6 space-y-3 text-lg text-slate-300">
            <li className="flex gap-3">
              <span className="text-mint">✓</span>
              Your website, funnel, and business dashboard. Built once. Yours for good.
            </li>
            <li className="flex gap-3">
              <span className="text-mint">✓</span>
              Your leads and customer data in YOUR database, not theirs.
            </li>
            <li className="flex gap-3">
              <span className="text-mint">✓</span>
              Runs on $0 to $25 a month instead of $200 to $800.
            </li>
            <li className="flex gap-3">
              <span className="text-mint">✓</span>
              Nobody can raise your rent, hold your data, or shut you off.
            </li>
          </ul>
          <div className="card mt-8 !bg-ink">
            <p className="font-semibold text-white">
              This page runs on the exact system I build for clients.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Real sites, real businesses, built and owned:{" "}
              <Link href="/portfolio" className="text-flow-400 underline">
                see the work
              </Link>
              .
            </p>
          </div>
        </div>

        {/* RIGHT: the form */}
        <div className="card lg:sticky lg:top-24">
          <h2 className="text-xl font-bold text-white">
            Book your call. Thirty minutes. Your next three moves.
          </h2>
          <p className="mb-5 mt-1 text-sm text-slate-400">
            Tell me what you are paying now. I will show you what owning it looks
            like.
          </p>
          <Suspense>
            <BookForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
