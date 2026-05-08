import { ImageResponse } from "next/og";
import { LeadFlowSocialImage } from "@/lib/leadflow-og";
import { getPulseSignalPage } from "@/lib/pulse-signal-pages";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { signal: string } }) {
  const signal = getPulseSignalPage(params.signal);

  return new ImageResponse(
    <LeadFlowSocialImage
      variant="custom"
      eyebrow={signal?.shortTitle ? `Pulse Signal: ${signal.shortTitle}` : "Live LeadFlow Counter"}
      title={signal?.title || "Watch The Site Think In Public."}
      subtitle={signal?.description || "Live views, dwell time, source trails, share backs, click intent, and probability signals."}
    />,
    size,
  );
}
