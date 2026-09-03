import Link from "next/link";
import { ArrowRight } from "lucide-react";

type FinalCtaProps = {
  eyebrow: string;
  title: string;
  body: string;
  primary: { href: string; label: string; external?: boolean };
  secondary?: { href: string; label: string; external?: boolean };
};

export default function FinalCta({ eyebrow, title, body, primary, secondary }: FinalCtaProps) {
  return (
    <section className="cb-final sv-final">
      <div className="cb-shell">
        <p className="cb-eyebrow">{eyebrow}</p>
        <h2 className="cb-h2">{title}</h2>
        <p className="cb-lead">{body}</p>
        <div className="cb-actions">
          {primary.external ? (
            <a href={primary.href} className="cb-btn cb-btn--primary">
              {primary.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : (
            <Link href={primary.href} className="cb-btn cb-btn--primary">
              {primary.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
          {secondary ? (
            secondary.external ? (
              <a href={secondary.href} className="cb-btn cb-btn--ghost">
                {secondary.label}
              </a>
            ) : (
              <Link href={secondary.href} className="cb-btn cb-btn--ghost">
                {secondary.label}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}

