import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Ladder card for the Hold The Line lane, shared by /hold-the-line and the
// /offers/[slug] pages so the ladder reads identically everywhere it appears.
// Every card carries its scene art up top; a wall of white boxes with floating
// buttons is exactly what this lane is not allowed to look like.

export default function HoldTheLineOfferCard({
  href,
  art,
  artAlt,
  price,
  name,
  summary,
  cta,
  lead = false,
  flag,
}: {
  href: string;
  art: string;
  artAlt: string;
  price: string;
  name: string;
  summary: string;
  cta: string;
  lead?: boolean;
  flag?: string;
}) {
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl border bg-[var(--panel)] shadow-[0_18px_50px_#0a122014] ${
        lead ? "border-[#0ea5e9]" : "border-[var(--line-strong)]"
      }`}
    >
      <figure className="relative m-0 border-b border-[var(--line)]">
        <Image
          src={art}
          alt={artAlt}
          width={1672}
          height={941}
          sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
          className="block h-auto w-full"
        />
        {flag ? (
          <span className="absolute left-4 top-4 rounded-full bg-[#0ea5e9] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0a1220]">
            {flag}
          </span>
        ) : null}
      </figure>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0284c7]">
          {price}
        </p>
        <h3 className="text-[20px] font-extrabold leading-snug text-[var(--heading)]">
          {name}
        </h3>
        <p className="text-[14px] leading-relaxed text-[var(--quiet)]">{summary}</p>
        <div className="mt-auto pt-2">
          <Link
            className={`cb-btn ${lead ? "cb-btn--primary" : "cb-btn--ghost"} cb-btn--sm`}
            href={href}
          >
            {cta}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
