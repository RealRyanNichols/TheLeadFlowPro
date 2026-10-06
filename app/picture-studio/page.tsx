import type { Metadata } from "next";
import StartStudio from "./StartStudio";

export const metadata: Metadata = { title: "Your Picture Studio | The LeadFlow Pro", robots: { index: false, follow: false } };
export default function Page() { return <StartStudio />; }
