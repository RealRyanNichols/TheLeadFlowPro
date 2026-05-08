// src/app/pricing/[slug]/page.tsx — dynamic tier page
// One file serves /pricing/starter, /pricing/growth, /pricing/pro, /pricing/agency

import { notFound } from "next/navigation";
import { TIERS, TierSlug } from "@/lib/tiers";
import { TierSalesPage } from "@/components/site/TierSalesPage";
import { createSeoMetadata } from "@/lib/seo-metadata";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return (Object.keys(TIERS) as TierSlug[]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tier = TIERS[slug as TierSlug];
  if (!tier) return {};
  return createSeoMetadata({
    title: `${tier.name} — $${tier.priceMonthly}/mo · The LeadFlow Pro`,
    description: tier.subhead,
    path: `/pricing/${tier.slug}`,
    imageTitle: `${tier.name} Plan`,
    imageSubtitle: tier.tagline,
  });
}

export default async function TierPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tier = TIERS[slug as TierSlug];
  if (!tier) notFound();
  return <TierSalesPage tier={tier} />;
}
