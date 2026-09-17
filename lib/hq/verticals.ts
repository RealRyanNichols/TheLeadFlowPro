// Plugin vertical packs: industry editions of the same engine.
//
// A pack is a set of workflows and prompts for one trade, layered on the
// plugin (lib/hq) without forking it. Each workflow names the engine tools
// it runs on and says whether it exists in the repository today. A pack is
// "real" only when every workflow in it exists; until then it is a draft
// that no page markets and no offer prices. That is the Phase 3 audit rule
// written into code: nothing is sold before it runs.

import type { Workspace } from "./types";

export type PackWorkflow = {
  id: string;
  name: string;
  /** What the owner gets, in their words. */
  does: string;
  /** Engine tools (lib/hq/mcp.ts names) the workflow is built from. */
  tools: string[];
  /** True only when the workflow runs end to end in this repository today. */
  exists: boolean;
  /** When exists is false: what is missing, so the audit can say. */
  missing?: string;
};

export type VerticalPack = {
  id: "contractor" | "dental_medical" | "realtor";
  name: string;
  /** Offer id in lib/site/offers.ts. Always tbd_ryan until Ryan prices it. */
  offerId: string;
  /** HQ industry labels (app/hq/_components/options.ts) that pick this pack. */
  industries: string[];
  audience: string;
  promise: string;
  /** What a lead is called in this trade, used when a lead has no service and the workspace lists several. */
  vocabulary: { request: string; nextStep: string; reviewThing: string };
  workflows: PackWorkflow[];
  prompts: { prompt: string; does: string; tools: string[] }[];
  notIncluded: string[];
};

