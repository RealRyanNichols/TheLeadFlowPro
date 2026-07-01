import type { Metadata } from "next";
import { getQuestionnaireBuilderDashboard } from "@/lib/questionnaire-builder";
import { QuestionnaireBuilderClient } from "../QuestionnaireBuilderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Questionnaire | The LeadFlow Pro",
  description: "Create a new white-label LeadFlow questionnaire from reviewed templates.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewBuilderPage({
  searchParams,
}: {
  searchParams?: { template?: string };
}) {
  const data = await getQuestionnaireBuilderDashboard(searchParams?.template || null);
  return <QuestionnaireBuilderClient data={data} />;
}
