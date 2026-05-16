import { InstantQuoteDemo } from "./demos/InstantQuoteDemo";
import { MissedCallRescueDemo } from "./demos/MissedCallRescueDemo";
import { LeadMagnetQuizDemo } from "./demos/LeadMagnetQuizDemo";
import { OwnerDashboardDemo } from "./demos/OwnerDashboardDemo";
import type { ToolSlug } from "@/lib/tools";

export function ToolDemo({ slug }: { slug: ToolSlug }) {
  switch (slug) {
    case "instant-quote":
      return <InstantQuoteDemo />;
    case "missed-call-rescue":
      return <MissedCallRescueDemo />;
    case "lead-magnet-quiz":
      return <LeadMagnetQuizDemo />;
    case "owner-dashboard":
      return <OwnerDashboardDemo />;
    default:
      return null;
  }
}

export function hasInteractiveDemo(slug: ToolSlug): boolean {
  return (
    slug === "instant-quote" ||
    slug === "missed-call-rescue" ||
    slug === "lead-magnet-quiz" ||
    slug === "owner-dashboard"
  );
}
