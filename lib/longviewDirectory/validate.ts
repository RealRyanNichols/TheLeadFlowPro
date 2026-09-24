// The site's own check of the publish contract.
//
// The engine on the droplet already filters what it exports, but a batch
// reaches the website through a pull request, and a hand edit, an old engine
// build, or a bad merge can still put a record on the site that breaks a rule.
// So every rule in SPEC.md "The publish contract" is re-checked here. A record
// that breaks one is DROPPED with a reason, never repaired and never thrown
// on: one bad row must not take the directory down, and nothing is guessed.
//
// Pure: no fs, no network, no clock. data.ts reads the files and calls this;
// scripts/validate-directory.ts fails the build on anything dropped.

import {
  DAY_KEYS,
  DIRECTORY_SCHEMA_VERSION,
  FACT_FIELDS,
  FACT_SOURCES,
  HIRING_ROLES,
  RESERVED_SLUGS,
  type DayKey,
  type Directory,
  type DirectoryBusiness,
  type DirectoryCategory,
  type DirectorySource,
  type Fact,
  type FactField,
  type FactSource,
  type HiringRole,
  type TimeRange,
  type WebsiteStatus,
  type WeeklyHours,
} from "./types";

export type DroppedRecord = { id: string; reason: string };

export type ValidationResult = {
  directory: Directory;
  /** Businesses removed because they break a contract rule. */
  dropped: DroppedRecord[];
  /** Directory-level problems (schema version, malformed top-level fields). */
  issues: string[];
};

/** The fixed category order and names from the engine (categories.py). */
export const CATEGORY_ORDER: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: "restaurants", name: "Restaurants & Food" },
  { slug: "auto", name: "Auto" },
  { slug: "health-dental", name: "Health & Dental" },
  { slug: "beauty", name: "Beauty & Personal Care" },
  { slug: "home-services", name: "Home Services" },
  { slug: "retail", name: "Retail & Shopping" },
  { slug: "professional", name: "Professional Services" },
  { slug: "faith-community", name: "Faith & Community" },
  { slug: "lodging-recreation", name: "Lodging, Arts & Recreation" },
  { slug: "education-childcare", name: "Education & Childcare" },
  { slug: "industrial", name: "Industrial, Wholesale & Transport" },
  { slug: "other", name: "Other Services" },
];

/** Mirrors GENERIC_EMAIL_LOCALS in the engine's privacy.py. Office inboxes only, never a person. */
export const GENERIC_EMAIL_LOCALS: ReadonlySet<string> = new Set([
  "info", "office", "contact", "hello", "frontdesk", "front.desk", "reception", "appointments",
  "appts", "scheduling", "service", "services", "sales", "support", "orders", "order", "bookings",
  "booking", "reservations", "care", "team", "mail", "inquiries", "inquiry", "help", "admin",
  "customerservice", "custserv", "events", "catering", "jobs", "careers", "hr", "billing", "parts",
]);

/** Mirrors TWO_LEVEL_SUFFIXES in the engine's normalize.py. */
const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "ltd.uk", "plc.uk",
  "com.au", "net.au", "org.au", "com.mx", "com.br", "co.nz", "co.jp",
  "tx.us", "k12.tx.us", "state.tx.us", "ci.longview.tx.us",
]);

/** Mirrors ATS_HOSTS in the engine's extract/careers.py: the only off-site careers links it keeps. */
const ATS_HOSTS: readonly string[] = [
  "indeed.com", "workforcenow.adp.com", "applytojob.com", "bamboohr.com", "paylocity.com",
  "jobs.lever.co", "boards.greenhouse.io", "myworkdayjobs.com", "ziprecruiter.com", "jazzhr.com",
  "paycomonline.net", "ultipro.com", "dayforcehcm.com",
];

