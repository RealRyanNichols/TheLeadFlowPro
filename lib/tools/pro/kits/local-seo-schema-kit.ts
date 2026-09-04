// Local SEO Schema Kit.
//
// The free generators each produce one block. A real site needs the whole
// wiring set at once: the LocalBusiness graph, a Service block and a page plan
// per service, FAQ markup, titles and descriptions cut to length, the robots
// and sitemap stubs, the Google Business Profile text, and a written install
// guide for whatever platform the site runs on.
//
// Everything generated is deterministic from the buyer's inputs. Nothing here
// invents reviews, ratings or claims, because fabricated structured data is
// how a site earns a manual action.

import {
  brandOf, count, num, str,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import {
  bigNumbers, bullets, callout, checklist, csvDoc, heading, jsonDoc, MADE_WITH,
  numbered, pLead, paragraph, printDoc, printDocument, resolveBrand, table, textDoc,
} from "../docs";

/* --------------------------------- parsing --------------------------------- */

export type ServiceEntry = { name: string; blurb: string };
export type FaqEntry = { q: string; a: string };

export function parseServiceList(text: string): ServiceEntry[] {
  return text
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split("|").map((p) => p.trim());
      return { name: (name || "").slice(0, 120), blurb: rest.join(" ").slice(0, 300) };
    })
    .filter((s) => s.name)
    .slice(0, 25);
}

export function parseFaqList(text: string): FaqEntry[] {
  return text
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line) => {
      const [q, ...rest] = line.split("|").map((p) => p.trim());
      return { q: (q || "").slice(0, 200), a: rest.join(" ").slice(0, 600) };
    })
    .filter((f) => f.q && f.a)
    .slice(0, 20);
}

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "Mo-Fr 08:00-17:00" style strings into schema.org OpeningHoursSpecification. */
export function parseHours(text: string): { dayOfWeek: string[]; opens: string; closes: string }[] {
  const DAY: Record<string, string> = {
    mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday",
    fr: "Friday", sa: "Saturday", su: "Sunday",
  };
  const ORDER = ["mo", "tu", "we", "th", "fr", "sa", "su"];
  const out: { dayOfWeek: string[]; opens: string; closes: string }[] = [];
  for (const part of text.split(/[;,]/)) {
    const m = part.trim().match(/^([A-Za-z]{2})(?:-([A-Za-z]{2}))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!m) continue;
    const from = m[1].toLowerCase();
    const to = (m[2] || m[1]).toLowerCase();
    const a = ORDER.indexOf(from);
    const b = ORDER.indexOf(to);
    if (a < 0 || b < 0 || b < a) continue;
    out.push({ dayOfWeek: ORDER.slice(a, b + 1).map((d) => DAY[d]), opens: m[3], closes: m[4] });
  }
  return out;
}

const BUSINESS_TYPES = [
  "LocalBusiness", "Plumber", "Electrician", "RoofingContractor", "HVACBusiness",
  "GeneralContractor", "HousePainter", "MovingCompany", "AutoRepair", "Dentist",
  "MedicalClinic", "Attorney", "RealEstateAgent", "InsuranceAgency", "Restaurant",
  "CafeOrCoffeeShop", "HairSalon", "BeautySalon", "ExerciseGym", "PetStore",
  "VeterinaryCare", "AccountingService", "Locksmith", "Landscaper" ,
] as const;

/* ---------------------------------- fields --------------------------------- */

