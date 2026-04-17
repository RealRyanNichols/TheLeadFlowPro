import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ProfileCapture } from "./ProfileCapture";
import { GoalPicker } from "./GoalPicker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get started — The LeadFlow Pro" };

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/onboarding");

  // Hasn't finished the questionnaire yet → show it. Signup pre-fills
  // name + businessName, but industry/phone/website and the explicit
  // "I agree this is my business" save are what flip onboardedAt.
  if (!user.onboardedAt) {
    return (
      <ProfileCapture
        initial={{
          name: user.name,
          businessName: user.businessName,
          industry: user.industry,
          phone: user.phone,
          website: user.website
        }}
      />
    );
  }

  const firstName = user.name?.split(" ")[0] || "there";
  return <GoalPicker firstName={firstName} />;
}
