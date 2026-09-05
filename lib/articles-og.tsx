import type { ReactElement } from "react";
import type { Article } from "./articles";

export const ARTICLE_OG_SIZE = { width: 1200, height: 630 } as const;

const NAVY = "#050D1B";
const WHITE = "#F8FBFF";
const MUTED = "#C3D0E0";

const V4_ARTICLE_SLUGS = [
  "data-centers-are-coming-to-texas",
  "the-money-is-in-the-follow-up",
  "marketplace-is-not-your-website",
  "small-business-website-cost",
  "website-builder-monthly-fees",
  "does-my-business-need-a-crm",
  "website-traffic-but-no-customers",
  "missed-calls-cost-customers",
  "facebook-page-is-not-a-website",
  "own-your-email-list",
  "east-texas-business-website-guide",
  "cost-of-renting-business-software",
  "ai-website-small-business-2026",
  "lawn-care-hourly-rate",
  "hvac-missed-calls-cost",
  "dental-office-no-show-cost",
  "auto-shop-credit-card-fees",
  "restaurant-delivery-app-fees",
  "contractor-unpaid-invoices",
  "salon-google-reviews",
  "roofing-cost-per-lead",
  "trucking-cost-per-mile",
  "cleaning-business-hire-or-stay-solo",
  "med-spa-discount-damage",
  "gym-break-even-members",
  "food-truck-taxes-set-aside",
  "mobile-detailing-drive-time",
  "appliance-repair-unclosed-quotes",
  "fencing-contractor-raise-prices",
  "wedding-photographer-after-hours-leads",
  "plumber-call-back-speed",
  "electrician-job-capacity",
  "painting-contractor-markup-vs-margin",
  "barbershop-booth-rent-vs-commission",
  "chiropractor-google-business-profile",
  "towing-truck-downtime-cost",
  "bakery-menu-margins",
  "used-car-lot-slow-website",
  "daycare-late-pickup-policy",
  "real-estate-agent-seo-value",
] as const;

const V4_ARTICLE_ART = Object.fromEntries(
  V4_ARTICLE_SLUGS.map((slug) => [slug, `/images/articles-v4/${slug}.jpg`]),
) as Record<string, string>;

const PREMIUM_ARTICLE_ART: Record<string, string> = {
  "locksmith-after-hours-calls": "/og/tools/after-hours-lead-calculator.jpg",
  "one-useful-business-task-with-ai":
    "/images/articles-v4/ai-website-small-business-2026.jpg",
  "give-every-inquiry-an-owner-and-next-step":
    "/images/articles-v4/does-my-business-need-a-crm.jpg",
  "bring-one-real-task-to-your-business-workshop":
    "/og/events/chatgpt-for-business-owners-longview.jpg",
  ...V4_ARTICLE_ART,
  // September 2026 field notes reuse existing repo art on purpose: the Premier
  // piece shows the real client site, and the mobile piece shares the traffic
  // leak scene its argument extends.
  "free-tools-that-bring-customers": "/og/portfolio/premier-dental.jpg",
  "website-text-too-small-on-mobile": "/og/portfolio/theleadflowpro.jpg",
  "pressure-washing-pricing":
    "/images/articles-v3/pressure-washing-pricing-scene.webp",
  "pest-control-customer-value":
    "/images/articles-v3/pest-control-customer-value-scene.webp",
  "tree-service-buy-or-rent-equipment":
    "/images/articles-v3/tree-service-buy-or-rent-equipment-scene.webp",
};

const PREMIUM_ARTICLE_OG_ART: Record<string, string> = {
  "pressure-washing-pricing":
    "/images/articles-v3/pressure-washing-pricing-scene-og.png",
  "pest-control-customer-value":
    "/images/articles-v3/pest-control-customer-value-scene-og.png",
  "tree-service-buy-or-rent-equipment":
    "/images/articles-v3/tree-service-buy-or-rent-equipment-scene-og.png",
};