/** Fields that may only come from the business's own website. */
const WEBSITE_ONLY_FIELDS: ReadonlySet<FactField> = new Set([
  "website", "phone", "email", "hours", "facebook", "instagram", "careers", "services",
]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_RE = /^lv-[a-z0-9]{4,40}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z$/;
const OPEN_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const CLOSE_RE = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const E164_RE = /^\+1([2-9]\d{2})([2-9]\d{2})(\d{4})$/;
const ZIP_RE = /^\d{5}$/;
const EMAIL_RE = /^([a-z0-9._%+-]+)@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i;
// Control characters, bidi overrides, and anything that looks like markup.
// The contract is plain text; React escapes on render anyway, this keeps junk
// off the page. Built from a string (as lib/hq/copy.ts does) so no line
// separator ever sits inside a regex literal.
const CONTROL_RE = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff]");
const MARKUP_RE = /<[a-z!/?]/i;

class ContractError extends Error {}

function fail(reason: string): never {
  throw new ContractError(reason);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function plainText(value: unknown, max: number, reason: string): string {
  if (typeof value !== "string") fail(reason);
  const text = value.trim();
  if (!text || text.length > max || CONTROL_RE.test(text) || MARKUP_RE.test(text)) fail(reason);
  return text;
}

function optionalText(value: unknown, max: number, reason: string): string | null {
  return value === null || value === undefined ? null : plainText(value, max, reason);
}

/** A real calendar date written YYYY-MM-DD. */
export function isLocalDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(year, month - 1, day);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function localDate(value: unknown, reason: string): string {
  if (!isLocalDate(value)) fail(reason);
  return value;
}

/** An absolute http(s) URL with a dotted host and no credentials, or null. */
export function httpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || /\s/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password || !url.hostname.includes(".")) return null;
  return url;
}

function requiredUrl(value: unknown, reason: string): string {
  if (!httpUrl(value)) fail(reason);
  return value as string;
}

function optionalUrl(value: unknown, reason: string): string | null {
  return value === null || value === undefined ? null : requiredUrl(value, reason);
}

/** The registrable domain of a host or URL, the same way the engine computes it. */
export function registrableDomain(hostOrUrl: string): string {
  let text = hostOrUrl.trim().toLowerCase();
  if (text.includes("://")) text = httpUrl(text)?.hostname ?? "";
  text = text.split("/")[0].split(":")[0].replace(/\.$/, "");
  if (text.startsWith("www.")) text = text.slice(4);
  const labels = text.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  for (const size of [4, 3, 2]) {
    if (labels.length > size && MULTI_LABEL_SUFFIXES.has(labels.slice(-size).join("."))) {
      return labels.slice(-(size + 1)).join(".");
    }
  }
  return labels.slice(-2).join(".");
}

/** Mirrors privacy.generic_email_ok: a generic office inbox on the site's own registrable domain. */
export function genericEmailOk(email: string, siteUrlOrHost: string): boolean {
  const m = EMAIL_RE.exec(email.trim());
  if (!m) return false;
  const local = m[1].toLowerCase();
  if (!GENERIC_EMAIL_LOCALS.has(local)) return false;
  const site = registrableDomain(siteUrlOrHost);
  return site !== "" && registrableDomain(m[2]) === site;
}

/** Mirrors careers.is_ats_host: the host is a known applicant-tracking host or one of its subdomains. */
export function isAtsHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return ATS_HOSTS.some((ats) => h === ats || h.endsWith(`.${ats}`));
}

/** "+19035550100" -> "(903) 555-0100"; null when it is not a valid NANP number. */
export function nanpDisplay(e164: string): string | null {
  const m = E164_RE.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : null;
}

function checkAddress(raw: unknown): DirectoryBusiness["address"] {
  if (!isRecord(raw)) fail("bad_address");
  const street = optionalText(raw.street, 120, "bad_address_street");
  const zip = raw.zip === null || raw.zip === undefined ? null : raw.zip;
  if ((street === null) !== (zip === null)) fail("address_street_and_zip_must_match");
  if (zip !== null && (typeof zip !== "string" || !ZIP_RE.test(zip))) fail("bad_address_zip");
  const city = plainText(raw.city, 60, "bad_address_city");
  const state = plainText(raw.state, 2, "bad_address_state");
  // The directory covers the City of Longview only. Anything else would make
  // the "Longview, TX" fallback untrue.
  if (city.toLowerCase() !== "longview" || state !== "TX") fail("address_outside_longview");
  return { street, city: "Longview", state: "TX", zip: zip as string | null };
}

