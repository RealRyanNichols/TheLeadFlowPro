import { redirect } from "next/navigation";

export const metadata = {
  title: "Pricing — The LeadFlow Pro",
  description: "See the full LeadFlow Pro price ladder.",
};

export default function PricingPage() {
  redirect("/tiers");
}
