import type { Metadata } from "next";
import OwnerStudio from "../OwnerStudio";

export const metadata: Metadata = { title: "Picture Studio Team | The LeadFlow Pro", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <OwnerStudio />; }
