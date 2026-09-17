import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import { marketablePacks, verticalPack } from "@/lib/hq/verticals";
import { PLUGIN } from "@/lib/pluginDocs";
import { offer } from "@/lib/site/offers";

// A vertical pack's product page. It renders only for a pack whose every
// workflow exists in the engine (lib/hq/verticals.ts); a draft pack is a
// 404, not a coming-soon page. The price is the offer's label, which is
// the TBD line until Ryan sets a number.

export const dynamic = "force-static";

export function generateStaticParams() {
  return marketablePacks().map((p) => ({ pack: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ pack: string }> }): Promise<Metadata> {
  const { pack: id } = await params;
  const pack = marketablePacks().find((p) => p.id === id);
  if (!pack) return PRIVATE_PAGE_METADATA;
  return { title: `${PLUGIN.name}: ${pack.name} | The LeadFlow Pro`, description: pack.promise };
}

export default async function PackPage({ params }: { params: Promise<{ pack: string }> }) {
  const { pack: id } = await params;
  const pack = verticalPack(id);
  if (!pack || !marketablePacks().some((p) => p.id === pack.id)) notFound();
  const o = offer(pack.offerId);
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <p className="hq-eyebrow">{PLUGIN.name}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--heading)]">{pack.name}</h1>
      <p className="mt-3 text-lg text-[var(--text)]">{pack.promise}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{pack.audience}</p>

      <section className="mt-8">
        <h2 className="text-xl font-black text-[var(--heading)]">What it runs for you</h2>
        <ul className="mt-3 space-y-2">
          {pack.workflows.map((w) => (
            <li key={w.id} className="flex gap-2 text-sm text-[var(--text)]">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--green)]" />
              <span>
                <strong>{w.name}.</strong> {w.does}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black text-[var(--heading)]">Say it like this</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--text)]">
          {pack.prompts.map((p) => (
            <li key={p.prompt}>
              <em>&ldquo;{p.prompt}&rdquo;</em> {p.does}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black text-[var(--heading)]">Not included</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-[var(--text)]">
          {pack.notIncluded.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <section className="hq-card mt-8">
        <p className="hq-eyebrow">Price</p>
        <p className="mt-1 text-2xl font-black text-[var(--heading)]">{o.priceLabel}</p>
        <p className="mt-1 text-sm text-[var(--text)]">{o.terms}</p>
        <p className="mt-3 text-sm text-[var(--text)]">
          Requires the plugin ({PLUGIN.priceLabel}, {PLUGIN.trialDays}-day trial).{" "}
          <Link href={PLUGIN.docsHref} className="font-bold text-[var(--blue)] underline">
            Plugin docs
          </Link>
        </p>
      </section>
    </main>
  );
}
