import { ImageResponse } from "next/og";
import { LeadFlowSocialImage } from "@/lib/leadflow-og";

export const runtime = "edge";

const size = { width: 1200, height: 630 };

function clean(value: string | null, fallback: string, max = 140) {
  const text = (value || fallback).replace(/\s+/g, " ").trim();
  return text.slice(0, max);
}

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = clean(searchParams.get("title"), "The LeadFlow Pro", 92);
  const subtitle = clean(
    searchParams.get("subtitle"),
    "Turn attention into conversations. No missed calls. No missed texts. No missed revenue.",
    180
  );
  const kicker = clean(searchParams.get("kicker"), "The LeadFlow Pro", 52);

  return new ImageResponse(
    <LeadFlowSocialImage
      variant="custom"
      title={title}
      subtitle={subtitle}
      eyebrow={kicker}
    />,
    size
  );
}
