import type { Metadata } from "next";
import { getQuestionnaireBuilderDashboard } from "@/lib/questionnaire-builder";
import { QuestionnaireBuilderClient } from "../QuestionnaireBuilderClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { questionnaireId: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getQuestionnaireBuilderDashboard(params.questionnaireId);
  return {
    title: `${data.current?.title || "Questionnaire"} Builder | The LeadFlow Pro`,
    description: "Edit a LeadFlow white-label questionnaire with scoring, consent, routes, and embed options.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EditBuilderPage({ params }: PageProps) {
  const data = await getQuestionnaireBuilderDashboard(params.questionnaireId);
  return <QuestionnaireBuilderClient data={data} />;
}
