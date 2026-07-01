import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck, CircleCheck, ShieldCheck, type LucideIcon } from "lucide-react";
import type { LeadFlowSection } from "@/lib/leadflow-sections";

const accentClasses: Record<LeadFlowSection["accent"], string> = {
  accent: "from-accent-400/26 to-cyan-400/10 text-accent-200 border-accent-300/25 bg-accent-300/10",
  cyan: "from-cyan-400/26 to-lead-400/10 text-cyan-200 border-cyan-300/25 bg-cyan-300/10",
  lead: "from-lead-400/24 to-cyan-400/10 text-lead-200 border-lead-300/25 bg-lead-300/10",
  violet: "from-fuchsia-400/18 to-cyan-400/10 text-fuchsia-100 border-fuchsia-300/20 bg-fuchsia-300/10",
};

export function LeadFlowSectionHero({
  section,
  children,
}: {
  section: LeadFlowSection;
  children?: ReactNode;
}) {
  const Icon = section.icon;

  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 py-14 md:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_10%,rgba(35,184,255,0.16),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(255,154,31,0.14),transparent_32%),linear-gradient(135deg,#030711_0%,#070c18_52%,#101008_100%)]" />
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:items-center">
          <div>
            <p className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wider ${accentClasses[section.accent]}`}>
              <Icon className="h-4 w-4" />
              {section.eyebrow}
            </p>
            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.94] tracking-normal text-white md:text-7xl">
              {section.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100 md:text-xl">
              {section.body}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={section.href}
                className="btn-accent text-base"
                data-conversion-event={`${section.href.replace("/", "") || "home"}_primary_click`}
                data-conversion-cta={section.primaryCta}
                data-conversion-source-page={section.href}
                data-conversion-destination={section.href}
              >
                {section.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {section.secondaryHref && section.secondaryCta ? (
                <Link
                  href={section.secondaryHref}
                  className="btn-ghost text-base"
                  data-conversion-event={`${section.href.replace("/", "") || "home"}_secondary_click`}
                  data-conversion-cta={section.secondaryCta}
                  data-conversion-source-page={section.href}
                  data-conversion-destination={section.secondaryHref}
                >
                  {section.secondaryCta}
                </Link>
              ) : null}
            </div>
          </div>
          {children ?? <SectionProofPanel section={section} />}
        </div>
      </div>
    </section>
  );
}

export function SectionProofPanel({ section }: { section: LeadFlowSection }) {
  return (
    <aside className="lead-shell p-5">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Section role</p>
          <h2 className="mt-1 text-2xl font-black text-white">{section.navLabel}</h2>
        </div>
        <BadgeCheck className="h-7 w-7 text-lead-400" />
      </div>
      <div className="mt-5 grid gap-3">
        {section.bullets.map((bullet) => (
          <div key={bullet} className="flex min-h-14 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-ink-100">
            <CircleCheck className="h-4 w-4 shrink-0 text-lead-400" />
            {bullet}
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-ink-100">
        <ShieldCheck className="mb-3 h-5 w-5 text-cyan-200" />
        Source-backed, suppression-aware, review-gated, and separated from private raw data.
      </div>
    </aside>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">{title}</h2>
      {body ? <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">{body}</p> : null}
    </div>
  );
}

export function InfoCard({
  icon: Icon,
  title,
  body,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  footer?: string;
}) {
  return (
    <article className="lead-panel flex min-h-64 flex-col p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-200">{body}</p>
      {footer ? (
        <div className="mt-auto rounded-lg border border-white/10 bg-ink-950/55 p-3 text-xs leading-5 text-ink-300">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

export function getSectionByHref(href: string) {
  return function getSection(sections: LeadFlowSection[]) {
    const section = sections.find((item) => item.href === href);
    if (!section) {
      throw new Error(`Missing LeadFlow section for ${href}`);
    }
    return section;
  };
}
