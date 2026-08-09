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
    title: "Your website should run your business.",
    description:
      "One connected business system, built for your industry and installed in accounts you control.",
    url: "https://www.theleadflowpro.com",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/free-build.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your website should run your business.",
    description: "One connected business system, built for your industry.",
    images: ["/og/free-build.jpg"],
  },
};

export const viewport = {
  themeColor: "#0e1a2e",
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
