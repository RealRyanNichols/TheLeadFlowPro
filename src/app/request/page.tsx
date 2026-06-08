import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { RequestStatForm } from "@/components/weird-stats/RequestStatForm";
import { StatsDisclaimer } from "@/components/weird-stats/StatsDisclaimer";
import { getWeirdStatBySlug, weirdProductByKey } from "@/lib/weird-stats";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Request a Weird Stat | The Weird Stats Clock",
  description:
    "Submit a strange stat idea, buy a priority request, request a private research pull, or create a custom shareable stat page.",
  path: "/request",
  imageTitle: "Request a Weird Stat",
  imageSubtitle: "Put a strange number into the machine.",
});

export default function RequestPage({
  searchParams,
}: {
  searchParams?: { product?: string; stat?: string; request?: string; board?: string };
}) {
  const product = weirdProductByKey(searchParams?.product) ?? weirdProductByKey("submit_weird_stat_300");
  const stat = searchParams?.stat ? getWeirdStatBySlug(searchParams.stat) : null;
  const defaultQuestion = stat ? `Deeper version of: ${stat.title}` : "";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LightHeader activePath="/request" />
      <main className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
          <div>
            <div className="inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
              Request path
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Feed a strange number into the machine.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Submit the stat idea, choose the lane, and checkout for the request type.
              Public ideas can appear on the queue. Private pulls stay private.
            </p>
            {product ? (
              <div className="mt-6 rounded-3xl border border-accent-300/20 bg-accent-300/10 p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-accent-100">
                  Selected unlock
                </div>
                <h2 className="mt-3 text-2xl font-black text-white">{product.label}</h2>
                <p className="mt-2 text-sm leading-6 text-accent-50">{product.body}</p>
              </div>
            ) : null}
            <div className="mt-6">
              <StatsDisclaimer />
            </div>
          </div>
          <RequestStatForm
            defaultProductKey={product?.key ?? "submit_weird_stat_300"}
            defaultQuestion={defaultQuestion}
          />
        </div>
      </main>
      <LightFooter />
    </div>
  );
}
