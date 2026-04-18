import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, PhoneCall, MessageSquare, Calendar, Sparkles, Mail,
  DollarSign, Clock, Send, Video, Paperclip, CheckCircle2, ExternalLink
} from "lucide-react";
import { LeadStatusBadge, LeadSourceLabel } from "@/components/dashboard/LeadStatusBadge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, relativeTime, cn } from "@/lib/utils";
import type { LeadStatus, Message } from "@prisma/client";

export const dynamic = "force-dynamic";

const PIPELINE: { id: LeadStatus; label: string }[] = [
  { id: "new",       label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "nurturing", label: "Nurturing" },
  { id: "qualified", label: "Qualified" },
  { id: "booked",    label: "Booked" },
  { id: "won",       label: "Won" }
];

function nextMoveFor(status: LeadStatus): { headline: string; body: string; cta: string; href: string } {
  switch (status) {
    case "new":       return { headline: "Reply in under 5 minutes",     body: "First-mover wins. Send Script K2 — a question-based opener — and mention what they asked about.", cta: "Open scripts",   href: "/dashboard/scripts" };
    case "contacted": return { headline: "Ask the qualifying question",  body: "One specific question beats a pitch. 'What's the one thing you're hoping to solve?'",           cta: "Open scripts",   href: "/dashboard/scripts" };
    case "nurturing": return { headline: "Send a video or GIF",           body: "Script L1 — the 45-second video bump. Replies double when the bump offers value.",              cta: "Open scripts",   href: "/dashboard/scripts" };
    case "qualified": return { headline: "Offer 2–3 booking times",       body: "Remove the back-and-forth. Paste the booking link from your FlowCard.",                         cta: "View FlowCard",  href: "/dashboard/card"    };
    case "booked":    return { headline: "Send a morning-of prep text",   body: "Day-of text cuts no-shows by 30–40%. Include parking + one prep item.",                         cta: "Open scripts",   href: "/dashboard/scripts" };
    case "won":       return { headline: "Ask for the review + referral", body: "Script T1 (review) + Script T2 (referral). 24 hours after service is the sweet spot.",          cta: "Open scripts",   href: "/dashboard/scripts" };
    default:          return { headline: "Follow up",                     body: "Send a re-engagement script from the library.",                                                 cta: "Open scripts",   href: "/dashboard/scripts" };
  }
}