const FIELDS: ProToolDef["fields"] = [
  {
    id: "bizType", label: "The closest business type", type: "select", def: "LocalBusiness", section: "Your business",
    options: BUSINESS_TYPES.map((t) => ({ value: t, label: t.replace(/([a-z])([A-Z])/g, "$1 $2") })),
    help: "Pick the most specific one that is true. LocalBusiness is always safe.",
  },
  { id: "street", label: "Street address", type: "text", def: "", section: "Your business", placeholder: "2800 Gilmer Rd Suite 106" },
  { id: "state", label: "State", type: "text", def: "", section: "Your business", placeholder: "TX" },
  { id: "zip", label: "ZIP", type: "text", def: "", section: "Your business", placeholder: "75604" },
  {
    id: "areas", label: "Towns you serve", type: "text", def: "", section: "Your business",
    placeholder: "Longview, Marshall, Kilgore, Tyler", help: "Comma separated. Drives the service area markup and the page plan.",
  },
  {
    id: "hours", label: "Hours", type: "text", def: "Mo-Fr 08:00-17:00", section: "Your business",
    help: "Like Mo-Fr 08:00-17:00; Sa 09:00-12:00. Blocks separated by semicolons.",
  },
  {
    id: "priceRange", label: "Price range", type: "select", def: "$$", section: "Your business",
    options: [
      { value: "$", label: "$ budget" },
      { value: "$$", label: "$$ mid" },
      { value: "$$$", label: "$$$ premium" },
    ],
  },
  {
    id: "services", label: "Your services", type: "textarea", def: "", rows: 5, section: "Your services",
    placeholder: "Water heater replacement | Same week replacement with haul away\nDrain cleaning | Camera inspection included",
    help: "One per line: service name | one honest line about it. Each gets a Service block, a page plan row and a title.",
  },
  {
    id: "faqs", label: "Questions customers actually ask", type: "textarea", def: "", rows: 5, section: "Your questions",
    placeholder: "Do you charge for estimates? | No. Estimates are free within our service area.",
    help: "One per line: question | answer. Only questions truly answered on your site; FAQ markup for hidden text earns penalties.",
  },
];

/* ----------------------------------- run ----------------------------------- */

