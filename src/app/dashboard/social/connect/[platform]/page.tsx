/**
 * Connect-a-platform page.
 *
 * For OAuth platforms  → user picks kind, we redirect to /api/social/connect/[platform]
 * For pending_approval → show waitlist + manual import option
 * For manual_only      → handle entry form that POSTs to /api/social/manual
 *
 * Free-tier caps (global 2 + Facebook 1+1) are enforced here first — if the
 * user already maxed out, we surface a friendly upgrade card instead of the
 * kind chooser. Server-side guards in the API routes still protect against
 * tampering.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck, Users, Building2, Youtube } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planById, type PlanId } from "@/lib/pricing";
import {
  platformById,
  FREE_TOTAL_SOCIAL_CAP,
  kindLabel,
  type PlatformKind,
} from "@/lib/social-platforms";
import { SocialIcon, socialBg } from "@/components/flowcard/SocialIcon";
import { ManualHandleForm } from "./ManualHandleForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { platform: string };
}

export default async function ConnectPlatformPage({ params }: PageProps) {
  const spec = platformById(params.platform);
  if (!spec) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/login?next=/dashboard/social/connect/${params.platform}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const plan = planById((user?.plan ?? "free") as PlanId);
  const isFree = plan.id === "free";

  const accounts = await prisma.socialAccount.findMany({
    where: { userId },
    select: { platform: true, kind: true },
  });
  const connectedTotal = accounts.length;
  const connectedHere = accounts.filter((a) => a.platform === spec.id);

  // Compute which kinds are still allowed
  const allowedKinds = spec.kinds.filter((k) => {
    if (isFree && connectedTotal >= FREE_TOTAL_SOCIAL_CAP) return false;
    if (isFree && spec.freeKindCaps) {
      const cap = spec.freeKindCaps[k];
      if (typeof cap === "number") {
        const have = connectedHere.filter((r) => r.kind === k).length;
        if (have >= cap) return false;
      }
    }
    return true;
  });

  const hitGlobalCap = isFree && connectedTotal >= FREE_TOTAL_SOCIAL_CAP;
  const hitKindCap   = !hitGlobalCap && allowedKinds.length === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/dashboard/social"
        className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Social Accounts
      </Link>

      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div
            className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${socialBg(spec.id)}`}
          >
            <SocialIcon platform={spec.id} className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-white">Connect {spec.label}</h1>
            <p className="mt-1 text-ink-300">{spec.pulls}</p>
          </div>
        </div>

        {/* Cap hit states ------------------------------------------------ */}
        {hitGlobalCap && (
          <UpgradeBlock
            title="You're at the Free plan cap"
            body={`Free plan allows ${FREE_TOTAL_SOCIAL_CAP} total social accounts. Upgrade to connect every platform you run.`}
          />
        )}

        {hitKindCap && (
          <UpgradeBlock
            title={`Free plan only allows so much on ${spec.label}`}
            body={
              spec.freeKindCaps
                ? `On Free, ${spec.label} is capped at ${Object.entries(spec.freeKindCaps)
                    .map(([k, n]) => `${n} ${kindLabel(k as PlatformKind).toLowerCase()}`)
                    .join(" + ")}. Upgrade to add more.`
                : "Upgrade to add more accounts on this platform."
            }
          />
        )}

        {!hitGlobalCap && !hitKindCap && (
          <ConnectBody spec={spec} allowedKinds={allowedKinds} />
        )}

        <div className="mt-6 pt-5 border-t border-white/5 flex items-start gap-2 text-xs text-ink-400">
          <ShieldCheck className="h-4 w-4 text-cyan-300 flex-shrink-0 mt-0.5" />
          <span>
            LeadFlow Pro only reads what you authorize. We never post without
            your say-so, never DM your followers, and never sell your data.
          </span>
        </div>
      </div>
    </div>
  );
}

function UpgradeBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-300">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-white">{title}</p>
          <p className="text-sm text-amber-200/90">{body}</p>
        </div>
      </div>
      <Link href="/pricing" className="btn-primary text-sm whitespace-nowrap">
        See plans
      </Link>
    </div>
  );
}

function ConnectBody({
  spec,
  allowedKinds,
}: {
  spec: ReturnType<typeof platformById> & {};
  allowedKinds: PlatformKind[];
}) {
  const isOauth   = spec.connectMode === "oauth";
  const isPending = spec.connectMode === "pending_approval";
  const isManual  = spec.connectMode === "manual_only";

  return (
    <div className="mt-6 space-y-5">
      {allowedKinds.length > 1 && (
        <p className="text-sm text-ink-300">
          Which {spec.label} account are you hooking up?
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {allowedKinds.map((k) => (
          <KindCard key={k} platformId={spec.id} kind={k} mode={spec.connectMode} />
        ))}
      </div>

      {/* OAuth-ready CTA (if no kind choice needed) */}
      {isOauth && allowedKinds.length === 1 && (
        <Link
          href={`/api/social/connect/${spec.id}?kind=${allowedKinds[0]}`}
          className="btn-primary w-full justify-center"
        >
          Connect {spec.label}
        </Link>
      )}

      {/* Pending-API path: always offer manual import */}
      {isPending && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <p className="text-sm text-cyan-200/90">
            <strong>OAuth is pending review</strong> — {spec.pendingReason ?? "awaiting approval"}. We&apos;ll flip you over automatically. Until then:
          </p>
          <p className="mt-2 text-xs text-ink-300">
            Paste your public handle or profile URL below. We&apos;ll pull what&apos;s visible
            (followers, bio, recent posts) so Flo has something to work with right now.
          </p>
          <div className="mt-4">
            <ManualHandleForm
              platformId={spec.id}
              kinds={allowedKinds}
              showKindPicker={allowedKinds.length > 1}
            />
          </div>
        </div>
      )}

      {/* Manual-only platforms (X, Snapchat) */}
      {isManual && (
        <ManualHandleForm
          platformId={spec.id}
          kinds={allowedKinds}
          showKindPicker={allowedKinds.length > 1}
        />
      )}
    </div>
  );
}

function KindCard({
  platformId,
  kind,
  mode,
}: {
  platformId: string;
  kind: PlatformKind;
  mode: "oauth" | "pending_approval" | "manual_only";
}) {
  const Icon = kind === "business_page" ? Building2 : kind === "channel" ? Youtube : Users;
  const href =
    mode === "oauth"
      ? `/api/social/connect/${platformId}?kind=${kind}`
      : `#${kind}`; // manual/pending forms anchor target
  return (
    <Link
      href={href}
      scroll={false}
      className="rounded-xl p-4 border border-white/10 hover:border-cyan-500/40 transition bg-ink-900/40 flex items-center gap-3"
    >
      <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="font-semibold text-white">{kindLabel(kind)}</p>
        <p className="text-xs text-ink-400">
          {kind === "business_page"
            ? "A business Page or managed account"
            : kind === "channel"
            ? "A YouTube channel"
            : "Your personal profile"}
        </p>
      </div>
    </Link>
  );
}