function channelIcon(channel: Message["channel"]) {
  switch (channel) {
    case "sms":      return MessageSquare;
    case "dm":       return MessageSquare;
    case "email":    return Mail;
    case "call_log": return PhoneCall;
    case "chatbot":  return Sparkles;
    case "note":     return Sparkles;
    default:         return MessageSquare;
  }
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/login?next=/dashboard/leads/${params.id}`);

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!lead) notFound();

  const convo = lead.messages;
  const currentIdx = PIPELINE.findIndex((p) => p.id === lead.status);
  const move = nextMoveFor(lead.status);
  const displayName =
    lead.name || lead.phone || lead.email || "New lead";
  const firstName = (lead.name ?? "").split(/\s+/)[0] || displayName;

  return (
    <div className="max-w-6xl space-y-5">
      {/* Back */}
      <Link href="/dashboard/leads" className="text-xs text-ink-400 hover:text-cyan-400 inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
      </Link>

      {/* Header */}
      <div className="glass-strong rounded-2xl p-5 sm:p-6 flex items-start gap-4 flex-wrap">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-brand-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
          {displayName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{displayName}</h1>
            <LeadStatusBadge status={lead.status} />
            <LeadSourceLabel source={lead.source} />
          </div>
          {lead.notes && <p className="text-sm text-ink-300 mt-1">{lead.notes}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink-400">
            {lead.phone && <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {lead.phone}</span>}
            {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Captured {relativeTime(lead.createdAt)}</span>
            {lead.estValue ? <span className="flex items-center gap-1 text-lead-400"><DollarSign className="h-3 w-3" /> {formatCurrency(lead.estValue)} potential</span> : null}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-ghost text-xs py-2 px-3"><PhoneCall className="h-3.5 w-3.5" /> Call</button>
          <button className="btn-accent text-xs py-2 px-3"><MessageSquare className="h-3.5 w-3.5" /> Text</button>
        </div>
      </div>

      {/* Pipeline tracker */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <p className="text-xs text-ink-300 font-semibold mb-3">Pipeline · where {firstName} is right now</p>
        <div className="flex items-center gap-1 overflow-x-auto">
          {PIPELINE.map((stage, i) => {
            const complete = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={stage.id} className="flex items-center gap-1 shrink-0">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap",
                  active ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 font-semibold" :
                  complete ? "bg-lead-500/10 text-lead-400 border-lead-500/20" :
                  "bg-white/5 text-ink-400 border-white/10"
                )}>
                  {complete ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-current" />}
                  {stage.label}
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className={cn(
                    "h-px w-4",
                    i < currentIdx ? "bg-lead-500/40" : "bg-white/10"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        {/* Conversation */}
        <div className="glass rounded-2xl overflow-hidden flex flex-col min-h-[32rem]">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Conversation</h2>
            <span className="text-[11px] text-ink-400">{convo.length} messages</span>
          </div>
          <div className="flex-1 p-5 space-y-3 overflow-y-auto">
            {convo.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-ink-300">No messages yet.</p>
                <p className="text-xs text-ink-500 mt-1">
                  Replies, auto-texts, and call logs will show up here.
                </p>
              </div>
            ) : (
              convo.map((m) => {
                const Icon = channelIcon(m.channel);
                if (m.channel === "call_log" || m.channel === "note") {
                  return (
                    <div key={m.id} className="flex items-center justify-center">
                      <span className="text-[11px] text-ink-400 flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/5 border border-white/5">
                        <Icon className="h-3 w-3" /> {m.body} · {relativeTime(m.createdAt)}
                      </span>
                    </div>
                  );
                }
                const mine = m.direction === "outbound";
                return (
                  <div key={m.id} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                    {!mine && (
                      <span className="h-6 w-6 rounded-full bg-white/10 text-ink-400 flex items-center justify-center shrink-0">
                        <Icon className="h-3 w-3" />
                      </span>
                    )}
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                      mine
                        ? "bg-cyan-500/15 text-white border border-cyan-500/30 rounded-br-md"
                        : "bg-white/5 text-ink-100 border border-white/10 rounded-bl-md"
                    )}>
                      {m.mediaUrl && (
                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 mb-1">
                          <Paperclip className="h-3 w-3" /> MEDIA ATTACHED
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <p className={cn("text-[10px] mt-1", mine ? "text-cyan-300/60" : "text-ink-400")}>
                        {relativeTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Composer */}
          <div className="border-t border-white/5 p-3 flex items-center gap-2">
            <button className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-300" title="Attach">
              <Paperclip className="h-4 w-4" />
            </button>
            <Link href="/dashboard/scripts" className="h-9 px-3 rounded-lg hover:bg-white/5 flex items-center gap-1.5 text-xs text-ink-200" title="Scripts">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Scripts
            </Link>
            <input
              type="text"
              placeholder="Type a reply…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
            />
            <button className="btn-accent text-xs py-2 px-3">
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Next move */}
          <div className="glass-strong rounded-2xl p-5 border border-cyan-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-promo-glow opacity-20 -z-10" />
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Next move</p>
            </div>
            <p className="text-base font-bold text-white">{move.headline}</p>
            <p className="text-xs text-ink-200 mt-1">{move.body}</p>
            <Link href={move.href} className="btn-accent text-xs py-2 px-3 mt-3 inline-flex">
              {move.cta} <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </div>

          {/* Quick actions */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-300 font-semibold mb-3">Quick actions</p>
            <div className="space-y-1.5">
              <QuickAction icon={Calendar} label="Book appointment" />
              <QuickAction icon={Video}    label="Send a saved video" />
              <QuickAction icon={Paperclip} label="Send a saved GIF" />
              <QuickAction icon={CheckCircle2} label="Mark as Won" />
            </div>
          </div>

          {/* Details */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-300 font-semibold mb-3">Details</p>
            <dl className="space-y-2 text-xs">
              <Detail label="Source"    value={lead.source} />
              <Detail label="Status"    value={lead.status} />
              <Detail label="Captured"  value={relativeTime(lead.createdAt)} />
              {lead.estValue ? <Detail label="Potential"  value={formatCurrency(lead.estValue)} /> : null}
              {lead.phone && <Detail label="Phone"     value={lead.phone} />}
              {lead.email && <Detail label="Email"     value={lead.email} />}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-ink-200 hover:text-white transition">
      <Icon className="h-3.5 w-3.5 text-cyan-400" />
      {label}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-ink-100 truncate max-w-[12rem] text-right capitalize">{value}</dd>
    </div>
  );
}
