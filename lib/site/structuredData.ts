// schema.org JSON-LD built from the business config, so every page that
// declares the organization or the local business says the same thing.
//
// The street address rides along only because the homepage has published it
// since the September 6 redesign (BUSINESS.address.policy). Flip the policy
// to "hidden" and it disappears from every page at once.

import { BUSINESS } from "./business";
import { googleBusinessProfile } from "./external-links";
import { OFFERS } from "./offers";

const SITE = BUSINESS.siteUrl;

function postalAddress() {
  if (BUSINESS.address.policy !== "structured_data_only") return undefined;
  return {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.address.street,
    addressLocality: BUSINESS.address.city,
    addressRegion: BUSINESS.address.region,
    postalCode: BUSINESS.address.postalCode,
    addressCountry: BUSINESS.address.country,
  };
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    description:
      "The Company Builder. We build the website, the system behind it, and the back office that runs it, in accounts the client controls.",
    // The name collides with an unrelated messaging app called LeadFlowPro.
    // This line tells the search engines which one this is. Never add the
    // one-word spelling as an alternateName; that would deepen the collision.
    disambiguatingDescription: `Marketing agency and business systems builder in ${BUSINESS.city}, Texas, operated by ${BUSINESS.operator}. Not the LeadFlowPro messaging app.`,
    url: SITE,
    logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png`, width: 512, height: 512 },
    image: `${SITE}/og/home.png`,
    email: BUSINESS.email.hello,
    telephone: BUSINESS.phone.schema,
    address: postalAddress(),
    founder: { "@type": "Person", name: BUSINESS.operator, url: `${SITE}/about` },
    sameAs: sameAsLinks(),
  };
}

/** The profiles search engines may tie to this business. The Google listing joins only once it is verified and set. */
export function sameAsLinks(): string[] {
  const gbp = googleBusinessProfile();
  return [BUSINESS.socials.youtube, BUSINESS.socials.facebook, ...(gbp ? [gbp] : [])];
}

export function areaServedJsonLd() {
  return [
    { "@type": "City", name: "Longview" },
    { "@type": "City", name: "Tyler" },
    { "@type": "City", name: "Marshall" },
    { "@type": "AdministrativeArea", name: "East Texas" },
    { "@type": "Country", name: "United States" },
  ];
}

/** ProfessionalService node for the whole business, with the live offer catalog. */
export function localBusinessJsonLd(
  options: { id?: string; name?: string; knowsAbout?: string[]; catalogName?: string; offerIds?: string[] } = {},
) {
  const offers = OFFERS.filter(
    (o) => o.status === "live" && (!options.offerIds || options.offerIds.includes(o.id)),
  );
  return {
    "@type": "ProfessionalService",
    "@id": options.id ?? `${SITE}/#localbusiness`,
    name: options.name ?? BUSINESS.name,
    parentOrganization: { "@id": `${SITE}/#organization` },
    url: SITE,
    image: `${SITE}/og/home.png`,
    sameAs: sameAsLinks(),
    telephone: BUSINESS.phone.schema,
    email: BUSINESS.email.hello,
    address: postalAddress(),
    areaServed: areaServedJsonLd(),
    knowsAbout: options.knowsAbout ?? [
      "Business websites",
      "Customer relationship management",
      "Lead capture and follow-up automation",
      "Small business operations software",
      "Meta and Google ads management",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: options.catalogName ?? "Website, agency, and connected business system offers",
      itemListElement: offers.map((o) => ({
        "@type": "Offer",
        url: `${SITE}${o.href}`,
        description: o.terms,
        ...(typeof o.priceUsd === "number" && o.priceUsd > 0
          ? { price: String(o.priceUsd), priceCurrency: "USD" }
          : {}),
        itemOffered: { "@type": "Service", name: o.name },
      })),
    },
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    url: SITE,
    name: BUSINESS.name,
    publisher: { "@id": `${SITE}/#organization` },
    inLanguage: "en-US",
  };
}

export function webPageJsonLd(path: string, name: string, description: string) {
  const url = `${SITE}${path === "/" ? "" : path}`;
  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": `${SITE}/#website` },
    about: { "@id": `${SITE}/#organization` },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function faqJsonLd(faq: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Wrap nodes in a graph. Serialize with jsonLdText() so "<" can never close the script tag. */
export function graph(...nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

export function jsonLdText(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
