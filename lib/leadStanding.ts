export type LeadStanding = { summary: string; nextAction: string | null; updatedAt: string | null };
const labels: Record<string, string> = {
  new: "New inquiry. Discovery is not yet recorded.",
  contacted: "Contacted. Check the latest reply and next action.",
  call_booked: "Call marked booked. Confirm its current date and outcome.",
  proposal: "Proposal stage. A customer decision is still to be confirmed.",
  won: "Won / client stage. Review the current delivery and payment records.",
  lost: "Closed / lost. Review the recorded reason before further contact.",
};
function clean(value: string | undefined, limit: number): string | null {
  if (!value) return null;
  const text = value.replace(/https?:\/\/\S+|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\/(?:home|root|etc|srv|opt)\/\S+/g, "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length <= limit ? text : text.slice(0, limit - 1).replace(/\s+\S*$/, "") + "…";
}
/** Only the explicitly curated snapshot is list copy. Raw notes are not excerpted. */
export function leadStanding(input: { notes?: string | null; status?: string | null }): LeadStanding {
  const blocks = [...(input.notes || "").matchAll(/\[LEADFLOW STANDING\]\s*\n([\s\S]*?)\n\[\/LEADFLOW STANDING\]/g)];
  const body = blocks.at(-1)?.[1] || "";
  const field = (name: string) => body.match(new RegExp("^" + name + ": ([^\\n]*)$", "m"))?.[1];
  const recordedStatus = field("Status");
  const current = !recordedStatus || recordedStatus === input.status;
  const updated = current ? field("Updated") : null;
  const date = updated && Number.isFinite(Date.parse(updated)) ? new Date(updated).toISOString() : null;
  return {
    summary: clean(current ? field("Summary") : undefined, 170) || labels[input.status || ""] || "Review the latest conversation before choosing the next step.",
    nextAction: clean(current ? field("Next") : undefined, 170), updatedAt: date,
  };
}
