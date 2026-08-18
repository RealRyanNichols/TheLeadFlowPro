import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import PremiumMedia from "./PremiumMedia";

type Action = {
  href: string;
  label: string;
  external?: boolean;
};

type SiteHeroProps = {
  eyebrow: string;
  mutedTitle?: string;
  title: string;
  body: string;
  media: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    kicker?: string;
    caption?: string;
  };
  primary?: Action;
  secondary?: Action;
  trustLine?: string;
  compact?: boolean;
};

function HeroAction({ action, primary }: { action: Action; primary: boolean }) {
  const className = `cb-btn ${primary ? "cb-btn--primary" : "cb-btn--ghost"}`;
  if (action.external) {
    return (
      <a href={action.href} className={className}>
        {action.label}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </a>
    );
  }
  return (
    <Link href={action.href} className={className}>
      {action.label}
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

export default function SiteHero({
  eyebrow,
  mutedTitle,
  title,
  body,
  media,
  primary,
  secondary,
  trustLine,
  compact = false,
}: SiteHeroProps) {
  return (
    <section className={`cb-hero${compact ? " sv-hero--compact" : ""}`}>
      <div className="cb-shell cb-hero-layout">
        <div className="cb-hero-copy">
          <p className="cb-eyebrow">{eyebrow}</p>
          <h1 className="cb-h1">
            {mutedTitle ? <em>{mutedTitle}</em> : null}
            {title}
          </h1>
          <p className="cb-hero-lead">{body}</p>
          {primary || secondary ? (
            <div className="cb-actions">
              {primary ? <HeroAction action={primary} primary /> : null}
              {secondary ? <HeroAction action={secondary} primary={false} /> : null}
            </div>
          ) : null}
          {trustLine ? (
            <p className="cb-hero-own">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              {trustLine}
            </p>
          ) : null}
        </div>
        <PremiumMedia
          {...media}
          priority
          className="sv-site-hero-media"
        />
      </div>
    </section>
  );
}

