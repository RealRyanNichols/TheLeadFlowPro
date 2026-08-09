import type { Metadata } from "next";
import AddOnsMenu from "./AddOnsMenu";

export const metadata: Metadata = {
  title: "The Add-On Menu | The LeadFlow Pro",
  description:
    "Pick what you want. Tell me how to build it. I build the whole thing, and you do not pay a dime if you do not like it. Every item on this menu is running live on a real site.",
};

export default function AddOnsPage() {
  return <AddOnsMenu />;
}
