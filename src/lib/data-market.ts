export type ListTypeId =
  | "local_business_owners"
  | "ecommerce_stores"
  | "ai_saas_companies"
  | "social_intent_posts"
  | "creator_seller_profiles"
  | "funding_hiring_signals"
  | "datasets_and_databases"
  | "domains_and_websites"
  | "local_service_routes";

export type SourceLaneId =
  | "owner_submitted_listings"
  | "websites"
  | "directories"
  | "marketplaces"
  | "social_public_posts"
  | "launch_databases"
  | "job_posts"
  | "public_business_records"
  | "verified_asset_docs";

export type RequestMode = "buy" | "list";

export type DeliverableId =
  | "public_listing"
  | "csv"
  | "profile_vault"
  | "weekly_drop"
  | "brokered_intro"
  | "custom_brief"
  | "data_room";

export interface CatalogItem<T extends string = string> {
  id: T;
  label: string;
  description: string;
  scoreWeight: number;
}

export const LIST_TYPES: CatalogItem<ListTypeId>[] = [
  {
    id: "local_business_owners",
    label: "Business owner lead lists",
    description: "Owners and operators with public websites, directories, reviews, hiring, or growth signals.",
    scoreWeight: 12
  },
  {
    id: "ecommerce_stores",
    label: "Ecommerce stores and assets",
    description: "Stores, product catalogs, storefront operators, platform clues, offer structure, and vendor-fit signals.",
    scoreWeight: 14
  },
  {
    id: "ai_saas_companies",
    label: "AI tools and SaaS assets",
    description: "AI tools, SaaS products, app directories, integrations, launch data, and founder signals.",
    scoreWeight: 15
  },
  {
    id: "social_intent_posts",
    label: "Demand-signal feeds",
    description: "Public posts where people say what they need, what broke, or what they are shopping for.",
    scoreWeight: 16
  },
  {
    id: "creator_seller_profiles",
    label: "Creator channels and operator profiles",
    description: "Public creator, reseller, agency, consultant, newsletter, and marketplace operator profiles.",
    scoreWeight: 10
  },
  {
    id: "funding_hiring_signals",
    label: "Growth and hiring opportunity lists",
    description: "Teams showing budget, momentum, expansion, new role creation, or go-to-market pressure.",
    scoreWeight: 13
  },
  {
    id: "datasets_and_databases",
    label: "Datasets and databases",
    description: "Submitted or public-source datasets with clear fields, provenance, and buyer use cases.",
    scoreWeight: 17
  },
  {
    id: "domains_and_websites",
    label: "Domains and websites",
    description: "Web properties, domains, traffic assets, directories, communities, and content sites.",
    scoreWeight: 11
  },
  {
    id: "local_service_routes",
    label: "Local service routes",
    description: "Service territories, routes, vendor books, appointment demand, and local operating assets.",
    scoreWeight: 12
  }
];

export const SOURCE_LANES: CatalogItem<SourceLaneId>[] = [
  {
    id: "owner_submitted_listings",
    label: "Submitted lead source",
    description: "A user supplies the lead source, proof, description, screenshots, and allowed buyer contact route.",
    scoreWeight: 11
  },
  {
    id: "websites",
    label: "Company websites",
    description: "Homepages, pricing, products, teams, forms, blogs, and changelogs.",
    scoreWeight: 10
  },
  {
    id: "directories",
    label: "Public directories",
    description: "Business directories, category indexes, review pages, and public profile pages.",
    scoreWeight: 8
  },
  {
    id: "marketplaces",
    label: "Marketplaces",
    description: "Ecommerce, product, service, and app marketplaces with public profile pages.",
    scoreWeight: 9
  },
  {
    id: "social_public_posts",
    label: "Public social posts",
    description: "Public posts, bios, threads, comments, and demand phrases where platform rules allow review.",
    scoreWeight: 11
  },
  {
    id: "launch_databases",
    label: "Launch databases",
    description: "AI, SaaS, startup, product, and app launch indexes.",
    scoreWeight: 10
  },
  {
    id: "job_posts",
    label: "Job posts",
    description: "Hiring pages and public job posts that signal spend, growth, or operational gaps.",
    scoreWeight: 7
  },
  {
    id: "public_business_records",
    label: "Public business records",
    description: "Public business filings and records where lawful and relevant.",
    scoreWeight: 6
  },
  {
    id: "verified_asset_docs",
    label: "Verified asset docs",
    description: "Screenshots, exports, analytics summaries, source proof, and submitted documentation.",
    scoreWeight: 12
  }
];

export const DELIVERABLES: CatalogItem<DeliverableId>[] = [
  {
    id: "public_listing",
    label: "Lead intake profile",
    description: "A searchable lead-source profile with score, proof notes, inquiry route, and review status.",
    scoreWeight: 8
  },
  {
    id: "csv",
    label: "CSV data or lead drop",
    description: "A source-linked spreadsheet with tags, confidence, and notes.",
    scoreWeight: 5
  },
  {
    id: "profile_vault",
    label: "Profile vault",
    description: "Searchable saved profiles with evidence notes and scoring.",
    scoreWeight: 12
  },
  {
    id: "weekly_drop",
    label: "Weekly lead drop",
    description: "Recurring researched list around the same source map.",
    scoreWeight: 10
  },
  {
    id: "brokered_intro",
    label: "Qualified lead handoff",
    description: "LeadFlow qualifies interest and routes buyer inquiries to the right contact or workflow.",
    scoreWeight: 12
  },
  {
    id: "custom_brief",
    label: "Custom intelligence brief",
    description: "A human-readable market brief with the leads and the reason to act.",
    scoreWeight: 14
  },
  {
    id: "data_room",
    label: "Managed lead workspace",
    description: "A reviewed workspace with lead details, sample records, proof notes, and fulfillment steps.",
    scoreWeight: 15
  }
];

