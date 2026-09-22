import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MAX_PROPOSAL_SELECTION, buildProposal, type ProposalIntake } from "@/lib/proposals/build";
import { renderProposalHtml } from "@/lib/proposals/render";
import { SAMPLE_NOW, sampleAgencyIntake, sampleBuildIntake } from "@/lib/proposals/fixtures";
import type { PlannerLead } from "@/lib/callCloser";
import { isCloserOfferId, type CloserOfferId } from "@/lib/payDoors";
import CopyButton from "@/app/hq/_components/CopyButton";
import ProposalSentButton from "./ProposalSentButton";

// A proposal Ryan reviews before sending. Built live from the lead's
// intake answers and the offers registry; never sent from here. Two
// fictional samples live at /admin/proposals/sample-build and
// /admin/proposals/sample-agency.
//
// Authorization sits next to the read: signed in and admin, checked before
// the lead is read, the same as the call sheet. When Ryan picks offers with
// the lead on a call ("Wants a proposal" on the call card), the call card
// links here with ?offers=a,b and those offers replace what the intake form
// guessed. "Mark the proposal sent" records that Ryan sent it himself.

export const dynamic = "force-dynamic";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Found = { intake: ProposalIntake; sample: boolean; lead: PlannerLead };

const LEAD_COLUMNS =
  "id, created_at, full_name, email, phone, business_name, website_url, current_platform, industry, desired_modules, interest, goals, budget_range, timeline, diagnostic, status, sms_consent, sms_unsubscribed_at, next_follow_up_at";

/** A sample's stand-in lead for the "Mark the proposal sent" preview. Nothing about it is saved. */
function sampleLead(intake: ProposalIntake): PlannerLead {
  return {
    id: intake.leadId,
    full_name: intake.fullName,
    business_name: intake.businessName,
    status: "call_booked",
    interest: intake.interest,
    phone: null,
    email: intake.email,
    sms_consent: null,
    sms_unsubscribed_at: null,
    next_follow_up_at: null,
    diagnostic: null,
  };
}

async function intakeFor(supabase: Supabase, leadId: string): Promise<Found | null> {
  if (leadId === "sample-build" || leadId === "sample-agency") {
    const intake = leadId === "sample-build" ? sampleBuildIntake() : sampleAgencyIntake();
    return { intake, sample: true, lead: sampleLead(intake) };
  }
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return null;
  const { data: lead } = await supabase.from("leads").select(LEAD_COLUMNS).eq("id", leadId).is("deleted_at", null).single();
  if (!lead) return null;
  return {
    sample: false,
    intake: {
      leadId: lead.id,
      createdAt: lead.created_at,
      fullName: lead.full_name ?? "",
      businessName: lead.business_name ?? null,
      email: lead.email ?? null,
      industry: lead.industry ?? null,
      websiteUrl: lead.website_url ?? null,
      currentPlatform: lead.current_platform ?? null,
      interest: lead.interest ?? null,
      goals: lead.goals ?? null,
      budgetRange: lead.budget_range ?? null,
      timeline: lead.timeline ?? null,
      desiredModules: Array.isArray(lead.desired_modules) ? lead.desired_modules.map(String) : null,
      diagnostic: lead.diagnostic && typeof lead.diagnostic === "object" ? (lead.diagnostic as Record<string, unknown>) : null,
    },
    lead: {
      id: lead.id,
      full_name: lead.full_name ?? "",
      business_name: lead.business_name ?? null,
      status: typeof lead.status === "string" ? lead.status : "",
      interest: lead.interest ?? null,
      phone: lead.phone ?? null,
      email: lead.email ?? null,
      sms_consent: typeof lead.sms_consent === "boolean" ? lead.sms_consent : null,
      sms_unsubscribed_at: lead.sms_unsubscribed_at ?? null,
      next_follow_up_at: lead.next_follow_up_at ?? null,
      diagnostic: null,
    },
  };
}

/** ?offers=a,b,c: closer offer ids only, deduped, at most three. Anything else is dropped. */
function selectionFrom(raw: string | string[] | undefined): CloserOfferId[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const out: CloserOfferId[] = [];
  for (const part of (value ?? "").split(",")) {
    const id = part.trim();
    if (out.length < MAX_PROPOSAL_SELECTION && isCloserOfferId(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ offers?: string | string[] }>;
}) {
  const { leadId } = await params;
  const supabase = await createClient();
  // Authorization next to the private read, not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/admin/proposals/${leadId}`)}`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const found = await intakeFor(supabase, leadId);
  if (!found) notFound();
  const selection = selectionFrom((await searchParams).offers);
  const now = found.sample ? SAMPLE_NOW : new Date();
  const proposal = buildProposal(found.intake, now, { selection });
  const html = renderProposalHtml(proposal, { sample: found.sample });
  const sentOffers: CloserOfferId[] = [];
  for (const r of proposal.recommended) {
    if (sentOffers.length < MAX_PROPOSAL_SELECTION && isCloserOfferId(r.offerId) && !sentOffers.includes(r.offerId)) sentOffers.push(r.offerId);
  }
  const callCardHref = found.sample ? null : `/admin/call-sheet/${leadId}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="hq-eyebrow">Proposal draft</p>
          <h1 className="text-xl font-black text-[var(--heading)]">{proposal.preparedFor.business ?? proposal.preparedFor.name}</h1>
          <p className="mt-1 text-sm text-[var(--text)]">
            {proposal.missing.length ? `${proposal.missing.length} thing${proposal.missing.length === 1 ? "" : "s"} to fix before sending.` : "Ready for your review. Print to PDF from the frame, or copy the text."}{" "}
            Nothing is sent from this page.
          </p>
          {selection.length ? <p className="mt-1 text-sm text-[var(--muted)]">Offers chosen with the lead on the call.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={proposal.text} label="Copy text" />
          {callCardHref && (
            <Link href={callCardHref} className="hq-btn hq-btn-sm">
              Back to call card
            </Link>
          )}
          {!found.sample && (
            <Link href={`/admin/leads/${leadId}`} className="hq-btn hq-btn-sm">
              Back to lead
            </Link>
          )}
        </div>
      </div>
      {proposal.missing.length > 0 && (
        <ul className="mb-4 list-disc rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] p-4 pl-8 text-sm">
          {proposal.missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      <ProposalSentButton
        lead={found.lead}
        offers={sentOffers}
        sample={found.sample}
        fixedNow={found.sample ? SAMPLE_NOW.toISOString() : null}
        callCardHref={callCardHref}
      />
      <iframe title="Proposal preview" srcDoc={html} sandbox="" className="h-[80vh] w-full rounded-xl border border-[var(--line)] bg-white" />
    </div>
  );
}
