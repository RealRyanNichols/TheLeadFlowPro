import type { Metadata } from "next";

const SITE_URL = "https://www.theleadflowpro.com";
const SITE_NAME = "The LeadFlow Pro";

type SeoMetadataInput = {
  title: string;
  description: string;
  path?: string;
  openGraphTitle?: string;
  openGraphDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  imageTitle?: string;
  imageSubtitle?: string;
  imageKicker?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

function absolutePath(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function socialImageUrl(input: {
  title: string;
  subtitle?: string;
  kicker?: string;
}) {
  void input;
  return `${SITE_URL}/images/leadflow-pro-social-card.png`;
}

export function createSeoMetadata(input: SeoMetadataInput): Metadata {
  const url = absolutePath(input.path || "/");
  const image = input.image
    ? absolutePath(input.image)
    : socialImageUrl({
        title: input.imageTitle || input.title.replace(/\s+·\s+The LeadFlow Pro$/, ""),
        subtitle: input.imageSubtitle || input.description,
        kicker: input.imageKicker || SITE_NAME,
      });

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.openGraphTitle || input.imageTitle || input.title,
      description: input.openGraphDescription || input.description,
      url,
      siteName: SITE_NAME,
      type: input.type || "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${input.imageTitle || input.title} | ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.twitterTitle || input.openGraphTitle || input.imageTitle || input.title,
      description: input.twitterDescription || input.openGraphDescription || input.description,
      images: [image],
    },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
  };
}