function run(v: Values): Result {
  const brand = resolveBrand(brandOf(v));
  const bizType = str(v, "bizType", "LocalBusiness");
  const street = str(v, "street").trim().slice(0, 200);
  const state = str(v, "state").trim().slice(0, 40);
  const zip = str(v, "zip").trim().slice(0, 20);
  const city = brand.city.split(",")[0]?.trim() || "";
  const areas = str(v, "areas")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 20);
  const hours = parseHours(str(v, "hours"));
  const priceRange = str(v, "priceRange", "$$");
  const services = parseServiceList(str(v, "services"));
  const faqs = parseFaqList(str(v, "faqs"));

  const site = brand.siteHref || "";
  const base = site.replace(/\/$/, "");

  /* ------------------------------- the graph ------------------------------- */

  const businessNode: Record<string, unknown> = {
    "@type": bizType,
    "@id": base ? `${base}/#business` : undefined,
    name: brand.name,
    url: base || undefined,
    telephone: brand.phoneHref || undefined,
    email: brand.email || undefined,
    priceRange,
    image: brand.logo ? undefined : undefined,
    address:
      street || city || state || zip
        ? {
            "@type": "PostalAddress",
            streetAddress: street || undefined,
            addressLocality: city || undefined,
            addressRegion: state || undefined,
            postalCode: zip || undefined,
            addressCountry: "US",
          }
        : undefined,
    areaServed: areas.length ? areas.map((a) => ({ "@type": "City", name: a })) : undefined,
    openingHoursSpecification: hours.length
      ? hours.map((h) => ({ "@type": "OpeningHoursSpecification", ...h }))
      : undefined,
    ...(services.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${brand.name} services`,
            itemListElement: services.map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s.name, description: s.blurb || undefined },
            })),
          },
        }
      : {}),
  };

  const prune = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(prune);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, val]) => val !== undefined && val !== "")
          .map(([key, val]) => [key, prune(val)]),
      );
    }
    return value;
  };

  const graph = prune({
    "@context": "https://schema.org",
    "@graph": [
      businessNode,
      ...(base
        ? [{ "@type": "WebSite", "@id": `${base}/#website`, url: base, name: brand.name, publisher: { "@id": `${base}/#business` } }]
        : []),
    ],
  });

  const scriptTag = (json: unknown) =>
    `<script type="application/ld+json">\n${JSON.stringify(json, null, 2)}\n</script>`;

  const faqGraph = faqs.length
    ? prune({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      })
    : null;

  /* ------------------------------- page plan ------------------------------- */

  const clamp = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}`);
  const titleFor = (service: string) => clamp(city ? `${service} in ${city} | ${brand.name}` : `${service} | ${brand.name}`, 60);
  const descFor = (s: ServiceEntry) =>
    clamp(
      `${s.blurb || `${s.name} from ${brand.name}`}${city ? ` Serving ${city}${areas.length ? " and " + areas.filter((a) => a !== city).slice(0, 3).join(", ") : ""}.` : ""} Call ${brand.phone || "us"} for a straight answer.`,
      155,
    );

  const pagePlan = services.map((s) => ({
    service: s.name,
    path: `/${slugify(s.name)}`,
    h1: city ? `${s.name} in ${city}` : s.name,
    title: titleFor(s.name),
    titleChars: titleFor(s.name).length,
    description: descFor(s),
    descChars: descFor(s).length,
  }));

  const serviceBlocks = services
    .map((s) =>
      scriptTag(
        prune({
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.name,
          description: s.blurb || undefined,
          provider: base ? { "@id": `${base}/#business` } : { "@type": bizType, name: brand.name },
          areaServed: areas.length ? areas.map((a) => ({ "@type": "City", name: a })) : undefined,
        }),
      ),
    )
    .map((block, i) => `=== PASTE ON THE ${pagePlan[i].path} PAGE ===\n\n${block}`)
    .join("\n\n\n");

  /* -------------------------------- gbp text ------------------------------- */

  const gbpDescription = clamp(
    `${brand.name} ${city ? `serves ${city}${areas.length ? " and " + areas.filter((a) => a !== city).slice(0, 4).join(", ") : ""}` : "is a local business"}${services.length ? ` with ${services.slice(0, 5).map((s) => s.name.toLowerCase()).join(", ")}` : ""}. Straight answers, written prices, and a real person on the phone${brand.phone ? ` at ${brand.phone}` : ""}.`,
    750,
  );

  const robots = ["User-agent: *", "Allow: /", ...(base ? ["", `Sitemap: ${base}/sitemap.xml`] : [])].join("\n");
  const sitemap = base
    ? [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
        `  <url><loc>${base}/</loc></url>`,
        ...pagePlan.map((p) => `  <url><loc>${base}${p.path}</loc></url>`),
        `</urlset>`,
      ].join("\n")
    : "Add your website in the brand kit and the sitemap stub fills in with your real URLs.";

  /* ------------------------------ readiness -------------------------------- */

  const blocks: { name: string; ready: boolean; why: string }[] = [
    { name: "LocalBusiness graph", ready: Boolean(brand.name !== "Your business" && (street || city)), why: "needs your name and at least a city or street" },
    { name: "Service blocks", ready: services.length > 0, why: "add at least one service" },
    { name: "FAQ markup", ready: faqs.length > 0, why: "add the questions customers really ask" },
    { name: "Page plan and titles", ready: services.length > 0 && Boolean(city), why: "needs services and your city" },
    { name: "Hours markup", ready: hours.length > 0, why: "needs hours it can parse" },
    { name: "Sitemap and robots", ready: Boolean(base), why: "needs your website in the brand kit" },
    { name: "Business Profile text", ready: Boolean(brand.name !== "Your business"), why: "needs your business name" },
  ];
  const readyCount = blocks.filter((b) => b.ready).length;

  const guide = printDocument(
    brand,
    `Schema install guide for ${brand.name}`,
    [
      {
        eyebrow: "Local SEO wiring kit",
        title: "What goes where",
        html:
          pLead(
            "Three kinds of paste: one site-wide block in the head of every page, one Service block per service page, and the FAQ block only on the page where those questions visibly appear.",
          ) +
          bigNumbers([
            { value: `${readyCount} of ${blocks.length}`, label: "Blocks ready to install" },
            { value: count(pagePlan.length), label: "Service pages planned" },
            { value: count(faqs.length), label: "Questions marked up" },
          ]) +
          heading("Where to paste, by platform") +
          numbered([
            "WordPress: Appearance, Theme File Editor is fragile; use a header and footer plugin (any reputable one) and paste the site-wide block into the head section. Service blocks go into an HTML block on each service page.",
            "Wix: Settings, Custom Code, add the site-wide block to Head on all pages. Per page blocks: the page's SEO settings, Advanced, Structured Data.",
            "Squarespace: Settings, Advanced, Code Injection for the site-wide block. Per page: the page's Advanced tab, Page Header Code Injection.",
            "Shopify: Online Store, Themes, Edit code, theme.liquid, before the closing head tag for the site-wide block.",
            "GoDaddy Website Builder: Edit Site, Settings, Site-wide code, add to Header.",
            "Plain HTML or a developer: the site-wide block goes in the head of every page; hand them this kit and they will know.",
          ]) +
          heading("Then verify, in this order") +
          checklist([
            "Paste the site-wide block, publish, and run the page through Google's Rich Results Test",
            "Fix anything it flags before adding the per page blocks",
            "Add Service blocks to their pages and re-test one of them",
            "Add the FAQ block only where the questions are visible on the page",
            "Submit the sitemap in Google Search Console and watch coverage for a week",
          ]) +
          callout(
            "The rule that keeps this safe",
            "Structured data describes what is already true and visible on the page. No invented reviews, no hidden FAQs, no service areas you do not really serve. That is not caution for its own sake; fabricated markup is what manual penalties are made of.",
          ) +
          heading("Block readiness") +
          table(
            ["Block", "Status", "If not ready"],
            blocks.map((b) => [b.name, b.ready ? "Ready" : "Waiting", b.ready ? "" : b.why]),
          ),
      },
    ],
    { footNote: MADE_WITH },
  );

  const documents: ToolDocument[] = [
    textDoc(
      "sitewide",
      "Site-wide schema block",
      "The LocalBusiness and WebSite graph as one paste-ready script tag for the head of every page.",
      "schema-site-wide.html.txt",
      scriptTag(graph),
    ),
    jsonDoc(
      "graph",
      "The raw graph, JSON",
      "The same graph unwrapped, for a developer or a tag manager.",
      "schema-graph.json",
      graph,
    ),
    ...(services.length
      ? [
          textDoc(
            "serviceblocks",
            `${services.length} Service blocks`,
            "One paste-ready block per service page, each labeled with the page it belongs on.",
            "schema-service-blocks.html.txt",
            serviceBlocks,
          ),
          csvDoc(
            "pageplan",
            "Page plan with titles cut to length",
            "Path, H1, meta title and description per service page, with character counts against the 60 and 155 limits.",
            "seo-page-plan.csv",
            ["service", "path", "h1", "meta_title", "title_chars", "meta_description", "description_chars"],
            pagePlan.map((p) => [p.service, p.path, p.h1, p.title, p.titleChars, p.description, p.descChars]),
          ),
        ]
      : []),
    ...(faqGraph
      ? [
          textDoc(
            "faqblock",
            "FAQ block",
            "FAQPage markup for the page where these questions visibly appear. Never paste it on a page that does not show them.",
            "schema-faq.html.txt",
            scriptTag(faqGraph),
          ),
        ]
      : []),
    textDoc(
      "stubs",
      "robots.txt and sitemap.xml stubs",
      "Both files ready to upload, the sitemap listing the home page and every planned service page.",
      "robots-and-sitemap.txt",
      `=== robots.txt ===\n\n${robots}\n\n\n=== sitemap.xml ===\n\n${sitemap}`,
    ),
    textDoc(
      "gbp",
      "Google Business Profile text",
      "The description under its 750 character limit and your services list, ready to paste into the profile.",
      "google-business-profile.txt",
      [
        `=== BUSINESS DESCRIPTION (${gbpDescription.length} of 750 characters) ===`,
        "",
        gbpDescription,
        "",
        "=== SERVICES TO LIST ===",
        "",
        ...(services.length ? services.map((s) => `- ${s.name}${s.blurb ? `: ${s.blurb}` : ""}`) : ["Add services in the kit and they appear here."]),
        "",
        "=== REMINDERS ===",
        "",
        "- The primary category matters more than anything typed here. Pick the most specific true one.",
        "- The description may not include URLs or promotional prices; Google removes profiles for it.",
        "- Add real photos monthly. Profiles with fresh photos get measurably more calls than stale ones.",
      ].join("\n"),
    ),
    printDoc(
      "guide",
      "Install and verify guide",
      "Where each block goes on six platforms, the verification order, and the readiness table.",
      "schema-install-guide.html",
      guide,
    ),
  ];

  return {
    headline: {
      value: `${readyCount} of ${blocks.length}`,
      label: "Schema blocks ready to install",
      sub: readyCount === blocks.length ? "everything is wired" : blocks.filter((b) => !b.ready).map((b) => b.name).join(", ") + " waiting on inputs",
      tone: readyCount === blocks.length ? "good" : readyCount >= 4 ? "neutral" : "warn",
    },
    explain:
      readyCount === blocks.length
        ? `The full wiring set is built: the site-wide graph, ${count(services.length)} Service blocks with their page plan, FAQ markup for ${count(faqs.length)} questions, the stubs and the profile text. The guide says exactly where each piece goes on your platform.`
        : `Every input you add turns another block on. The readiness table in the guide names what each block is waiting for, and nothing is generated half-empty.`,
    stats: [
      { label: "Service pages planned", value: count(pagePlan.length) },
      { label: "Questions marked up", value: count(faqs.length) },
      { label: "Towns in the service area", value: count(areas.length) },
      {
        label: "Titles over 60 characters",
        value: count(pagePlan.filter((p) => p.titleChars > 60).length),
        tone: pagePlan.some((p) => p.titleChars > 60) ? "warn" : "good",
      },
    ],
    ...(pagePlan.length
      ? {
          table: {
            title: "The page plan",
            headers: ["Page", "Meta title", "Chars"],
            rows: pagePlan.map((p) => [p.path, p.title, p.titleChars]),
          },
        }
      : {}),
    verdict: {
      tone: "neutral",
      text: "Install the site-wide block first and verify it with the Rich Results Test before pasting anything per page. The guide holds your hand through all six platforms.",
    },
    assumptions: [
      "Markup describes only what you entered and what is visible on your pages. The kit invents no reviews, ratings or claims.",
      "Structured data makes pages eligible for rich results; nothing can guarantee how or whether Google shows them.",
      "Titles aim under 60 characters and descriptions under 155, the usual display limits, and the plan flags any that run over.",
    ],
    documents,
  };
}

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 19,
  promise:
    "The whole local search wiring set: the graph, per page Service blocks, FAQ markup, titles cut to length, the stubs, the profile text and the install guide.",
  kit: [
    "Site-wide LocalBusiness and WebSite graph, paste ready",
    "One Service block per service, labeled with its page",
    "Page plan CSV: paths, H1s, titles and descriptions with counts",
    "FAQ markup for the questions you really answer",
    "robots.txt and sitemap.xml stubs",
    "Google Business Profile description and services text",
    "Install and verify guide for six platforms",
  ],
  upgradeFrom: [
    "localbusiness-schema-generator",
    "faq-schema-generator",
    "meta-title-description-writer",
    "robots-txt-generator",
    "google-business-profile-scorecard",
  ],
  freePreview:
    "Fill in your business and watch the readiness score, the page plan and every block description build before paying.",
};

