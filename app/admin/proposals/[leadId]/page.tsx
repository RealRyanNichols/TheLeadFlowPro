import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildProposal, type ProposalIntake } from "@/lib/proposals/build";
import { renderProposalHtml } from "@/lib/proposals/render";
import { SAMPLE_NOW, sampleAgencyIntake, sampleBuildIntake } from "@/lib/proposals/fixtures";
import CopyButton from "@/app/hq/_components/CopyButton";

// A proposal Ryan reviews before sending. Built live from the lead's
// intake answers and the offers registry; never sent from here. The admin
// layout has already required an admin profile. Two fictional samples
// live at /admin/proposals/sample-build and /admin/proposals/sample-agency.

export const dynamic = "force-dynamic";

async function intakeFor(leadId: string): Promise<{ intake: ProposalIntake; sample: boolean } | null> {
  if (leadId === "sample-build") return { intake: sampleBuildIntake(), sample: true };
  if (leadId === "sample-agency") return { intake: sampleAgencyIntake(), sample: true };
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return null;
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, created_at, full_name, email, business_name, website_url, current_platform, industry, desired_modules, interest, goals, budget_range, timeline, diagnostic")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();
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
  };
}

export default async function ProposalPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const found = await intakeFor(leadId);
  if (!found) notFound();
  const proposal = buildProposal(found.intake, found.sample ? SAMPLE_NOW : new Date());
  const html = renderProposalHtml(proposal, { sample: found.sample });

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
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={proposal.text} label="Copy text" />
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
      <iframe title="Proposal preview" srcDoc={html} sandbox="" className="h-[80vh] w-full rounded-xl border border-[var(--line)] bg-white" />
    </div>
  );
}
