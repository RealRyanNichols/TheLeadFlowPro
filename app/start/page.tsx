import type { Metadata } from "next";
import StartRouter from "./StartRouter";

export const metadata: Metadata = {
  title: "Map My Company | The LeadFlow Pro",
  description:
    "Answer a few flexible questions and see the connected company system that fits before you submit any contact information.",
  alternates: { canonical: "https://www.theleadflowpro.com/start" },
  openGraph: {
    title: "Map My Company | The LeadFlow Pro",
    description:
      "See the connected website, customer record, follow-up, payment, and reporting system that fits your company.",
    url: "https://www.theleadflowpro.com/start",
    siteName: "The LeadFlow Pro",
    type: "website",
    images: [
      {
        url: "/images/homepage-v2/connected-company-hero.webp",
        width: 1920,
        height: 1080,
        alt: "A connected company system linking customer conversations, follow-up, payments, and reporting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Map My Company | The LeadFlow Pro",
    description: "See the connected company system that fits before you send your details.",
    images: ["/images/homepage-v2/connected-company-hero.webp"],
  },
};

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  // StartRouter validates the goal id itself; unknown values fall back to the
  // first question.
  const { goal } = await searchParams;
  return <StartRouter initialGoal={goal} />;
}
