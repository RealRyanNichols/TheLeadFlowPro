import "./directory.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { DIRECTORY_DISCLAIMER, SAMPLE_BANNER } from "@/lib/longviewDirectory/display";
import type { Directory } from "@/lib/longviewDirectory/types";

// The frame every directory page shares: the sample-data banner, the header
// band with breadcrumbs and the page's one h1, and the footer note with the
// disclaimer. Server component; no client JavaScript.

export type Crumb = { label: string; href?: string };

type DirectoryPageProps = {
  directory: Directory;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  crumbs?: Crumb[];
  /** Rendered above the eyebrow (the profile's cover art). */
  art?: ReactNode;
  /** Rendered under the lead (the profile's address and directions). */
  heroExtra?: ReactNode;
  variant?: "list" | "profile";
  /** The profile carries its own disclaimer and "Own this business?" band. */
  footer?: boolean;
  children: ReactNode;
};

export default function DirectoryPage({
  directory,
  eyebrow,
  title,
  lead,
  crumbs,
  art,
  heroExtra,
  variant = "list",
  footer = true,
  children,
}: DirectoryPageProps) {
  return (
    <main className="cb-page lvd">
      {directory.sample ? (
        <p className="lvd-sample" role="note">
          {SAMPLE_BANNER}
        </p>
      ) : null}
      <section className={`lvd-hero${variant === "profile" ? " lvd-hero--profile" : ""}`}>
        <div className="cb-shell">
          {crumbs?.length ? (
            <nav aria-label="Breadcrumb" className="lvd-crumbs">
              <ol>
                {crumbs.map((crumb, i) => (
                  <li key={crumb.label}>
                    {crumb.href ? (
                      <Link href={crumb.href}>{crumb.label}</Link>
                    ) : (
                      <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {art}
          <p className="cb-eyebrow">{eyebrow}</p>
          <h1 className="cb-h1 lvd-h1">{title}</h1>
          {lead ? <p className="cb-lead lvd-lead">{lead}</p> : null}
          {heroExtra}
        </div>
      </section>
      {children}
      {footer ? (
        <div className="lvd-foot">
          <div className="cb-shell">
            <p className="lvd-disclaimer">{DIRECTORY_DISCLAIMER}</p>
            <p>A free community resource from The LeadFlow Pro.</p>
            <p>
              <Link href="/longview">The LeadFlow Pro builds websites and follow-up systems for Longview businesses.</Link>
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
