import type { Metadata } from "next";
import FreeBuildFunnel from "./FreeBuildFunnel";

export const metadata: Metadata = {
  title: "I Will Build Your Website Free | The LeadFlow Pro",
  description:
    "Tell me about your business. I build your complete website, funnel, and follow-up system. You do not pay a dime until you see it working and decide you want it. Fair, right?",
  openGraph: {
    title: "I'll build your website free. Pay nothing until you love it.",
    description:
      "Give me your business name and anything you have. I build the complete site. $0 up front. No card. No contract.",
    url: "https://www.theleadflowpro.com/free-build",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/free-build.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "I'll build your website free. Pay nothing until you love it.",
    description: "Give me your business name and anything you have. $0 up front.",
    images: ["/og/free-build.jpg"],
  },
};

export default function FreeBuildPage() {
  return <FreeBuildFunnel />;
}
