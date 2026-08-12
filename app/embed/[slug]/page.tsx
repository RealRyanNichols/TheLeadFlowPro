import { notFound } from "next/navigation";
import { TOOLS, getTool } from "@/lib/tools";
import ToolEngine from "@/components/tools/ToolEngine";
import EmbedAutoHeight from "@/components/tools/EmbedAutoHeight";

// Iframe-served tool for other people's websites. The overlay covers the site
// chrome so the frame shows only the tool plus the powered-by backlink. The
// code never leaves our server; every embed is a live backlink.

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  return {
    title: tool ? `${tool.name} | The LeadFlow Pro` : "Tool",
    robots: { index: false },
  };
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <div className="fixed inset-0 z-[999] overflow-auto bg-[#0e1a2e] p-3 sm:p-4">
      <EmbedAutoHeight slug={tool.slug}>
        <ToolEngine slug={tool.slug} embedded />
        <p className="mt-3 pb-2 text-center text-xs text-slate-500">
          Free tool by{" "}
          <a
            href={`https://www.theleadflowpro.com/tools/${tool.slug}?utm_source=embed&utm_medium=tool&utm_campaign=${tool.slug}`}
            target="_top"
            className="font-bold text-sky-400 underline"
          >
            The LeadFlow Pro
          </a>{" "}
          · Want one custom for your business? Text (903) 500-8898
        </p>
      </EmbedAutoHeight>
    </div>
  );
}
