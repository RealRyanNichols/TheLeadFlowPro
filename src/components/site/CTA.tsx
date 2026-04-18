import Link from "next/link";

export function CTA() {
  return (
    <section className="py-12 md:py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-promo-glow p-6 md:p-16 text-center">
          <div className="absolute inset-0 -z-10 bg-grid-fade" />
          <h2 className="text-3xl md:text-5xl font-extrabold">
            See the data. <span className="funnel-text">Make the move.</span>
          </h2>
          <p className="mt-3 md:mt-4 text-ink-200 text-base md:text-lg max-w-2xl mx-auto">
            Free forever tier. No card. 3-minute setup. You stay in the driver's seat —
            we just make sure you can see the road.
          </p>
          <div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-accent text-base">
              Start free
            </Link>
            <Link href="#pricing" className="btn-ghost text-base">
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
