import { ImageResponse } from "next/og";
import { getTool, DOMAINS, TOOLS } from "@/lib/tools";
import { ogCard, OG_SIZE } from "@/lib/tools/og";

// Every tool gets its own share image, generated on demand and cached.
// No webfont is fetched and no emoji font is involved, so this cannot fail at
// request time and leave a blank card in somebody's feed.

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Free business tool from The LeadFlow Pro";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);

  if (!tool) {
    return new ImageResponse(
      ogCard({
        eyebrow: "Free tools",
        title: "Free Tools Built for Real Work",
        hook: "Calculators, generators, planners and QR tools from The LeadFlow Pro.",
        domain: "sales-marketing",
        toolType: "calculator",
        url: "theleadflowpro.com/tools",
        seed: slug || "tools",
      }),
      size,
    );
  }

  return new ImageResponse(
    ogCard({
      eyebrow: DOMAINS[tool.domain].label,
      title: tool.name,
      hook: tool.tagline,
      domain: tool.domain,
      toolType: tool.toolType,
      url: `theleadflowpro.com/tools/${tool.slug}`,
      seed: tool.slug,
    }),
    size,
  );
}
