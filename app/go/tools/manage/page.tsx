import type { Metadata } from "next";
import MonthlyMenuChange from "./MonthlyMenuChange";

export const metadata: Metadata = {
  title: "Change Next Month's Build Menu | The LeadFlow Pro",
  description: "Request additions or removals before your next LeadFlow Tool Studio renewal.",
  robots: { index: false, follow: false },
};

export default function ManageToolMenuPage() {
  return <MonthlyMenuChange />;
}

