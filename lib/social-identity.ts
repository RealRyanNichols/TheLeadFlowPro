import {
  LEADFLOW_META,
  leadFlowSupabaseRuntimeIssues,
} from "@/lib/metaCampaignGuard";

export const LEADFLOW_SOCIAL_PAGE_ID = LEADFLOW_META.pageId;

export type SocialRuntimeIdentityInput = {
  configuredPageId: string;
  supabaseUrl: string;
};

export type SocialPublishIdentityInput = SocialRuntimeIdentityInput & {
  postPageId: string;
  provider: string;
};

/**
 * The social publisher is a LeadFlow-only control plane. A similarly named
 * Page or Supabase project must never be treated as equivalent, even when an
 * environment variable was accidentally copied from another client.
 */
export function leadFlowSocialRuntimeIdentityIssues(
  input: SocialRuntimeIdentityInput,
): string[] {
  const issues = leadFlowSupabaseRuntimeIssues(input.supabaseUrl);
  if (input.configuredPageId !== LEADFLOW_SOCIAL_PAGE_ID) {
    issues.unshift(
      `Runtime Facebook Page ID must equal ${LEADFLOW_SOCIAL_PAGE_ID}; received ${input.configuredPageId || "<missing>"}`,
    );
  }
  return issues;
}

/** Re-check the stored row as part of every external Meta mutation. */
export function leadFlowSocialPublishIdentityIssues(
  input: SocialPublishIdentityInput,
): string[] {
  const issues = leadFlowSocialRuntimeIdentityIssues(input);
  if (input.provider !== "facebook") {
    issues.push(
      `Social post provider must equal facebook; received ${input.provider || "<missing>"}`,
    );
  }
  if (input.postPageId !== LEADFLOW_SOCIAL_PAGE_ID) {
    issues.push(
      `Stored social post Page ID must equal ${LEADFLOW_SOCIAL_PAGE_ID}; received ${input.postPageId || "<missing>"}`,
    );
  }
  return issues;
}
