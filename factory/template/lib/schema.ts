// schema.org structured data for a factory site, built from the client config.
// No imports, so it works in the standalone app and in the preview.

import type { ClientConfig } from "./config";

export function localBusinessJsonLd(c: ClientConfig) {
  const address = c.business.address
    ? {
        "@type": "PostalAddress",
        ...(c.business.address.showStreet && c.business.address.street ? { streetAddress: c.business.address.street } : {}),
        addressLocality: c.business.address.city,
        addressRegion: c.business.address.region,
        ...(c.business.address.postalCode ? { postalCode: c.business.address.postalCode } : {}),
        addressCountry: c.business.address.country,
      }
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": c.business.schemaType,
    "@id": `${c.seo.siteUrl}/#localbusiness`,
    name: c.business.name,
    ...(c.business.legalName ? { legalName: c.business.legalName } : {}),
    description: c.seo.description,
    url: c.seo.siteUrl,
    telephone: c.business.phoneE164,
    email: c.business.email,
    ...(address ? { address } : {}),
    areaServed: c.business.serviceArea.map((name) => ({ "@type": "Place", name })),
    ...(c.business.hours?.length ? { openingHours: c.business.hours } : {}),
    ...(c.business.socials?.length ? { sameAs: c.business.socials.map((s) => s.url) } : {}),
    ...(c.brand.logo ? { logo: c.brand.logo.startsWith("http") ? c.brand.logo : `${c.seo.siteUrl}${c.brand.logo}` } : {}),
    makesOffer: c.pages.services.items.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.name, description: s.description },
      ...(s.startingAt ? { priceSpecification: { "@type": "PriceSpecification", description: s.startingAt } } : {}),
    })),
  };
}

export function webPageJsonLd(c: ClientConfig, path: string, name: string, description: string) {
  const url = `${c.seo.siteUrl}${path === "/" ? "" : path}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@type": "WebSite", url: c.seo.siteUrl, name: c.business.name },
    about: { "@id": `${c.seo.siteUrl}/#localbusiness` },
  };
}

export function jsonLdText(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
