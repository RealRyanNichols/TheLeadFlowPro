"use client";
import type { LeadStanding } from "@/lib/leadStanding";
import { leadSourceLabel } from "@/lib/leadSourceLabel";
const pretty = (value?: string | null) => value ? value.replace(/_/g, " ") : "Not recorded";
export default function LeadStandingBrief({ brief }: { brief?: LeadStanding }) {
  if (!brief) return null;
  const intake = brief.intake;
  return <div className="lf-prospect-brief" aria-label="Current prospect standing">
    <p className="lf-prospect-summary">{brief.summary}</p>
    {brief.nextAction && <p className="lf-prospect-next"><strong>Next:</strong> {brief.nextAction}</p>}
    <details className="lf-prospect-details" onClick={event => event.stopPropagation()}>
      <summary>Intake &amp; source details</summary>
      <dl>
        <div><dt>Where they came from</dt><dd>{leadSourceLabel(intake?.source)}</dd></div>
        <div><dt>Business / industry</dt><dd>{pretty(intake?.industry)}</dd></div>
        <div><dt>Requested help</dt><dd>{pretty(intake?.interest)}</dd></div>
        <div><dt>Timing they supplied</dt><dd>{pretty(intake?.timeline)}</dd></div>
        {intake?.goals && <div className="lf-prospect-wide"><dt>What they told us</dt><dd>{intake.goals}</dd></div>}
        <div className="lf-prospect-wide"><dt>Campaign / exact ad</dt><dd>{intake?.campaign || "Exact campaign or ad creative is not recorded in this brief. Check the source lead before attributing it."}</dd></div>
      </dl>
      {brief.updatedAt && <p className="lf-prospect-reviewed">Standing reviewed {new Date(brief.updatedAt).toLocaleDateString("en-US", {month:"short",day:"numeric",timeZone:"America/Chicago"})}. Source answers may be older; confirm current needs.</p>}
    </details>
  </div>;
}
