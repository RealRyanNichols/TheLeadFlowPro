import type { Metadata } from "next";
import { PRICE_CENTS, ADS_CENTS, ENDS_AT } from "@/lib/septemberSpecial";
import { usd } from "@/lib/site/prices";
import SeptemberSpecial from "./SeptemberSpecial";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const expired = Date.now() >= Date.parse(ENDS_AT);
  const title = expired
    ? "September offer closed | The LeadFlow Pro"
    : `${usd(PRICE_CENTS / 100)} September Special | The LeadFlow Pro`;
  const description = expired
    ? "The September introductory offer has ended. Talk with The LeadFlow Pro about a written proposal for your business."
    : `100 Facebook posts, a website, email follow-up, a commercial, 5 reels, 10 images and ${usd(ADS_CENTS / 100)} in ads. ${usd(PRICE_CENTS / 100)} one time. Five clients. Ends Sept. 24 at 6pm CT.`;
  const shareImage = expired
    ? { url: "/og/home.png", width: 1200, height: 630 }
    : { url: "/images/offers/september-special-1497.png", width: 1254, height: 1254 };
  return {
    title,
    description,
    alternates: { canonical: "https://www.theleadflowpro.com/september-special" },
    robots: { index: !expired, follow: true },
    openGraph: {
      title,
      description,
      url: "https://www.theleadflowpro.com/september-special",
      type: "website",
      images: [shareImage],
    },
    twitter: { card: "summary", title, description, images: [shareImage.url] },
  };
}

export default function SeptemberSpecialPage() {
  return <SeptemberSpecial initialNow={Date.now()} />;
}
