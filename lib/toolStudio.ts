// Product and price source of truth for /go/tools and /api/checkout.
//
// The $97 offer is deliberately a paid blueprint, not an unlimited custom
// application. Production builds have bounded inputs, outputs, revisions,
// and integrations so product discovery does not turn into unpriced labor.

export type ToolBuildId = "tool_blueprint" | "quick_tool" | "tool_funnel";

export type ToolBuild = {
  id: ToolBuildId;
  name: string;
  priceUsd: number;
  description: string;
  bestFor: string;
  includes: string[];
  boundary: string;
  tag?: string;
};

export const TOOL_BUILDS: ToolBuild[] = [
  {
    id: "tool_blueprint",
    name: "Tool Blueprint",
    priceUsd: 97,
    description:
      "Turn one idea into a build-ready plan before paying for production.",
    bestFor: "You know the problem, but the inputs, outputs, and right first version are not clear yet.",
    includes: [
      "One 30-minute discovery call",
      "Input, output, and decision-logic map",
      "Lead-capture and follow-up recommendation",
      "One-page wireframe and written production quote",
    ],
    boundary:
      "This is the plan, not finished custom software. It keeps a $97 test from becoming an open-ended build.",
    tag: "START HERE",
  },
  {
    id: "quick_tool",
    name: "Quick Tool",
    priceUsd: 497,
    description:
      "Launch one focused calculator, quiz, estimator, checklist, or generator from a proven pattern.",
    bestFor: "You need one useful interaction that can live on an existing page and collect interest.",
    includes: [
      "One single-purpose interactive tool",
      "Up to five user inputs and one result screen",
      "Mobile styling matched to the approved brand",
      "Embed or stand-alone page, analytics event, and one correction round",
    ],
    boundary:
      "No account system, file upload, paid API, custom database, or multi-step automation in this scope.",
  },
  {
    id: "tool_funnel",
    name: "Tool Funnel",
    priceUsd: 997,
    description:
      "Pair the interactive tool with the page, form, alerts, and measurement needed to turn usage into leads.",
    bestFor: "You want a tool that earns attention and gives the business a clear follow-up opportunity.",
    includes: [
      "One calculator, quiz, estimator, assessment, or generator",
      "Landing page with offer, proof, and next step",
      "Name, phone, and email lead capture with consent controls",
      "Owner alert, lead-source tracking, analytics, and two correction rounds",
    ],
    boundary:
      "Ad spend, paid vendors, CRM subscriptions, complex uploads, memberships, and custom databases are quoted separately.",
    tag: "BEST FIRST BUILD",
  },
];

export type MonthlyMenuId =
  | "tool_care"
  | "follow_up_tuneup"
  | "content_refresh"
  | "seo_archive_batch"
  | "funnel_test";

export type MonthlyMenuItem = {
  id: MonthlyMenuId;
  name: string;
  priceUsd: number;
  description: string;
};

export const MONTHLY_MENU: MonthlyMenuItem[] = [
  {
    id: "tool_care",
    name: "Tool Care",
    priceUsd: 97,
    description: "Monitoring, one minor in-scope update, and a monthly performance note.",
  },
  {
    id: "follow_up_tuneup",
    name: "Follow-Up Tune-Up",
    priceUsd: 197,
    description: "Refresh one email, call, or owner-response sequence using the month's real questions.",
  },
  {
    id: "content_refresh",
    name: "Content Refresh",
    priceUsd: 197,
    description: "One new supporting article, landing-page section, or campaign content batch.",
  },
  {
    id: "seo_archive_batch",
    name: "Search + Archive Batch",
    priceUsd: 297,
    description: "Add and index one approved batch of niche records, resources, FAQs, or local pages.",
  },
  {
    id: "funnel_test",
    name: "Funnel Test",
    priceUsd: 297,
    description: "One measured offer, form, headline, or result-screen test with a written finding.",
  },
];

export type ToolStudioSelection = {
  buildId?: string | null;
  monthlyIds?: string[];
};

export type ToolStudioPrice = {
  build: ToolBuild | null;
  monthly: MonthlyMenuItem[];
  dueTodayUsd: number;
  renewsMonthlyUsd: number;
};

export function priceToolStudio(selection: ToolStudioSelection): ToolStudioPrice | null {
  const build = TOOL_BUILDS.find((item) => item.id === selection.buildId) ?? null;
  const requested = Array.isArray(selection.monthlyIds) ? selection.monthlyIds : [];
  const unique = [...new Set(requested)];
  const monthly = unique
    .map((id) => MONTHLY_MENU.find((item) => item.id === id))
    .filter((item): item is MonthlyMenuItem => !!item);

  if (unique.length !== monthly.length) return null;
  if (!build && monthly.length === 0) return null;

  const renewsMonthlyUsd = monthly.reduce((sum, item) => sum + item.priceUsd, 0);
  return {
    build,
    monthly,
    dueTodayUsd: (build?.priceUsd ?? 0) + renewsMonthlyUsd,
    renewsMonthlyUsd,
  };
}

export function findToolBuild(id: string) {
  return TOOL_BUILDS.find((item) => item.id === id) ?? null;
}

