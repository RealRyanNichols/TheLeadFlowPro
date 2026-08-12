import { ImageResponse } from "next/og";
import { ogCard, OG_SIZE } from "@/lib/tools/og";
import {
  PUBLISHED_COLLECTIONS,
  collectionTools,
  getCollection,
} from "@/lib/tools/collections";
import { DOMAINS, type Domain } from "@/lib/tools";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Free tool collection from The LeadFlow Pro";

export function generateStaticParams() {
  return PUBLISHED_COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollection(slug);

  const tools = collection ? collectionTools(collection) : [];
  // Colour the card by whatever domain the collection actually leans on, so a
  // restaurant collection and a website collection do not look identical.
  const domain: Domain =
    (tools.length
      ? (Object.entries(
          tools.reduce<Record<string, number>>((acc, t) => {
            acc[t.domain] = (acc[t.domain] || 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1])[0][0] as Domain)
      : "sales-marketing") ?? "sales-marketing";

  return new ImageResponse(
    ogCard({
      eyebrow: collection ? `${tools.length} free tools` : "Free tools",
      title: collection?.short ?? "Free Tools Built for Real Work",
      hook: collection?.hook ?? "Calculators, generators, planners and QR tools.",
      domain: DOMAINS[domain] ? domain : "sales-marketing",
      toolType: "calculator",
      url: collection
        ? `theleadflowpro.com/tools/collections/${collection.slug}`
        : "theleadflowpro.com/tools",
      seed: `collection-${slug}`,
      typeLabel: "Tool collection",
    }),
    size,
  );
}