const VISUAL_HEADLINES: Record<string, string> = {
  "locksmith-after-hours-calls": "Know Your After-Hours Gap",
  "one-useful-business-task-with-ai": "One Task. One Useful Result.",
  "give-every-inquiry-an-owner-and-next-step": "Every Inquiry Has a Next Step",
  "bring-one-real-task-to-your-business-workshop":
    "Bring a Task. Learn the Process.",
  "free-tools-that-bring-customers": "Free Tools Fill the Funnel",
  "website-text-too-small-on-mobile": "The Phone Is the Website",
  "data-centers-are-coming-to-texas": "Build for What Is Coming",
  "the-money-is-in-the-follow-up": "Follow-Up Catches Demand",
  "marketplace-is-not-your-website": "Own the Home Base",
  "small-business-website-cost": "Know What You Are Buying",
  "website-builder-monthly-fees": "Stop Renting the Foundation",
  "does-my-business-need-a-crm": "One Place for Every Lead",
  "website-traffic-but-no-customers": "Traffic Is Not Conversion",
  "missed-calls-cost-customers": "Every Missed Call Leaks",
  "facebook-page-is-not-a-website": "Own the Front Door",
  "own-your-email-list": "The Audience Must Be Yours",
  "east-texas-business-website-guide": "Answer the Buying Question",
  "cost-of-renting-business-software": "Subscription Stacks Become Rent",
  "ai-website-small-business-2026": "AI Still Needs a System",
  "lawn-care-hourly-rate": "Price the Route, Not Hours",
  "hvac-missed-calls-cost": "Capture the Emergency Call",
  "dental-office-no-show-cost": "Reminders Protect the Chair",
  "auto-shop-credit-card-fees": "Price the Payment Cost",
  "restaurant-delivery-app-fees": "Know the Channel Margin",
  "contractor-unpaid-invoices": "The Job Is Not Paid",
  "salon-google-reviews": "Make the Review Ask Automatic",
  "roofing-cost-per-lead": "Track Cost Through the Sale",
  "trucking-cost-per-mile": "Every Mile Has a Cost",
  "cleaning-business-hire-or-stay-solo": "Know Your Capacity Ceiling",
  "pressure-washing-pricing": "Price the Whole Job",
  "pest-control-customer-value": "Retention Creates Value",
  "tree-service-buy-or-rent-equipment": "Know the Crossover Point",
  "med-spa-discount-damage": "Discounts Replace Full Margin",
  "gym-break-even-members": "Know the Member Floor",
  "food-truck-taxes-set-aside": "Set the Tax Money Aside",
  "mobile-detailing-drive-time": "Drive Time Is Labor",
  "appliance-repair-unclosed-quotes": "Unclosed Quotes Are Inventory",
  "fencing-contractor-raise-prices": "Price Increases Need Math",
  "wedding-photographer-after-hours-leads": "After-Hours Demand Still Counts",
  "plumber-call-back-speed": "The Callback Clock Is Running",
  "electrician-job-capacity": "Capacity Is a Scheduling Problem",
  "painting-contractor-markup-vs-margin": "Markup Is Not Margin",
  "barbershop-booth-rent-vs-commission": "Choose the Right Chair Model",
  "chiropractor-google-business-profile": "Own the Local Search Signal",
  "towing-truck-downtime-cost": "Downtime Owns the Truck",
  "bakery-menu-margins": "Every Item Needs Margin",
  "used-car-lot-slow-website": "Speed Keeps Buyers Moving",
  "daycare-late-pickup-policy": "Policy Needs an Automatic Clock",
  "real-estate-agent-seo-value": "Rankings Need Owned Follow-Up",
};

