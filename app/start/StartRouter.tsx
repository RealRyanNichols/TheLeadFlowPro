"use client";

// The Map My System guided router. Every completed diagnostic is written to
// leads.diagnostic with attribution and consent so the admin System Map
// viewer shows the full picture and the first conversation starts warm.
// No contact information is requested before the result screen.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";
import styles from "./start-v2.module.css";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Inbox,
  Send,
  TriangleAlert,
  Zap,
  Blocks,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChartColumn,
  ChartNoAxesCombined,
  Check,
  CircleCheck,
  CircleHelp,
  ClipboardCheck,
  CodeXml,
  Compass,
  ContactRound,
  CreditCard,
  Database,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  House,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LibraryBig,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareMore,
  Network,
  Package,
  Palette,
  PanelsTopLeft,
  PhoneCall,
  PlugZap,
  Plus,
  RotateCcw,
  Route,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sprout,
  Store,
  Tag,
  Target,
  Unplug,
  UsersRound,
  Video,
  Wrench,
} from "lucide-react";

type IconName = keyof typeof ICONS;

const ICONS = {
  archive: Archive,
  blocks: Blocks,
  book_open: BookOpen,
  bot: Bot,
  briefcase: BriefcaseBusiness,
  calendar: CalendarDays,
  chart: ChartNoAxesCombined,
  circle_help: CircleHelp,
  clipboard: ClipboardCheck,
  code: CodeXml,
  contact: ContactRound,
  credit_card: CreditCard,
  database: Database,
  graduation: GraduationCap,
  heart_pulse: HeartPulse,
  home: House,
  layers: Layers,
  layout: LayoutTemplate,
  library: LibraryBig,
  list_checks: ListChecks,
  mail: Mail,
  map_pin: MapPin,
  megaphone: Megaphone,
  messages: MessageSquareMore,
  network: Network,
  package: Package,
  palette: Palette,
  panels: PanelsTopLeft,
  panels_top: LayoutDashboard,
  phone: PhoneCall,
  plug: PlugZap,
  plus: Plus,
  route: Route,
  shopping_bag: ShoppingBag,
  shirt: Shirt,
  smartphone: Smartphone,
  sparkles: Sparkles,
  sprout: Sprout,
  store: Store,
  tag: Tag,
  target: Target,
  unplug: Unplug,
  users: UsersRound,
  video: Video,
  wrench: Wrench,
} as const;

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const C = ICONS[name as IconName] ?? ChartColumn;
  return <C aria-hidden="true" className={className} strokeWidth={1.8} />;
}

type Option = {
  id: string;
  label: string;
  short: string;
  description: string;
  icon: string;
};

const GOALS: Option[] = [
  {
    id: "demand",
    label: "Get more qualified customers",
    short: "more qualified demand",
    description:
      "Build the pages, offers, tools, and tracking that turn attention into real inquiries.",
    icon: "megaphone",
  },
  {
    id: "follow_up",
    label: "Stop losing leads after they reach us",
    short: "faster follow-up",
    description:
      "Catch calls, texts, forms, and DMs, then route every serious lead to the right next move.",
    icon: "messages",
  },
  {
    id: "replace_tools",
    label: "Replace disconnected software",
    short: "one connected operation",
    description:
      "Bring the website, CRM, portal, communications, reporting, and workflows together.",
    icon: "blocks",
  },
  {
    id: "delivery",
    label: "Build a portal, course, or member experience",
    short: "better customer delivery",
    description:
      "Give customers, students, members, or partners a real place to log in and get the work.",
    icon: "panels",
  },
  {
    id: "industry_tools",
    label: "Build tools or an industry archive",
    short: "purpose-built industry tools",
    description:
      "Create calculators, assessments, applications, directories, archives, and searchable resources.",
    icon: "wrench",
  },
  {
    id: "custom",
    label: "I have a bigger idea",
    short: "a custom platform",
    description:
      "Show me what is possible. I do not want to force the idea into a box before we map it.",
    icon: "sparkles",
  },
];

const INDUSTRIES: Option[] = [
  {
    id: "mortgage_real_estate",
    label: "Mortgage or real estate",
    short: "Mortgage and real estate",
    description: "Lenders, brokers, agents, title, insurance, and real estate teams.",
    icon: "home",
  },
  {
    id: "education_training",
    label: "Education or career training",
    short: "Education and training",
    description:
      "Schools, academies, certification programs, coaches, and internal training.",
    icon: "graduation",
  },
  {
    id: "local_service",
    label: "Local or home services",
    short: "Local services",
    description:
      "Contractors, trades, automotive, field services, and appointment-driven businesses.",
    icon: "map_pin",
  },
  {
    id: "professional_services",
    label: "Professional services",
    short: "Professional services",
    description: "Legal, financial, consulting, agencies, experts, and business services.",
    icon: "briefcase",
  },
  {
    id: "health_dental",
    label: "Health, dental, or medical",
    short: "Health and dental",
    description:
      "Practices, offices, education providers, and patient-facing service businesses.",
    icon: "heart_pulse",
  },
  {
    id: "events_hospitality",
    label: "Events, venues, or hospitality",
    short: "Events and hospitality",
    description:
      "Venues, coworking, event operators, hospitality, and community spaces.",
    icon: "calendar",
  },
  {
    id: "media_nonprofit",
    label: "Media, publishing, nonprofit, or ministry",
    short: "Media and mission-driven organizations",
    description:
      "Publishing, public archives, organizations, nonprofits, churches, and ministries.",
    icon: "library",
  },
  {
    id: "ecommerce",
    label: "Ecommerce or products",
    short: "Ecommerce and product businesses",
    description:
      "Brands, physical products, digital products, inventory, and customer communities.",
    icon: "shopping_bag",
  },
  {
    id: "software",
    label: "Software or a digital platform",
    short: "Software and digital platforms",
    description:
      "SaaS, marketplaces, member products, internal tools, and data platforms.",
    icon: "code",
  },
  {
    id: "other",
    label: "Something else",
    short: "Your industry",
    description:
      "Use the closest workflow now. We can name and shape the vertical with you later.",
    icon: "plus",
  },
];

