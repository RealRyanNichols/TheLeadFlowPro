import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

const LEGACY_TIERS = ["learn-it", "build-it-with-you", "done-for-you"] as const;

export function generateStaticParams() {
  return LEGACY_TIERS.map((tier) => ({ tier }));
}

export const metadata: Metadata = {
  title: "Pricing | The LeadFlow Pro",
  description:
    "Compare the current Website Launch, System Map, Lead Engine, Training Platform, Company OS, and Custom Platform offer ladder.",
  robots: { index: false, follow: true },
};

export default async function LegacyPricingTierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!LEGACY_TIERS.includes(tier as (typeof LEGACY_TIERS)[number])) notFound();
  permanentRedirect("/pricing");
}