function checkWebsite(raw: unknown): DirectoryBusiness["website"] {
  if (raw === null || raw === undefined) return null;
  if (!isRecord(raw)) fail("bad_website");
  const url = requiredUrl(raw.url, "bad_website_url");
  const statuses: WebsiteStatus[] = ["ok", "moved", "dead", "blocked"];
  if (!statuses.includes(raw.status as WebsiteStatus)) fail("bad_website_status");
  return { url, status: raw.status as WebsiteStatus };
}

function checkPhone(raw: unknown): DirectoryBusiness["phone"] {
  if (raw === null || raw === undefined) return null;
  if (!isRecord(raw) || typeof raw.e164 !== "string" || typeof raw.display !== "string") fail("bad_phone");
  const display = nanpDisplay(raw.e164);
  if (!display) fail("phone_not_nanp");
  if (raw.display !== display) fail("phone_display_mismatch");
  return { e164: raw.e164, display };
}

function checkHours(raw: unknown): WeeklyHours | null {
  if (raw === null || raw === undefined) return null;
  if (!isRecord(raw)) fail("bad_hours");
  const hours: WeeklyHours = {};
  for (const [key, ranges] of Object.entries(raw)) {
    if (!DAY_KEYS.includes(key as DayKey)) fail("bad_hours_day");
    if (!Array.isArray(ranges) || ranges.length > 6) fail("bad_hours_ranges");
    const out: TimeRange[] = [];
    for (const range of ranges) {
      if (!Array.isArray(range) || range.length !== 2) fail("bad_hours_range");
      const [open, close] = range;
      if (typeof open !== "string" || !OPEN_RE.test(open)) fail("bad_hours_time");
      if (typeof close !== "string" || !CLOSE_RE.test(close)) fail("bad_hours_time");
      if (open === close) fail("bad_hours_range");
      out.push([open, close]);
    }
    hours[key as DayKey] = out;
  }
  // An object that states no day says nothing; show "Hours not listed".
  return Object.keys(hours).length ? hours : null;
}

function checkSocial(raw: unknown): DirectoryBusiness["social"] {
  if (raw === null || raw === undefined) return { facebook: null, instagram: null };
  if (!isRecord(raw)) fail("bad_social");
  const onHost = (value: unknown, host: string, reason: string): string | null => {
    if (value === null || value === undefined) return null;
    const url = httpUrl(value);
    if (!url) fail(reason);
    const h = url.hostname.toLowerCase();
    if (h !== host && !h.endsWith(`.${host}`)) fail(reason);
    return value as string;
  };
  return {
    facebook: onHost(raw.facebook, "facebook.com", "facebook_not_on_facebook_com"),
    instagram: onHost(raw.instagram, "instagram.com", "instagram_not_on_instagram_com"),
  };
}

function checkFacts(raw: unknown): Fact[] {
  if (!Array.isArray(raw)) fail("bad_facts");
  return raw.map((fact) => {
    if (!isRecord(fact)) fail("bad_fact");
    if (!FACT_FIELDS.includes(fact.field as FactField)) fail("bad_fact_field");
    if (!FACT_SOURCES.includes(fact.source as FactSource)) fail("bad_fact_source");
    const url = optionalUrl(fact.url, "bad_fact_url");
    const checkedAt = localDate(fact.checkedAt, "bad_fact_checked_at");
    return { field: fact.field as FactField, source: fact.source as FactSource, url, checkedAt };
  });
}

/** The fields a profile would show for this record; each needs a fact. */
export function shownFields(b: DirectoryBusiness): FactField[] {
  const fields: FactField[] = ["name", "category"];
  if (b.address.street) fields.push("address");
  if (b.permitSince) fields.push("permitSince");
  if (b.website) fields.push("website");
  if (b.phone) fields.push("phone");
  if (b.email) fields.push("email");
  if (b.hours) fields.push("hours");
  if (b.social.facebook) fields.push("facebook");
  if (b.social.instagram) fields.push("instagram");
  if (b.careersUrl) fields.push("careers");
  if (b.services.length) fields.push("services");
  return fields;
}

