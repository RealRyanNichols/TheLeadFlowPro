// White-Label Tool Embeds.
//
// The one nobody else can sell. Every free tool on this site already embeds
// anywhere as an iframe carrying our credit line. This kit turns that line
// into the buyer's: their name, their phone, their button, their color, on
// any of the tools, on their own website, for one payment.
//
// The mechanics: the kit builds a small brand payload and embed URLs carrying
// it. run() is pure and cannot sign anything, so it leaves {{WL_SIGN:...}}
// placeholders that the render layer fills in, only on an unlocked render.
// The public embed route verifies the signature and re-validates every brand
// field before rendering, so a tampered URL falls back to the free frame.

import {
  brandOf, count, str, list,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import { TOOLS, sortTools } from "../../index";
import { encodeWhiteLabelBrand, type WhiteLabelBrand } from "../../../proAccess";
import {
  bigNumbers, bullets, callout, checklist, csvDoc, esc, heading, jsonDoc, MADE_WITH,
  numbered, pLead, paragraph, printDoc, printDocument, resolveBrand, safeUrl, textDoc,
} from "../docs";

const SITE = "https://www.theleadflowpro.com";

/* ---------------------------------- fields --------------------------------- */

const TOOL_OPTIONS = sortTools([...TOOLS], "popular").map((t) => ({
  value: t.slug,
  label: `${t.name} (${t.short ?? t.name})`.slice(0, 90),
}));

const DEFAULT_PICKS = [
  "missed-call-calculator",
  "job-price-calculator",
  "google-review-link",
  "hourly-rate-calculator",
  "lead-value-calculator",
  "loan-payment-calculator",
].filter((slug) => TOOLS.some((t) => t.slug === slug));

const FIELDS: ProToolDef["fields"] = [
  {
    id: "picks", label: "The tools to put on your site", type: "checks", def: DEFAULT_PICKS, section: "Your tools",
    options: TOOL_OPTIONS,
    help: "Every published tool in the library, most used first. Pick as many as you want; the price does not change.",
  },
  {
    id: "ctaText", label: "The button under every tool", type: "text", def: "Get a free quote", section: "Your bar",
    help: "What the button says. Short sells.",
  },
  {
    id: "ctaLink", label: "Where the button goes", type: "text", def: "", section: "Your bar",
    placeholder: "yourbusiness.com/contact",
    help: "Your contact or booking page. Without it the bar shows your name and phone only.",
  },
  {
    id: "pageTitle", label: "Your tools page headline", type: "text", def: "Free tools for our customers", section: "Your bar",
    help: "Used on the ready-made tools page in the kit.",
  },
];

/* ----------------------------------- run ----------------------------------- */

function run(v: Values): Result {
  const brand = resolveBrand(brandOf(v));
  const picks = list(v, "picks")
    .map((slug) => TOOLS.find((t) => t.slug === slug))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const ctaText = str(v, "ctaText").trim().slice(0, 48);
  const ctaLink = safeUrl(str(v, "ctaLink").trim().slice(0, 300));
  const pageTitle = (str(v, "pageTitle").trim() || "Free tools for our customers").slice(0, 120);

  const phoneDigits = brand.phoneHref.replace(/\D/g, "");
  const payload: WhiteLabelBrand = {
    n: brand.personalized ? brand.name : "Your business",
    ...(phoneDigits ? { p: phoneDigits } : {}),
    ...(brand.color !== "#1240E8" ? { c: brand.color } : {}),
    ...(ctaText && ctaLink ? { t: ctaText, u: ctaLink } : {}),
  };
  const b64 = encodeWhiteLabelBrand(payload);
  const wl = `{{WL_SIGN:${b64}}}`;

  // The branded route, not the free one: /embed/[slug]/b reads the signature
  // per request, while the free embeds stay statically served and untouched.
  const embedUrl = (slug: string) => `${SITE}/embed/${slug}/b?b=${b64}&wl=${wl}`;

  const resizeScript = `<script>if(!window.__leadflowEmbedResize){window.__leadflowEmbedResize=true;window.addEventListener("message",function(e){if(e.origin!=="${SITE}"||!e.data||e.data.type!=="leadflowpro:embed-height")return;var f=document.querySelector('iframe[data-leadflow-tool="'+e.data.slug+'"]');var h=Number(e.data.height);if(f&&h>0)f.style.height=h+"px";});}</script>`;

  // The title attribute is escaped because the snippet's destination is HTML:
  // a business name carrying a quote would otherwise break out of the
  // attribute, in the buyer's own page. Everything else in the tag is either
  // base64url, a validated slug, or a number.
  const iframeFor = (t: (typeof picks)[number]) =>
    `<iframe src="${embedUrl(t.slug)}" data-leadflow-tool="${t.slug}" width="100%" height="${t.embedHeight || 820}" style="border:0;border-radius:16px;max-width:760px" title="${esc(t.name)}, a free tool from ${esc(payload.n)}" loading="lazy"></iframe>`;

  const snippets = picks
    .map(
      (t) =>
        `=== ${t.name.toUpperCase()} ===\nSuggested page: a page about ${t.tagline.toLowerCase()}\n\n${iframeFor(t)}`,
    )
    .join("\n\n\n");

  const snippetsDoc = [
    `YOUR BRANDED EMBED CODES, ${payload.n}`,
    "",
    "Each code below is one tool, carrying your name, your phone and your button",
    "instead of ours. Paste the resize script once per page, anywhere, then paste",
    "each tool's code where you want it to appear.",
    "",
    "THE RESIZE SCRIPT (once per page)",
    "",
    resizeScript,
    "",
    "",
    snippets,
  ].join("\n");

  const toolsPage = [
    `<!doctype html>`,
    `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${esc(pageTitle)} | ${esc(payload.n)}</title>`,
    `<style>body{margin:0;background:#f6f8fb;color:#101828;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}` +
      `header{background:${brand.color};color:#fff;padding:40px 20px;text-align:center}` +
      `header h1{margin:0;font-size:30px;letter-spacing:-.02em}header p{margin:8px 0 0;opacity:.9}` +
      `main{max-width:820px;margin:0 auto;padding:28px 16px 60px}` +
      `section{margin:0 0 42px}section h2{font-size:20px;margin:0 0 4px}section p{margin:0 0 14px;color:#475467}` +
      `footer{text-align:center;padding:28px;color:#667085;font-size:14px}</style></head><body>`,
    `<header><h1>${esc(pageTitle)}</h1><p>${esc(payload.n)}${brand.phone ? ` · ${esc(brand.phone)}` : ""}</p></header>`,
    `<main>`,
    ...picks.map(
      (t) =>
        `<section><h2>${esc(t.name)}</h2><p>${esc(t.tagline)}</p>${iframeFor(t)}</section>`,
    ),
    `</main>`,
    `<footer>${esc(payload.n)}${brand.city ? ` · ${esc(brand.city)}` : ""}</footer>`,
    resizeScript,
    `</body></html>`,
  ].join("\n");

  const guide = printDocument(
    brand,
    `White-label embed guide for ${brand.name}`,
    [
      {
        eyebrow: "White-label embeds",
        title: "Your tools, your name, any website",
        html:
          pLead(
            `${count(picks.length)} working tool${picks.length === 1 ? "" : "s"} carrying ${payload.n}'s name, phone and button. We host them, keep them working and keep them free to run; your site just holds the frame.`,
          ) +
          bigNumbers([
            { value: count(picks.length), label: "Tools in your library" },
            { value: ctaText && ctaLink ? `"${ctaText}"` : "Name and phone", label: "What the bar under each tool shows" },
            { value: "Forever", label: "How long the codes work" },
          ]) +
          heading("Install, in plain words") +
          numbered([
            "Open your website editor and add an Embed, HTML or Custom Code block to the page you want a tool on.",
            "Paste the resize script once anywhere on that page, then the tool's code where the tool should sit.",
            "Publish and check it on a phone. The frame sizes itself.",
            "Prefer a whole tools page? The kit includes one finished HTML file; upload it as a new page and link your menu to it.",
          ]) +
          heading("Where each block works") +
          bullets([
            "WordPress: a Custom HTML block. Wix: Embed, then Embed HTML. Squarespace: a Code block.",
            "Shopify: a Custom Liquid section or a page in the code editor. GoDaddy: the HTML section.",
            "Webflow, Framer, Carrd, plain HTML: any embed or code element.",
          ]) +
          callout(
            "What you may and may not do",
            "Use the branded embeds on websites for the business named on them, as many pages and sites as that business runs. Reselling the embeds, or rebadging them for other businesses, needs its own kit per business; that is the whole price of the thing.",
          ) +
          heading("Good pairings") +
          bullets(
            picks
              .slice(0, 6)
              .map((t) => `${t.name}: put it on a page about ${t.tagline.toLowerCase()}, where the visitor already has the question it answers.`),
          ) +
          checklist([
            "The resize script is on every page that carries a tool",
            "Each tool sits on the page whose visitors have that question",
            "The button link points at a page with a form or a phone number",
            "You checked one page on a real phone",
          ]),
      },
    ],
    { footNote: MADE_WITH },
  );

  const documents: ToolDocument[] = [
    printDoc(
      "guide",
      "Install guide",
      "Plain words for every major website builder, the usage terms, and the checklist.",
      "white-label-embed-guide.html",
      guide,
    ),
    ...(picks.length
      ? [
          textDoc(
            "snippets",
            `${picks.length} branded embed codes`,
            "One paste-ready code per tool, each carrying your signed brand bar, plus the resize script.",
            "branded-embed-codes.txt",
            snippetsDoc,
          ),
          textDoc(
            "page",
            "A finished tools page",
            "A complete HTML page holding every tool you picked under your header. Upload it as /tools on your own site.",
            "your-tools-page.html",
            toolsPage,
          ),
          csvDoc(
            "index",
            "Your tool index",
            "Each tool with its public page and the page of yours it belongs on, for whoever runs your website.",
            "your-tool-index.csv",
            ["tool", "what_it_does", "leadflow_page", "suggested_home_on_your_site"],
            picks.map((t) => [t.name, t.tagline, `${SITE}/tools/${t.slug}`, `a page about ${t.tagline.toLowerCase()}`]),
          ),
        ]
      : []),
    jsonDoc(
      "manifest",
      "Brand manifest",
      "Your selections and brand payload, so the kit can be reopened and extended later.",
      "white-label-manifest.json",
      { brand: payload, tools: picks.map((t) => t.slug), pageTitle },
    ),
  ];

  return {
    headline: {
      value: count(picks.length),
      label: "Tools ready to carry your name",
      sub: picks.length ? `every one keeps working as long as we do, at no monthly cost` : "pick at least one tool above",
      tone: picks.length ? "good" : "warn",
    },
    explain: picks.length
      ? `Each embed is the same working tool from this library, hosted here, resized automatically, with the credit line replaced by ${payload.n}'s bar: ${
          ctaText && ctaLink ? `the "${ctaText}" button` : "your name and phone"
        }${brand.color !== "#1240E8" ? " in your color" : ""}. The signature in the URL is what authorizes the swap, and it never expires.`
      : "Pick tools from the library above. The bar under each one carries your name, phone and button in place of our credit line.",
    stats: [
      { label: "Library available", value: count(TOOLS.length), sub: "every published tool qualifies" },
      { label: "Monthly cost after purchase", value: "$0", tone: "good" },
      { label: "The bar shows", value: payload.n, sub: [brand.phone, ctaText && ctaLink ? `"${ctaText}"` : ""].filter(Boolean).join(" · ") || undefined },
    ],
    verdict: {
      tone: "neutral",
      text: picks.length
        ? "Take the codes, or take the finished tools page and upload it whole. The install guide covers every major builder in plain words."
        : "Everything below builds the moment at least one tool is picked.",
    },
    assumptions: [
      "Embeds are served from theleadflowpro.com and keep working as long as the library does; your page holds only the frame.",
      "The branded bar is for the business named on it. One kit covers one business, on as many of its own pages and sites as it likes.",
      "Tools remain free for visitors to use; the kit changes whose name is on them, nothing about what they do.",
    ],
    documents,
  };
}

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 29,
  promise:
    "Any of the free tools on your own website under your own name: your bar, your phone, your button, no credit line, no monthly fee.",
  kit: [
    "Branded embed codes for every tool you pick",
    "A finished tools page ready to upload as is",
    "Install guide for every major website builder",
    "Tool index for whoever runs your site",
    "Brand manifest for reopening the kit later",
  ],
  upgradeFrom: [
    "missed-call-calculator",
    "job-price-calculator",
    "google-review-link",
    "hourly-rate-calculator",
    "lead-value-calculator",
    "qr-code-maker",
  ],
  freePreview:
    "Pick your tools, set your bar, and see exactly what every embed and the finished page will carry before paying.",
};

