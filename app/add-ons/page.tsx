import type { Metadata } from "next";
import AddOnsMenu from "./AddOnsMenu";

export const metadata: Metadata = {
  title: "The Add-On Menu | The LeadFlow Pro",
  description:
    "Inspect proven modules and request a written scope. Website Launch is $1,000: $500 to start and $500 after approval, before launch. Other modules are priced separately.",
};

export default function AddOnsPage() {
  return <AddOnsMenu />;
}
