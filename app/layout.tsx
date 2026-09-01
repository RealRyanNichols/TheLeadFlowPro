import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import "./company-builder.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TrackingScripts from "@/components/TrackingScripts";
import { getSettings } from "@/lib/settings";

// Self-hosted through next/font, which also removes the render-blocking Google
// Fonts @import globals.css used to carry. Archivo is the editorial display
// face; Inter stays the interface voice.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "More Attention. More Leads. More Revenue. | The LeadFlow Pro",
  description:
    "The LeadFlow Pro turns attention into conversations, conversations into qualified leads, and qualified leads into customers with one connected business system.",
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
    title: "More Attention. More Leads. More Revenue.",
    description:
      "Turn attention into conversations, conversations into qualified leads, and qualified leads into customers with The LeadFlow Pro.",
    url: "https://www.theleadflowpro.com",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "More Attention. More Leads. More Revenue.",
    description: "One connected system that turns attention into conversations and qualified leads.",
    images: ["/og/home.png"],
  },
};

// Last two leftovers from the navy era. themeColor painted the mobile browser
// chrome navy above a light page, and colorScheme "dark" told the UA to render
// scrollbars, form controls and other default UI dark on a site that is now
// light everywhere. globals.css already declares color-scheme:light on :root;
// these are the document-level defaults that were still contradicting it.
export const viewport = {
  themeColor: "#f7f5f2",
  colorScheme: "light" as const,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`}>
      <body>
        <a className="cb-skip" href="#main-content">
          Skip to content
        </a>
        <TrackingScripts
          metaPixelId={settings.meta_pixel_id}
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
