import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { SocialProof } from "@/components/site/SocialProof";
import { Features } from "@/components/site/Features";
import { AutomationFlow } from "@/components/site/AutomationFlow";
import { HowItWorks } from "@/components/site/HowItWorks";
import { ToolRequests } from "@/components/site/ToolRequests";
import { Pricing } from "@/components/site/Pricing";
import { CTA } from "@/components/site/CTA";
import { Footer } from "@/components/site/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <AutomationFlow />
        <HowItWorks />
        <ToolRequests />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
