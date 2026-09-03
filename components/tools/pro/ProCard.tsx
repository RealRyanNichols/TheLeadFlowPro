import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { DOMAINS } from "@/lib/tools";
import type { ProToolIndexEntry } from "@/lib/tools/pro";

/**
 * A kit on the shelf. Same card geometry as a free tool so the two shelves
 * read as one library, with the price where the "use it now" line sits on a
 * free card, because the price is the thing being decided here.
 */
export default function ProCard({
  tool,
  owned = false,
  priority = false,
}: {
  tool: ProToolIndexEntry;
  owned?: boolean;
  priority?: boolean;
}) {
  const domain = DOMAINS[tool.domain];
  return (
    <Link href={`/tools/pro/${tool.slug}`} className="tool-card pro-card group" data-slug={tool.slug}>
      <span className="tool-card-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tool.image.src}
          alt={tool.image.alt}
          width={tool.image.width}
          height={tool.image.height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
        />
        <span className="tool-card-badges">
          {owned ? (
            <span className="tool-badge pro-badge-owned">Yours</span>
          ) : (
            <span className="tool-badge pro-badge-price">${tool.priceUsd}</span>
          )}
          {tool.isNew ? <span className="tool-badge tool-badge-new">New</span> : null}
        </span>
      </span>

      <span className="flex flex-1 flex-col p-4">
        <span
          className="border-l-2 py-0.5 pl-2 text-[10px] font-black uppercase tracking-wider"
          style={{ color: domain.ink, borderColor: domain.line }}
        >
          {domain.label}
        </span>

        <span className="mt-2.5 block text-[16px] font-black leading-tight text-[var(--heading)]">{tool.name}</span>
        <span className="mt-1 block text-[13px] font-bold" style={{ color: domain.ink }}>
          {tool.tagline}
        </span>

        <span className="pro-card-kit">
          {tool.kit.slice(0, 3).map((item) => (
            <span key={item}>
              <Check aria-hidden="true" className="h-3 w-3" />
              {item}
            </span>
          ))}
          {tool.kit.length > 3 ? <span className="pro-card-more">and {tool.kit.length - 3} more</span> : null}
        </span>

        <span className="pro-card-foot">
          {owned ? "Open your kit" : `Try it free, unlock for $${tool.priceUsd}`}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
