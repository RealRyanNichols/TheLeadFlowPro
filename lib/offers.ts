// Numbers come from lib/site/prices.ts and the Stripe link from
// lib/site/external-links.ts. This module keeps the checkout-facing shape the
// pages, the deposit flow, and the webhook already depend on.
import { EXTERNAL_LINKS } from "@/lib/site/external-links";
import { PRICES, usd, usdFrom } from "@/lib/site/prices";

export const WEBSITE_LAUNCH_CHECKOUT = EXTERNAL_LINKS.stripeWebsiteLaunchDeposit;

export const WEBSITE_LAUNCH = {
  id: "website-launch",
  name: "Website Launch",
  total: PRICES.websiteLaunchTotal,
  deposit: PRICES.websiteLaunchDeposit,
  finalPayment: PRICES.websiteLaunchFinal,
  priceLabel: usd(PRICES.websiteLaunchTotal),
  depositLabel: usd(PRICES.websiteLaunchDeposit),
  finalLabel: usd(PRICES.websiteLaunchFinal),
  paymentLabel: `${usd(PRICES.websiteLaunchDeposit)} to start. Once intake begins, the deposit is non-refundable, except where the written agreement or applicable law requires otherwise. ${usd(PRICES.websiteLaunchFinal)} after approval, before launch.`,
  summary:
    "The first connected release for a real business: five premium pages built around one buyer, one offer, and one measurable next action.",
  included: [
    "One conversion map: audience, offer, buyer path, and primary action",
    "Up to five conversion-led pages named in the written scope",
    "One lead-capture path with routing to the agreed destination",
    "Responsive production build for desktop, tablet, and mobile",
    "Basic on-page SEO, core analytics, domain connection, and deployment",
    "Two focused revision rounds against the approved scope",
    "A founding-rate visual pack with up to three premium system scenes",
  ],
  exclusions: [
    "Additional pages, stand-alone landing pages, or multi-step funnels",
    "CRM, database migration, phone, text, email, or AI automation",
    "Customer, member, student, or course portals",
    "Custom calculators, workflow tools, ecommerce, or payment systems",
    "Ad setup, ad spend, ongoing ad management, or ongoing social publishing",
    "A new brand identity, unlimited copywriting, illustrations, or revisions",
    "Third-party hosting, database, email, SMS, advertising, or vendor fees",
  ],
  milestones: [
    {
      number: "01",
      name: "Reserve",
      body: `The ${usd(PRICES.websiteLaunchDeposit)} deposit reserves the build and opens intake. Once intake begins, it is non-refundable, except where the written agreement or applicable law requires otherwise.`,
    },
    {
      number: "02",
      name: "Lock the scope",
      body: "We confirm the buyer, offer, five pages, raw assets, and primary action in writing.",
    },
    {
      number: "03",
      name: "Build",
      body: "The working site is assembled in a reviewable preview environment.",
    },
    {
      number: "04",
      name: "Review",
      body: "You test the pages and form, then use two focused revision rounds.",
    },
    {
      number: "05",
      name: "Approve",
      body: `The final ${usd(PRICES.websiteLaunchFinal)} is due only after approval and before production launch.`,
    },
    {
      number: "06",
      name: "Launch",
      body: "We connect the live domain, verify routing and analytics, and hand off the agreed accounts.",
    },
  ],
} as const;

export const OFFER_LADDER = [
  {
    id: "system-map",
    name: "System Map",
    price: usd(PRICES.systemMap),
    priceValue: PRICES.systemMap,
    purpose: "Paid diagnosis, architecture, priorities, and an implementation roadmap.",
    href: "/packages/system-map",
  },
  {
    id: "website-launch",
    name: "Website Launch",
    price: usd(PRICES.websiteLaunchTotal),
    priceValue: PRICES.websiteLaunchTotal,
    purpose: "A scope-controlled five-page conversion website with a real approval checkpoint.",
    href: "/packages/launch",
  },
  {
    id: "lead-engine",
    name: "Lead Engine",
    price: usdFrom(PRICES.leadEngineFrom),
    priceValue: PRICES.leadEngineFrom,
    purpose: "Website, conversion funnel, CRM, lead routing, and response automation.",
    href: "/start?goal=follow_up",
  },
  {
    id: "training-platform",
    name: "Training Platform",
    price: usdFrom(PRICES.trainingPlatformFrom),
    priceValue: PRICES.trainingPlatformFrom,
    purpose: "Course catalog, member dashboard, enrollment, progress, and admin tools.",
    href: "/start?goal=delivery",
  },
  {
    id: "company-os",
    name: "Company OS",
    price: usdFrom(PRICES.companyOsFrom),
    priceValue: PRICES.companyOsFrom,
    purpose: "Website, CRM, client portal, analytics, automation, and operating dashboard.",
    // One address for Company OS everywhere: the footer, /services, and
    // /pricing all used to disagree. The package page is the canonical one.
    href: "/packages/industry-os",
  },
  {
    id: "custom-platform",
    name: "Custom Platform",
    price: usdFrom(PRICES.customPlatformFrom),
    priceValue: PRICES.customPlatformFrom,
    purpose: "Custom software, multi-role workflows, advanced integrations, and platform architecture.",
    href: "/start?goal=custom",
  },
] as const;
