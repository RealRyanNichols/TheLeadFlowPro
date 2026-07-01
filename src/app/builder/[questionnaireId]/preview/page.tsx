import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getQuestionnaireBuilderDashboard } from "@/lib/questionnaire-builder";
import { QuestionnairePreviewClient } from "../../QuestionnairePreviewClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { questionnaireId: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getQuestionnaireBuilderDashboard(params.questionnaireId);
  return {
    title: `${data.current?.title || "Questionnaire"} Preview | The LeadFlow Pro`,
    description: "Preview a LeadFlow questionnaire without writing test responses to the lead database.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function BuilderPreviewPage({ params }: PageProps) {
  const data = await getQuestionnaireBuilderDashboard(params.questionnaireId);
  const draft = data.current || data.templates[0];
  return (
    <main className="min-h-screen bg-[#050711] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href={draft.id ? `/builder/${draft.id}` : "/builder"} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm font-black text-ink-100">
          <ArrowLeft className="h-4 w-4" />
          Back to builder
        </Link>
        <QuestionnairePreviewClient
          definition={draft.definition}
          resultPages={draft.resultPages}
          consentModules={draft.consentModules}
          route={`/builder/${params.questionnaireId}/preview`}
        />
      </div>
    </main>
  );
}
