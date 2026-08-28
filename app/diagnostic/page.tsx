import type { Metadata } from "next";
import type { DiagnosticAnswers } from "@/lib/businessDiagnostic";
import BusinessDiagnosticForm from "./BusinessDiagnosticForm";

export const metadata: Metadata = {
  title: "Business Growth Diagnostic | The LeadFlow Pro",
  description:
    "Share what is working, what is leaking, and what you want the business to do next so The LeadFlow Pro can prepare a sharper recommendation.",
  alternates: { canonical: "https://www.theleadflowpro.com/diagnostic" },
  openGraph: {
    title: "Business Growth Diagnostic | The LeadFlow Pro",
    description:
      "Give us the business context behind the problem so we can map the right next move.",
    url: "https://www.theleadflowpro.com/diagnostic",
    siteName: "The LeadFlow Pro",
    type: "website",
  },
};

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 500) ?? "";
}

function allowed(value: string, choices: readonly string[]): string {
  return choices.includes(value) ? value : "";
}

const HELP_OPTIONS = [
  "website_repair",
  "new_website",
  "shopify_ecommerce",
  "lead_generation",
  "crm",
  "follow_up",
  "ai_agents",
  "ads",
  "social_media",
  "content",
  "analytics",
  "operations",
] as const;

export default async function DiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const params = await searchParams;
  const resumeToken = first(params.resume).slice(0, 300);
  const sourceChannel = first(params.source).slice(0, 100) || "website";
  const sourceDetail = first(params.ref).slice(0, 200);

  // Direct-share links may preselect harmless project context. Personal contact
  // information is deliberately never accepted from a query string.
  const initialAnswers: DiagnosticAnswers = {};
  const platform = allowed(first(params.platform), [
    "shopify",
    "wordpress",
    "wix",
    "squarespace",
    "webflow",
    "custom",
    "other",
    "unknown",
  ]);
  const websiteState = allowed(first(params.issue), [
    "no_site",
    "working",
    "needs_improvement",
    "partly_broken",
    "locked",
    "under_construction",
    "unknown",
  ]);
  const help = first(params.help)
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is (typeof HELP_OPTIONS)[number] =>
      HELP_OPTIONS.includes(item as (typeof HELP_OPTIONS)[number]),
    );

  if (platform) initialAnswers.website_platform = platform;
  if (websiteState) initialAnswers.website_state = websiteState;
  if (help.length) initialAnswers.help_categories = [...new Set(help)].slice(0, 8);

  return (
    <BusinessDiagnosticForm
      initialAnswers={initialAnswers}
      resumeToken={resumeToken}
      sourceChannel={sourceChannel}
      sourceDetail={sourceDetail}
      utm={{
        source: first(params.utm_source),
        medium: first(params.utm_medium),
        campaign: first(params.utm_campaign),
        content: first(params.utm_content),
        term: first(params.utm_term),
      }}
    />
  );
}
