import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FarettaChatbot } from "@/components/FarettaChatbot";
import { MetaPixel } from "@/components/site/MetaPixel";
import { SitePulseTracker } from "@/components/site/SitePulseTracker";

export const metadata: Metadata = {
  title: "The LeadFlow Pro — No missed calls. No missed texts. No missed revenue.",
  description:
    "If your business gets calls, texts, or online leads — this is for you. Capture every lead, automate follow-up, and close more sales. AI-powered social intelligence + lead inbox in one dashboard.",
  metadataBase: new URL("https://www.theleadflowpro.com"),
  applicationName: "The LeadFlow Pro",
  category: "business",
  keywords: [
    "The LeadFlow Pro",
    "Ryan Nichols",
    "lead generation",
    "social media systems",
    "business automation",
    "client portals",
    "Meta ads tracking",
    "Longview Texas marketing",
  ],
  manifest: "/site.webmanifest",
  openGraph: {
    title: "The LeadFlow Pro",
    description:
      "Turn attention into conversations. Automate follow-up. Close more sales.",
    url: "https://www.theleadflowpro.com",
    siteName: "The LeadFlow Pro",
    type: "website",
    images: [
      {
        url: "/images/leadflow-pro-social-card.png",
        width: 1200,
        height: 630,
        alt: "The LeadFlow Pro — Turn Attention Into Conversations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The LeadFlow Pro",
    description:
      "Turn attention into conversations. Automate follow-up. Close more sales.",
    images: ["/images/leadflow-pro-social-card.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    title: "LeadFlow Pro",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "msapplication-TileColor": "#061833",
    "msapplication-TileImage": "/images/leadflow-pro-app-icon-192.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The LeadFlow Pro",
    url: "https://www.theleadflowpro.com",
    logo: "https://www.theleadflowpro.com/images/leadflow-pro-app-icon-512.png",
    image: "https://www.theleadflowpro.com/images/leadflow-pro-social-card.png",
    founder: {
      "@type": "Person",
      name: "Ryan Nichols",
    },
    sameAs: [
      "https://x.com/RealRyanNichols",
      "https://www.facebook.com/RealRyanNicholsSr/",
      "https://www.youtube.com/@RealRyanNicholsSr",
      "https://www.tiktok.com/@therealryannichols",
    ],
  };

  return (
    <html lang="en" className="dark">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <SessionProvider>{children}</SessionProvider>
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <SitePulseTracker />
        <FarettaChatbot />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
