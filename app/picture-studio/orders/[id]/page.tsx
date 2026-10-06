import type { Metadata } from "next";
import OrderStudio from "../../OrderStudio";

export const metadata: Metadata = { title: "Your Picture Project | The LeadFlow Pro", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <OrderStudio id={id} />; }
