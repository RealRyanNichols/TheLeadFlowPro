import { ImageResponse } from "next/og";
import { LeadFlowSocialImage } from "@/lib/leadflow-og";

export const runtime = "edge";
export const alt = "The LeadFlow Pro — Turn Attention Into Conversations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<LeadFlowSocialImage />, size);
}
