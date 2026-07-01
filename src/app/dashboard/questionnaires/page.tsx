import type { Metadata } from "next";
import { getQuestionnaireBuilderDashboard } from "@/lib/questionnaire-builder";
import { QuestionnaireBuilderClient } from "@/app/builder/QuestionnaireBuilderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questionnaires | The LeadFlow Pro",
  description: "Admin registry for LeadFlow questionnaire products, templates, publish routes, and embed widgets.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardQuestionnairesPage() {
  const data = await getQuestionnaireBuilderDashboard();
  return <QuestionnaireBuilderClient data={data} mode="admin" />;
}