export const KIT: ProToolDef = {
  slug: "white-label-tool-embeds",
  name: "White-Label Tool Embeds",
  short: "White-Label Embeds",
  emoji: "🏷️",
  category: "Website",
  tagline: "The whole tool library, wearing your name",
  description:
    "Put any of the working tools from this library on your own website with your name, phone, color and button where the credit line used to be. One payment covers every tool you pick, a finished tools page, and codes that never expire.",
  who: "Any business or web designer who wants real interactive calculators on a site without building or renting them: trades, lenders, agents, agencies.",
  problem:
    "A working calculator keeps visitors on a page and starts conversations, but building one costs hundreds and widget vendors rent them monthly. The free embeds work today, with somebody else's name under them.",
  payoff:
    "A library of working tools on your site, in your brand, hosted and maintained here, for one payment and no rent.",
  steps: [
    "Put your business name, phone and color in the brand kit once.",
    "Pick the tools that fit your customers from the library list.",
    "Set the button text and where it sends people.",
    "Paste the codes, or upload the finished tools page as is.",
  ],
  faqs: [
    {
      q: "Is there really no monthly fee?",
      a: "Really. The tools are hosted here either way; the kit is a one time payment for the right to carry your brand on them, and the signed codes have no expiry built into them.",
    },
    {
      q: "Can I use this for my clients' websites?",
      a: "One kit covers one business, on as many of its own pages and sites as it runs. An agency putting branded tools on three clients' sites buys three kits, which at this price is still less than an hour of custom development.",
    },
    {
      q: "What stops somebody copying my branded URL?",
      a: "Nothing needs to; the URL only renders your brand, which is exactly what you paid for. What nobody can do is mint a URL for a different brand, because the brand payload is signed and the embed route checks the signature on every load.",
    },
    {
      q: "Can I add more tools later?",
      a: "Open the kit, tick more tools, take the new codes. The kit covers every tool you pick, including tools added to the library after you bought.",
    },
  ],
  domain: "websites-digital",
  toolType: "builder",
  goals: ["capture-leads", "create-marketing", "check-a-website"],
  industries: [
    "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
    "remodeling", "cleaning", "real-estate", "mortgage-lending", "insurance", "legal",
    "dental-practice", "medical-practice", "auto-repair", "restaurant", "hair-salon",
    "fitness", "marketing-agency", "it-services", "accounting", "consulting",
  ],
  audiences: ["owners", "managers", "freelancers", "professionals"],
  keywords: [
    "white label calculator", "embed calculator on website", "calculator widget for website",
    "lead magnet calculator", "free tools page for business", "calculator for wordpress",
    "interactive tools for my website", "branded calculator embed",
  ],
  synonyms: ["branded tool embeds", "white label widgets", "tools page kit"],
  disclaimer: "general-estimate",
  dataSensitivity: "none",
  popularity: 82,
  isNew: true,
  embedHeight: 1200,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A browser window on someone's own site holding one of the library's calculators, with a brand nameplate being fitted over the old credit line like a plate sliding into place.",
  visualFamily: "websites",
  primarySubject: "browser holding an embedded calculator with a nameplate sliding in",
  supportingSubjects: ["small tool cards queued beside", "swap arrows"],
  sceneType: "device",
  composition: "browser center right at two thirds height, nameplate entering from the left on guide rails, queued tool cards lower left, negative space upper left",
  colorAccent: 6,
  cardImage: "/tools-art/card/white-label-tool-embeds.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/white-label-tool-embeds.svg",
  heroImageAlt: "A browser with an embedded calculator, a business nameplate sliding in over the old credit line",
  ogImage: "/og/tools/white-label-tool-embeds.jpg",
  ogLayout: "device",
  ogHook: "The tool library, on your site, wearing your name.",
  focalPoint: { x: 0.6, y: 0.5 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};