const PREMIUM_ARTICLE_ALT: Record<string, string> = {
  "locksmith-after-hours-calls":
    "LeadFlow After-Hours Lead Calculator card with a purple phone and message panels on a navy background",
  "one-useful-business-task-with-ai":
    "An existing LeadFlow illustration showing an owned website and customer system connected to practical AI work",
  "give-every-inquiry-an-owner-and-next-step":
    "An existing LeadFlow illustration of calls, messages, forms, and notes converging into one customer record",
  "bring-one-real-task-to-your-business-workshop":
    "LeadFlow workshop graphic showing a small Longview class, a laptop, business steps, and the published 97 dollar price",
  "free-tools-that-bring-customers":
    "Premier Dental Academy of Longview homepage with the 12 week RDA program, free training tools, and enrollment paths",
  "website-text-too-small-on-mobile":
    "The LeadFlow Pro homepage, the site whose mobile text this article's fix shipped on",
  "data-centers-are-coming-to-texas":
    "An East Texas business district connected to new data-center infrastructure at dusk",
  "the-money-is-in-the-follow-up":
    "An inquiry signal moving through timed follow-up checkpoints into a completed handoff",
  "marketplace-is-not-your-website":
    "A crowded rented marketplace contrasted with one grounded and connected owned business property",
  "small-business-website-cost":
    "A polished small-business storefront supported by distinct website build and infrastructure layers",
  "website-builder-monthly-fees":
    "A website caught in recurring toll gates contrasted with a stable owned foundation",
  "does-my-business-need-a-crm":
    "Calls, messages, forms, and notes converging into one secure customer record",
  "website-traffic-but-no-customers":
    "Website traffic leaking before a customer action while one repaired path reaches its destination",
  "missed-calls-cost-customers":
    "Incoming call signals falling through an unattended line while one protected route captures the inquiry",
  "facebook-page-is-not-a-website":
    "An unstable rented social storefront contrasted with a grounded owned web property",
  "own-your-email-list":
    "Scattered audience signals moving into a secure business-owned contact vault",
  "east-texas-business-website-guide":
    "An East Texas storefront connected to a clear website buyer path from discovery to contact",
  "cost-of-renting-business-software":
    "A growing stack of recurring software meters drawing from a business operating core",
  "ai-website-small-business-2026":
    "An owned website and customer system connected to practical AI-assisted work paths",
  "lawn-care-hourly-rate":
    "A lawn-care route combining time, equipment, materials, and travel into one job price",
  "hvac-missed-calls-cost":
    "An urgent after-hours HVAC call routed into a protected response and customer record",
  "dental-office-no-show-cost":
    "A dental chair connected to a reminder sequence and a confirmed appointment arrival",
  "auto-shop-credit-card-fees":
    "An auto-repair payment moving through visible processing-cost layers",
  "restaurant-delivery-app-fees":
    "A restaurant order passing through channel tolls before reaching net margin",
  "contractor-unpaid-invoices":
    "A completed contractor job path stopped at an unpaid invoice checkpoint",
  "salon-google-reviews":
    "A completed salon service triggering an automatic review request and feedback loop",
  "roofing-cost-per-lead":
    "Roofing attention tracked through inquiry, inspection, quote, and sale checkpoints",
  "trucking-cost-per-mile":
    "A truck route passing fuel, maintenance, insurance, and ownership cost checkpoints",
  "cleaning-business-hire-or-stay-solo":
    "A cleaning operator capacity path splitting between a solo ceiling and a staffed route",
  "pressure-washing-pricing":
    "A pressure-washing wand crossing three illuminated pricing checkpoints on wet concrete",
  "pest-control-customer-value":
    "A home connected to seasonal pest-control service points and one long-term customer record",
  "tree-service-buy-or-rent-equipment":
    "A professional wood chipper above crossing ownership and rental cost lines",
  "med-spa-discount-damage":
    "A med-spa service margin draining as a discount replaces full-price appointments",
  "gym-break-even-members":
    "A gym overhead ring met by the member capacity needed to reach break-even",
  "food-truck-taxes-set-aside":
    "Food-truck payments splitting into operating cash and a protected tax reserve",
  "mobile-detailing-drive-time":
    "A mobile-detailing van crossing a route where travel time becomes a job cost",
  "appliance-repair-unclosed-quotes":
    "Appliance-repair quotes waiting in an organized follow-up sequence",
  "fencing-contractor-raise-prices":
    "Rising fencing material and labor costs meeting an adjusted price line",
  "wedding-photographer-after-hours-leads":
    "An after-hours photography inquiry entering a protected booking and follow-up path",
  "plumber-call-back-speed":
    "An urgent plumbing inquiry moving through a visible callback timing route",
  "electrician-job-capacity":
    "Electrical jobs arranged against limited crew time and scheduling capacity",
  "painting-contractor-markup-vs-margin":
    "A painting job showing the difference between its markup layer and retained margin",
  "barbershop-booth-rent-vs-commission":
    "A barbershop chair splitting between fixed booth rent and commission paths",
  "chiropractor-google-business-profile":
    "A local search beacon connecting a chiropractic office to its owned website path",
  "towing-truck-downtime-cost":
    "An immobilized tow truck while operating costs continue moving",
  "bakery-menu-margins":
    "Bakery menu items built from visible ingredient, labor, and margin layers",
  "used-car-lot-slow-website":
    "A vehicle shopper stalled by a slow website lane beside a clear fast path",
  "daycare-late-pickup-policy":
    "A daycare pickup clock activating a clear reminder and policy path after its threshold",
  "real-estate-agent-seo-value":
    "Local search visibility connecting a real-estate website to an owned follow-up system",
};

const CURATED_TAKEAWAYS: Record<string, string> = {
  "free-tools-that-bring-customers":
    "Answer the question people search. The tool does the selling.",
  "website-text-too-small-on-mobile":
    "Your customers judge the phone version. Fix that one first.",
  "pressure-washing-pricing": "Labor. Materials. Margin. Price all three.",
  "pest-control-customer-value":
    "One treatment is a sale. Retention builds value.",
  "tree-service-buy-or-rent-equipment":
    "Buy only when real usage crosses rental cost.",
  "east-texas-business-website-guide":
    "A useful website answers the buying question before the call.",
  "the-money-is-in-the-follow-up":
    "Most leads are not lost. They are simply left behind.",
  "cost-of-renting-business-software":
    "Renting is convenient until the monthly total owns the decision.",
  "data-centers-are-coming-to-texas":
    "Growth matters only when the infrastructure can carry it.",
};

const OG_LAYOUTS: Record<
  string,
  {
    direction: "row" | "row-reverse" | "column" | "column-reverse";
    panel: number;
    imagePosition: string;
  }