const PRESENCES: Option[] = [
  {
    id: "none",
    label: "We do not have a website yet",
    short: "no owned website yet",
    description:
      "The business may be new, offline, referral-driven, or ready for a clean foundation.",
    icon: "sprout",
  },
  {
    id: "known_builder",
    label: "A known website builder",
    short: "a site on Shopify, Wix, Squarespace, or GoDaddy",
    description:
      "Shopify, Wix, Squarespace, GoDaddy, Webflow, or another familiar hosted platform.",
    icon: "layout",
  },
  {
    id: "wordpress",
    label: "WordPress",
    short: "a WordPress site",
    description:
      "Hosted WordPress, managed WordPress, or a site maintained through plugins and themes.",
    icon: "panels_top",
  },
  {
    id: "custom_unknown",
    label: "A custom, off-brand, or mystery website",
    short: "a custom or unknown website",
    description:
      "You have a site, but it is custom-built, on a smaller platform, or you honestly do not know what runs it.",
    icon: "circle_help",
  },
  {
    id: "marketplace_only",
    label: "A marketplace is our main home",
    short: "marketplaces instead of an owned website",
    description:
      "Most business happens on Amazon, eBay, Poshmark, Mercari, Whatnot, Etsy, or a similar channel.",
    icon: "store",
  },
  {
    id: "social_only",
    label: "Social profiles, DMs, or phone calls",
    short: "social profiles and direct conversations",
    description:
      "Customers find and contact you through social media, messages, calls, referrals, or links.",
    icon: "messages",
  },
  {
    id: "site_and_channels",
    label: "A website plus several selling channels",
    short: "a website plus multiple sales channels",
    description:
      "The business already spans an owned site, marketplaces, social commerce, or in-person sales.",
    icon: "network",
  },
];

const CHANNELS: Option[] = [
  {
    id: "owned_site",
    label: "Our own website or store",
    short: "Owned site",
    description: "A site or checkout the business controls directly.",
    icon: "home",
  },
  {
    id: "amazon",
    label: "Amazon",
    short: "Amazon",
    description: "Seller Central, FBA, FBM, or another Amazon selling program.",
    icon: "package",
  },
  {
    id: "ebay",
    label: "eBay",
    short: "eBay",
    description: "Listings, auctions, Buy It Now, or an eBay Store.",
    icon: "tag",
  },
  {
    id: "poshmark",
    label: "Poshmark",
    short: "Poshmark",
    description: "A Poshmark closet, catalog, community, or live selling workflow.",
    icon: "shirt",
  },
  {
    id: "mercari",
    label: "Mercari",
    short: "Mercari",
    description: "Listings, offers, shipping, and marketplace order management.",
    icon: "shopping_bag",
  },
  {
    id: "whatnot",
    label: "Whatnot",
    short: "Whatnot",
    description: "Live shows, marketplace listings, auctions, and seller operations.",
    icon: "video",
  },
  {
    id: "etsy",
    label: "Etsy",
    short: "Etsy",
    description: "Handmade, vintage, digital, or creative product listings.",
    icon: "palette",
  },
  {
    id: "social_shop",
    label: "Facebook, Instagram, or TikTok",
    short: "Social commerce",
    description: "Shops, posts, live selling, messages, or social checkout.",
    icon: "smartphone",
  },
  {
    id: "in_person",
    label: "In person, by phone, or by invoice",
    short: "Direct and in-person sales",
    description:
      "Retail, events, appointments, phone orders, invoices, or manual payments.",
    icon: "store",
  },
  {
    id: "other",
    label: "Another channel",
    short: "Another channel",
    description:
      "A niche marketplace, wholesale portal, dealer network, or something else.",
    icon: "plus",
  },
];

const CHANNEL_FEES: Record<string, { summary: string; source: string }> = {
  amazon: {
    summary:
      "Category-based referral fees, plus the seller plan and any fulfillment, storage, advertising, or other program costs.",
    source: "https://sell.amazon.com/pricing",
  },
  ebay: {
    summary:
      "Category-based final value fees plus a per-order charge, with optional Store, listing, and promoted-listing costs.",
    source:
      "https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822",
  },
  poshmark: {
    summary:
      "Poshmark currently charges $2.95 on sales under $15 and a 20% commission on sales of $15 or more.",
    source: "https://support.poshmark.com/s/article/297755057",
  },
  mercari: {
    summary:
      "Mercari currently charges sellers 10% of the item price plus buyer-paid shipping, with no separate payment-processing fee.",
    source: "https://www.mercari.com/us/help_center/article/169/",
  },
  whatnot: {
    summary:
      "Standard U.S. pricing for most categories is currently 8% commission plus 2.9% and $0.30 payment processing. Some categories and promotions use reduced rates.",
    source:
      "https://help.whatnot.com/hc/en-us/articles/4847069165965-Whatnot-seller-fees",
  },
  etsy: {
    summary:
      "Etsy currently charges a $0.20 listing fee, 6.5% transaction fee, country-specific payment processing, and optional or required Offsite Ads fees.",
    source: "https://www.etsy.com/legal/fees/",
  },
};

const STAGES: Option[] = [
  {
    id: "starting_clean",
    label: "We are starting clean",
    short: "starting clean",
    description:
      "There is little to migrate, so the right foundation can be installed from day one.",
    icon: "sprout",
  },
  {
    id: "mostly_manual",
    label: "We have a site or profile, but most work is manual",
    short: "a mostly manual process",
    description:
      "Forms, marketplace dashboards, inboxes, spreadsheets, calls, and follow-up depend on people remembering.",
    icon: "clipboard",
  },
  {
    id: "disconnected",
    label: "We use several disconnected tools",
    short: "a disconnected stack",
    description:
      "The pieces exist, but the customer and the data keep falling between them.",
    icon: "unplug",
  },
  {
    id: "existing_crm",
    label: "We have a CRM or team system that is not working",
    short: "an underperforming CRM",
    description:
      "The software is there. Adoption, handoffs, reporting, or automation still breaks.",
    icon: "database",
  },
  {
    id: "custom_system",
    label: "We already have custom technology",
    short: "an existing custom system",
    description:
      "The job is expansion, integration, migration, cleanup, or a stronger operating layer.",
    icon: "layers",
  },
  {
    id: "not_sure",
    label: "Honestly, I am not sure",
    short: "an unclear current stack",
    description:
      "That is normal. We can inventory what exists and map the next move without guessing.",
    icon: "circle_help",
  },
];

