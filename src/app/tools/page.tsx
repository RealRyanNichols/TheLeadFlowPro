import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { ToolsClient } from "./ToolsClient";

export const metadata = {
  title: "LeadFlow Tools | The LeadFlow Pro",
  description:
    "Interactive tools, quizzes, calculators, and scorecards that solve real problems while collecting consented first-party lead signal data.",
};

export default function ToolsPage() {
  return (
    <>
      <Header />
      <ToolsClient />
      <Footer />
    </>
  );
}