> = {
  "pressure-washing-pricing": {
    direction: "row",
    panel: 47,
    imagePosition: "64% 50%",
  },
  "pest-control-customer-value": {
    direction: "column-reverse",
    panel: 44,
    imagePosition: "50% 40%",
  },
  "tree-service-buy-or-rent-equipment": {
    direction: "row-reverse",
    panel: 43,
    imagePosition: "38% 50%",
  },
};

const OG_LAYOUT_VARIANTS = [
  { direction: "row" as const, panel: 43, imagePosition: "68% 50%" },
  { direction: "row-reverse" as const, panel: 46, imagePosition: "34% 50%" },
  { direction: "column-reverse" as const, panel: 41, imagePosition: "50% 34%" },
  { direction: "column" as const, panel: 40, imagePosition: "50% 68%" },
  { direction: "row" as const, panel: 50, imagePosition: "72% 45%" },
  { direction: "row-reverse" as const, panel: 40, imagePosition: "28% 56%" },
];

function articleOgLayout(slug: string) {
  if (OG_LAYOUTS[slug]) return OG_LAYOUTS[slug];
  const hash = [...slug].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return OG_LAYOUT_VARIANTS[hash % OG_LAYOUT_VARIANTS.length];
}

export function articlePremiumArtPath(slug: string) {
  const path = PREMIUM_ARTICLE_ART[slug];
  if (!path) throw new Error(`Missing article scene for ${slug}`);
  return path;
}

export function articlePremiumOgArtPath(slug: string) {
  const path = PREMIUM_ARTICLE_OG_ART[slug] ?? PREMIUM_ARTICLE_ART[slug];
  if (!path) throw new Error(`Missing article social scene for ${slug}`);
  return path;
}

export function articleVisualHeadline(slug: string) {
  const headline = VISUAL_HEADLINES[slug];
  if (!headline) throw new Error(`Missing article visual headline for ${slug}`);
  return headline;
}

export function articlePremiumArtAlt(slug: string) {
  const alt = PREMIUM_ARTICLE_ALT[slug];
  if (!alt) throw new Error(`Missing article scene description for ${slug}`);
  return alt;
}

export function articleSocialImagePath(slug: string) {
  return `/articles/${slug}/opengraph-image`;
}

function words(value: string) {
  return value
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function articleTakeaway(description: string, slug?: string) {
  if (slug && CURATED_TAKEAWAYS[slug]) return CURATED_TAKEAWAYS[slug];
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || description;
  const selected = words(firstSentence).slice(0, 11).join(" ");
  return selected.length < firstSentence.length ? `${selected}...` : selected;
}

function titleSize(title: string, horizontal: boolean) {
  if (title.length > 70) return horizontal ? 41 : 45;
  if (title.length > 56) return horizontal ? 46 : 50;
  if (title.length > 42) return horizontal ? 51 : 56;
  return horizontal ? 58 : 62;
}

type ArticleOgCardProps = {
  article: Article;
  backgroundUrl: string;
};

export function articleOgCard({
  article,
  backgroundUrl,
}: ArticleOgCardProps): ReactElement {
  const layout = articleOgLayout(article.slug);
  const visualHeadline = articleVisualHeadline(article.slug);
  const horizontal =
    layout.direction === "row" || layout.direction === "row-reverse";
  const panelStyle = horizontal
    ? { width: `${layout.panel}%`, height: "100%" }
    : { width: "100%", height: `${layout.panel}%` };

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        flexDirection: layout.direction,
        background: NAVY,
        color: WHITE,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <img
        src={backgroundUrl}
        alt=""
        width={ARTICLE_OG_SIZE.width}
        height={ARTICLE_OG_SIZE.height}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: layout.imagePosition,
        }}
      />

      <div
        style={{
          ...panelStyle,
          display: "flex",
          position: "relative",
          flexDirection: "column",
          justifyContent: horizontal ? "space-between" : "flex-start",
          padding: horizontal ? "48px 50px 44px" : "30px 54px 34px",
          background: "rgba(5, 13, 27, 0.94)",
        }}
      >
        <div
          style={{
            display: "flex",
            color: WHITE,
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          The LeadFlow <span style={{ color: "#3264FF" }}>Pro</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: horizontal ? 0 : 16,
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: horizontal ? 465 : 1080,
              fontSize: titleSize(visualHeadline, horizontal),
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 0.98,
            }}
          >
            {visualHeadline}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: horizontal ? 450 : 1050,
              marginTop: 19,
              color: MUTED,
              fontSize: horizontal ? 22 : 24,
              lineHeight: 1.26,
            }}
          >
            {articleTakeaway(article.description, article.slug)}
          </div>
        </div>
      </div>
    </div>
  );
}