function checkBusiness(raw: unknown, knownCategories: ReadonlySet<string>): DirectoryBusiness {
  if (!isRecord(raw)) fail("not_an_object");
  if (typeof raw.id !== "string" || !ID_RE.test(raw.id)) fail("bad_id");
  if (typeof raw.slug !== "string" || raw.slug.length > 160 || !SLUG_RE.test(raw.slug)) fail("bad_slug");
  if ((RESERVED_SLUGS as readonly string[]).includes(raw.slug)) fail("reserved_slug");
  const name = plainText(raw.name, 160, "bad_name");
  if (typeof raw.category !== "string" || !SLUG_RE.test(raw.category)) fail("bad_category");
  if (!knownCategories.has(raw.category)) fail("unknown_category");
  const categoryLabel = optionalText(raw.categoryLabel, 120, "bad_category_label");
  const address = checkAddress(raw.address);
  const permitSince = raw.permitSince === null || raw.permitSince === undefined
    ? null
    : localDate(raw.permitSince, "bad_permit_since");
  const website = checkWebsite(raw.website);
  const phone = checkPhone(raw.phone);
  let email: string | null = null;
  if (raw.email !== null && raw.email !== undefined) {
    if (typeof raw.email !== "string" || !EMAIL_RE.test(raw.email)) fail("bad_email");
    if (!website) fail("email_without_website");
    const local = raw.email.split("@")[0].toLowerCase();
    if (!GENERIC_EMAIL_LOCALS.has(local)) fail("email_not_generic");
    if (!genericEmailOk(raw.email, website.url)) fail("email_off_domain");
    email = raw.email;
  }
  const hours = checkHours(raw.hours);
  const social = checkSocial(raw.social);
  const careersUrl = optionalUrl(raw.careersUrl, "bad_careers_url");
  if (!Array.isArray(raw.hiringRoles)) fail("bad_hiring_roles");
  const hiringRoles = raw.hiringRoles as unknown[];
  if (hiringRoles.some((role) => !HIRING_ROLES.includes(role as HiringRole))) fail("bad_hiring_role");
  if (new Set(hiringRoles).size !== hiringRoles.length) fail("bad_hiring_roles");
  if (hiringRoles.length && !careersUrl) fail("hiring_roles_without_careers");
  if (!Array.isArray(raw.services) || raw.services.length > 40) fail("bad_services");
  const services = raw.services.map((s) => plainText(s, 60, "bad_service"));
  const facts = checkFacts(raw.facts);
  const updatedAt = localDate(raw.updatedAt, "bad_updated_at");
  if (typeof raw.indexable !== "boolean") fail("bad_indexable");

  const business: DirectoryBusiness = {
    id: raw.id,
    slug: raw.slug,
    name,
    category: raw.category,
    categoryLabel,
    address,
    permitSince,
    website,
    phone,
    email,
    hours,
    social,
    careersUrl,
    hiringRoles: hiringRoles as HiringRole[],
    services,
    facts,
    updatedAt,
    indexable: raw.indexable,
  };

  // Provenance: contact details only from the business's own site, the
  // permit date only from the Comptroller, and a source for every shown field.
  for (const fact of facts) {
    if (WEBSITE_ONLY_FIELDS.has(fact.field) && fact.source !== "website") fail(`fact_not_from_website:${fact.field}`);
    if (fact.field === "permitSince" && fact.source !== "tx_sales_tax") fail("permit_fact_not_from_comptroller");
  }
  if (facts.some((f) => f.source === "website") && !website) fail("website_fact_without_website");
  if (website) {
    // "From the website" must mean a page on that website (or a subdomain),
    // not a directory or review site that happens to list the business.
    const site = registrableDomain(website.url);
    for (const fact of facts) {
      if (fact.source !== "website") continue;
      if (!fact.url) fail(`website_fact_without_url:${fact.field}`);
      if (registrableDomain(fact.url) !== site) fail(`website_fact_off_site:${fact.field}`);
    }
    // The careers link itself may point at a job board, but only the ones the engine keeps.
    if (careersUrl && registrableDomain(careersUrl) !== site && !isAtsHost(new URL(careersUrl).hostname)) {
      fail("careers_url_off_site");
    }
  }
  for (const field of shownFields(business)) {
    if (!facts.some((f) => f.field === field)) fail(`missing_fact:${field}`);
  }
  return business;
}