export const KIT: ProToolDef = {
  slug: "local-seo-schema-kit",
  name: "Local SEO Schema Kit",
  short: "Schema Kit",
  emoji: "🧭",
  category: "Website",
  tagline: "Every block your site needs, checked before you paste",
  description:
    "Generate the complete structured data set for a local business from one profile: the site-wide graph, a Service block and planned page per service, FAQ markup, meta titles cut to the display limits, robots and sitemap stubs, and the Business Profile text, with a guide that says where each piece goes.",
  who: "Local businesses and whoever runs their website: owners, office managers, or the web person they hand this kit to.",
  problem:
    "The free generators make one block at a time, and the site needs seven things wired together, pasted in the right places, and verified in the right order, which is exactly where most people give up.",
  payoff:
    "One kit, every block, each labeled with where it goes, plus the page plan and the verification checklist.",
  steps: [
    "Put your business name, phone, website and city in the brand kit once.",
    "Add your address, service area, hours and the closest business type.",
    "List your services and the questions customers really ask.",
    "Paste each block where the guide says, then verify with the Rich Results Test.",
  ],
  faqs: [
    {
      q: "Will this get me to the top of Google?",
      a: "Nobody can promise that, and anyone who does is selling something else. Structured data makes your pages eligible for rich results and helps Google understand exactly what and where you are. It is wiring, not magic.",
    },
    {
      q: "I do not know what schema is. Can I still use this?",
      a: "Yes. Each block is a copy and paste, the guide says where it goes on six common platforms in plain words, and the verification step tells you it worked. If somebody else runs your site, hand them the kit.",
    },
    {
      q: "Why does the kit refuse to mark up reviews?",
      a: "Because fabricated review markup is one of the fastest ways to a manual penalty. The kit generates only what is true from your inputs and visible on your pages.",
    },
    {
      q: "What happens when my services change?",
      a: "Open the kit, change the list, and every block, page plan row and title regenerates. Paste the new versions over the old ones.",
    },
  ],
  domain: "websites-digital",
  toolType: "generator",
  goals: ["check-a-website", "create-marketing", "capture-leads"],
  industries: [
    "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
    "cleaning", "remodeling", "auto-repair", "restaurant", "hair-salon", "barbershop",
    "spa", "fitness", "dental-practice", "medical-practice", "legal", "real-estate",
    "insurance", "veterinary", "pet-services", "accounting", "it-services", "handyman",
  ],
  audiences: ["owners", "managers", "administrators", "freelancers"],
  keywords: [
    "local seo schema generator", "localbusiness schema", "json ld generator", "service schema markup",
    "faq schema generator", "meta title generator", "google business profile description",
    "schema markup for small business",
  ],
  synonyms: ["structured data kit", "json ld kit", "local seo wiring kit"],
  disclaimer: "general-estimate",
  dataSensitivity: "none",
  popularity: 84,
  isNew: true,
  embedHeight: 1150,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A storefront pin standing on a street grid with labeled wiring running from it into a browser page's head, each wire ending in a tidy block.",
  visualFamily: "route",
  primarySubject: "map pin over a street grid wired to a browser page",
  supportingSubjects: ["schema blocks on the wires", "search magnifier"],
  sceneType: "diagram",
  composition: "pin and grid left, wires arcing right into the browser frame, negative space top center",
  colorAccent: 5,
  cardImage: "/tools-art/card/local-seo-schema-kit.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/local-seo-schema-kit.svg",
  heroImageAlt: "A local business map pin wired into a browser page head, with structured data blocks riding the wires",
  ogImage: "/og/tools/local-seo-schema-kit.jpg",
  ogLayout: "panel-over-scene",
  ogHook: "The graph, the blocks, the titles and the guide.",
  focalPoint: { x: 0.4, y: 0.5 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};
