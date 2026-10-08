import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";

import "./globals.css";
import "./fonts.css";
import "./company-builder.css";
import "./leadflow-theme.css";
import "./theme-consistency.css";
import "./public-growth-theme.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TrackingScripts from "@/components/TrackingScripts";
import {
  LEADFLOW_META,
  resolveLeadFlowMetaPixelId,
} from "@/lib/metaCampaignGuard";
import { getSettings } from "@/lib/settings";

// Keep the exact already-deployed fonts and fallback metrics in source.
// The production build no longer depends on a Google Fonts CSS response.
export const metadata: Metadata = withPublicPageMetadata("/", {
  title: "The LeadFlow Pro | Growth for businesses & communities",
  description:
    "Websites, marketing and follow-up for local businesses, online businesses and communities. Based in Longview, Texas. Start with a free 30-minute consultation.",
  metadataBase: new URL("https://www.theleadflowpro.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: { canonical: "https://www.theleadflowpro.com" },
  openGraph: {
    title: "The LeadFlow Pro | Growth for businesses & communities",
    description:
      "Websites, marketing and follow-up for local businesses, online businesses and communities, built in accounts you own.",
    url: "https://www.theleadflowpro.com",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The LeadFlow Pro | Growth for businesses & communities",
    description:
      "Growth for local businesses, online businesses and communities through websites, marketing and follow-up in accounts you own.",
    images: ["/og/home.png"],
  },
});

// White/blue public chrome and light page controls.
export const viewport = {
  themeColor: "#ffffff",
  colorScheme: "light" as const,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  const metaPixelId = resolveLeadFlowMetaPixelId(
    settings.meta_pixel_id,
    process.env.NEXT_PUBLIC_META_PIXEL_ID,
  );
  if (!metaPixelId) {
    console.error(
      `Meta Pixel disabled: runtime configuration must contain exact LeadFlow pixel ${LEADFLOW_META.pixelId}`,
    );
  }
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/leadflow/1a4aa50920b5315c-s.p.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/leadflow/e4af272ccee01ff0-s.p.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a className="cb-skip" href="#main-content">
          Skip to content
        </a>
        <TrackingScripts
          metaPixelId={metaPixelId}
          googleAdsId={settings.google_ads_id}
          ga4Id={settings.ga4_id}
        />
        <div className="site-frame">
          <SiteHeader />
          <div className="site-content" id="main-content" tabIndex={-1}>
            {children}
          </div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
