import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, DatabaseZap, LockKeyhole, ShieldCheck } from "lucide-react";
import { LeadScoreBadge, SourceProofChip } from "@/components/leadflow-system";
import type { ProtectedLeadProfileDetail } from "@/lib/lead-profile-detail";

type ProtectedGateReason =
  | "not_found"
  | "missing_auth_config"
  | "not_authenticated"
  | "invalid_session"
  | "buyer_profile_required"
  | "buyer_restricted"
  | "no_entitlement";

const reasonCopy: Record<ProtectedGateReason, { title: string; body: string; ctaHref: string; ctaLabel: string }> = {
  not_found: {
    title: "This protected profile is not available.",
    body: "The profile may have been removed, suppressed, or moved back into review.",
    ctaHref: "/marketplace",
    ctaLabel: "Back to marketplace",
  },
  missing_auth_config: {
    title: "Buyer authentication is not configured yet.",
    body: "The protected profile shell is ready, but Supabase Auth keys need to be connected before buyers can log in and prove access.",
    ctaHref: "/marketplace",
    ctaLabel: "Back to marketplace",
  },
  not_authenticated: {
    title: "Log in to view protected profile intelligence.",
    body: "Full lead profiles are only visible after buyer login, account review, and an active entitlement for this exact signal.",
    ctaHref: "/login?mode=buyer",
    ctaLabel: "Log in as buyer",
  },
  invalid_session: {
    title: "Your buyer session needs a fresh login.",
    body: "This protects full lead records from stale sessions. Log back in, then open the approved profile from your buyer portal.",
    ctaHref: "/login?mode=buyer",
    ctaLabel: "Refresh login",
  },
  buyer_profile_required: {
    title: "Complete the buyer profile first.",
    body: "LeadFlow reviews buyer type, intended use, industry, service area, budget range, and consent before releasing profile access.",
    ctaHref: "/buyer/settings",
    ctaLabel: "Complete buyer profile",
  },
  buyer_restricted: {
    title: "This buyer account cannot view restricted profiles.",
    body: "Suspended or denied buyer accounts cannot access full lead records, request exports, or open protected profile intelligence.",
    ctaHref: "/buyer",
    ctaLabel: "Open buyer portal",
  },
  no_entitlement: {
    title: "Access to this profile is review-gated.",
    body: "You can browse public marketplace previews, but full proof, signal history, and buyer-use details require an active entitlement.",
    ctaHref: "/marketplace",
    ctaLabel: "Request access",
  },
};

export function ProtectedLeadProfileGate({
  profile,
  reason,
  profileId,
}: {
  profile: ProtectedLeadProfileDetail | null;
  reason: ProtectedGateReason;
  profileId: string;
}) {
  const copy = reasonCopy[reason];
  const requestHref = `/buy-leads?signal=${encodeURIComponent(profileId)}&request=access`;

  return (
    <main className="relative isolate overflow-hidden pb-24">
      <section className="relative border-b border-white/10 py-12 md:py-18">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(35,184,255,0.22),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(255,186,61,0.16),transparent_28%),linear-gradient(135deg,#030711_0%,#07101b_58%,#0f1007_100%)]" />
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.48fr)] lg:items-stretch">
            <section className="lead-shell p-6 md:p-8">
              <div className="flex flex-wrap gap-2">
                <SourceProofChip label="Protected intelligence" />
                <SourceProofChip label="Entitlement required" verified={false} />
                <SourceProofChip label="No raw data exposed" verified={false} />
              </div>
              <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/12 text-cyan-100 shadow-2xl shadow-cyan-950/30">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] text-white md:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-ink-100 md:text-xl md:leading-8">
                {copy.body}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={copy.ctaHref}
                  className="btn-accent inline-flex min-h-12 items-center justify-center gap-2"
                >
                  {copy.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={requestHref}
                  className="btn-ghost inline-flex min-h-12 items-center justify-center gap-2"
                >
                  Request this signal
                </Link>
              </div>
            </section>

            <aside className="lead-shell p-5">
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Preview only</p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {profile?.title || "Protected lead profile"}
                  </h2>
                </div>
                {profile ? <LeadScoreBadge score={profile.leadScore} /> : null}
              </div>

              <div className="grid gap-3">
                <GateFact
                  icon={<DatabaseZap className="h-4 w-4" />}
                  label="Public preview"
                  value={profile?.category || "Marketplace listing only"}
                />
                <GateFact
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="What stays hidden"
                  value="Source proof details, signal history, contact route hints, export controls, and raw answers."
                />
                <GateFact
                  icon={<LockKeyhole className="h-4 w-4" />}
                  label="Access rule"
                  value="Admin users can view all. Buyers need an active entitlement tied to this profile or listing."
                />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function GateFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-400">
        <span className="text-cyan-300">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}
