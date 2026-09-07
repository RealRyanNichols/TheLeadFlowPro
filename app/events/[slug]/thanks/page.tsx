import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import ProPurchaseTracker from "@/components/tools/pro/ProPurchaseTracker";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your workshop payment | The LeadFlow Pro", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Thanks({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { slug } = await params;
    // Cookie path limits this credential to API routes. The public page carries
    // no buyer or seat details; authoritative details remain in the private portal.
    const settings = await getSettings();
    return <main className="cb-page"><section className="cb-band"><div className="cb-shell" style={{ maxWidth: 760 }}>
    <p className="cb-eyebrow">Your next step</p><h1 className="cb-h2">Open your workshop registration.</h1>
    <p className="cb-lead">Your private attendee page shows your verified payment status, seat, arrival instructions, and calendar download. Keep the confirmation email so you can return on another device.</p>
    <div className="cb-actions"><a className="cb-btn cb-btn--primary" href="/api/events/attendee" referrerPolicy="no-referrer">View my seat and arrival details</a><Link className="cb-btn cb-btn--ghost" href={`/events/${encodeURIComponent(slug)}`}>Workshop details</Link></div>
    <ProPurchaseTracker googleAdsId={settings.google_ads_id} conversionLabel={settings.google_ads_conversion_label} receiptEndpoint="/api/events/purchase-receipt"/>
  </div></section></main>;
}
