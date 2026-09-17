// The per-client configuration for a factory-built site.
//
// One JSON file per client (site.config.json) describes the business, the
// brand tokens, the offer, the five pages, where leads go, and which analytics
// the client owns. Everything the template renders comes from here. Nothing
// in the template names a business, a price, or a phone number by hand.
//
// This file has no imports so it works unchanged inside the standalone app
// that ships to the client's own Vercel project and inside The LeadFlow Pro
// preview. Keep it that way.

export const FACTORY_VERSION = "1.0.0";

export type PageKey = "home" | "services" | "about" | "contact" | "conversion";

export type ClientConfig = {
  /** URL-safe identifier, also the output directory name. */
  slug: string;
  factoryVersion: string;
  business: {
    name: string;
    legalName?: string;
    tagline: string;
    /** E.164, e.g. +19035550100 */
    phoneE164: string;
    phoneDisplay: string;
    email: string;
    address?: {
      street?: string;
      city: string;
      region: string;
      postalCode?: string;
      country: string;
      /** Show the street on the public site and in structured data. */
      showStreet: boolean;
    };
    serviceArea: string[];
    hours?: string[];
    /** schema.org type: LocalBusiness, HomeAndConstructionBusiness, Dentist, ... */
    schemaType: string;
    socials?: { label: string; url: string }[];
  };
  brand: {
    /** Six-digit hex, e.g. #1240E8 */
    primary: string;
    accent: string;
    background: string;
    ink: string;
    /** Path under public/ or an absolute URL. Optional. */
    logo?: string;
    fontDisplay?: string;
    fontBody?: string;
  };
  offer: {
    headline: string;
    subhead: string;
    promise: string;
    primaryCta: { label: string; kind: "call" | "text" | "form" | "link"; href?: string };
    trustLine?: string;
  };
  pages: {
    home: { sections: { title: string; body: string }[] };
    services: {
      intro: string;
      items: { name: string; description: string; startingAt?: string; slug: string }[];
    };
    about: {
      story: string;
      people?: { name: string; role: string; bio?: string; photo?: string }[];
    };
    contact: { intro: string };
    conversion: {
      /** The one page with a job: a quote, a booking, an estimate, or a campaign. */
      kind: "quote" | "booking" | "estimate" | "campaign";
      slug: string;
      title: string;
      intro: string;
      fields: { id: string; label: string; type: "text" | "email" | "tel" | "textarea" | "select"; required?: boolean; options?: string[] }[];
      /** Printed under the form. Never promises a result. */
      consentLine: string;
      thankYou: string;
    };
  };
  leadRoute: {
    /** Where a submission goes. email: the client's inbox via their Resend key; webhook: their CRM; leadflow_hq: the plugin's inbound door. */
    kind: "email" | "webhook" | "leadflow_hq";
    /** Inbox for kind=email. */
    to?: string;
    /** URL for kind=webhook or the plugin lead endpoint for kind=leadflow_hq. */
    url?: string;
    /** Who is alerted, in words, so the handoff doc can say it. */
    owner: string;
  };
  analytics: {
    ga4Id?: string;
    metaPixelId?: string;
    /** Always on: the template's own page and form events, stored nowhere but the client's analytics. */
    firstParty: true;
  };
  seo: {
    siteUrl: string;
    title: string;
    description: string;
  };
  launch: {
    status: "draft" | "preview" | "live";
    vercelProject?: string;
    domain?: string;
    /** YYYY-MM-DD */
    scopeApprovedOn?: string;
  };
};

export type ConfigProblem = { path: string; message: string };

const HEX = /^#[0-9a-fA-F]{6}$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_RE = /^https:\/\/[^\s]+$/;

