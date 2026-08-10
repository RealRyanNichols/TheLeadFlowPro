import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TOOLS, getTool } from "@/lib/tools";
import ToolRenderer from "@/components/tools/ToolRenderer";
import EmbedGate from "@/components/tools/EmbedGate";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  return {
    title: `${tool.name} — Free | The LeadFlow Pro`,
    description: `${tool.description} Free to use, free to embed on your own website.`,
    alternates: { canonical: `https://www.theleadflowpro.com/tools/${tool.slug}` },
    openGraph: {
      title: `${tool.name} — free for your business.`,
      description: tool.description,
      url: `https://www.theleadflowpro.com/tools/${tool.slug}`,
      siteName: "The LeadFlow Pro",
      images: [{ url: "/og/free-build.jpg", width: 1200, height: 630 }],
      type: "website",
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    description: tool.description,
    applicationCategory: "BusinessApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "The LeadFlow Pro" },
  };

  return (
    <main className="mx-auto w-[min(760px,100%-40px)] pb-24 pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        All free tools
      </Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
        {tool.name}
      </h1>
      <p className="mt-2 text-slate-400">{tool.description}</p>
      <div className="mt-7">
        <ToolRenderer slug={tool.slug} />
      </div>
      <EmbedGate toolSlug={tool.slug} toolName={tool.name} embedHeight={tool.embedHeight} />
    </main>
  );
}
