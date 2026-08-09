import type { Metadata } from "next";
import StartRouter from "./StartRouter";

export const metadata: Metadata = {
  title: "Map My Business System | The LeadFlow Pro",
  description:
    "Answer a few flexible questions and see the connected LeadFlow system that fits your business before you submit any contact information.",
  alternates: { canonical: "https://www.theleadflowpro.com/start" },
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
