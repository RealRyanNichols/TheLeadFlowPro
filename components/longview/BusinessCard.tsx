import Link from "next/link";
import type { ReactNode } from "react";
import Monogram from "./Monogram";
import { addressLine, businessPath } from "@/lib/longviewDirectory/display";
import type { DirectoryBusiness } from "@/lib/longviewDirectory/types";

// One business in a list. Badges appear only for facts the listing has; a
// missing badge means "not found yet", never "does not have one".

type BusinessCardProps = {
  business: DirectoryBusiness;
  categoryName: string;
  children?: ReactNode;
};

export function cardBadges(business: DirectoryBusiness): { label: string; tone?: "hiring" }[] {
  const badges: { label: string; tone?: "hiring" }[] = [];
  if (business.website && business.website.status !== "dead") badges.push({ label: "Website" });
  if (business.hours) badges.push({ label: "Hours listed" });
  if (business.careersUrl) badges.push({ label: "Hiring", tone: "hiring" });
  return badges;
}

export default function BusinessCard({ business, categoryName, children }: BusinessCardProps) {
  const badges = cardBadges(business);
  return (
    <li className="lvd-card">
      <Monogram name={business.name} category={business.category} />
      <div>
        <h3 className="lvd-card-name">
          <Link href={businessPath(business.slug)}>{business.name}</Link>
        </h3>
        <p className="lvd-card-meta">{business.categoryLabel ?? categoryName}</p>
        <p className="lvd-card-addr">{addressLine(business)}</p>
        {badges.length ? (
          <ul className="lvd-badges" aria-label="Listed on this profile">
            {badges.map((badge) => (
              <li key={badge.label} className={`lvd-badge${badge.tone ? ` lvd-badge--${badge.tone}` : ""}`}>
                {badge.label}
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </li>
  );
}
