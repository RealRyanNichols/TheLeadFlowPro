import { ImageResponse } from "next/og";
import { LeadFlowDataOgImage } from "@/lib/leadflow-data-og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(LeadFlowDataOgImage(), {
    width: 1200,
    height: 630,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
