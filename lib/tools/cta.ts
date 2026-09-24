// The one call to action every tool page ends with. Two lanes, both doors
// into work The LeadFlow Pro does for the visitor: the website work (the
// default) or the agency intake. A tool picks its lane in its metadata.
// Nothing else is a valid lane, so a tool cannot end on a page that sells
// nothing.
//
// The default lane used to be "free_build", pointing at the free website
// build. That offer was retired on 2026-09-22; the lane is now "website" and
// opens the services page.

export type ToolCtaLane = "website" | "agency";

export const TOOL_CTA_LANES: Record<ToolCtaLane, { href: string; eyebrow: string; title: string; body: string; label: string }> = {
  website: {
    href: "/services",
    eyebrow: "One useful tool is the proof",
    title: "Now imagine the whole website doing real work.",
    body: "A five-page site built to capture leads and follow up, in accounts you own. The result is a working site, not a promise of leads.",
    label: "See what we build",
  },
  agency: {
    href: "/agency/start",
    eyebrow: "One useful tool is the proof",
    title: "Want the leads handled, not just counted?",
    body: "Ads, pages, forms, and follow-up run for you in accounts you own. Tell Ryan what is leaking and get a written scope, not a pitch.",
    label: "Tell Ryan what is leaking",
  },
};

export const TOOL_CTA_LANE_IDS = Object.keys(TOOL_CTA_LANES) as ToolCtaLane[];

export function toolCtaLane(cta: string | undefined): ToolCtaLane {
  return cta === "agency" ? "agency" : "website";
}

export function toolCta(tool: { cta?: string }) {
  return TOOL_CTA_LANES[toolCtaLane(tool.cta)];
}