// The full 16-module catalog from the approved guided build. Do not trim.
const MODULES: Record<string, Option> = {
  website_funnels: {
    id: "website_funnels",
    label: "Website and funnels",
    short: "Public site",
    description:
      "Offers, pages, lead paths, landing pages, and the public front door.",
    icon: "layout",
  },
  crm_pipeline: {
    id: "crm_pipeline",
    label: "CRM and pipeline",
    short: "CRM",
    description:
      "People, status, source, owner, notes, value, and every next action.",
    icon: "users",
  },
  admin_workspace: {
    id: "admin_workspace",
    label: "Admin workspace",
    short: "Admin workspace",
    description:
      "One place for the team to operate, review, assign, approve, and report.",
    icon: "panels_top",
  },
  customer_portal: {
    id: "customer_portal",
    label: "Customer or member portal",
    short: "Portal",
    description:
      "A secure home for customers, students, members, partners, or vendors.",
    icon: "contact",
  },
  forms_tools: {
    id: "forms_tools",
    label: "Interactive tools and forms",
    short: "Tools and forms",
    description:
      "Calculators, assessments, applications, registrations, and guided workflows.",
    icon: "list_checks",
  },
  courses_training: {
    id: "courses_training",
    label: "Courses and training",
    short: "Courses",
    description:
      "Private curriculum, lessons, progress, resources, and team knowledge.",
    icon: "book_open",
  },
  archive_library: {
    id: "archive_library",
    label: "Archive or resource library",
    short: "Archive",
    description:
      "Searchable records, articles, profiles, documents, resources, and public knowledge.",
    icon: "archive",
  },
  email_automation: {
    id: "email_automation",
    label: "Email response and automation",
    short: "Resend email",
    description:
      "Fast replies, segments, nurture, broadcasts, receipts, and internal alerts.",
    icon: "mail",
  },
  calls_texts: {
    id: "calls_texts",
    label: "Calls and text messages",
    short: "Quo calls and SMS",
    description:
      "Shared phone activity, texts, contacts, transcripts, and communication history.",
    icon: "phone",
  },
  booking_routing: {
    id: "booking_routing",
    label: "Booking and lead routing",
    short: "Booking and routing",
    description:
      "Get the right lead to the right person, calendar, location, or next step.",
    icon: "route",
  },
  ads_attribution: {
    id: "ads_attribution",
    label: "Ads and attribution",
    short: "Ads and attribution",
    description:
      "Meta, Google, pixels, first-party source tracking, and revenue feedback.",
    icon: "target",
  },
  analytics_reporting: {
    id: "analytics_reporting",
    label: "Analytics and reporting",
    short: "Reporting",
    description:
      "Show what came in, what moved, what stalled, and what produced revenue.",
    icon: "chart",
  },
  ai_agent: {
    id: "ai_agent",
    label: "AI agent or business assistant",
    short: "AI agent",
    description:
      "Answer questions, qualify, route, recover, and assist without pretending to be human.",
    icon: "bot",
  },
  payments_checkout: {
    id: "payments_checkout",
    label: "Payments and checkout",
    short: "Checkout",
    description:
      "Offers, invoices, deposits, subscriptions, payment events, and access delivery.",
    icon: "credit_card",
  },
  commerce_hub: {
    id: "commerce_hub",
    label: "Marketplace and commerce hub",
    short: "Commerce hub",
    description:
      "Bring products, inventory, orders, fees, and channel reporting into one operating view while keeping each marketplace compliant.",
    icon: "store",
  },
  connector_mcp: {
    id: "connector_mcp",
    label: "ChatGPT or Claude connector",
    short: "AI connector",
    description:
      "A secure remote MCP layer for tenant-scoped tools and approved actions.",
    icon: "plug",
  },
};

// Why each module matters and where it is already proven live. This is what
// turns the result from a parts list into a pitch served on a platter.
const MODULE_META: Record<string, { why: string; proof: string }> = {
  website_funnels: {
    why: "Every channel you named needs one owned home base that captures the lead instead of letting it scroll past.",
    proof: "TheLeadFlowPro.com",
  },
  crm_pipeline: {
    why: "Every inquiry gets a name, a source, a status, and a next action. Nothing falls through again.",
    proof: "TheLeadFlowPro.com",
  },
  admin_workspace: {
    why: "One screen for the whole operation: review, assign, approve, export, done.",
    proof: "TheLeadFlowPro.com",
  },
  customer_portal: {
    why: "Customers log in and get what they paid for without emailing you to ask for it.",
    proof: "DonAndPatti.com",
  },
  forms_tools: {
    why: "Calculators and guided forms qualify people before you ever spend a minute talking to them.",
    proof: "Premier Dental Academy",
  },
  courses_training: {
    why: "Your knowledge delivered as lessons with progress, quizzes, and certificates. Sellable, repeatable.",
    proof: "Premier Dental Academy",
  },
  archive_library: {
    why: "Records and resources people can actually search. Authority nobody can take down.",
    proof: "RealRyanNichols",
  },
  email_automation: {
    why: "Every lead gets a reply in seconds and a follow-up until they answer. The money is in the follow-up.",
    proof: "TheLeadFlowPro.com",
  },
  calls_texts: {
    why: "A missed call gets a text back before that customer dials your competitor.",
    proof: "The LeadFlow stack",
  },
  booking_routing: {
    why: "The right lead lands on the right calendar without a week of phone tag.",
    proof: "Premier Dental Academy",
  },
  ads_attribution: {
    why: "Know exactly which dollar of ad spend produced which customer. Stop guessing.",
    proof: "TheLeadFlowPro.com",
  },
  analytics_reporting: {
    why: "What came in, what moved, what stalled, what made money. In your database, not rented.",
    proof: "TheLeadFlowPro.com",
  },
  ai_agent: {
    why: "An assistant trained on your business answers questions and qualifies leads around the clock.",
    proof: "RealRyanNichols",
  },
  payments_checkout: {
    why: "Deposits, payment plans, subscriptions, and invoices collected without chasing anybody.",
    proof: "DonAndPatti.com",
  },
  commerce_hub: {
    why: "Products, orders, inventory, and channel fees in one operating view you control.",
    proof: "GideonHQ",
  },
  connector_mcp: {
    why: "ChatGPT and Claude can securely work with your business data, with your permission.",
    proof: "The LeadFlow stack",
  },
};

