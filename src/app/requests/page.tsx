import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { PublicRequestCard } from "@/components/weird-stats/PublicRequestCard";
import { PUBLIC_REQUEST_SEEDS } from "@/lib/weird-stats";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Public Weird Stat Queue | The Weird Stats Clock",
  description: "Vote, boost, follow, and share public weird stat ideas waiting for review or formula building.",
  path: "/requests",
  imageTitle: "Public Weird Stat Queue",
  imageSubtitle: "The audience decides which strange numbers move next.",
});

export default function RequestsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LightHeader activePath="/requests" />
      <main className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[96rem]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                Public queue
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Weird stat ideas waiting for votes, boosts, and formulas.
              </h1>
            </div>
            <Link
              href="/request"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
            >
              Submit a request <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PUBLIC_REQUEST_SEEDS.map((request) => (
              <PublicRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      </main>
      <LightFooter />
    </div>
  );
}