/** Everything a scoped five-page build needs before it is previewable. */
export function validateClientConfig(input: unknown): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const bad = (path: string, message: string) => problems.push({ path, message });
  if (!input || typeof input !== "object") return [{ path: "", message: "config is not an object" }];
  const c = input as Partial<ClientConfig>;

  if (!c.slug || !SLUG.test(c.slug)) bad("slug", "lowercase letters, digits, and single hyphens only");
  if (c.factoryVersion !== FACTORY_VERSION) bad("factoryVersion", `must be ${FACTORY_VERSION}`);

  const b = c.business;
  if (!b) bad("business", "missing");
  else {
    if (!b.name?.trim()) bad("business.name", "missing");
    if (!b.tagline?.trim()) bad("business.tagline", "missing");
    if (!b.phoneE164 || !E164.test(b.phoneE164)) bad("business.phoneE164", "must be E.164 like +19035550100");
    if (!b.phoneDisplay?.trim()) bad("business.phoneDisplay", "missing");
    if (!b.email || !EMAIL.test(b.email)) bad("business.email", "not a valid address");
    if (!Array.isArray(b.serviceArea) || b.serviceArea.length === 0) bad("business.serviceArea", "name at least one town or area");
    if (!b.schemaType?.trim()) bad("business.schemaType", "missing (LocalBusiness is a safe default)");
    if (b.address && (!b.address.city || !b.address.region || !b.address.country)) bad("business.address", "city, region, and country are required when an address is given");
  }

  const br = c.brand;
  if (!br) bad("brand", "missing");
  else {
    for (const key of ["primary", "accent", "background", "ink"] as const) {
      if (!br[key] || !HEX.test(br[key])) bad(`brand.${key}`, "six-digit hex colour");
    }
  }

  const o = c.offer;
  if (!o) bad("offer", "missing");
  else {
    if (!o.headline?.trim()) bad("offer.headline", "missing");
    if (!o.subhead?.trim()) bad("offer.subhead", "missing");
    if (!o.promise?.trim()) bad("offer.promise", "missing");
    if (!o.primaryCta?.label?.trim()) bad("offer.primaryCta.label", "missing");
    if (!["call", "text", "form", "link"].includes(o.primaryCta?.kind ?? "")) bad("offer.primaryCta.kind", "call, text, form, or link");
    if (o.primaryCta?.kind === "link" && !o.primaryCta.href) bad("offer.primaryCta.href", "a link CTA needs an href");
  }

  const p = c.pages;
  if (!p) bad("pages", "missing");
  else {
    if (!p.home?.sections?.length) bad("pages.home.sections", "at least one section");
    if (!p.services?.items?.length) bad("pages.services.items", "at least one service");
    else {
      const slugs = new Set<string>();
      p.services.items.forEach((s, i) => {
        if (!s.name?.trim()) bad(`pages.services.items[${i}].name`, "missing");
        if (!s.description?.trim()) bad(`pages.services.items[${i}].description`, "missing");
        if (!s.slug || !SLUG.test(s.slug)) bad(`pages.services.items[${i}].slug`, "url-safe slug");
        if (slugs.has(s.slug)) bad(`pages.services.items[${i}].slug`, "duplicate");
        slugs.add(s.slug);
      });
    }
    if (!p.about?.story?.trim()) bad("pages.about.story", "missing");
    if (!p.contact?.intro?.trim()) bad("pages.contact.intro", "missing");
    const cv = p.conversion;
    if (!cv) bad("pages.conversion", "missing");
    else {
      if (!["quote", "booking", "estimate", "campaign"].includes(cv.kind)) bad("pages.conversion.kind", "quote, booking, estimate, or campaign");
      if (!cv.slug || !SLUG.test(cv.slug) || ["services", "about", "contact"].includes(cv.slug)) bad("pages.conversion.slug", "url-safe and not services, about, or contact");
      if (!cv.title?.trim()) bad("pages.conversion.title", "missing");
      if (!cv.fields?.length) bad("pages.conversion.fields", "at least one field");
      else {
        const hasContact = cv.fields.some((f) => f.type === "email" || f.type === "tel");
        if (!hasContact) bad("pages.conversion.fields", "include an email or phone field so the lead can be answered");
        cv.fields.forEach((f, i) => {
          if (!f.id || !/^[a-z][a-z0-9_]*$/.test(f.id)) bad(`pages.conversion.fields[${i}].id`, "snake_case id");
          if (!f.label?.trim()) bad(`pages.conversion.fields[${i}].label`, "missing");
          if (f.type === "select" && !f.options?.length) bad(`pages.conversion.fields[${i}].options`, "a select needs options");
        });
      }
      if (!cv.consentLine?.trim()) bad("pages.conversion.consentLine", "missing");
      if (!cv.thankYou?.trim()) bad("pages.conversion.thankYou", "missing");
      const lower = `${cv.title} ${cv.intro} ${cv.thankYou}`.toLowerCase();
      for (const banned of ["guarantee", "guaranteed", "#1", "best in", "lowest price"]) {
        if (lower.includes(banned)) bad("pages.conversion", `copy must not say "${banned}"`);
      }
    }
  }

  const lr = c.leadRoute;
  if (!lr) bad("leadRoute", "missing");
  else {
    if (!["email", "webhook", "leadflow_hq"].includes(lr.kind)) bad("leadRoute.kind", "email, webhook, or leadflow_hq");
    if (lr.kind === "email" && (!lr.to || !EMAIL.test(lr.to))) bad("leadRoute.to", "the client's inbox");
    if (lr.kind !== "email" && (!lr.url || !URL_RE.test(lr.url))) bad("leadRoute.url", "an https URL the client controls");
    if (!lr.owner?.trim()) bad("leadRoute.owner", "name who answers the lead");
  }

  if (!c.analytics || c.analytics.firstParty !== true) bad("analytics.firstParty", "must be true");
  if (c.analytics?.ga4Id && !/^G-[A-Z0-9]{6,}$/.test(c.analytics.ga4Id)) bad("analytics.ga4Id", "looks wrong (G-XXXXXXX)");
  if (c.analytics?.metaPixelId && !/^\d{10,20}$/.test(c.analytics.metaPixelId)) bad("analytics.metaPixelId", "digits only");

  const s = c.seo;
  if (!s) bad("seo", "missing");
  else {
    if (!s.siteUrl || !URL_RE.test(s.siteUrl)) bad("seo.siteUrl", "https URL");
    if (!s.title?.trim() || s.title.length > 70) bad("seo.title", "1 to 70 characters");
    if (!s.description?.trim() || s.description.length > 160) bad("seo.description", "1 to 160 characters");
  }

  const l = c.launch;
  if (!l || !["draft", "preview", "live"].includes(l.status)) bad("launch.status", "draft, preview, or live");
  if (l?.status === "live" && (!l.domain || !l.vercelProject || !l.scopeApprovedOn)) bad("launch", "a live site needs domain, vercelProject, and scopeApprovedOn");

  return problems;
}

/** The five routes every factory site has, in nav order. */
export function siteRoutes(c: ClientConfig): { key: PageKey; href: string; label: string }[] {
  return [
    { key: "home", href: "/", label: "Home" },
    { key: "services", href: "/services", label: "Services" },
    { key: "about", href: "/about", label: "About" },
    { key: "conversion", href: `/${c.pages.conversion.slug}`, label: c.pages.conversion.title },
    { key: "contact", href: "/contact", label: "Contact" },
  ];
}

export function primaryCtaHref(c: ClientConfig): string {
  const cta = c.offer.primaryCta;
  if (cta.kind === "call") return `tel:${c.business.phoneE164}`;
  if (cta.kind === "text") return `sms:${c.business.phoneE164}`;
  if (cta.kind === "form") return `/${c.pages.conversion.slug}`;
  return cta.href ?? "/contact";
}