export const VERTICAL_PACKS: readonly VerticalPack[] = [
  {
    id: "contractor",
    name: "Contractor edition",
    offerId: "plugin_pack_contractor",
    industries: ["Plumbing", "HVAC", "Electrical", "Roofing", "Landscaping and lawn", "Cleaning", "Pest control", "Painting", "Flooring", "Remodeling and construction", "Garage doors", "Pool service", "Moving"],
    audience: "Trades that quote jobs, send a crew, and lose work to whoever answers first.",
    promise: "Every call answered, every estimate followed up, every finished job asked for a review, from inside ChatGPT or Claude.",
    vocabulary: { request: "your estimate request", nextStep: "set a time to look at the job", reviewThing: "the work" },
    workflows: [
      { id: "instant_text_back", name: "Instant text-back on a new lead", does: "A new lead gets a text in your voice within a minute, only if they agreed to texts.", tools: ["draft_reply", "send_message"], exists: true },
      { id: "estimate_follow_up", name: "Estimate follow-up ladder", does: "Every sent estimate gets a two-day and a seven-day check-in until it is won, lost, or answered.", tools: ["schedule_follow_up", "draft_reply"], exists: true },
      { id: "review_after_job", name: "Review ask after a won job", does: "The day a job is marked won, a review request goes out with your Google link.", tools: ["log_touch", "draft_reply", "send_message"], exists: true },
      { id: "weekly_job_posts", name: "Weekly posts from finished jobs", does: "Three posts a week drafted from the jobs you logged, approved by you before they publish.", tools: ["draft_weekly_content", "approve_content", "publish_post"], exists: true },
      { id: "storm_surge_mode", name: "Storm surge mode", does: "When calls spike after weather, the brief re-ranks by roof-first and drafts a holding text for everyone waiting.", tools: ["next_calls", "draft_reply"], exists: false, missing: "No surge detection or bulk holding draft in the engine yet." },
    ],
    prompts: [
      { prompt: "Who has an estimate out that I have not heard back on?", does: "Lists quoted leads by days since the quote, oldest first.", tools: ["list_leads"] },
      { prompt: "Text everyone from today's calls that I am running an hour behind", does: "Drafts one reschedule text per lead with consent; you say send.", tools: ["draft_reply", "send_message"] },
      { prompt: "Ask the Hendersons for a review", does: "Drafts the review ask with your Google link.", tools: ["draft_reply"] },
    ],
    notIncluded: ["Job costing or invoicing", "Scheduling software", "A promise of jobs won"],
  },
  {
    id: "dental_medical",
    name: "Dental and medical office edition",
    offerId: "plugin_pack_dental_medical",
    industries: ["Dental", "Medical or clinic", "Chiropractic", "Veterinary"],
    audience: "Front desks that lose new patients between the first call and the first appointment.",
    promise: "New patient inquiries answered fast, reminded before the visit, and asked for a review after it, with no patient details leaving your records.",
    vocabulary: { request: "your appointment request", nextStep: "get you scheduled", reviewThing: "your visit" },
    workflows: [
      { id: "new_patient_text_back", name: "New patient text-back", does: "A new inquiry gets a text back to set the first visit, only with consent.", tools: ["draft_reply", "send_message"], exists: true },
      { id: "no_show_follow_up", name: "No-show follow-up", does: "A missed appointment gets one kind text to rebook.", tools: ["log_touch", "draft_reply"], exists: true },
      { id: "review_after_visit", name: "Review ask after a visit", does: "A completed first visit gets a review request.", tools: ["draft_reply", "send_message"], exists: true },
      { id: "appointment_reminders", name: "Appointment reminders", does: "Reminders at 48 and 2 hours before a booked visit.", tools: ["schedule_follow_up"], exists: false, missing: "The engine has no appointment time on a lead; the follow-up ladder is day-based, not appointment-based." },
      { id: "intake_form_link", name: "Intake form link in the confirmation", does: "The confirmation text carries the office's intake form link.", tools: ["draft_reply"], exists: false, missing: "No per-workspace intake link field yet." },
    ],
    prompts: [
      { prompt: "Who called this week and has not booked?", does: "Lists new and contacted leads without a booked status.", tools: ["list_leads"] },
      { prompt: "Send a rebook text to this morning's no-show", does: "Drafts one text; you say send.", tools: ["draft_reply", "send_message"] },
    ],
    notIncluded: ["Clinical records, charting, or anything covered by a patient privacy law beyond name and phone", "Insurance verification", "A promise of new patients"],
  },
  {
    id: "realtor",
    name: "Realtor edition",
    offerId: "plugin_pack_realtor",
    industries: ["Real estate"],
    audience: "Agents who get leads from listings and open houses and let the slow ones go cold.",
    promise: "Every listing inquiry answered, every showing followed up, and a weekly market post drafted, without leaving your assistant.",
    vocabulary: { request: "your showing request", nextStep: "set up a showing", reviewThing: "working together" },
    workflows: [
      { id: "listing_inquiry_text_back", name: "Listing inquiry text-back", does: "A new inquiry gets a text to set a showing, with consent.", tools: ["draft_reply", "send_message"], exists: true },
      { id: "showing_follow_up", name: "Showing follow-up ladder", does: "After a showing, check-ins at two, seven, and thirty days.", tools: ["schedule_follow_up", "draft_reply"], exists: true },
      { id: "weekly_market_post", name: "Weekly market post", does: "One post a week about the local market, drafted for your approval.", tools: ["draft_weekly_content", "approve_content"], exists: true },
      { id: "open_house_capture", name: "Open house sign-in capture", does: "A QR sign-in that lands every open house visitor in the inbox.", tools: ["add_lead"], exists: false, missing: "No open-house form or QR flow in the engine; the website form endpoint is generic." },
    ],
    prompts: [
      { prompt: "Who saw a home this week and has not heard from me?", does: "Lists contacted leads with no touch in the last three days.", tools: ["list_leads", "next_calls"] },
      { prompt: "Draft this week's market post", does: "One post for your approval.", tools: ["draft_content"] },
    ],
    notIncluded: ["MLS or listing data", "Transaction management", "A promise of closings"],
  },
];

export type PackStatus = "real" | "draft";

/** A pack is real only when every workflow exists. Draft packs are never marketed or priced. */
export function packStatus(pack: VerticalPack): PackStatus {
  return pack.workflows.every((w) => w.exists) ? "real" : "draft";
}

export function packAudit(pack: VerticalPack): { status: PackStatus; existing: number; missing: PackWorkflow[] } {
  const missing = pack.workflows.filter((w) => !w.exists);
  return { status: packStatus(pack), existing: pack.workflows.length - missing.length, missing };
}

export function verticalPack(id: string): VerticalPack | null {
  return VERTICAL_PACKS.find((p) => p.id === id) ?? null;
}

/** Packs a page may market: real ones only. */
export function marketablePacks(): VerticalPack[] {
  return VERTICAL_PACKS.filter((p) => packStatus(p) === "real");
}

/** The pack a workspace's industry falls into, real or draft. The engine may use its vocabulary either way; only marketing waits. */
export function packForWorkspace(ws: Pick<Workspace, "industry">): VerticalPack | null {
  const industry = (ws.industry ?? "").trim().toLowerCase();
  if (!industry) return null;
  return VERTICAL_PACKS.find((p) => p.industries.some((i) => i.toLowerCase() === industry)) ?? null;
}

/** What a lead is called when it has no service and the workspace lists several. Falls back to the engine's default. */
export function requestNoun(ws: Pick<Workspace, "industry">, fallback = "your request"): string {
  return packForWorkspace(ws)?.vocabulary.request ?? fallback;
}
