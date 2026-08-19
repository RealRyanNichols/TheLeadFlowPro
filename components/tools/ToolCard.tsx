import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DOMAINS, TOOL_TYPES, type ToolIndexEntry } from "@/lib/tools";

/**
 * The catalogue card. The artwork is a real image element with declared
 * dimensions, so the grid does not shift as it loads and the picture says what
 * kind of tool it is before the title is read.
 *
 * `priority` skips lazy loading for the handful above the fold.
 */
export default function ToolCard({ tool, priority = false }: { tool: ToolIndexEntry; priority?: boolean }) {
  const domain = DOMAINS[tool.domain];
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="tool-card group"
      data-slug={tool.slug}
      data-track-tool={tool.slug}
    >
      <span className="tool-card-art">
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
          {tool.isNew && <span className="tool-badge tool-badge-new">New</span>}
          <span className="tool-badge tool-badge-free">Free</span>
        </span>
      </span>

      <span className="flex flex-1 flex-col p-4">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className="border-l-2 py-0.5 pl-2 text-[10px] font-black uppercase tracking-wider"
            style={{ color: domain.ink, borderColor: domain.line }}
          >
            {domain.label}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">
            {TOOL_TYPES[tool.toolType].label}
          </span>
        </span>

        <span className="mt-2.5 block text-[16px] font-black leading-tight text-[var(--heading)]">
          {tool.name}
        </span>
        <span className="mt-1 block text-[13px] font-bold" style={{ color: domain.ink }}>
          {tool.tagline}
        </span>
        <span className="mt-2 block flex-1 text-[13px] leading-relaxed text-[var(--muted)]">
          {tool.description.length > 118 ? `${tool.description.slice(0, 116)}...` : tool.description}
        </span>

        <span className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-black text-[var(--blue)]">
          {TOOL_TYPES[tool.toolType].verb} it now
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
