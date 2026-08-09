import ShowcaseDashboard from "@/components/ShowcaseDashboard";

export const metadata = {
  title: "The Command Center | The LeadFlow Pro",
  description:
    "A live demo of the analytics and automation back office every LeadFlow Pro build includes: traffic, leads, conversions, attribution, and AI agents working 24/7.",
  openGraph: { images: [{ url: "/og/showcase.png", width: 1200, height: 630 }] },
};

export default function ShowcasePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-black text-white sm:text-5xl">
          The <span className="text-gradient">Command Center</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">
          This is the back office a LeadFlow Pro build ships with. Live traffic,
          instant lead response, full-funnel attribution, AI agents on shift
          around the clock. Simulated data — the architecture is real and it's
          the same one running the site you're on.
        </p>
      </div>
      <div className="mt-8">
        <ShowcaseDashboard />
      </div>
    </section>
  );
}
