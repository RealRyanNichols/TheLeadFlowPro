import { PRO_TOOLS } from "./tools/pro";

export const COMMERCE_ORIGIN = "https://www.theleadflowpro.com";

/** Public merchandising only. Never expose buyers, keys, previews, or generated files. */
export function commerceCatalog() {
  return {
    version: 1 as const,
    merchant: {
      name: "The LeadFlow Pro",
      operator: "Longview Training Center, LLC",
      url: `${COMMERCE_ORIGIN}/commerce`,
    },
    products: PRO_TOOLS.map((tool) => ({
      id: tool.slug,
      name: tool.name,
      description: tool.tagline,
      priceCents: Math.round(tool.pro.priceUsd * 100),
      currency: "USD" as const,
      url: `${COMMERCE_ORIGIN}/tools/pro/${tool.slug}`,
      image: `${COMMERCE_ORIGIN}${tool.image.src}`,
      delivery: "digital_download" as const,
      includes: [...tool.pro.kit],
    })),
  };
}
