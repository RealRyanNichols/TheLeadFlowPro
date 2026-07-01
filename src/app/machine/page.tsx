import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { LeadFlowMachine } from "@/components/site/LeadFlowMachine";

export const metadata = {
  title: "LeadFlow Machine | The LeadFlow Pro",
  description: "The LeadFlow Pro Phase 3 machine for privacy-safe intake tools, source proof, scoring, suppression checks, review gates, and buyer routing."
};

export default function MachinePage() {
  return (
    <>
      <Header />
      <LeadFlowMachine />
      <Footer />
    </>
  );
}
