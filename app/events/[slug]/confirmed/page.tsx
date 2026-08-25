import type { Metadata } from "next";
import ConfirmedClient from "./ConfirmedClient";

// Stripe lands paid attendees here with ?t=<registration token>. Everything
// sensitive (seat status, street address) is fetched client-side through the
// token-gated confirmation API, so this page itself holds no secrets and can
// stay static.

export const metadata: Metadata = {
  title: "Registration | The LeadFlow Pro",
  robots: { index: false, follow: false },
};

export default async function ConfirmedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ConfirmedClient slug={slug} />;
}
