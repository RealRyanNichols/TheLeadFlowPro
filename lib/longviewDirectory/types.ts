// The publish contract between the Longview Business Archive engine
// (deploy/longview-archive, running on the droplet) and the public directory
// at /longview/businesses. The engine writes this shape to
// content/longview-directory/directory.json; the full rules are in
// deploy/longview-archive/SPEC.md under "The publish contract".
//
// Leaf module: types and constants only.

export const DIRECTORY_SCHEMA_VERSION = 1;

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** "HH:MM" on a 24-hour clock; a close of "24:00" is allowed. */
export type TimeRange = [open: string, close: string];

/**
 * Only the days the business states. A missing day is "not stated", never
 * "closed". An empty list means the business itself says it is closed.
 */
export type WeeklyHours = Partial<Record<DayKey, TimeRange[]>>;

export const HIRING_ROLES = [
  "front_desk",
  "office_manager",
  "medical_assistant",
  "dental_assistant",
  "receptionist",
] as const;
export type HiringRole = (typeof HIRING_ROLES)[number];

export const FACT_SOURCES = ["tx_sales_tax", "tx_tabc", "npi", "website"] as const;
export type FactSource = (typeof FACT_SOURCES)[number];

export const FACT_FIELDS = [
  "name",
  "address",
  "category",
  "permitSince",
  "website",
  "phone",
  "email",
  "hours",
  "facebook",
  "instagram",
  "careers",
  "services",
] as const;
export type FactField = (typeof FACT_FIELDS)[number];

export type Fact = {
  field: FactField;
  source: FactSource;
  url: string | null;
  /** YYYY-MM-DD, America/Chicago. */
  checkedAt: string;
};

export type DirectoryAddress = {
  /** Null unless there is positive storefront evidence; then the page shows "Longview, TX" only. */
  street: string | null;
  city: string;
  state: string;
  zip: string | null;
};

export type WebsiteStatus = "ok" | "moved" | "dead" | "blocked";

export type DirectoryBusiness = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string | null;
  address: DirectoryAddress;
  permitSince: string | null;
  website: { url: string; status: WebsiteStatus } | null;
  phone: { e164: string; display: string } | null;
  email: string | null;
  hours: WeeklyHours | null;
  social: { facebook: string | null; instagram: string | null };
  careersUrl: string | null;
  hiringRoles: HiringRole[];
  services: string[];
  facts: Fact[];
  updatedAt: string;
  indexable: boolean;
};

export type DirectorySource = {
  id: string;
  name: string;
  publisher: string;
  license: string;
  url: string | null;
  lastSyncedAt: string | null;
};

export type DirectoryCategory = { slug: string; name: string; count: number };

export type Directory = {
  schemaVersion: number;
  generatedAt: string | null;
  batchId: string | null;
  /** True only for fictional fixtures. The committed file must never be a sample. */
  sample: boolean;
  /** Global switch. Profiles carry noindex until this is true (an owner decision). */
  indexable: boolean;
  scope: string;
  counts: { published: number; inArchive: number; heldForPrivacy: number; needsReview: number };
  sources: DirectorySource[];
  categories: DirectoryCategory[];
  businesses: DirectoryBusiness[];
};

/** Slugs a business can never take because a directory route owns them. */
export const RESERVED_SLUGS = ["about", "new", "hiring", "category", "page", "search", "status"] as const;

export const DIRECTORY_PATH = "/longview/businesses";
