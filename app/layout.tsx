import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TrackingScripts from "@/components/TrackingScripts";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "The LeadFlow Pro | Industry-Specific Business Systems",
  description:
    "We build the website, CRM, portal, tools, forms, courses, archives, email, text, and automation your industry actually needs. One connected system, installed in accounts you control.",
  metadataBase: new URL("https://www.theleadflowpro.com"),
  alternates: { canonical: "https://www.theleadflowpro.com" },
  openGraph: {
    title: "Your website should run your business.",
    description:
      "One connected business system, built for your industry and installed in accounts you control.",
    url: "https://www.theleadflowpro.com",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your website should run your business.",
    description: "One connected business system, built for your industry.",
    images: ["/og/home.png"],
  },
};

export const viewport = {
  themeColor: "#060b14",
  colorScheme: "dark" as const,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="en">
      <body>
        <TrackingScripts
          metaPixelId={settings.meta_pixel_id}
          googleAdsId={settings.google_ads_id}
          ga4Id={settings.ga4_id}
        />
        <div className="site-frame">
          <SiteHeader />
          <div className="site-content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
