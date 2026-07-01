import "server-only";

import {
  buyerAccountIsRestricted,
  getBuyerPortalData,
  trackBuyerEvent,
  type BuyerAccount,
  type BuyerEntitlement,
} from "@/lib/buyer-portal";
import {
  buildProtectedLeadProfile,
  getLeadProfileDetail,
  type ProtectedLeadProfileDetail,
} from "@/lib/lead-profile-detail";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow, patchLeadFlowRows } from "@/lib/leadflow-data-api";

export type LeadProfileViewerRole = "admin" | "buyer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nullableUuid(value: string | null | undefined) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

export type ProtectedLeadProfileAccess =
  | {
      allowed: true;
      role: LeadProfileViewerRole;
      profile: ProtectedLeadProfileDetail;
      entitlement: BuyerEntitlement | null;
      buyerAccount: BuyerAccount | null;
      actorUserId: string | null;
    }
  | {
      allowed: false;
      reason:
        | "not_found"
        | "missing_auth_config"
        | "not_authenticated"
        | "invalid_session"
        | "buyer_profile_required"
        | "buyer_restricted"
        | "no_entitlement";
      profile: ProtectedLeadProfileDetail | null;
    };

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function entitlementMatchesProfile(entitlement: BuyerEntitlement, profileId: string) {
  if (entitlement.status !== "active") return false;
  if (entitlement.expires_at && new Date(entitlement.expires_at).getTime() <= Date.now()) return false;
  if (entitlement.lead_profile_id === profileId) return true;
  if (entitlement.listing_slug === profileId) return true;
  if (entitlement.listing_id === profileId) return true;

  return (
    metadataString(entitlement.metadata, "profile_slug") === profileId ||
    metadataString(entitlement.metadata, "lead_profile_slug") === profileId ||
    metadataString(entitlement.metadata, "listing_slug") === profileId
  );
}

export function entitlementAllowsExport(entitlement: BuyerEntitlement | null) {
  if (!entitlement || entitlement.status !== "active") return false;
  return ["exclusive", "full_profile", "raw_export", "premium"].includes(entitlement.access_level);
}

export async function getProtectedLeadProfileAccess(
  profileId: string,
  options: { isAdmin?: boolean; adminUserId?: string | null } = {},
): Promise<ProtectedLeadProfileAccess> {
  const baseProfile = getLeadProfileDetail(profileId);
  const profile = baseProfile ? buildProtectedLeadProfile(baseProfile) : null;

  if (!profile) {
    return { allowed: false, reason: "not_found", profile: null };
  }

  if (options.isAdmin) {
    return {
      allowed: true,
      role: "admin",
      profile,
      entitlement: null,
      buyerAccount: null,
      actorUserId: options.adminUserId || null,
    };
  }

  const buyerData = await getBuyerPortalData();
  if (!buyerData.authenticated) {
    const reason =
      buyerData.reason === "missing_config"
        ? "missing_auth_config"
        : buyerData.reason === "invalid_session"
          ? "invalid_session"
          : "not_authenticated";
    return { allowed: false, reason, profile };
  }

  if (!buyerData.account) return { allowed: false, reason: "buyer_profile_required", profile };
  if (buyerAccountIsRestricted(buyerData.account)) return { allowed: false, reason: "buyer_restricted", profile };

  const entitlement = buyerData.entitlements.find((item) => entitlementMatchesProfile(item, profile.id)) || null;
  if (!entitlement) return { allowed: false, reason: "no_entitlement", profile };

  return {
    allowed: true,
    role: "buyer",
    profile,
    entitlement,
    buyerAccount: buyerData.account,
    actorUserId: buyerData.user.id,
  };
}

export async function trackLeadProfileEvent(
  eventName: string,
  input: {
    profileId: string;
    role: LeadProfileViewerRole | "public";
    buyerAccountId?: string | null;
    entitlementId?: string | null;
    action?: string;
    tab?: string;
    allowed?: boolean;
    rawRecordsReturned?: boolean;
  },
) {
  if (!hasLeadFlowDataApiConfig()) return { skipped: true };

  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: input.role === "admin" ? "admin" : input.role === "buyer" ? "buyer" : "profile_access",
    tool_slug: "lead_profile_detail",
    source_path: `/lead-profile/${input.profileId}`,
    properties: {
      profile_id: input.profileId,
      role: input.role,
      buyer_account_id: input.buyerAccountId || null,
      entitlement_id: input.entitlementId || null,
      action: input.action || null,
      tab: input.tab || null,
      allowed: input.allowed ?? true,
      raw_records_returned: input.rawRecordsReturned ?? false,
    },
  });
  return { skipped: false };
}

export async function auditLeadProfileAccess(input: {
  profileId: string;
  actorUserId: string | null;
  actorType: LeadProfileViewerRole;
  buyerAccountId?: string | null;
  entitlementId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  if (!hasLeadFlowDataApiConfig()) return { skipped: true };

  await insertLeadFlowRow("audit_log", {
    actor_user_id: input.actorUserId,
    actor_type: input.actorType,
    action: input.action,
    object_schema: "leadflow",
    object_table: "lead_profiles",
    object_id: nullableUuid(input.profileId),
    lead_profile_id: nullableUuid(input.profileId),
    buyer_account_id: input.buyerAccountId || null,
    details: {
      entitlement_id: input.entitlementId || null,
      profile_slug: input.profileId,
      source_path: `/lead-profile/${input.profileId}`,
      raw_records_returned: false,
      ...(input.details || {}),
    },
  });
  return { skipped: false };
}

export async function persistAdminLeadProfileAction(profileId: string, action: string) {
  if (!hasLeadFlowDataApiConfig()) return { persisted: false };

  const patch =
    action === "approve"
      ? { review_status: "approved", status: "available", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : action === "reject"
        ? { review_status: "rejected", status: "draft", updated_at: new Date().toISOString() }
        : action === "needs_review"
          ? { review_status: "review", updated_at: new Date().toISOString() }
          : action === "suppress"
            ? { review_status: "suppressed", status: "suppressed", suppression_status: "suppressed", updated_at: new Date().toISOString() }
            : action === "resolve_suppression"
              ? { review_status: "review", status: "sample_available", suppression_status: "unchecked", updated_at: new Date().toISOString() }
              : action === "mark_verified"
                ? { source_proof_status: "approved", last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                : { updated_at: new Date().toISOString() };

  await patchLeadFlowRows("lead_profiles", { slug: `eq.${profileId}` }, patch).catch(async () => {
    await patchLeadFlowRows("lead_profiles", { id: `eq.${profileId}` }, patch);
  });

  return { persisted: true };
}

export async function trackBuyerLeadProfileAction(
  eventName: string,
  input: {
    profileId: string;
    buyerAccountId: string;
    entitlementId?: string | null;
    action: string;
    details?: Record<string, unknown>;
  },
) {
  await Promise.all([
    trackBuyerEvent(eventName, {
      buyer_account_id: input.buyerAccountId,
      profile_id: input.profileId,
      entitlement_id: input.entitlementId || null,
      action: input.action,
      ...(input.details || {}),
    }).catch(() => null),
    trackLeadProfileEvent(eventName, {
      profileId: input.profileId,
      role: "buyer",
      buyerAccountId: input.buyerAccountId,
      entitlementId: input.entitlementId || null,
      action: input.action,
      rawRecordsReturned: false,
    }).catch(() => null),
  ]);
}
