import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { StatsDisclaimer } from "@/components/weird-stats/StatsDisclaimer";
import { UnlockCard } from "@/components/weird-stats/UnlockCard";
import { WEIRD_PURCHASE_PRODUCTS } from "@/lib/weird-stats";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Unlock Weird Stats | The Weird Stats Clock",
  description:
    "Buy tiny weird stat boosts, priority requests, private research pulls, custom stat pages, and sponsored stat boards.",
  path: "/unlock",
  imageTitle: "Weird Stats Unlocks",
  imageSubtitle: "Micropurchases for strange numbers, deeper boards, and custom stat pages.",
});

export default function UnlockPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LightHeader activePath="/unlock" />
      <main className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[96rem]">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-accent-300/25 bg-accent-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-accent-100">
              Micropurchase menu
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Unlock deeper stat cards without buying a giant package.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Boost the queue, submit strange questions, buy private pulls, sponsor boards,
              or turn one idea into a shareable stat page.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {WEIRD_PURCHASE_PRODUCTS.map((product) => (
              <UnlockCard key={product.key} product={product} />
            ))}
          </div>
          <div className="mt-8">
            <StatsDisclaimer />
          </div>
        </div>
      </main>
      <LightFooter />
    </div>
  );
}