function checkSources(raw: unknown, issues: string[]): DirectorySource[] {
  if (!Array.isArray(raw)) {
    issues.push("sources is not a list");
    return [];
  }
  const out: DirectorySource[] = [];
  for (const source of raw) {
    try {
      if (!isRecord(source)) fail("bad_source");
      out.push({
        id: plainText(source.id, 40, "bad_source"),
        name: plainText(source.name, 200, "bad_source"),
        publisher: plainText(source.publisher, 200, "bad_source"),
        license: plainText(source.license, 120, "bad_source"),
        url: optionalUrl(source.url, "bad_source"),
        lastSyncedAt: source.lastSyncedAt === null || source.lastSyncedAt === undefined
          ? null
          : localDate(source.lastSyncedAt, "bad_source"),
      });
    } catch (error) {
      if (!(error instanceof ContractError)) throw error;
      issues.push(`a source entry breaks the contract (${error.message})`);
    }
  }
  return out;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Categories are rebuilt from the businesses that survived the checks, in the
 * fixed order, so a count on the page is always the count of what is shown.
 */
export function recountCategories(
  businesses: readonly DirectoryBusiness[],
  names: ReadonlyMap<string, string> = new Map(),
): DirectoryCategory[] {
  const counts = new Map<string, number>();
  for (const b of businesses) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  const order = CATEGORY_ORDER.map((c) => c.slug);
  const extra = [...counts.keys()].filter((slug) => !order.includes(slug)).sort();
  return [...order, ...extra]
    .filter((slug) => (counts.get(slug) ?? 0) > 0)
    .map((slug) => ({
      slug,
      name: names.get(slug) ?? CATEGORY_ORDER.find((c) => c.slug === slug)?.name ?? slug,
      count: counts.get(slug) ?? 0,
    }));
}

export function emptyDirectory(): Directory {
  return {
    schemaVersion: DIRECTORY_SCHEMA_VERSION,
    generatedAt: null,
    batchId: null,
    sample: false,
    indexable: false,
    scope: "City of Longview, Texas",
    counts: { published: 0, inArchive: 0, heldForPrivacy: 0, needsReview: 0 },
    sources: [],
    categories: [],
    businesses: [],
  };
}

export function validateDirectory(raw: unknown): ValidationResult {
  const issues: string[] = [];
  const dropped: DroppedRecord[] = [];
  if (!isRecord(raw)) {
    return { directory: emptyDirectory(), dropped, issues: ["the file is not a JSON object"] };
  }
  if (raw.schemaVersion !== DIRECTORY_SCHEMA_VERSION) {
    // An unknown shape is never half-read.
    return {
      directory: emptyDirectory(),
      dropped,
      issues: [`schemaVersion ${JSON.stringify(raw.schemaVersion)} is not ${DIRECTORY_SCHEMA_VERSION}`],
    };
  }

  let generatedAt: string | null = null;
  if (raw.generatedAt !== null && raw.generatedAt !== undefined) {
    if (typeof raw.generatedAt === "string" && INSTANT_RE.test(raw.generatedAt) && !Number.isNaN(Date.parse(raw.generatedAt))) {
      generatedAt = raw.generatedAt;
    } else {
      issues.push("generatedAt is not a UTC timestamp");
    }
  }
  let batchId: string | null = null;
  if (raw.batchId !== null && raw.batchId !== undefined) {
    if (typeof raw.batchId === "string" && raw.batchId.length <= 40 && !CONTROL_RE.test(raw.batchId)) batchId = raw.batchId;
    else issues.push("batchId is not a short string");
  }
  // Fail safe: anything but an explicit false is treated as fictional sample data.
  if (typeof raw.sample !== "boolean") issues.push("sample is not true or false");
  if (typeof raw.indexable !== "boolean") issues.push("indexable is not true or false");
  const counts = isRecord(raw.counts) ? raw.counts : {};
  const countValues = {
    published: nonNegativeInt(counts.published),
    inArchive: nonNegativeInt(counts.inArchive),
    heldForPrivacy: nonNegativeInt(counts.heldForPrivacy),
    needsReview: nonNegativeInt(counts.needsReview),
  };
  if (Object.values(countValues).some((v) => v === null)) issues.push("counts are missing or not whole numbers");

  const categoryNames = new Map<string, string>();
  if (Array.isArray(raw.categories)) {
    for (const c of raw.categories) {
      if (isRecord(c) && typeof c.slug === "string" && SLUG_RE.test(c.slug) && typeof c.name === "string") {
        try {
          categoryNames.set(c.slug, plainText(c.name, 80, "bad_category_name"));
        } catch (error) {
          if (!(error instanceof ContractError)) throw error;
          issues.push(`category ${c.slug} has an unusable name`);
        }
      } else {
        issues.push("a category entry is malformed");
      }
    }
  } else {
    issues.push("categories is not a list");
  }
  const known = new Set([...CATEGORY_ORDER.map((c) => c.slug), ...categoryNames.keys()]);

  const businesses: DirectoryBusiness[] = [];
  const slugs = new Set<string>();
  const ids = new Set<string>();
  if (!Array.isArray(raw.businesses)) issues.push("businesses is not a list");
  const rows = Array.isArray(raw.businesses) ? raw.businesses : [];
  rows.forEach((row, index) => {
    const id = isRecord(row) && typeof row.id === "string" ? row.id : `#${index}`;
    try {
      const business = checkBusiness(row, known);
      if (ids.has(business.id)) fail("duplicate_id");
      if (slugs.has(business.slug)) fail("duplicate_slug");
      ids.add(business.id);
      slugs.add(business.slug);
      businesses.push(business);
    } catch (error) {
      if (!(error instanceof ContractError)) throw error;
      dropped.push({ id, reason: error.message });
    }
  });

  return {
    directory: {
      schemaVersion: DIRECTORY_SCHEMA_VERSION,
      generatedAt,
      batchId,
      sample: raw.sample !== false,
      indexable: raw.indexable === true,
      scope: typeof raw.scope === "string" && raw.scope.trim() ? raw.scope.trim() : "City of Longview, Texas",
      counts: {
        published: countValues.published ?? 0,
        inArchive: countValues.inArchive ?? 0,
        heldForPrivacy: countValues.heldForPrivacy ?? 0,
        needsReview: countValues.needsReview ?? 0,
      },
      sources: checkSources(raw.sources, issues),
      categories: recountCategories(businesses, categoryNames),
      businesses,
    },
    dropped,
    issues,
  };
}

/** Removal entries are compared trimmed and lowercased, so " LV-ABC..." still hides the listing. */
export function normalizeSuppression(entry: string): string {
  return entry.trim().toLowerCase();
}

/** A usable removal entry: a business id (lv-...) or a profile slug. */
export function isSuppressionEntry(entry: string): boolean {
  return ID_RE.test(entry) || (entry.length <= 160 && SLUG_RE.test(entry));
}

/**
 * Removal requests win immediately: a business whose id or slug is listed
 * never renders. `unmatched` lists entries that hide nothing in this directory.
 */
export function applySuppressions(
  directory: Directory,
  entries: Iterable<string>,
): { directory: Directory; suppressed: string[]; unmatched: string[] } {
  const hidden = new Set([...entries].map(normalizeSuppression));
  const isHidden = (b: DirectoryBusiness) => hidden.has(b.id) || hidden.has(b.slug);
  const suppressed = directory.businesses.filter(isHidden).map((b) => b.id);
  const unmatched = [...hidden].filter((e) => !directory.businesses.some((b) => b.id === e || b.slug === e));
  if (!suppressed.length) return { directory, suppressed, unmatched };
  const businesses = directory.businesses.filter((b) => !isHidden(b));
  const names = new Map(directory.categories.map((c) => [c.slug, c.name]));
  return { directory: { ...directory, businesses, categories: recountCategories(businesses, names) }, suppressed, unmatched };
}

/** suppressions.json: { "ids": ["lv-..." or "a-slug"] }, normalized. Null when the file is unusable. */
export function parseSuppressions(raw: unknown): string[] | null {
  if (!isRecord(raw) || !Array.isArray(raw.ids)) return null;
  if (raw.ids.some((id) => typeof id !== "string")) return null;
  return (raw.ids as string[]).map(normalizeSuppression);
}
