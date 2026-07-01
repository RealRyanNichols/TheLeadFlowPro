import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getPublishedQuestionnaire } from "@/lib/questionnaire-builder";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const draft = await getPublishedQuestionnaire(params.slug);
  if (!draft) return { title: "Questionnaire Not Found | The LeadFlow Pro" };
  return {
    title: `${draft.title} | The LeadFlow Pro`,
    description: draft.description,
    robots: {
      index: draft.visibility === "public",
      follow: true,
    },
  };
}

export default async function PublicQuestionnairePage({ params }: PageProps) {
  const draft = await getPublishedQuestionnaire(params.slug);
  if (!draft) notFound();
  const widgetSrc = `/widgets/${draft.slug}/embed?domain=www.theleadflowpro.com&page=${encodeURIComponent(`/q/${draft.slug}`)}`;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#050711] pb-16 text-white">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_12%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(255,186,61,0.13),transparent_28%),linear-gradient(135deg,#07101b,#050711)] py-12 md:py-16">
          <div className="container">
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
              LeadFlow tool
            </p>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.95] text-white md:text-7xl">{draft.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-100">{draft.description}</p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider text-ink-200">
              <span className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2">Consent-aware</span>
              <span className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2">Score shown first</span>
              <span className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2">No protected-trait targeting</span>
            </div>
          </div>
        </section>
        <section className="container py-8">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#060a11]/92 shadow-2xl shadow-black/30">
            <iframe
              title={`${draft.title} questionnaire`}
              src={widgetSrc}
              className="min-h-[760px] w-full border-0 bg-transparent"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
