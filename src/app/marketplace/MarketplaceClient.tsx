"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  CalendarClock,
  CheckCircle2,
  Crown,
  DatabaseZap,
  Eye,
  FileCheck2,
  Filter,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  ConfidenceLabel,
  LeadScoreBadge,
  SourceProofChip,
  SuppressionStatusBadge,
  type ConfidenceLevel,
  type SignalStatus,
} from "@/components/leadflow-system";
import { trackEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

type MarketplaceListing = {
  id: string;
  title: string;
  summary: string;
  category: string;
  vertical: string;
  industry: string;
  location: string;
  buyerType: string;
  sourceType: string;
  dataType: string;
  leadScore: number;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  recordCount: string;
  sourceProofStatus: string;
  freshness: string;
  freshnessDate: string;
  buyerUseCase: string;
  bestBuyer: string;
  priceLabel: string;
  sharedExclusive: string;
  accessModel?: "shared" | "limited_seats" | "exclusive_listing" | "exclusive_geo" | "exclusive_vertical" | "exclusive_time_window" | "internal_only";
  listingStatus?: "draft" | "review" | "sample_available" | "available" | "reserved" | "sold_shared" | "sold_exclusive" | "expired" | "archived" | "suppressed";
  maxBuyers?: number | null;
  currentBuyerCount?: number;
  exclusiveTerritory?: string;
  exclusiveWindow?: string;
  releaseMode: string;
  complianceStatus: string;
  reviewStatus: string;
  suppressionStatus: SignalStatus;
  suppressionNote: string;
  sampleFields: string[];
  hiddenUntilApproved: string[];
  sourceProofExamples: string[];
};

type FilterKey =
  | "industry"
  | "location"
  | "buyerType"
  | "sourceType"
  | "confidence"
  | "freshness"
  | "dataType"
  | "priceRange"
  | "sharedExclusive"
  | "complianceStatus"
  | "reviewStatus";

type RequestType = "sample" | "access";

type RequestFormStatus =
  | { state: "idle"; message: string }
  | { state: "saving"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

const industryOptions = [
  "Ecommerce",
  "Real estate",
  "Mortgage",
  "VA IRRRL",
  "Local services",
  "Contractors",
  "Legal",
  "Dental",
  "Medical",
  "Banking",
  "Insurance",
  "Crypto",
  "SaaS",
  "AI tools",
  "Politics and civic issue signals",
  "Creator audiences",
  "General business",
];

const buyerTypeOptions = [
  "Business owner",
  "Agency",
  "Broker",
  "Realtor",
  "Loan officer",
  "Contractor",
  "Consultant",
  "Media buyer",
  "Sales manager",
  "Founder",
  "Operator",
  "Investor",
  "Campaign team",
  "Local organization",
];

const sourceTypeOptions = [
  "Public business website",
  "Submitted source",
  "Questionnaire response",
  "Tool-generated signal",
  "Public directory",
  "Public campaign site",
  "Public marketplace",
  "First-party consented response",
  "Partner-submitted data",
  "Internal research review",
];

const marketplaceListings: MarketplaceListing[] = [
  {
    id: "ecommerce-vendor-signal-pack",
    title: "Ecommerce Vendor Signal Pack",
    summary:
      "Vendor, category, marketplace, and product-line clues packaged for operators who need source-backed ecommerce opportunities instead of recycled supplier lists.",
    category: "Ecommerce",
    vertical: "Ecommerce and marketplace sourcing",
    industry: "Ecommerce",
    location: "United States",
    buyerType: "Agency",
    sourceType: "Public marketplace",
    dataType: "Lead signal pack",
    leadScore: 87,
    confidence: "high",
    confidenceLabel: "High confidence",
    recordCount: "4,800 signal sample",
    sourceProofStatus: "Sample rows and public source links",
    freshness: "Last 7 days",
    freshnessDate: "July 1, 2026",
    buyerUseCase: "Find vendors, categories, and marketplace operators worth manual review or outreach.",
    bestBuyer: "Agency, product sourcer, marketplace operator",
    priceLabel: "$149 to $499 starter access",
    sharedExclusive: "Shared",
    accessModel: "shared",
    listingStatus: "sample_available",
    currentBuyerCount: 2,
    releaseMode: "Review-gated shared access",
    complianceStatus: "Source proof reviewed",
    reviewStatus: "Sample available",
    suppressionStatus: "sampleAvailable",
    suppressionNote: "No suppressed contacts are exposed in public preview. Full release is reviewed first.",
    sampleFields: ["category", "platform clue", "vendor lane", "source type", "freshness bucket", "buyer use case"],
    hiddenUntilApproved: ["direct contact fields", "full row export", "unredacted source notes", "matched buyer route"],
    sourceProofExamples: ["public marketplace category tag", "platform listing context", "manual source review note"],
  },
  {
    id: "local-contractor-demand-signal",
    title: "Local Contractor Demand Signal",
    summary:
      "Local service demand, review gaps, website leaks, and category pressure signals for contractors and agencies that can respond fast.",
    category: "Home services",
    vertical: "Contractors and local services",
    industry: "Contractors",
    location: "Texas and regional markets",
    buyerType: "Contractor",
    sourceType: "Public business website",
    dataType: "Demand signal map",
    leadScore: 84,
    confidence: "high",
    confidenceLabel: "High confidence",
    recordCount: "2,400 service-area signals",
    sourceProofStatus: "Website, directory, and demand-pattern proof",
    freshness: "Last 10 days",
    freshnessDate: "June 30, 2026",
    buyerUseCase: "Spot categories where missed calls, missed texts, weak websites, and demand spikes create a follow-up gap.",
    bestBuyer: "Roofing, HVAC, plumbing, remodeling, restoration",
    priceLabel: "$199 to $599",
    sharedExclusive: "Limited seats",
    accessModel: "limited_seats",
    listingStatus: "available",
    maxBuyers: 4,
    currentBuyerCount: 2,
    releaseMode: "Shared with category limits",
    complianceStatus: "Suppression checked",
    reviewStatus: "Review",
    suppressionStatus: "review",
    suppressionNote: "Signals are checked before any named release. Suppressed records stay out.",
    sampleFields: ["service category", "city cluster", "website funnel issue", "source proof", "urgency clue", "recommended buyer"],
    hiddenUntilApproved: ["named account rows", "contact route hints", "export file", "reviewer notes"],
    sourceProofExamples: ["public website path", "public directory gap", "service-area review pattern"],
  },
  {
    id: "real-estate-agent-opportunity-map",
    title: "Real Estate Agent Opportunity Map",
    summary:
      "Market coverage, agent activity, listing movement, and follow-up opportunity clues for brokerages and real estate teams.",
    category: "Real estate",
    vertical: "Real estate",
    industry: "Real estate",
    location: "Metro areas",
    buyerType: "Broker",
    sourceType: "Public directory",
    dataType: "Opportunity map",
    leadScore: 76,
    confidence: "medium",
    confidenceLabel: "Medium confidence",
    recordCount: "920 market signals",
    sourceProofStatus: "Public listing movement and coverage gaps",
    freshness: "Last 21 days",
    freshnessDate: "June 27, 2026",
    buyerUseCase: "Identify markets where agent teams may need better lead flow, CRM automation, appointment booking, or website funnel repair.",
    bestBuyer: "Brokerage, agent team, CRM operator",
    priceLabel: "$249 to $799",
    sharedExclusive: "Exclusive",
    accessModel: "exclusive_geo",
    listingStatus: "available",
    currentBuyerCount: 0,
    exclusiveTerritory: "Metro territory",
    releaseMode: "Territory-reviewed exclusive request",
    complianceStatus: "Needs partner review",
    reviewStatus: "Review",
    suppressionStatus: "review",
    suppressionNote: "No private owner dossier is shown. Release depends on source review and buyer use case.",
    sampleFields: ["market", "agent lane", "activity clue", "coverage gap", "source type", "review status"],
    hiddenUntilApproved: ["complete map", "full source trail", "direct account routes", "exclusive terms"],
    sourceProofExamples: ["public directory entry", "listing movement clue", "market coverage note"],
  },
  {
    id: "mortgage-refi-interest-signal",
    title: "Mortgage Refi Interest Signal",
    summary:
      "Permissioned refinance interest and mortgage-readiness signals for licensed mortgage teams, routed only after review.",
    category: "Mortgage and refi",
    vertical: "Mortgage",
    industry: "Mortgage",
    location: "Licensed partner areas",
    buyerType: "Loan officer",
    sourceType: "First-party consented response",
    dataType: "Consented inquiry signal",
    leadScore: 81,
    confidence: "high",
    confidenceLabel: "High confidence",
    recordCount: "Live consented inquiries",
    sourceProofStatus: "Named consent path and inquiry context",
    freshness: "Live intake",
    freshnessDate: "July 1, 2026",
    buyerUseCase: "Review mortgage/refi interest that has permission context before any licensed partner contact.",
    bestBuyer: "Licensed mortgage team or approved refi partner",
    priceLabel: "Request pricing",
    sharedExclusive: "Named seller",
    accessModel: "exclusive_time_window",
    listingStatus: "review",
    currentBuyerCount: 0,
    releaseMode: "Named partner review",
    complianceStatus: "Consent checked",
    reviewStatus: "Review",
    suppressionStatus: "review",
    suppressionNote: "Mortgage data is review-gated. No SSNs, bank logins, or private account data are accepted here.",
    sampleFields: ["loan interest type", "state bucket", "timeframe", "consent scope", "source page", "review status"],
    hiddenUntilApproved: ["identity fields", "contact route", "full answer set", "seller-specific routing decision"],
    sourceProofExamples: ["consented questionnaire path", "notice version", "timestamped review status"],
  },
  {
    id: "va-irrrl-watchlist",
    title: "VA IRRRL Watchlist",
    summary:
      "A mortgage-specific watchlist for VA refinance interest signals that require licensed review, consent, and conservative routing.",
    category: "Mortgage and refi",
    vertical: "VA IRRRL",
    industry: "VA IRRRL",
    location: "Licensed partner areas",
    buyerType: "Loan officer",
    sourceType: "Questionnaire response",
    dataType: "Watchlist",
    leadScore: 78,
    confidence: "medium",
    confidenceLabel: "Medium confidence",
    recordCount: "Watchlist sample",
    sourceProofStatus: "Questionnaire and eligibility-context review",
    freshness: "Live intake",
    freshnessDate: "July 1, 2026",
    buyerUseCase: "Help licensed teams review VA refinance interest without treating the public page as a loan offer.",
    bestBuyer: "Licensed VA mortgage team",
    priceLabel: "Review required",
    sharedExclusive: "Named seller",
    accessModel: "exclusive_time_window",
    listingStatus: "review",
    currentBuyerCount: 0,
    releaseMode: "Named partner only",
    complianceStatus: "Licensed partner review",
    reviewStatus: "Review",
    suppressionStatus: "review",
    suppressionNote: "Only adult, consented, review-cleared requests can move forward.",
    sampleFields: ["interest bucket", "state", "timing", "consent scope", "source path", "review status"],
    hiddenUntilApproved: ["contact details", "full context", "seller routing", "export"],
    sourceProofExamples: ["questionnaire source path", "consent event", "licensed-area check"],
  },
  {
    id: "ai-tool-buyer-intent-signal",
    title: "AI Tool Buyer Intent Signal",
    summary:
      "Launch pages, pricing clues, tool adoption gaps, and buyer-intent signals for AI agencies, SaaS consultants, and automation builders.",
    category: "AI and SaaS",
    vertical: "AI tools",
    industry: "AI tools",
    location: "Remote",
    buyerType: "Consultant",
    sourceType: "Public campaign site",
    dataType: "Buyer intent signal",
    leadScore: 82,
    confidence: "medium",
    confidenceLabel: "Medium confidence",
    recordCount: "680 AI launch signals",
    sourceProofStatus: "Pricing page, launch post, and traffic clue",
    freshness: "Last 3 days",
    freshnessDate: "July 1, 2026",
    buyerUseCase: "Find AI tools and SaaS teams that may need integrations, AI chatbot setup, AI agent workflows, or distribution help.",
    bestBuyer: "SaaS agency, integration builder, automation shop",
    priceLabel: "$199 to $699",
    sharedExclusive: "Aggregated insight",
    accessModel: "internal_only",
    listingStatus: "available",
    currentBuyerCount: 0,
    releaseMode: "Aggregate only",
    complianceStatus: "Aggregate only",
    reviewStatus: "Approved",
    suppressionStatus: "approved",
    suppressionNote: "This product is aggregate or business-level only. No hidden personal identity dossier is shown.",
    sampleFields: ["tool category", "launch clue", "pricing clue", "integration gap", "buyer fit", "source type"],
    hiddenUntilApproved: ["complete source list", "watchlist export", "buyer notes", "scored account set"],
    sourceProofExamples: ["public launch page", "pricing-page clue", "public campaign reference"],
  },
  {
    id: "website-neglect-signal-pack",
    title: "Website Neglect Signal Pack",
    summary:
      "Businesses with visible website funnel leaks, weak calls to action, missed appointment booking paths, and follow-up gaps.",
    category: "General business",
    vertical: "Website funnel and automation",
    industry: "General business",
    location: "United States",
    buyerType: "Agency",
    sourceType: "Tool-generated signal",
    dataType: "Audit-generated signal pack",
    leadScore: 88,
    confidence: "high",
    confidenceLabel: "High confidence",
    recordCount: "Live scored inquiries",
    sourceProofStatus: "Tool result, URL review, and source page",
    freshness: "Live intake",
    freshnessDate: "July 1, 2026",
    buyerUseCase: "Find businesses asking for help with website funnels, CRM automation, AI receptionist, missed DMs, missed calls, and follow-up.",
    bestBuyer: "Web builder, ads operator, AI automation shop",
    priceLabel: "$249 to $899",
    sharedExclusive: "Named seller",
    accessModel: "exclusive_listing",
    listingStatus: "sample_available",
    currentBuyerCount: 0,
    releaseMode: "Review-gated named buyer",
    complianceStatus: "Consent checked",
    reviewStatus: "Sample available",
    suppressionStatus: "sampleAvailable",
    suppressionNote: "Tool answers stay private until the person agrees to contact or routing.",
    sampleFields: ["business type", "funnel issue", "missed follow-up clue", "tool score", "source page", "next action"],
    hiddenUntilApproved: ["identity", "phone", "email", "raw answers", "full audit notes"],
    sourceProofExamples: ["Website Money Leak Checker", "source page timestamp", "reviewed URL note"],
  },
  {
    id: "local-service-business-lead-leak-pack",
    title: "Local Service Business Lead Leak Pack",
    summary:
      "Signals from local businesses that are losing attention through missed calls, missed texts, missed DMs, and broken follow-up.",
    category: "Local services",
    vertical: "Local business marketing",
    industry: "Local services",
    location: "Local and regional",
    buyerType: "Business owner",
    sourceType: "Tool-generated signal",
    dataType: "Lead leak pack",
    leadScore: 86,
    confidence: "high",
    confidenceLabel: "High confidence",
    recordCount: "Live lead leak audits",
    sourceProofStatus: "Audit answers and source path",
    freshness: "Live intake",
    freshnessDate: "July 1, 2026",
    buyerUseCase: "Sell or build business automation, AI receptionist, CRM automation, appointment booking, and follow-up repair.",
    bestBuyer: "Local agency, automation builder, operator",
    priceLabel: "$197 sample audit path",
    sharedExclusive: "Named seller",
    accessModel: "exclusive_listing",
    listingStatus: "sample_available",
    currentBuyerCount: 0,
    releaseMode: "Review-gated named buyer",
    complianceStatus: "Consent checked",
    reviewStatus: "Sample available",
    suppressionStatus: "sampleAvailable",
    suppressionNote: "Contact and routing require consent and suppression checks.",
    sampleFields: ["industry", "missed call pain", "follow-up speed", "CRM status", "budget range", "urgency"],
    hiddenUntilApproved: ["name", "phone", "email", "company URL", "raw notes"],
    sourceProofExamples: ["Lead Leak Audit", "Business Signal Score", "source timestamp"],
  },
  {
    id: "dental-office-growth-signal",
    title: "Dental Office Growth Signal",
    summary:
      "Dental marketing demand and front-office lead flow gaps focused on business growth, not patient medical details.",
    category: "Dental",
    vertical: "Dental marketing",
    industry: "Dental",
    location: "United States",
    buyerType: "Agency",
    sourceType: "Internal research review",
    dataType: "Vertical opportunity signal",
    leadScore: 74,
    confidence: "medium",
    confidenceLabel: "Medium confidence",
    recordCount: "430 growth signals",
    sourceProofStatus: "Business website and marketing-path review",
    freshness: "Last 30 days",
    freshnessDate: "June 24, 2026",
    buyerUseCase: "Find practices that may need local business marketing, Facebook ads, Instagram ads, website funnel repair, or lead response systems.",
    bestBuyer: "Dental marketing agency or automation consultant",
    priceLabel: "Request sample",
    sharedExclusive: "Shared",
    accessModel: "shared",
    listingStatus: "review",
    currentBuyerCount: 1,
    releaseMode: "Shared vertical sample",
    complianceStatus: "No medical data",
    reviewStatus: "Review",
    suppressionStatus: "review",
    suppressionNote: "This product does not collect or expose health history, treatment need, or patient medical data.",
    sampleFields: ["practice type", "marketing gap", "website CTA", "response path", "source type", "buyer fit"],
    hiddenUntilApproved: ["account list", "full reviewer notes", "contact route", "export"],
    sourceProofExamples: ["public practice website", "public ad/funnel clue", "manual business review"],
  },
  {
    id: "political-issue-pulse-signal",
    title: "Political Issue Pulse Signal",
    summary:
      "Aggregated civic issue-level signals from public or consented inputs for campaign teams, local organizations, and media buyers.",
    category: "Civic issue signals",
    vertical: "Politics and civic issue signals",
    industry: "Politics and civic issue signals",
    location: "District or region",
    buyerType: "Campaign team",
    sourceType: "Public campaign site",
    dataType: "Aggregated issue signal",
    leadScore: 71,
    confidence: "medium",
    confidenceLabel: "Medium confidence",
    recordCount: "Issue-level sample",
    sourceProofStatus: "Public source or consented issue input",
    freshness: "Last 14 days",
    freshnessDate: "June 29, 2026",
    buyerUseCase: "Understand issue attention, public concern categories, and message questions without targeting private political identity.",
    bestBuyer: "Campaign team, local organization, civic media buyer",
    priceLabel: "Aggregate pricing",
    sharedExclusive: "Aggregated insight",
    accessModel: "internal_only",
    listingStatus: "available",
    currentBuyerCount: 0,
    releaseMode: "Aggregate only",
    complianceStatus: "No individual persuasion targeting",
    reviewStatus: "Approved",
    suppressionStatus: "approved",
    suppressionNote: "No individual political persuasion profile is sold. Civic signals stay issue-level, public-source, consented, or aggregate.",
    sampleFields: ["issue category", "district bucket", "public source type", "attention trend", "question cluster", "freshness"],
    hiddenUntilApproved: ["full aggregate report", "method notes", "source table", "buyer-specific analysis"],
    sourceProofExamples: ["public campaign page", "consented civic issue tool", "aggregate trend review"],
  },
];

const filters: Array<{
  key: FilterKey;
  label: string;
  placeholder: string;
  options: string[];
  getValue: (listing: MarketplaceListing) => string;
}> = [
  { key: "industry", label: "Industry", placeholder: "All industries", options: industryOptions, getValue: (listing) => listing.industry },
  { key: "location", label: "Location", placeholder: "All locations", options: ["United States", "Texas and regional markets", "Licensed partner areas", "Remote", "Metro areas", "Local and regional", "District or region"], getValue: (listing) => listing.location },
  { key: "buyerType", label: "Buyer type", placeholder: "All buyers", options: buyerTypeOptions, getValue: (listing) => listing.buyerType },
  { key: "sourceType", label: "Source type", placeholder: "All sources", options: sourceTypeOptions, getValue: (listing) => listing.sourceType },
  { key: "confidence", label: "Confidence score", placeholder: "Any confidence", options: ["High confidence", "Medium confidence", "Low confidence"], getValue: (listing) => listing.confidenceLabel },
  { key: "freshness", label: "Freshness", placeholder: "Any freshness", options: ["Live intake", "Last 3 days", "Last 7 days", "Last 10 days", "Last 14 days", "Last 21 days", "Last 30 days"], getValue: (listing) => listing.freshness },
  { key: "dataType", label: "Data type", placeholder: "Any data type", options: ["Lead signal pack", "Demand signal map", "Opportunity map", "Consented inquiry signal", "Watchlist", "Buyer intent signal", "Audit-generated signal pack", "Lead leak pack", "Vertical opportunity signal", "Aggregated issue signal"], getValue: (listing) => listing.dataType },
  { key: "priceRange", label: "Price range", placeholder: "Any price", options: ["$149 to $499 starter access", "$199 to $599", "$249 to $799", "$199 to $699", "$249 to $899", "$197 sample audit path", "Request pricing", "Request sample", "Review required", "Aggregate pricing"], getValue: (listing) => listing.priceLabel },
  { key: "sharedExclusive", label: "Shared or exclusive", placeholder: "Any release", options: ["Shared", "Limited seats", "Exclusive", "Named seller", "Aggregated insight"], getValue: (listing) => listing.sharedExclusive },
  { key: "complianceStatus", label: "Compliance status", placeholder: "Any status", options: ["Source proof reviewed", "Suppression checked", "Needs partner review", "Consent checked", "Licensed partner review", "Aggregate only", "No medical data", "No individual persuasion targeting"], getValue: (listing) => listing.complianceStatus },
  { key: "reviewStatus", label: "Review status", placeholder: "Any review", options: ["Sample available", "Review", "Approved"], getValue: (listing) => listing.reviewStatus },
];

const initialFilters = Object.fromEntries(filters.map((filter) => [filter.key, "all"])) as Record<FilterKey, string>;

const featuredIds = [
  "ecommerce-vendor-signal-pack",
  "local-service-business-lead-leak-pack",
  "mortgage-refi-interest-signal",
];

function trackMarketplaceEvent(eventName: string, properties: Record<string, string | number | boolean>) {
  trackEvent(eventName, { route: "/marketplace", ...properties });
}

function matchesFilter(listing: MarketplaceListing, selectedFilters: Record<FilterKey, string>) {
  return filters.every((filter) => {
    const selected = selectedFilters[filter.key];
    return selected === "all" || filter.getValue(listing) === selected;
  });
}

function safeSourcePath() {
  if (typeof window === "undefined") return "/marketplace";
  return `${window.location.pathname}${window.location.search}`;
}

function derivedAccessModel(listing: MarketplaceListing): NonNullable<MarketplaceListing["accessModel"]> {
  if (listing.accessModel) return listing.accessModel;
  if (listing.sharedExclusive === "Exclusive") return "exclusive_listing";
  if (listing.sharedExclusive === "Limited seats") return "limited_seats";
  if (listing.sharedExclusive === "Named seller") return "exclusive_time_window";
  if (listing.sharedExclusive === "Aggregated insight") return "internal_only";
  return "shared";
}

function derivedListingStatus(listing: MarketplaceListing): NonNullable<MarketplaceListing["listingStatus"]> {
  if (listing.listingStatus) return listing.listingStatus;
  if (listing.reviewStatus === "Sample available") return "sample_available";
  if (listing.reviewStatus === "Approved") return "available";
  return "review";
}

function accessStateLabel(listing: MarketplaceListing) {
  const status = derivedListingStatus(listing);
  const model = derivedAccessModel(listing);
  if (status === "reserved") return "Reserved";
  if (status === "sold_exclusive") return "Sold exclusive";
  if (model === "limited_seats") {
    const max = listing.maxBuyers || 0;
    const current = listing.currentBuyerCount || 0;
    return max > 0 && current >= max ? "Limited seats full" : "Limited seats available";
  }
  if (model === "internal_only") return "Aggregate or internal only";
  if (model === "shared") return "Shared access available";
  return "Exclusive available";
}

function exclusiveCtaLabel(listing: MarketplaceListing) {
  const status = derivedListingStatus(listing);
  if (status === "sold_exclusive") return "Sold Exclusive";
  if (status === "reserved") return "Reserved";
  if (derivedAccessModel(listing) === "shared") return "Request Exclusive";
  return "Request Exclusive";
}

function canRequestExclusive(listing: MarketplaceListing) {
  const status = derivedListingStatus(listing);
  return derivedAccessModel(listing) !== "internal_only" && !["sold_exclusive", "suppressed", "archived"].includes(status);
}

export function MarketplaceClient() {
  const [selectedFilters, setSelectedFilters] = useState(initialFilters);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(() => new Set());

  const visibleListings = useMemo(
    () => marketplaceListings.filter((listing) => matchesFilter(listing, selectedFilters)),
    [selectedFilters],
  );

  const featuredListings = useMemo(
    () => featuredIds.map((id) => marketplaceListings.find((listing) => listing.id === id)).filter(Boolean) as MarketplaceListing[],
    [],
  );

  useEffect(() => {
    trackMarketplaceEvent("marketplace_viewed", {
      listing_count: marketplaceListings.length,
      featured_count: featuredListings.length,
    });
  }, [featuredListings.length]);

  function updateFilter(key: FilterKey, value: string) {
    const nextFilters = { ...selectedFilters, [key]: value };
    setSelectedFilters(nextFilters);
    const visibleCount = marketplaceListings.filter((listing) => matchesFilter(listing, nextFilters)).length;

    trackMarketplaceEvent("marketplace_filter_changed", {
      filter_key: key,
      filter_value: value,
      visible_count: visibleCount,
    });
  }

  function resetFilters() {
    setSelectedFilters(initialFilters);
    trackMarketplaceEvent("marketplace_filter_changed", {
      filter_key: "reset",
      filter_value: "all",
      visible_count: marketplaceListings.length,
    });
  }

  function openListing(listing: MarketplaceListing, openSource: string, nextRequestType: RequestType | null = null) {
    setSelectedListing(listing);
    setRequestType(nextRequestType);
    trackMarketplaceEvent("listing_card_clicked", {
      listing_id: listing.id,
      category: listing.category,
      vertical: listing.industry,
      lead_score: listing.leadScore,
      open_source: openSource,
    });
    trackMarketplaceEvent("listing_preview_opened", {
      listing_id: listing.id,
      category: listing.category,
      vertical: listing.industry,
      lead_score: listing.leadScore,
      view_source: openSource,
    });
    if (nextRequestType) {
      trackMarketplaceEvent(nextRequestType === "access" ? "access_request_started" : "sample_request_started", {
        listing_id: listing.id,
        category: listing.category,
        vertical: listing.industry,
        request_type: nextRequestType,
      });
    }
  }

  function closeModal() {
    setSelectedListing(null);
    setRequestType(null);
  }

  function addToWatchlist(listing: MarketplaceListing) {
    setWatchlist((current) => {
      const next = new Set(current);
      next.add(listing.id);
      return next;
    });
    fetch("/api/buyer/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        listingSlug: listing.id,
        title: listing.title,
        category: listing.category,
      }),
    }).catch(() => null);
    trackMarketplaceEvent("watchlist_added", {
      listing_id: listing.id,
      category: listing.category,
      vertical: listing.industry,
      lead_score: listing.leadScore,
    });
  }

  return (
    <main className="pb-24">
      <section className="relative isolate overflow-hidden border-b border-white/10 py-14 md:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(35,184,255,0.20),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(255,154,31,0.18),transparent_32%),linear-gradient(135deg,#030711_0%,#070c18_52%,#101008_100%)]" />
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                <DatabaseZap className="h-4 w-4" />
                Lead signal marketplace
              </p>
              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.94] tracking-normal text-white md:text-7xl">
                Buy lead signals with proof attached.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100 md:text-xl">
                No mystery spreadsheets. No recycled junk. No blind lists. Every listing shows category, source context,
                confidence, freshness, buyer use case, and review status before access is released.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button type="button" className="btn-accent text-base" onClick={() => openListing(featuredListings[0], "hero_primary", "access")}>
                  Request Access
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a href="#signal-packs" className="btn-ghost text-base">
                  View Sample Signals
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Source-backed", "Confidence scored", "Reviewed before release", "Suppression checked", "Built for serious buyers"].map((chip) => (
                  <span key={chip} className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-extrabold uppercase tracking-wider text-ink-100">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <aside className="lead-shell p-5">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Buyer shelf</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{marketplaceListings.length} reviewed examples</h2>
                </div>
                <ShieldCheck className="h-7 w-7 text-lead-400" />
              </div>
              <div className="mt-5 grid gap-3">
                {featuredListings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                    onClick={() => openListing(listing, "hero_shelf")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{listing.category}</p>
                        <p className="mt-1 text-sm font-bold text-white">{listing.title}</p>
                      </div>
                      <LeadScoreBadge score={listing.leadScore} label="Score" className="min-h-12 min-w-16 px-2 py-1" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ConfidenceLabel level={listing.confidence} />
                      <SuppressionStatusBadge status={listing.suppressionStatus} />
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-ink-900/45 py-6">
        <div className="container">
          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="lead-shell p-4 lg:sticky lg:top-24 lg:self-start">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Filter stack</p>
                  <h2 className="mt-1 text-xl font-black text-white">Choose usable signal.</h2>
                </div>
                <Filter className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="grid gap-3">
                {filters.map((filter) => (
                  <label key={filter.key} className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{filter.label}</span>
                    <select
                      value={selectedFilters[filter.key]}
                      onChange={(event) => updateFilter(filter.key, event.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
                    >
                      <option value="all">{filter.placeholder}</option>
                      {filter.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button type="button" onClick={resetFilters} className="btn-ghost mt-4 min-h-10 w-full justify-center px-4 py-2 text-sm">
                <SlidersHorizontal className="h-4 w-4" />
                Reset filters
              </button>
            </aside>

            <div>
              <div className="lead-shell p-4 md:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Marketplace results</p>
                    <h2 className="mt-2 text-3xl font-black text-white md:text-5xl">Browse source-backed signal products.</h2>
                    <p className="mt-3 text-sm leading-6 text-ink-200 md:text-base md:leading-7">
                      Every card shows proof, confidence, suppression state, and the buyer use case before any access request.
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold text-ink-100">
                    <span className="text-cyan-300">{visibleListings.length}</span> of {marketplaceListings.length} visible
                  </div>
                </div>
              </div>

              <section id="marketplace-results" className="mt-5 grid gap-4 xl:grid-cols-2">
                {visibleListings.map((listing) => (
                  <MarketplaceCard
                    key={listing.id}
                    listing={listing}
                    watchlisted={watchlist.has(listing.id)}
                    onOpen={() => openListing(listing, "card")}
                    onRequest={(type) => openListing(listing, `card_${type}`, type)}
                    onExclusive={() => {
                      trackMarketplaceEvent("exclusive_request_started", {
                        listing_id: listing.id,
                        category: listing.category,
                        vertical: listing.industry,
                        access_model: derivedAccessModel(listing),
                        status: derivedListingStatus(listing),
                      });
                    }}
                    onWatchlist={() => addToWatchlist(listing)}
                  />
                ))}
              </section>

              {visibleListings.length === 0 ? (
                <div className="lead-shell mt-8 p-6 text-center">
                  <Search className="mx-auto h-7 w-7 text-cyan-300" />
                  <h3 className="mt-4 text-2xl font-black text-white">No signal matches that filter mix.</h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-300">
                    Reset the filters or request a custom buyer signal if the market you need is narrower than the sample shelf.
                  </p>
                  <button type="button" onClick={resetFilters} className="btn-accent mx-auto mt-5 text-sm">
                    Reset filters
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section id="signal-packs" className="py-14 md:py-20">
        <div className="container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Featured listing section</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Signal Packs Worth Looking At</h2>
              <p className="mt-4 text-base leading-7 text-ink-200">
                These three paths show the core marketplace model: ecommerce demand, local business lead leaks, and reviewed mortgage interest.
              </p>
            </div>
            <Link href="/build-my-system" className="btn-ghost justify-center text-sm">
              Build My Lead Machine
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {featuredListings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => openListing(listing, "featured")}
                className="lead-shell min-h-80 p-5 text-left transition hover:-translate-y-1 hover:border-cyan-300/35"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">{listing.industry}</p>
                    <h3 className="mt-2 text-2xl font-black leading-tight text-white">{listing.title}</h3>
                  </div>
                  <LeadScoreBadge score={listing.leadScore} label="Score" className="min-w-[4.75rem]" />
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-200">{listing.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <ConfidenceLabel level={listing.confidence} label={listing.confidenceLabel} />
                  <SourceProofChip label={listing.sourceProofStatus} />
                </div>
                <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-ink-400">Best buyer</p>
                <p className="mt-1 text-sm leading-6 text-white">{listing.bestBuyer}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-ink-900/45 py-14 md:py-20">
        <div className="container">
          <div className="lead-shell p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Buyer disclaimer</p>
                <h2 className="mt-2 text-2xl font-black text-white">Reviewed before release.</h2>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-ink-100 md:text-base md:leading-7">
                  Every profile is reviewed for source proof, permission status, suppression status, and buyer use case before release.
                  Public previews do not reveal sensitive personal information.
                </p>
              </div>
              <Link href="/privacy-center" className="btn-ghost justify-center text-sm">
                Review Controls
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {selectedListing ? (
        <ListingPreviewModal
          listing={selectedListing}
          requestType={requestType}
          onClose={closeModal}
          onRequestTypeChange={setRequestType}
          onWatchlist={() => addToWatchlist(selectedListing)}
          watchlisted={watchlist.has(selectedListing.id)}
        />
      ) : null}
    </main>
  );
}

function MarketplaceCard({
  listing,
  watchlisted,
  onOpen,
  onRequest,
  onExclusive,
  onWatchlist,
}: {
  listing: MarketplaceListing;
  watchlisted: boolean;
  onOpen: () => void;
  onRequest: (type: RequestType) => void;
  onExclusive: () => void;
  onWatchlist: () => void;
}) {
  const exclusiveEnabled = canRequestExclusive(listing);
  return (
    <article className="lead-shell flex min-h-[35rem] flex-col p-5">
      <button type="button" className="text-left" onClick={onOpen} aria-label={`Preview ${listing.title}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-cyan-300">{listing.category}</p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-white">{listing.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-300">{listing.summary}</p>
          </div>
          <LeadScoreBadge score={listing.leadScore} className="min-w-[4.75rem]" />
        </div>
      </button>

      <div className="mt-5 flex flex-wrap gap-2">
        <ConfidenceLabel level={listing.confidence} label={listing.confidenceLabel} />
        <SourceProofChip label={listing.sourceProofStatus} />
        <SuppressionStatusBadge status={listing.suppressionStatus} />
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-accent-300/25 bg-accent-300/10 px-2.5 text-xs font-extrabold text-accent-100">
          <Crown className="h-3.5 w-3.5" />
          {accessStateLabel(listing)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <SignalFact label="Vertical" value={listing.vertical} />
        <SignalFact label="Record count" value={listing.recordCount} />
        <SignalFact label="Source type" value={listing.sourceType} />
        <SignalFact label="Freshness date" value={listing.freshnessDate} icon={<CalendarClock className="h-4 w-4 text-cyan-300" />} />
        <SignalFact label="Buyer use case" value={listing.buyerUseCase} />
        <SignalFact label="Best buyer" value={listing.bestBuyer} />
        <SignalFact label="Price" value={listing.priceLabel} />
        <SignalFact label="Release" value={listing.releaseMode} />
        <SignalFact label="Access model" value={accessStateLabel(listing)} />
        <SignalFact label="Seats" value={listing.maxBuyers ? `${listing.currentBuyerCount || 0} / ${listing.maxBuyers}` : listing.currentBuyerCount ? `${listing.currentBuyerCount} active buyers` : "No active buyer lock"} />
        <SignalFact label="Compliance" value={listing.complianceStatus} />
        <SignalFact label="Suppression" value={statusText(listing.suppressionStatus)} />
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onOpen} className="btn-ghost justify-center text-sm">
          <Eye className="h-4 w-4" />
          Preview
        </button>
        <Link href={`/marketplace/${listing.id}/sample`} className="btn-ghost justify-center text-sm">
          Get Sample
        </Link>
        <Link
          href={`/checkout/listing_access/${listing.id}`}
          onClick={() => trackMarketplaceEvent("checkout_started", {
            listing_id: listing.id,
            category: listing.category,
            vertical: listing.industry,
            checkout_type: "listing_access",
            status: derivedListingStatus(listing),
          })}
          className="btn-accent justify-center text-sm"
        >
          Buy Access
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/marketplace/${listing.id}/exclusive`}
          onClick={onExclusive}
          aria-disabled={!exclusiveEnabled}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition",
            exclusiveEnabled
              ? "border-accent-300/35 bg-accent-300/10 text-accent-100 hover:bg-accent-300/15"
              : "pointer-events-none border-white/10 bg-white/[0.025] text-ink-500",
          )}
        >
          <Crown className="h-4 w-4" />
          {exclusiveCtaLabel(listing)}
        </Link>
        <button type="button" onClick={onWatchlist} className="btn-ghost justify-center text-sm">
          <BookmarkPlus className="h-4 w-4" />
          {watchlisted ? "Watchlisted" : "Watchlist"}
        </button>
      </div>
    </article>
  );
}

function ListingPreviewModal({
  listing,
  requestType,
  watchlisted,
  onClose,
  onRequestTypeChange,
  onWatchlist,
}: {
  listing: MarketplaceListing;
  requestType: RequestType | null;
  watchlisted: boolean;
  onClose: () => void;
  onRequestTypeChange: (type: RequestType | null) => void;
  onWatchlist: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/72 px-4 py-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="marketplace-preview-title">
      <div className="mx-auto max-w-6xl rounded-xl border border-white/12 bg-[#050918] shadow-2xl shadow-black/60">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#050918]/95 p-4 backdrop-blur md:p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Listing preview</p>
            <h2 id="marketplace-preview-title" className="mt-1 text-2xl font-black text-white md:text-4xl">
              {listing.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-ink-100 hover:border-cyan-300/40 hover:text-white" aria-label="Close listing preview">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="lead-panel p-5">
                <p className="text-sm leading-7 text-ink-100">{listing.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <ConfidenceLabel level={listing.confidence} label={listing.confidenceLabel} />
                  <SourceProofChip label={listing.sourceProofStatus} />
                  <SuppressionStatusBadge status={listing.suppressionStatus} />
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-accent-300/25 bg-accent-300/10 px-2.5 text-xs font-extrabold text-accent-100">
                    <Crown className="h-3.5 w-3.5" />
                    {accessStateLabel(listing)}
                  </span>
                </div>
              </div>
              <LeadScoreBadge score={listing.leadScore} className="min-w-[6rem]" />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <SignalFact label="Category" value={listing.category} />
              <SignalFact label="Vertical" value={listing.vertical} />
              <SignalFact label="Source type" value={listing.sourceType} />
              <SignalFact label="Review status" value={listing.reviewStatus} />
              <SignalFact label="Buyer use case" value={listing.buyerUseCase} />
              <SignalFact label="Best buyer" value={listing.bestBuyer} />
              <SignalFact label="Access model" value={accessStateLabel(listing)} />
              <SignalFact label="Exclusive territory" value={listing.exclusiveTerritory || "Reviewed by request"} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <PreviewList title="Sample fields included" icon={<FileCheck2 className="h-5 w-5 text-lead-400" />} items={listing.sampleFields} />
              <PreviewList title="Hidden until access is approved" icon={<LockKeyhole className="h-5 w-5 text-accent-300" />} items={listing.hiddenUntilApproved} />
              <PreviewList title="Source proof examples" icon={<ShieldCheck className="h-5 w-5 text-cyan-300" />} items={listing.sourceProofExamples} />
            </div>

            <div className="lead-panel mt-5 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Suppression note</p>
              <p className="mt-2 text-sm leading-6 text-ink-100">{listing.suppressionNote}</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={`/marketplace/${listing.id}/sample`} className="btn-ghost justify-center text-sm">
                Get Sample
              </Link>
              <Link
                href={`/checkout/listing_access/${listing.id}`}
                onClick={() => trackMarketplaceEvent("checkout_started", {
                  listing_id: listing.id,
                  category: listing.category,
                  vertical: listing.industry,
                  checkout_type: "listing_access",
                  status: derivedListingStatus(listing),
                })}
                className="btn-accent justify-center text-sm"
              >
                Buy Full Access
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/marketplace/${listing.id}/exclusive`}
                onClick={() => trackMarketplaceEvent("exclusive_request_started", {
                  listing_id: listing.id,
                  category: listing.category,
                  vertical: listing.industry,
                  access_model: derivedAccessModel(listing),
                  status: derivedListingStatus(listing),
                })}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition",
                  canRequestExclusive(listing)
                    ? "border-accent-300/35 bg-accent-300/10 text-accent-100 hover:bg-accent-300/15"
                    : "pointer-events-none border-white/10 bg-white/[0.025] text-ink-500",
                )}
              >
                <Crown className="h-4 w-4" />
                {exclusiveCtaLabel(listing)}
              </Link>
              <button type="button" onClick={onWatchlist} className="btn-ghost justify-center text-sm">
                <BookmarkPlus className="h-4 w-4" />
                {watchlisted ? "Watchlisted" : "Add To Watchlist"}
              </button>
            </div>
          </div>

          <aside className="lead-shell p-4">
            {requestType ? (
              <BuyerRequestForm listing={listing} requestType={requestType} />
            ) : (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-2xl font-black text-white">Pick an access path.</h3>
                <p className="mt-3 text-sm leading-6 text-ink-200">
                  Samples are limited previews. Full access is review-gated and depends on intended use, category fit, compliance status, and suppression checks.
                </p>
                <div className="mt-5 grid gap-3">
                  <Link href={`/marketplace/${listing.id}/sample`} className="btn-ghost justify-center text-sm">
                    Get Sample
                  </Link>
                  <Link
                    href={`/checkout/listing_access/${listing.id}`}
                    onClick={() => trackMarketplaceEvent("checkout_started", {
                      listing_id: listing.id,
                      category: listing.category,
                      vertical: listing.industry,
                      checkout_type: "listing_access",
                      status: derivedListingStatus(listing),
                    })}
                    className="btn-accent justify-center text-sm"
                  >
                    Buy Full Access
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function BuyerRequestForm({ listing, requestType }: { listing: MarketplaceListing; requestType: RequestType }) {
  const [status, setStatus] = useState<RequestFormStatus>({ state: "idle", message: "" });
  const isAccess = requestType === "access";

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus({ state: "saving", message: "Saving the buyer request for review." });

    const form = new FormData(formElement);
    const payload = {
      requestType,
      listingId: listing.id,
      listingTitle: listing.title,
      category: listing.category,
      vertical: listing.industry,
      sourcePath: safeSourcePath(),
      name: stringFromForm(form, "name"),
      email: stringFromForm(form, "email"),
      phone: stringFromForm(form, "phone"),
      company: stringFromForm(form, "company"),
      website: stringFromForm(form, "website"),
      buyerType: stringFromForm(form, "buyerType"),
      industry: stringFromForm(form, "industry"),
      leadNeed: stringFromForm(form, "leadNeed"),
      monthlyBudgetRange: stringFromForm(form, "monthlyBudgetRange"),
      speed: stringFromForm(form, "speed"),
      intendedUse: stringFromForm(form, "intendedUse"),
      industryServed: stringFromForm(form, "industryServed"),
      geographyServed: stringFromForm(form, "geographyServed"),
      accessPreference: stringFromForm(form, "accessPreference"),
      notes: stringFromForm(form, "notes"),
      consentAccepted: form.get("consentAccepted") === "on",
      reviewGatedAccepted: !isAccess || form.get("reviewGatedAccepted") === "on",
    };

    try {
      const buyerPortalPayload = {
        listingSlug: listing.id,
        listingTitle: listing.title,
        category: listing.category,
        requestType,
        message: payload.notes,
        intendedUse: isAccess ? payload.intendedUse : payload.leadNeed,
        budgetRange: payload.monthlyBudgetRange,
        urgency: isAccess ? payload.accessPreference : payload.speed,
      };

      let response = await fetch("/api/buyer/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buyerPortalPayload),
      });
      let result = (await response.json().catch(() => ({}))) as { error?: string; persisted?: boolean; requestId?: string; request?: { id?: string } };

      if (response.status === 401) {
        response = await fetch("/api/leadflow/buyer-requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        result = (await response.json().catch(() => ({}))) as { error?: string; persisted?: boolean; requestId?: string; request?: { id?: string } };
      }

      if (!response.ok) {
        throw new Error(result.error || "Buyer request failed.");
      }

      const savedToBuyerPortal = Boolean(result.request?.id);
      const eventName = isAccess ? "access_request_submitted" : "sample_request_submitted";
      trackMarketplaceEvent(eventName, {
        listing_id: listing.id,
        category: listing.category,
        vertical: listing.industry,
        lead_score: listing.leadScore,
        request_type: requestType,
        persisted: savedToBuyerPortal || Boolean(result.persisted),
      });

      formElement.reset();
      setStatus({
        state: "success",
        message: savedToBuyerPortal
          ? "Request attached to your buyer account for review."
          : result.persisted
            ? "Request saved for review. LeadFlow will check fit, proof, suppression, and release path before access."
            : "Request captured in safe placeholder mode. Add Supabase credentials to persist it live.",
      });
    } catch (error: unknown) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Buyer request failed.",
      });
    }
  }

  return (
    <form onSubmit={submitRequest} className="space-y-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
          {isAccess ? "Request full access" : "Request sample"}
        </p>
        <h3 className="mt-1 text-2xl font-black text-white">{listing.title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-300">
          {isAccess
            ? "Full access is reviewed before release. Tell us the use case and the access lane you want."
            : "Samples are limited and proof-first. Tell us what kind of lead signal you are actually trying to buy."}
        </p>
      </div>

      <div className="grid gap-3">
        <FormField label="Name" name="name" autoComplete="name" required />
        <FormField label="Email" name="email" type="email" autoComplete="email" required />
        <FormField label={isAccess ? "Phone" : "Phone optional"} name="phone" type="tel" autoComplete="tel" required={isAccess} />
        <FormField label="Company" name="company" autoComplete="organization" required />
        <FormField label="Website" name="website" type="url" placeholder="https://example.com" />
        {isAccess ? (
          <>
            <FormTextArea label="Intended use" name="intendedUse" required placeholder="How would you use this signal product if access is approved?" />
            <FormField label="Industry served" name="industryServed" required />
            <FormField label="Geography served" name="geographyServed" required />
            <FormSelect label="Budget range" name="monthlyBudgetRange" required options={["Under $500", "$500 to $1,500", "$1,500 to $5,000", "$5,000 to $10,000", "$10,000+"]} />
            <FormSelect label="Shared or exclusive access" name="accessPreference" required options={["Shared access", "Exclusive request", "Named-seller route", "Aggregated insight only"]} />
          </>
        ) : (
          <>
            <FormSelect label="Buyer type" name="buyerType" required options={buyerTypeOptions} />
            <FormSelect label="Industry" name="industry" required options={industryOptions} />
            <FormTextArea label="What kind of leads do you want?" name="leadNeed" required placeholder="Describe the buyer, source, region, or problem you want signals for." />
            <FormSelect label="Monthly budget range" name="monthlyBudgetRange" required options={["Under $500", "$500 to $1,500", "$1,500 to $5,000", "$5,000 to $10,000", "$10,000+"]} />
            <FormSelect label="How fast do you need leads?" name="speed" required options={["This week", "This month", "Building pipeline", "Researching first"]} />
          </>
        )}
        <FormTextArea label="Notes" name="notes" placeholder="Anything we should check before review?" />
      </div>

      <label className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
        <input name="consentAccepted" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" />
        <span>I agree that LeadFlow Pro may review this buyer request and contact me about access to the selected signal product.</span>
      </label>

      {isAccess ? (
        <label className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
          <input name="reviewGatedAccepted" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" />
          <span>I understand access is review-gated and can be denied, limited, aggregated, or routed differently based on proof, compliance, suppression, and intended use.</span>
        </label>
      ) : null}

      <button type="submit" disabled={status.state === "saving"} className="btn-accent min-h-12 w-full justify-center text-sm">
        {status.state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {isAccess ? "Submit Access Request" : "Submit Sample Request"}
      </button>

      {status.message ? (
        <p className={`rounded-lg border p-3 text-sm leading-6 ${
          status.state === "error"
            ? "border-red-300/30 bg-red-300/10 text-red-100"
            : status.state === "success"
              ? "border-lead-300/30 bg-lead-300/10 text-lead-100"
              : "border-white/10 bg-white/[0.035] text-ink-100"
        }`}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}

function FormField({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
      />
    </label>
  );
}

function FormSelect({ label, name, options, required }: { label: string; name: string; options: string[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
      >
        <option value="" disabled>
          Choose one
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormTextArea({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <textarea
        name={name}
        required={required}
        rows={4}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
      />
    </label>
  );
}

function PreviewList({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  return (
    <div className="lead-panel p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-black text-white">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-ink-200">
            <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignalFact({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 flex items-start gap-2 text-sm leading-6 text-ink-100">
        {icon}
        <span>{value}</span>
      </p>
    </div>
  );
}

function statusText(status: SignalStatus) {
  if (status === "sampleAvailable") return "Sample available";
  if (status === "review") return "In review";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function stringFromForm(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
