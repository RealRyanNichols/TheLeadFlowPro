import { ImageResponse } from "next/og";
import { LeadFlowSocialImage } from "@/lib/leadflow-og";

export const runtime = "edge";
export const alt = "The LeadFlow Pro Live Pulse — Watch the site think in public";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <LeadFlowSocialImage
      variant="custom"
      eyebrow="Live LeadFlow Counter"
      title="Watch The Site Think In Public."
      subtitle="Live views, dwell time, source trails, share backs, click intent, and probability signals."
    />,
    size,
  );
}
