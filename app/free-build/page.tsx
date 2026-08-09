import type { Metadata } from "next";
import FreeBuildFunnel from "./FreeBuildFunnel";

export const metadata: Metadata = {
  title: "I Will Build Your Website Free | The LeadFlow Pro",
  description:
    "Tell me about your business. I build your complete website, funnel, and follow-up system. You do not pay a dime until you see it working and decide you want it. Fair, right?",
};

export default function FreeBuildPage() {
  return <FreeBuildFunnel />;
}
