import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Your Weird Stat Is In | The Weird Stats Clock",
  description: "Your stat request is in the machine. Watch the queue or browse live boards.",
  path: "/request/thank-you",
  noIndex: true,
});

export default function RequestThankYouPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LightHeader activePath="/request" />
      <main className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6 text-center shadow-2xl shadow-black/20 sm:p-10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-cyan-200" />
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
            Your weird stat is in the machine.
          </h1>
          <p className="mt-4 text-base leading-7 text-cyan-50/90">
            The request can move into review, formula building, a public card, a private answer,
            or a custom stat page depending on what you chose.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/requests"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
            >
              Watch the queue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/boards"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-slate-950/70 px-6 py-3 text-sm font-black text-cyan-50 hover:bg-slate-900"
            >
              Browse boards <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <LightFooter />
    </div>
  );
}
