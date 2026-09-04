import { notFound } from "next/navigation";
import { getTool } from "@/lib/tools";
import { proAccessSecrets, verifyWhiteLabel } from "@/lib/proAccess";
import ToolEngine from "@/components/tools/ToolEngine";
import EmbedAutoHeight from "@/components/tools/EmbedAutoHeight";

// The white-label embed, sold by the White-Label Embeds kit.
//
// Same tool, same engine as /embed/[slug], with the buyer's brand bar where
// the LeadFlow credit line sits on the free frame. It lives on its own route
// so the free embeds stay statically served: this page has to read the query
// string on every request, because the signature in it is the authorization.
//
// The signature is checked server side and every brand field is revalidated
// before it renders, since the payload rides in a public URL. Anything
// invalid renders the ordinary credit line, never an error, so a mangled
// paste on somebody's site degrades to the free frame instead of a broken page.

export const dynamic = "force-dynamic";

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

export default async function BrandedEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ b?: string; wl?: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const { b, wl } = await searchParams;
  const brand = verifyWhiteLabel(b, wl, proAccessSecrets());
  const accent = brand?.c ?? "#38bdf8";
  const tel = brand?.p ? (brand.p.length === 10 ? `1${brand.p}` : brand.p) : "";
  const prettyTel = brand?.p
    ? `(${brand.p.slice(-10, -7)}) ${brand.p.slice(-7, -4)}-${brand.p.slice(-4)}`
    : "";

  return (
    <div className="fixed inset-0 z-[999] overflow-auto bg-[#0e1a2e] p-3 sm:p-4">
      <EmbedAutoHeight slug={tool.slug}>
        <ToolEngine slug={tool.slug} embedded />
        {brand ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm font-bold text-white">
              A free tool from {brand.n}
              {tel ? (
                <>
                  {" · "}
                  <a href={`tel:+${tel}`} className="font-black underline" style={{ color: accent }}>
                    {prettyTel}
                  </a>
                </>
              ) : null}
            </p>
            {brand.t && brand.u ? (
              <a
                href={brand.u}
                target="_top"
                rel="noopener noreferrer"
                className="rounded-lg px-4 py-2 text-sm font-black text-[#0e1a2e]"
                style={{ background: accent }}
              >
                {brand.t}
              </a>
            ) : null}
          </div>
        ) : (
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
        )}
      </EmbedAutoHeight>
    </div>
  );
}
