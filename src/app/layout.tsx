import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FarettaChatbot } from "@/components/FarettaChatbot";
import { ConversionEventTracker } from "@/components/site/ConversionEvents";
import { MetaPixel } from "@/components/site/MetaPixel";
import { SitePulseTracker } from "@/components/site/SitePulseTracker";

export const metadata: Metadata = {
  title: "The LeadFlow Pro | No missed calls. No missed texts. No missed revenue.",
  description:
    "If your business gets calls, texts, or online leads, this is for you. Capture every lead, automate follow-up, and close more sales. AI-powered social intelligence + lead inbox in one dashboard.",
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
        alt: "The LeadFlow Pro | Turn Attention Into Conversations",
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

// Meta Pixel ID — hardcoded so it works without an env var, override via
// NEXT_PUBLIC_META_PIXEL_ID in Vercel if you ever rotate accounts.
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1012793881211964";

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
      <head>
        {/*
          Meta Pixel — base code rendered in <head> per Meta's install
          instructions so Meta Pixel Helper and the Events Manager test tool
          detect it as "Active" reliably. Per-route PageView and Lead events
          are fired client-side from <MetaPixel /> below using the same fbq
          queue. The guard `if (f.fbq) return;` inside the snippet prevents
          double-initialization.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <SessionProvider>{children}</SessionProvider>
        <Suspense fallback={null}>
          <MetaPixel />
          <ConversionEventTracker />
        </Suspense>
        <SitePulseTracker />
        <FarettaChatbot />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
