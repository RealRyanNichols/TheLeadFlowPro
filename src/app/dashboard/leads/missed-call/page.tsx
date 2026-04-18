import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MissedCallForm } from "@/components/dashboard/MissedCallForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MISSED_CALL_REPLY } from "@/lib/sms";

export const dynamic = "force-dynamic";

export default async function MissedCallSettings() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/dashboard/leads/missed-call");

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      inboundPhone: true,
      forwardToPhone: true,
      missedCallReply: true,
      missedCallEnabled: true,
      missedCallFollowup: true,
      formKey: true,
    },
  });

  // Real stats — count call_log messages and auto-reply sms messages within
  // the user's leads over the last 30 days. Zero until real calls flow.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [missedCalls, autoReplies] = await Promise.all([
    prisma.message.count({
      where: {
        channel: "call_log",
        createdAt: { gte: since },
        lead: { userId },
      },
    }),
    prisma.message.count({
      where: {
        channel: "sms",
        direction: "outbound",
        sentBy: { in: ["auto-text-back", "pending-twilio-config"] },
        createdAt: { gte: since },
        lead: { userId },
      },
    }),
  ]);

  // A "recovered" lead = one whose first event was a missed call and they
  // later replied (i.e. has any inbound sms after the call_log event).
  const recoveredRows = await prisma.lead.findMany({
    where: {
      userId,
      source: "call",
      createdAt: { gte: since },
      messages: { some: { direction: "inbound", channel: "sms" } },
    },
    select: { id: true },
  });

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "theleadflowpro.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const initial = {
    inboundPhone: u?.inboundPhone ?? "",
    forwardToPhone: u?.forwardToPhone ?? "",
    missedCallReply: u?.missedCallReply ?? DEFAULT_MISSED_CALL_REPLY,
    missedCallEnabled: u?.missedCallEnabled ?? true,
    missedCallFollowup: u?.missedCallFollowup ?? false,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/dashboard/leads" className="text-xs text-ink-300 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to inbox
        </Link>
        <p className="text-cyan-400 text-sm font-semibold mt-3">Missed-Call Auto Text-Back</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Never let a missed call <span className="funnel-text">go cold</span>
        </h1>
        <p className="mt-2 text-ink-300">
          When the phone rings and you can't answer, we fire a text within 5 seconds.
          Keeps the lead warm; you reply when you can.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Missed calls (30d)" value={missedCalls.toString()} />
        <StatCard label="Auto-replies sent" value={autoReplies.toString()} highlight />
        <StatCard label="Leads recovered" value={recoveredRows.length.toString()} />
      </div>

      <MissedCallForm
        initial={initial}
        origin={origin}
        userId={userId}
        formKey={u?.formKey ?? null}
      />
    </div>
  );
}
