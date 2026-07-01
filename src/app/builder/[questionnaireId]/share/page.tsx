import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Code2, ExternalLink, Share2 } from "lucide-react";
import { getQuestionnaireBuilderDashboard } from "@/lib/questionnaire-builder";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { questionnaireId: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getQuestionnaireBuilderDashboard(params.questionnaireId);
  return {
    title: `${data.current?.title || "Questionnaire"} Share | The LeadFlow Pro`,
    description: "Share or embed a published LeadFlow white-label questionnaire.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function BuilderSharePage({ params }: PageProps) {
  const data = await getQuestionnaireBuilderDashboard(params.questionnaireId);
  const draft = data.current || data.templates[0];
  const shareUrl = draft.shareUrl || (draft.publishedRoute ? `https://www.theleadflowpro.com${draft.publishedRoute}` : "");
  const embedCode = `<script src="https://www.theleadflowpro.com/api/widget-script/${draft.slug}.js"></script>\n<div id="leadflow-widget-${draft.slug}"></div>`;

  return (
    <main className="min-h-screen bg-[#050711] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href={draft.id ? `/builder/${draft.id}` : "/builder"} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm font-black text-ink-100">
          <ArrowLeft className="h-4 w-4" />
          Back to builder
        </Link>
        <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_16%_12%,rgba(35,184,255,0.18),transparent_30%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
          <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
            <Share2 className="h-4 w-4" />
            Share flow
          </p>
          <h1 className="mt-4 text-4xl font-black text-white md:text-6xl">{draft.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink-200">
            Published questionnaires get a public route and an embeddable widget. Real submissions run through the widget consent and source tracking pipeline.
          </p>
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white"><ExternalLink className="h-5 w-5 text-cyan-200" /> Public share URL</h2>
            {shareUrl ? (
              <Link href={shareUrl} className="mt-4 block break-words rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm font-black text-cyan-50">
                {shareUrl}
              </Link>
            ) : (
              <p className="mt-4 rounded-lg border border-accent-300/25 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
                Publish the questionnaire first to generate a public share URL.
              </p>
            )}
          </article>
          <article className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white"><Code2 className="h-5 w-5 text-lead-200" /> Embed code</h2>
            <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-ink-950 p-4 text-xs leading-6 text-ink-100">
              {embedCode}
            </pre>
          </article>
        </section>
      </div>
    </main>
  );
}
