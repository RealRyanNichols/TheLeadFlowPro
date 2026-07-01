import type { Metadata } from "next";
import { getQuestionnaireBuilderDashboard } from "@/lib/questionnaire-builder";
import { QuestionnaireBuilderClient } from "./QuestionnaireBuilderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questionnaire Builder | The LeadFlow Pro",
  description: "Build white-label lead collection tools, scoring rules, consent modules, result pages, share links, and embed widgets.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BuilderPage() {
  const data = await getQuestionnaireBuilderDashboard();
  return <QuestionnaireBuilderClient data={data} />;
}
