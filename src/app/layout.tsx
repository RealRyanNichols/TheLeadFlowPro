import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FarettaChatbot } from "@/components/FarettaChatbot";

export const metadata: Metadata = {
  title: "The LeadFlow Pro — No missed calls. No missed texts. No missed revenue.",
  description:
    "If your business gets calls, texts, or online leads — this is for you. Capture every lead, automate follow-up, and close more sales. AI-powered social intelligence + lead inbox in one dashboard.",
  metadataBase: new URL("https://www.theleadflowpro.com"),
  openGraph: {
    title: "The LeadFlow Pro",
    description:
      "Turn attention into conversations. Automate follow-up. Close more sales.",
    url: "https://www.theleadflowpro.com",
    siteName: "The LeadFlow Pro",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
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
    images: ["/twitter-image"],
  },
  icons: { icon: "/favicon.ico" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <SessionProvider>{children}</SessionProvider>
        <FarettaChatbot />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
