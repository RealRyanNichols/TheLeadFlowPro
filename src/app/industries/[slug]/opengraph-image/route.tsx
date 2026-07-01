import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getLeadFlowIndustryPage } from "@/lib/leadflow-industries";
import { LeadFlowSocialImage } from "@/lib/leadflow-og";

export const runtime = "edge";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const page = getLeadFlowIndustryPage(params.slug);
  if (!page) notFound();

  return new ImageResponse(
    <LeadFlowSocialImage
      variant="custom"
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle={page.metaDescription}
    />,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
