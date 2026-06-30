import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProblemIntakeClient } from "./ProblemIntakeClient";

export const metadata: Metadata = {
  title: "Find the Signal - The LeadFlow Pro",
  description:
    "Sharp signal intake for adults who want something solved, compared, found, fixed, automated, or matched."
};

export default function ProblemIntakePage() {
  return (
    <>
      <Header />
      <main>
        <ProblemIntakeClient />
      </main>
      <Footer />
    </>
  );
}
