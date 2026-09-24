// Words, links, and art for directory pages.
//
// Labels for sources, fields, and hiring roles; date formats; the Google Maps
// search link; the claim/correct/remove mailto; the monogram colours; and the
// crawler identity the about page publishes. The crawler string must match
// USER_AGENT in deploy/longview-archive/longview_archive/config.py (a test
// compares them), and the contact inbox comes from BUSINESS, never typed here.

import { BUSINESS } from "../site/business";
import { DIRECTORY_PATH, type DirectoryBusiness, type FactField, type FactSource, type HiringRole } from "./types";

export const DIRECTORY_DISCLAIMER = "Not affiliated with the businesses listed. No rankings, no reviews, no endorsements.";

export const CRAWLER_TOKEN = "LeadFlowPro-LongviewArchive";
export const ABOUT_PATH = `${DIRECTORY_PATH}/about`;
export const CRAWLER_USER_AGENT = `${CRAWLER_TOKEN}/1.0 (+${BUSINESS.siteUrl}${ABOUT_PATH}; ${BUSINESS.email.hello})`;

/** The politeness limits the engine enforces (config.py defaults; a test compares them). */
export const CRAWLER_LIMITS = {
  sitesAtOnce: 2,
  secondsBetweenRequests: 20,
  pagesPerVisit: 6,
  maxPageMegabytes: 2.5,
  robotsRefreshHours: 24,
} as const;

export const SAMPLE_BANNER = "Sample data: fictional businesses for layout testing";

export const SOURCE_LABELS: Record<FactSource, string> = {
  tx_sales_tax: "Texas Comptroller open data",
  tx_tabc: "Texas Alcoholic Beverage Commission",
  npi: "CMS NPI Registry",
  website: "The business's own website",
};

export const FIELD_LABELS: Record<FactField, string> = {
  name: "Business name",
  address: "Address",
  category: "Category",
  permitSince: "Sales-tax permit date",
  website: "Website",
  phone: "Phone",
  email: "Email",
  hours: "Hours",
  facebook: "Facebook",
  instagram: "Instagram",
  careers: "Careers page",
  services: "Services",
};

export const ROLE_LABELS: Record<HiringRole, string> = {
  front_desk: "Front desk",
  office_manager: "Office manager",
  medical_assistant: "Medical assistant",
  dental_assistant: "Dental assistant",
  receptionist: "Receptionist",
};

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-09-24" -> "Sep 24, 2026". Calendar text only; no time zone math on a date. */
export function formatDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

/** "2019-03-01" -> "March 2019". */
export function formatMonthYear(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  return `${LONG_MONTHS[m - 1]} ${y}`;
}

export function businessPath(slug: string): string {
  return `${DIRECTORY_PATH}/${slug}`;
}

export function categoryPath(slug: string): string {
  return `${DIRECTORY_PATH}/category/${slug}`;
}

/** The public street line, or the city only when the address is not public. */
export function addressLine(business: DirectoryBusiness): string {
  const { street, zip } = business.address;
  return street && zip ? `${street}, Longview, TX ${zip}` : "Longview, TX";
}

export function mapsSearchUrl(business: DirectoryBusiness): string {
  const query = business.address.street
    ? `${business.name}, ${addressLine(business)}`
    : `${business.name}, Longview, TX`;
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}`;
}

/** Link text for a website: the host without "www.". */
export function websiteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function mailto(subject: string, body: string): string {
  return `mailto:${BUSINESS.email.hello}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** One email to the LeadFlow inbox. Nothing is sent to the business. */
export function claimMailto(business: DirectoryBusiness): string {
  return mailto(
    `Longview directory: ${business.name} (${business.id})`,
    [
      `Listing: ${BUSINESS.siteUrl}${businessPath(business.slug)}`,
      "",
      "I would like to claim, correct, or remove this listing.",
      "What should change:",
      "",
    ].join("\n"),
  );
}

export function directoryMailto(): string {
  return mailto(
    "Longview directory: claim, correct, or remove a listing",
    ["Business name:", "Listing link (if you have it):", "What should change:", ""].join("\n"),
  );
}

/** Up to two initials from the distinctive words of a name. */
export function monogramInitials(name: string): string {
  const skip = new Set(["the", "and", "of", "a", "an", "at", "in", "on", "for", "llc", "inc", "co"]);
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !skip.has(w.toLowerCase()));
  const initials = words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return initials || "#";
}

// Each colour carries white initials at better than 4.5:1.
const CATEGORY_COLORS: Record<string, string> = {
  restaurants: "#9a3412",
  auto: "#1240e8",
  "health-dental": "#146c34",
  beauty: "#9d174d",
  "home-services": "#92400e",
  retail: "#5135e5",
  professional: "#0a1220",
  "faith-community": "#6b21a8",
  "lodging-recreation": "#0f766e",
  "education-childcare": "#3730a3",
  industrial: "#374151",
  other: "#4e5866",
};

export function categoryColor(slug: string): string {
  return CATEGORY_COLORS[slug] ?? CATEGORY_COLORS.other;
}
