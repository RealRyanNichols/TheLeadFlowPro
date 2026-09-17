import type { Metadata } from "next";
import { workshopKit, worksheetPath } from "@/lib/site/workshopKit";
import ConfirmedClient from "./ConfirmedClient";

// Stripe lands paid attendees here with ?t=<registration token>. Everything
// sensitive (seat status, street address) is fetched client-side through the
// token-gated confirmation API, so this page itself holds no secrets and can
// stay static. The prep checklist and worksheet link come from the event's
// kit and contain no attendee data.

export const metadata: Metadata = {
  title: "Registration | The LeadFlow Pro",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ConfirmedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kit = workshopKit(slug);
  return (
    <ConfirmedClient
      slug={slug}
      prep={kit?.prep ?? null}
      worksheetHref={kit && kit.worksheet.sections.length ? worksheetPath(slug) : null}
    />
  );
}