export const REGIONS = [
  "United States",
  "Texas",
  "East Texas",
  "Local city or county",
  "North America",
  "Global English-language"
];

export const MUST_HAVE_FIELDS = [
  "Source URL",
  "Lead/source title",
  "Asking price or budget",
  "Company name",
  "Source contact",
  "Source proof",
  "Public profile URL",
  "Category",
  "Intent reason",
  "Confidence score",
  "Owner or decision-maker clue",
  "Website",
  "Social profile",
  "Email/contact page",
  "Last-seen timestamp",
  "Suppression status"
];

export interface DataListSelection {
  requestMode?: RequestMode;
  listTypes: string[];
  sourceLanes: string[];
  regions: string[];
  volume: number;
  deliverable: string;
  urgency: string;
  mustHaveFields: string[];
}

export interface DataScore {
  intentScore: number;
  sourceDepthScore: number;
  freshnessScore: number;
  complianceScore: number;
  totalScore: number;
  estimatedPriceUsd: number;
  priceFloorUsd: number;
  notes: string[];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function estimateDataProduct(selection: DataListSelection): DataScore {
  const requestMode = selection.requestMode ?? "buy";
  const isSourceSubmission = requestMode === "list";
  const listWeight = selection.listTypes.reduce((sum, id) => {
    return sum + (LIST_TYPES.find((item) => item.id === id)?.scoreWeight ?? 5);
  }, 0);

  const sourceWeight = selection.sourceLanes.reduce((sum, id) => {
    return sum + (SOURCE_LANES.find((item) => item.id === id)?.scoreWeight ?? 4);
  }, 0);

  const deliverableWeight =
    DELIVERABLES.find((item) => item.id === selection.deliverable)?.scoreWeight ?? 5;

  const sourceDepthScore = clampScore(
    35 +
      sourceWeight * 4 +
      selection.regions.length * 3 +
      (selection.sourceLanes.includes("owner_submitted_listings") ? 6 : 0) +
      (selection.sourceLanes.includes("verified_asset_docs") ? 8 : 0)
  );
  const intentScore = clampScore(
    30 +
      listWeight * 3 +
      deliverableWeight * 2 +
      (isSourceSubmission ? 4 : 0)
  );
  const freshnessScore = clampScore(
    selection.urgency === "rush"
      ? 88
      : selection.urgency === "weekly"
        ? 82
        : 72
  );

  const complianceScore = clampScore(
    94 -
      Math.max(0, selection.sourceLanes.length - 4) * 4 -
      (selection.listTypes.includes("social_intent_posts") ? 6 : 0) -
      (isSourceSubmission ? 2 : 0)
  );

  const totalScore = clampScore(
    intentScore * 0.34 +
      sourceDepthScore * 0.28 +
      freshnessScore * 0.18 +
      complianceScore * 0.2
  );

  const normalizedVolume = Math.max(50, Math.min(100_000, selection.volume || 500));
  const sourceSubmissionBase =
    selection.deliverable === "public_listing"
      ? 0
      : selection.deliverable === "brokered_intro"
        ? 99
        : selection.deliverable === "data_room"
          ? 249
          : 49;
  const buyerBase = selection.deliverable === "profile_vault" ? 149 : 49;
  const base = isSourceSubmission ? sourceSubmissionBase : buyerBase;
  const volumeCharge = isSourceSubmission ? Math.ceil(normalizedVolume / 1000) * 10 : Math.ceil(normalizedVolume / 250) * 18;
  const sourceCharge = Math.max(0, selection.sourceLanes.length - 2) * 35;
  const listCharge = Math.max(0, selection.listTypes.length - 1) * 45;
  const fieldCharge = Math.max(0, selection.mustHaveFields.length - 5) * 8;
  const urgencyCharge = selection.urgency === "rush" ? 150 : selection.urgency === "weekly" ? 75 : 0;
  const sourceReviewCharge = isSourceSubmission && selection.deliverable !== "public_listing" ? 75 : 0;

  const estimatedPriceUsd = Math.max(
    base,
    base + volumeCharge + sourceCharge + listCharge + fieldCharge + urgencyCharge + sourceReviewCharge
  );

  const notes = [
    totalScore >= 80
      ? isSourceSubmission
        ? "Strong source candidate: clear category, proof path, and buyer signal."
        : "Strong list candidate: enough sources and intent to package."
      : isSourceSubmission
        ? "Needs a tighter proof package before it becomes a premium lead source."
        : "Needs a tighter source map before it becomes a premium list.",
    complianceScore < 85
      ? "Public social sources need a stricter review and suppression pass."
      : "Compliance posture is clean for a public or permissioned-source request.",
    normalizedVolume > 5_000
      ? isSourceSubmission
        ? "Large asset or dataset should use a managed lead workspace before buyer release."
        : "Large volume request should be batched before delivery."
      : isSourceSubmission
        ? "Source size is reasonable for the first marketplace package."
        : "Volume is reasonable for a first lead drop."
  ];

  return {
    intentScore,
    sourceDepthScore,
    freshnessScore,
    complianceScore,
    totalScore,
    estimatedPriceUsd,
    priceFloorUsd: base,
    notes
  };
}

export function labelFor(items: CatalogItem[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id;
}