function tilePair(i: number) {
  const [a, b] = TILE_PALETTE[i % TILE_PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

const GOAL_MODULE_ORDER: Record<string, string[]> = {
  demand: [
    "website_funnels",
    "commerce_hub",
    "forms_tools",
    "ads_attribution",
    "analytics_reporting",
    "booking_routing",
    "ai_agent",
    "email_automation",
    "crm_pipeline",
  ],
  follow_up: [
    "crm_pipeline",
    "email_automation",
    "calls_texts",
    "booking_routing",
    "admin_workspace",
    "analytics_reporting",
    "ai_agent",
    "website_funnels",
  ],
  replace_tools: [
    "crm_pipeline",
    "admin_workspace",
    "commerce_hub",
    "website_funnels",
    "customer_portal",
    "email_automation",
    "calls_texts",
    "analytics_reporting",
    "connector_mcp",
  ],
  delivery: [
    "customer_portal",
    "courses_training",
    "admin_workspace",
    "payments_checkout",
    "email_automation",
    "forms_tools",
    "archive_library",
    "analytics_reporting",
  ],
  industry_tools: [
    "forms_tools",
    "archive_library",
    "admin_workspace",
    "customer_portal",
    "analytics_reporting",
    "website_funnels",
    "ai_agent",
    "connector_mcp",
  ],
  custom: Object.keys(MODULES),
};

const PACKAGES = {
  launch: {
    name: "Website Launch",
    price: "$1,000",
    description:
      "A conversion-led five-page public experience with lead capture, responsive production, core analytics, deployment, and two revision rounds.",
  },
  industry_os: {
    name: "Company OS",
    price: "$7,500+",
    description:
      "The public experience plus the portals, industry tools, courses, archives, calls, texts, and deeper workflows that make the vertical different.",
  },
  custom_platform: {
    name: "Custom Platform",
    price: "$15,000+",
    description:
      "A larger product, multi-location operation, custom data platform, advanced connector, or system with complex migration and permissions.",
  },
} as const;

type PackageId = keyof typeof PACKAGES;

const STEP_LABELS: Record<string, string> = {
  goal: "The problem",
  industry: "The business",
  presence: "The home base",
  channels: "The sales channels",
  stage: "The current setup",
  modules: "What matters",
  result: "Your system map",
};

type Answers = {
  goal: string | null;
  industry: string | null;
  presence: string | null;
  salesChannels: string[];
  stages: string[];
  modules: string[];
};

const EMPTY_ANSWERS: Answers = {
  goal: null,
  industry: null,
  presence: null,
  salesChannels: [],
  stages: [],
  modules: [],
};

const goalOf = (id: string | null) => GOALS.find((g) => g.id === id) ?? GOALS[5];
const industryOf = (id: string | null) =>
  INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[9];
const presenceOf = (id: string | null) =>
  PRESENCES.find((p) => p.id === id) ?? PRESENCES[3];
const channelOf = (id: string) => CHANNELS.find((c) => c.id === id) ?? CHANNELS[9];
const stageOf = (id: string) => STAGES.find((s) => s.id === id) ?? STAGES[5];

function listJoin(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const stagesShort = (ids: string[]) =>
  ids.length ? listJoin(ids.map((id) => stageOf(id).short)) : "an unclear current stack";

// Every business sells or generates leads somewhere, so the sales-channel
// question is always asked separately from the home-base question above it.
const STEPS = ["goal", "industry", "presence", "channels", "stage", "modules", "result"];

// Per-option gradient icon tiles. Same brand family as The Work cards:
// Cyan, violet, emerald, amber, red, and sky cycle so no two neighbors match.
const TILE_PALETTE: Array<[string, string, string]> = [
  ["#38bdf8", "#2563eb", "#38bdf84d"],
  ["#a78bfa", "#d946ef", "#a78bfa4d"],
  ["#34d399", "#0ea371", "#34d3994d"],
  ["#fbbf24", "#f97316", "#fbbf244d"],
  ["#f87171", "#ef4444", "#f871714d"],
  ["#22d3ee", "#3b82f6", "#22d3ee4d"],
];

function tileVars(i: number) {
  const [a, b, g] = TILE_PALETTE[i % TILE_PALETTE.length];
  return { "--ta": a, "--tb": b, "--tg": g } as React.CSSProperties;
}

function QuestionShell({
  headingRef,
  eyebrow,
  title,
  description,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="router-question">
      <div className="router-question-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h1 ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function OptionButton({
  label,
  description,
  icon,
  tint = 0,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  tint?: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="router-option" style={tileVars(tint)} onClick={onClick}>
      <span className="router-option-icon">
        <Icon name={icon} />
      </span>
      <span className="router-option-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <ArrowRight aria-hidden="true" className="router-option-arrow" />
    </button>
  );
}

function MultiOptionButton({
  label,
  description,
  icon,
  tint = 0,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  tint?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`router-option router-option-multi ${selected ? "is-selected" : ""}`}
      style={tileVars(tint)}
      onClick={onClick}
    >
      <span className="router-option-icon">
        <Icon name={icon} />
      </span>
      <span className="router-option-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <span className="router-check" aria-hidden="true">
        {selected ? <Check className="h-4 w-4" /> : null}
      </span>
    </button>
  );
}

function BackButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      className={`router-back ${compact ? "is-compact" : ""}`}
      onClick={onClick}
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      Back
    </button>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="form-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function ContactCard({
  answers,
  packageId,
  recommendedModules,
  onCancel,
  onSuccess,
}: {
  answers: Answers;
  packageId: PackageId;
  recommendedModules: string[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWebsiteLaunch = packageId === "launch";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number before choosing call or text consent.");
      setSending(false);
      return;
    }
    const goal = goalOf(answers.goal);
    const industry = industryOf(answers.industry);
    const presence = presenceOf(answers.presence);
    const stageLabels = answers.stages.map((id) => stageOf(id).label);
    const channelLabels = answers.salesChannels.map((c) => channelOf(c).label);
    const moduleLabels = recommendedModules.map((m) => MODULES[m].label);
    const ownerNotes = String(form.get("goals") ?? "").trim();
    const summary = [
      `Primary goal: ${goal.label}.`,
      `Business home: ${presence.label}.`,
      channelLabels.length ? `Sales channels: ${channelLabels.join(", ")}.` : "",
      `Current setup: ${stageLabels.join("; ") || "Not specified"}.`,
      `Recommended path: ${PACKAGES[packageId].name}.`,
      `System map: ${moduleLabels.join(", ")}.`,
      ownerNotes ? `Owner notes: ${ownerNotes}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const params = new URLSearchParams(window.location.search);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        business_name: form.get("business_name"),
        email: form.get("email"),
        phone: phone || null,
        website_url: form.get("website_url"),
        industry: answers.industry,
        desired_modules: recommendedModules,
        current_platform: answers.presence,
        interest: packageId === "launch" ? "launch_system" : packageId,
        goals: summary,
        budget_range: form.get("budget_range"),
        timeline: form.get("timeline"),
        best_contact_method: form.get("best_contact_method"),
        sms_consent: smsConsent,
        marketing_email_consent: form.get("marketing_email_consent") === "on",
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        industry_label: industry.label,
        diagnostic: {
          version: 2,
          completed: true,
          answers: {
            goal: answers.goal,
            industry: answers.industry,
            presence: answers.presence,
            sales_channels: answers.salesChannels,
            stages: answers.stages,
            selected_modules: answers.modules,
          },
          labels: {
            goal: goal.label,
            industry: industry.label,
            presence: presence.label,
            sales_channels: channelLabels,
            stages: stageLabels,
          },
          recommendation: {
            package: packageId,
            package_name: PACKAGES[packageId].name,
            price_range: PACKAGES[packageId].price,
            modules: recommendedModules,
            module_labels: moduleLabels,
          },
          next_action: isWebsiteLaunch
            ? "Review the Website Launch intake, confirm the five-page written scope, and connect the $500 deposit to the project."
            : "Review the diagnostic, confirm scope on the $497 System Map, then phase the larger build.",
          owner_notes: ownerNotes || null,
        },
      }),
    });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}) as { error?: string })).error ??
          "The request did not go through. Please try again.",
      );
      setSending(false);
      return;
    }
    window.fbq?.("track", "Lead");
    onSuccess();
  }

  return (
    <div className="result-contact-card">
      <div className="result-contact-heading">
        <div>
          <span className="eyebrow">Now the handoff</span>
          <h2>
            {isWebsiteLaunch
              ? "Send the Website Launch details with your business attached."
              : "Send this map with your business attached."}
          </h2>
          <p>
            {isWebsiteLaunch
              ? "You already did the thinking. This keeps intake focused on the five-page scope and launch goal."
              : "You already did the thinking. This keeps the first conversation focused on the larger system."}
          </p>
        </div>
        <button type="button" className="button-quiet" onClick={onCancel}>
          Keep exploring
        </button>
      </div>
      <form onSubmit={handleSubmit} className="system-map-form">
        <div className="form-grid">
          <Field label="Your name" required>
            <input name="full_name" autoComplete="name" required maxLength={200} />
          </Field>
          <Field label="Business name" required>
            <input name="business_name" autoComplete="organization" required maxLength={200} />
          </Field>
          <Field label="Work email" required>
            <input name="email" type="email" autoComplete="email" required maxLength={200} />
          </Field>
          <Field label="Mobile phone">
            <input name="phone" type="tel" autoComplete="tel" maxLength={50} />
          </Field>
          <Field label="Website or main selling profile">
            <input
              name="website_url"
              type="text"
              inputMode="url"
              placeholder="Website, store URL, marketplace profile, or none"
              maxLength={300}
            />
          </Field>
          <Field label="Prepared build budget" required>
            <select name="budget_range" required defaultValue="">
              <option value="" disabled>
                Choose the closest range
              </option>
              <option value="497_map">$497 system map only</option>
              <option value="1000_5000">$1,000 to $5,000</option>
              <option value="5000_15000">$5,000 to $15,000</option>
              <option value="15000_30000">$15,000 to $30,000</option>
              <option value="30000_50000">$30,000 to $50,000</option>
              <option value="50000_plus">$50,000+</option>
              <option value="map_first">I need the map before I know</option>
            </select>
          </Field>
          <Field label="Target timing" required>
            <select name="timeline" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              <option value="scope_approved">As soon as the scope is approved</option>
              <option value="30_days">Within 30 days</option>
              <option value="90_days">Within 90 days</option>
              <option value="this_year">This year</option>
              <option value="exploring">I am still exploring</option>
            </select>
          </Field>
          <Field label="Best response channel">
            <select name="best_contact_method" defaultValue="email">
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="text">Text</option>
              <option value="any">Any</option>
            </select>
          </Field>
        </div>
        <Field
          label={
            isWebsiteLaunch
              ? "Anything the launch recommendation missed?"
              : "Anything the map missed?"
          }
        >
          <textarea
            name="goals"
            rows={4}
            maxLength={1000}
            placeholder="Tell Ryan about the offer, the people, the handoff, or the bigger idea that needs to work."
          />
        </Field>
        <div className="consent-list">
          <label>
            <input type="checkbox" name="sms_consent" />
            <span>
              If I provided a mobile number, The LeadFlow Pro may call or text me about
              this request and related project updates. Consent is not a condition of
              purchase. Message and data rates may apply. Reply STOP to opt out.
            </span>
          </label>
          <label>
            <input type="checkbox" name="marketing_email_consent" />
            <span>
              Send me occasional LeadFlow articles, tools, and launch updates by email. I
              can unsubscribe at any time.
            </span>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button-primary form-submit" disabled={sending}>
          {sending
            ? isWebsiteLaunch
              ? "Sending Website Launch Details..."
              : "Sending Your Map..."
            : isWebsiteLaunch
              ? "Send My Website Launch Details"
              : "Send My System Map Request"}
          {!sending && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
        </button>
        <p className="form-legal">
          By submitting, you agree to our <Link href="/terms">Terms</Link> and acknowledge
          our <Link href="/privacy">Privacy Policy</Link>. We use your information to
          respond to this request.
        </p>
      </form>
    </div>
  );
}

export default function StartRouter({ initialGoal }: { initialGoal?: string }) {
  const validInitial = GOALS.some((g) => g.id === initialGoal) ? initialGoal! : null;
  const [answers, setAnswers] = useState<Answers>({ ...EMPTY_ANSWERS, goal: validInitial });
  const [step, setStep] = useState<string>(validInitial ? "industry" : "goal");
  const [showContact, setShowContact] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const steps = STEPS;

  const stepIndex = steps.indexOf(step);
  const progress = step === "result" ? 100 : ((Math.max(0, stepIndex) + 1) / steps.length) * 100;

  function goTo(next: string) {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setShowContact(false);
    setStep(next);
  }

  function goBack() {
    goTo(steps[Math.max(0, stepIndex - 1)]);
  }

  useEffect(() => {
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        headingRef.current?.focus({ preventScroll: true });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [step]);

  const goal = goalOf(answers.goal);
  const industry = industryOf(answers.industry);
  const presence = presenceOf(answers.presence);
  const stagesText = stagesShort(answers.stages);

  // Package scoring, verbatim from the approved build: portal-class modules,
  // stack condition, channel spread, and goal each add weight.
  const packageId: PackageId = (() => {
    const heavy = new Set([
      "customer_portal",
      "courses_training",
      "archive_library",
      "connector_mcp",
      "payments_checkout",
      "commerce_hub",
    ]);
    const heavyCount = answers.modules.filter((m) => heavy.has(m)).length;
    const score =
      answers.modules.length +
      heavyCount +
      Number(
        answers.stages.includes("disconnected") || answers.stages.includes("existing_crm"),
      ) +
      2 * Number(answers.stages.includes("custom_system")) +
      (answers.salesChannels.length >= 3 ? 2 : Number(answers.salesChannels.length > 0)) +
      Number(answers.presence === "site_and_channels") +
      2 * Number(answers.industry === "software") +
      2 * Number(answers.goal === "custom");
    if (score >= 10 || (answers.goal === "custom" && answers.modules.length >= 6)) {
      return "custom_platform";
    }
    return score >= 6 || heavyCount >= 2 ? "industry_os" : "launch";
  })();
  const pkg = PACKAGES[packageId];

  const recommendedModules = useMemo(() => {
    const set = new Set(answers.modules);
    set.add("crm_pipeline");
    set.add("admin_workspace");
    set.add("analytics_reporting");
    if (answers.goal !== "delivery") set.add("website_funnels");
    if (answers.goal === "follow_up") {
      set.add("email_automation");
      set.add("calls_texts");
    }
    if (answers.industry === "ecommerce" || answers.salesChannels.length > 0) {
      set.add("commerce_hub");
      set.add("payments_checkout");
    }
    if (
      answers.presence === "none" ||
      answers.presence === "marketplace_only" ||
      answers.presence === "social_only"
    ) {
      set.add("website_funnels");
    }
    return Array.from(set);
  }, [answers]);

  const channelFees = answers.salesChannels.flatMap((c) => {
    const fee = CHANNEL_FEES[c];
    return fee ? [{ id: c, label: channelOf(c).label, ...fee }] : [];
  });

  return (
    <div className={`router-page ${styles.routerV2}`}>
      <header className="router-header">
        <Link href="/" className="brand-lockup" aria-label="The LeadFlow Pro home">
          The LeadFlow<span>Pro</span>
        </Link>
        <Link href="/" className="router-exit">
          Browse the full site
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>
      <main className="router-main">
        <div className="router-progress" aria-label={`Progress: ${Math.round(progress)} percent`}>
          <div className="router-progress-meta">
            <span>
              {step === "result"
                ? "Your map is ready"
                : "A few quick choices. No contact form yet."}
            </span>
            <span>{STEP_LABELS[step]}</span>
          </div>
          <div className="router-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        {step === "goal" && (
          <QuestionShell
            headingRef={headingRef}
            eyebrow="Start with the leak"
            title="What do you want fixed first?"
            description="Pick the closest answer. You are not locking yourself into a package, and you can change anything later."
          >
            <div className="router-option-grid router-option-grid-large">
              {GOALS.map((g, i) => (
                <OptionButton
                  key={g.id}
                  label={g.label}
                  description={g.description}
                  icon={g.icon}
                  tint={i}
                  onClick={() => {
                    setAnswers({ ...EMPTY_ANSWERS, goal: g.id });
                    goTo("industry");
                  }}
                />
              ))}
            </div>
            <p className="router-reassurance">
              <Compass aria-hidden="true" className="h-4 w-4" />
              Not sure where the real problem is? Choose &ldquo;I have a bigger idea.&rdquo;
              We will keep the map wide open.
            </p>
          </QuestionShell>
        )}

        {step === "industry" && (
          <QuestionShell
            headingRef={headingRef}
            eyebrow="Now give it context"
            title="What kind of business are we mapping?"
            description="Choose the closest workflow, not the perfect label. The industry pack changes the tools, records, language, and handoffs."
          >
            <div className="router-option-grid">
              {INDUSTRIES.map((ind, i) => (
                <OptionButton
                  key={ind.id}
                  label={ind.label}
                  description={ind.description}
                  icon={ind.icon}
                  tint={i}
                  onClick={() => {
                    setAnswers((a) => ({
                      ...a,
                      industry: ind.id,
                      presence: null,
                      salesChannels: [],
                      stages: [],
                      modules: [],
                    }));
                    goTo("presence");
                  }}
                />
              ))}
            </div>
            <BackButton onClick={goBack} />
          </QuestionShell>
        )}

        {step === "presence" && (
          <QuestionShell
            headingRef={headingRef}
            eyebrow={`${industry.short} system map`}
            title="Where does the business live today?"
            description="This is about the current home base, not whether it is good or bad. A mystery website, no website, and a marketplace-only business are all real starting points."
          >
            <div className="router-option-stack">
              {PRESENCES.map((p, i) => (
                <OptionButton
                  key={p.id}
                  label={p.label}
                  description={p.description}
                  icon={p.icon}
                  tint={i}
                  onClick={() => {
                    setAnswers((a) => ({
                      ...a,
                      presence: p.id,
                      salesChannels: [],
                      stages: [],
                      modules: [],
                    }));
                    goTo("channels");
                  }}
                />
              ))}
            </div>
            <BackButton onClick={goBack} />
          </QuestionShell>
        )}

        {step === "channels" && (
          <QuestionShell
            headingRef={headingRef}
            eyebrow="Map the real sales footprint"
            title="Where do you sell or take orders?"
            description="Choose every channel that matters. Marketplaces can stay part of the plan. The goal is to connect the operation and build an owned home base where it helps."
          >
            <div className="router-option-grid">
              {CHANNELS.map((c, i) => (
                <MultiOptionButton
                  key={c.id}
                  label={c.label}
                  description={c.description}
                  icon={c.icon}
                  tint={i}
                  selected={answers.salesChannels.includes(c.id)}
                  onClick={() =>
                    setAnswers((a) => ({
                      ...a,
                      salesChannels: a.salesChannels.includes(c.id)
                        ? a.salesChannels.filter((x) => x !== c.id)
                        : [...a.salesChannels, c.id],
                    }))
                  }
                />
              ))}
            </div>
            <div className="router-actions">
              <BackButton onClick={goBack} compact />
              <button type="button" className="button-primary" onClick={() => goTo("stage")}>
                Continue
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p className="router-selection-count" aria-live="polite">
              {answers.salesChannels.length === 0
                ? "No channel fits? You can continue and explain it in your own words later."
                : `${answers.salesChannels.length} ${answers.salesChannels.length === 1 ? "channel" : "channels"} selected.`}
            </p>
          </QuestionShell>
        )}

        {step === "stage" && (
          <QuestionShell
            headingRef={headingRef}
            eyebrow={`${industry.short} system map`}
            title="What are we working with right now?"
            description="Now tell us how the operation works behind that home base. Most businesses are more than one of these at the same time, so pick everything that is true. This decides whether the job starts with a clean foundation, a migration, or a repair."
          >
            <div className="router-option-stack">
              {STAGES.map((s, i) => (
                <MultiOptionButton
                  key={s.id}
                  label={s.label}
                  description={s.description}
                  icon={s.icon}
                  tint={i}
                  selected={answers.stages.includes(s.id)}
                  onClick={() =>
                    setAnswers((a) => ({
                      ...a,
                      stages: a.stages.includes(s.id)
                        ? a.stages.filter((x) => x !== s.id)
                        : [...a.stages, s.id],
                    }))
                  }
                />
              ))}
            </div>
            <div className="router-actions">
              <BackButton onClick={goBack} compact />
              <button type="button" className="button-primary" onClick={() => goTo("modules")}>
                Continue
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p className="router-selection-count" aria-live="polite">
              {answers.stages.length === 0
                ? "Not sure? You can continue and we will inventory the stack together."
                : `${answers.stages.length} ${answers.stages.length === 1 ? "answer" : "answers"} selected.`}
            </p>
          </QuestionShell>
        )}

        {step === "modules" && (
          <QuestionShell
            headingRef={headingRef}
            eyebrow="Build the first version"
            title="Which pieces matter most right now?"
            description={`We started with the modules that fit ${goal.short}. Select as many as you need. We will add the connected foundation automatically.`}
          >
            <div className="router-option-grid">
              {(answers.goal ? GOAL_MODULE_ORDER[answers.goal] : GOAL_MODULE_ORDER.custom)
                .map((id) => MODULES[id])
                .map((m, i) => (
                  <MultiOptionButton
                    key={m.id}
                    label={m.label}
                    description={m.description}
                    icon={m.icon}
                    tint={i}
                    selected={answers.modules.includes(m.id)}
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        modules: a.modules.includes(m.id)
                          ? a.modules.filter((x) => x !== m.id)
                          : [...a.modules, m.id],
                      }))
                    }
                  />
                ))}
            </div>
            {answers.goal !== "custom" && (
              <button
                type="button"
                className="router-wide-open"
                onClick={() => setAnswers((a) => ({ ...a, modules: Object.keys(MODULES) }))}
              >
                Show me the whole system, not just these suggestions
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
            <div className="router-actions">
              <BackButton onClick={goBack} compact />
              <button
                type="button"
                className="button-primary router-build-button"
                onClick={() => goTo("result")}
              >
                Build My System Map
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p className="router-selection-count" aria-live="polite">
              {answers.modules.length === 0
                ? "You can continue with no selections. We will map the connected core first."
                : `${answers.modules.length} priority ${answers.modules.length === 1 ? "module" : "modules"} selected.`}
            </p>
          </QuestionShell>
        )}

        {step === "result" && (
          <section className="router-result" aria-labelledby="system-map-title">
            <div className="result-heading">
              <span className="eyebrow">Your first system map</span>
              <h1 id="system-map-title" ref={headingRef} tabIndex={-1}>
                A system for {industry.short.toLowerCase()}, built around {goal.short}.
              </h1>
              <p>
                You told us the business is working from {presence.short} with {stagesText}.
                This is the connected first version I would put on the table before anybody
                sells you random software.
              </p>
            </div>

            {/* WHERE YOU ARE vs WHERE THIS TAKES YOU */}
            <div className="mt-10 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
              <div className="rounded-2xl border border-[var(--warn-line)] bg-amber-500/[0.05] p-6">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-warn">
                  Where you are today
                </span>
                <ul className="mt-4 space-y-3 text-sm text-[var(--text)]">
                  <li className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-warn" />
                    <span>Working from {presence.short}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-warn" />
                    <span>
                      {answers.salesChannels.length > 1
                        ? `${answers.salesChannels.length} sales channels that do not talk to each other`
                        : "Business coming in through channels that do not talk to each other"}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-warn" />
                    <span>Running on {stagesText}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-warn" />
                    <span>Leads and follow-up depend on somebody remembering</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center md:px-1">
                <div className="flex h-11 w-11 rotate-90 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-600 shadow-[0_0_24px_rgba(56,189,248,0.45)] md:rotate-0">
                  <ArrowRight className="h-5 w-5 text-[var(--heading)]" strokeWidth={2.6} />
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--green-line)] bg-emerald-500/[0.05] p-6">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--green)]">
                  Where this takes you
                </span>
                <ul className="mt-4 space-y-3 text-sm text-[var(--text)]">
                  <li className="flex items-start gap-3">
                    <CircleCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" />
                    <span>One owned platform behind every channel you already use</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CircleCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" />
                    <span>Every lead captured, answered in seconds, and followed up automatically</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CircleCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" />
                    <span>One pipeline showing what came in, what stalled, and what made money</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CircleCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" />
                    <span>Your code, your data, your customer list. Nobody can take it</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* THE FLOW MAP */}
            <div className="mt-6 rounded-2xl border border-line bg-[var(--fill-2)] p-6 sm:p-8">
              <div className="text-center">
                <span className="eyebrow">Your money map</span>
                <h2 className="mt-3 text-2xl font-black text-[var(--heading)] sm:text-3xl">
                  Every channel feeds one system you own.
                </h2>
              </div>
              <div className="mt-8 flex flex-col items-center gap-5 md:flex-row md:justify-center md:gap-0">
                <div className="flex w-full max-w-xs flex-col gap-3 md:w-56">
                  {(answers.salesChannels.length
                    ? answers.salesChannels.slice(0, 4)
                    : ["owned_site"]
                  ).map((c, i) => {
                    const ch = channelOf(c);
                    return (
                      <div
                        key={c}
                        className="flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 shadow-[0_8px_22px_rgba(10,18,32,0.08)]"
                      >
                        <span
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[var(--heading)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                          style={{ background: tilePair(i) }}
                        >
                          <Icon name={ch.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="text-sm font-semibold text-[var(--heading)]">{ch.short}</span>
                      </div>
                    );
                  })}
                  {answers.salesChannels.length > 4 && (
                    <span className="text-center text-xs font-bold text-[var(--quiet)]">
                      + {answers.salesChannels.length - 4} more channels
                    </span>
                  )}
                </div>
                <div className="flow-line-v md:hidden" />
                <div className="flow-line hidden w-16 md:block" />
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-full border-2 border-[var(--accent-line)] bg-[var(--panel)] px-2 text-center shadow-[0_10px_30px_rgba(18,64,232,0.14)]" style={{ width: 168, height: 168 }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 shadow-[0_4px_14px_rgba(56,189,248,0.5)]">
                    <Zap className="h-5 w-5 text-[var(--heading)]" strokeWidth={2.4} />
                  </span>
                  <span className="text-[13px] font-extrabold tracking-[0.08em] text-[var(--heading)]">
                    YOUR PLATFORM
                  </span>
                  <span className="text-[11px] font-medium text-[var(--muted)]">Owned. Not rented.</span>
                </div>
                <div className="flow-line-v md:hidden" />
                <div className="flow-line hidden w-16 md:block" />
                <div className="flex w-full max-w-xs flex-col gap-3 md:w-64">
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 shadow-[0_8px_22px_rgba(10,18,32,0.08)]">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-[var(--heading)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                      <Inbox className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--heading)]">One inbox and CRM</span>
                      <span className="block text-[11.5px] text-[var(--muted)]">Every lead in your database</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 shadow-[0_8px_22px_rgba(10,18,32,0.08)]">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-cyan-400 to-indigo-500 text-[var(--heading)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                      <Send className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--heading)]">Automatic follow-up</span>
                      <span className="block text-[11.5px] text-[var(--muted)]">Email and text until they answer</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 shadow-[0_8px_22px_rgba(10,18,32,0.08)]">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-400 to-fuchsia-500 text-[var(--heading)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                      <ChartColumn className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--heading)]">Reporting you own</span>
                      <span className="block text-[11.5px] text-[var(--muted)]">What made money, in plain sight</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {answers.salesChannels.length > 0 && (
              <div className="result-channel-bar !mt-6">
                <div>
                  <span className="eyebrow">Channel strategy</span>
                  <strong>Keep the reach. Build the owned center.</strong>
                  <p>
                    {answers.salesChannels.map((c) => channelOf(c).short).join(", ")} can
                    remain active sales channels. The system map connects the inventory,
                    orders, reporting, and follow-up that each channel permits without
                    treating any marketplace account like an asset you fully control.
                  </p>
                  {channelFees.length > 0 && (
                    <details className="result-fee-details">
                      <summary>See the channel fees we would audit</summary>
                      <ul>
                        {channelFees.map((f) => (
                          <li key={f.id}>
                            <div>
                              <strong>{f.label}</strong>
                              <span>{f.summary}</span>
                            </div>
                            <a href={f.source} target="_blank" rel="noreferrer">
                              Official fee page
                              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                            </a>
                          </li>
                        ))}
                      </ul>
                      <small>
                        Fee rules change and can depend on category, order value, shipping,
                        fulfillment, ads, promotions, and account status. The map uses the
                        seller&rsquo;s real statements before estimating savings.
                      </small>
                    </details>
                  )}
                </div>
                <Icon name="network" className="h-7 w-7" />
              </div>
            )}

            <div className="result-layout">
              <div className="result-system-card">
                <div className="result-system-topline">
                  <div>
                    <span>LeadFlow Core + Industry Pack</span>
                    <strong>One business. One connected system.</strong>
                  </div>
                  <ShieldCheck aria-hidden="true" className="h-7 w-7 text-[var(--green)]" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {recommendedModules.map((id, i) => {
                    const m = MODULES[id];
                    const meta = MODULE_META[id];
                    return (
                      <div
                        key={id}
                        className="flex items-start gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-3.5"
                      >
                        <span
                          className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] text-[var(--heading)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                          style={{ background: tilePair(i) }}
                        >
                          <Icon name={m.icon} className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold leading-snug text-[var(--heading)]">
                            {m.label}
                          </span>
                          <span className="mt-1 block text-[12.5px] leading-relaxed text-[var(--muted)]">
                            {meta?.why ?? m.description}
                          </span>
                          {meta?.proof && (
                            <span className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--green)]/90">
                              <CircleCheck className="h-3 w-3" />
                              Proven live on {meta.proof}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="result-system-footer">
                  <span>GitHub + Vercel + Supabase</span>
                  <span>Installed in accounts you control</span>
                </div>
              </div>
              <aside className="result-package-card">
                <span className="eyebrow">Likely build path</span>
                <h2>{pkg.name}</h2>
                <p className="result-price">{pkg.price}</p>
                <p>{pkg.description}</p>
                <div className="result-map-note">
                  <strong>
                    {packageId === "launch"
                      ? "Start with the $500 Website Launch deposit."
                      : "Start with the $497 System Map."}
                  </strong>
                  <span>
                    {packageId === "launch"
                      ? "The deposit reserves the build and is applied to the $1,000 total. The remaining $500 is due after approval and before launch."
                      : "We confirm the scope, phases, ownership, and connections. If the larger build is approved, the map is credited to it."}
                  </span>
                </div>
              </aside>
            </div>

            <div className="result-freedom-bar">
              <div>
                <strong>This is a recommendation, not a box.</strong>
                <span>
                  Change the priorities, compare the packages, or keep exploring before you
                  talk to anybody.
                </span>
              </div>
              <button type="button" onClick={() => goTo("modules")}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Change my answers
              </button>
            </div>

            {!showContact && !submitted && (
              <div className="result-next-actions">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => setShowContact(true)}
                >
                  Talk to Ryan About This Build
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
                <Link href="/add-ons" className="button-secondary">
                  Hand-Pick From the Add-On Menu
                </Link>
                <Link href="/portfolio" className="button-secondary">
                  See the Live Work
                </Link>
              </div>
            )}

            {showContact && !submitted && (
              <ContactCard
                answers={answers}
                packageId={packageId}
                recommendedModules={recommendedModules}
                onCancel={() => setShowContact(false)}
                onSuccess={() => setSubmitted(true)}
              />
            )}

            {submitted && (
              <div className="router-success" role="status">
                <CircleCheck aria-hidden="true" className="h-10 w-10 text-[var(--green)]" />
                <div>
                  <h2>
                    {packageId === "launch"
                      ? "Your Website Launch details are in."
                      : "Your system map request is in."}
                  </h2>
                  <p>
                    {packageId === "launch"
                      ? "Ryan has the business type, current setup, priorities, and launch path. Reserve the build with $500 when you are ready to open intake. Once intake begins, the deposit is non-refundable, except where the written agreement or applicable law requires otherwise."
                      : "Ryan has the business type, the current setup, the priorities, and the build path. You will not have to repeat all of this on the first conversation."}
                  </p>
                  <div className="router-success-actions">
                    {packageId === "launch" ? (
                      <a href={WEBSITE_LAUNCH_CHECKOUT} className="button-primary">
                        Reserve Website Launch | $500
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </a>
                    ) : null}
                    <Link href="/portfolio" className="button-secondary">
                      See More Live Work
                    </Link>
                    <button
                      type="button"
                      className="button-quiet"
                      onClick={() => {
                        setAnswers(EMPTY_ANSWERS);
                        setSubmitted(false);
                        setShowContact(false);
                        goTo("goal");
                      }}
                    >
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      Map another business
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="router-footer">
        <span>The LeadFlow Pro, a DBA of Longview Training Center, LLC</span>
        <span>Your answers stay in this browser until you choose to send the map.</span>
      </footer>
    </div>
  );
}
