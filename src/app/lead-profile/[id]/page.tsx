import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getAdminTokenSession } from "@/lib/admin-token";
import {
  auditLeadProfileAccess,
  getProtectedLeadProfileAccess,
  trackLeadProfileEvent,
} from "@/lib/protected-lead-profile";
import { LeadProfileDetailClient } from "./LeadProfileDetailClient";
import { ProtectedLeadProfileGate } from "./ProtectedLeadProfileGate";

export const dynamic = "force-dynamic";

type LeadProfilePageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Protected Lead Profile | The LeadFlow Pro",
    description: "Protected source-backed lead profile for approved buyers and admin users.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function LeadProfilePage({ params }: LeadProfilePageProps) {
  const adminSession = await getAdminTokenSession();
  const access = await getProtectedLeadProfileAccess(params.id, {
    isAdmin: Boolean(adminSession),
    adminUserId: adminSession?.userId || null,
  });

  if (!access.allowed && access.reason === "not_found") notFound();

  if (!access.allowed) {
    return (
      <>
        <Header />
        <ProtectedLeadProfileGate profile={access.profile} reason={access.reason} profileId={params.id} />
        <Footer />
      </>
    );
  }

  await Promise.all([
    trackLeadProfileEvent("lead_profile_viewed", {
      profileId: access.profile.id,
      role: access.role,
      buyerAccountId: access.buyerAccount?.id || null,
      entitlementId: access.entitlement?.id || null,
      rawRecordsReturned: false,
    }).catch(() => null),
    auditLeadProfileAccess({
      profileId: access.profile.id,
      actorUserId: access.actorUserId,
      actorType: access.role,
      buyerAccountId: access.buyerAccount?.id || null,
      entitlementId: access.entitlement?.id || null,
      action: "lead_profile.viewed",
      details: {
        profile_title: access.profile.title,
        access_level: access.entitlement?.access_level || "admin",
      },
    }).catch(() => null),
  ]);

  return (
    <>
      <Header />
      <LeadProfileDetailClient
        profile={access.profile}
        viewerRole={access.role}
        entitlementAccessLevel={access.entitlement?.access_level || null}
        exportAllowed={access.role === "admin" || Boolean(access.entitlement && access.profile.exportAllowed)}
      />
      <Footer />
    </>
  );
}
