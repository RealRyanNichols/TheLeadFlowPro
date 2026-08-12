import { ImageResponse } from "next/og";
import { TOOL_COUNT } from "@/lib/tools";
import { ogCard, OG_SIZE } from "@/lib/tools/og";

// The library's own share image.
//
// /tools used to borrow /og/free-build.jpg, the "I will build your website free"
// advert, which said nothing about a tool library and confused anyone who shared
// the page. This is the page's own card.

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = `${TOOL_COUNT} free tools built for real work, from The LeadFlow Pro`;

export default function Image() {
  return new ImageResponse(
    ogCard({
      eyebrow: `${TOOL_COUNT} tools`,
      title: "Free Tools Built for Real Work",
      hook: "Calculators, generators, planners and QR tools. Use them here, save the result, put them on your own site.",
      domain: "sales-marketing",
      toolType: "calculator",
      url: "theleadflowpro.com/tools",
      seed: "tools-directory",
      typeLabel: "Free tool library",
    }),
    size,
  );
}
