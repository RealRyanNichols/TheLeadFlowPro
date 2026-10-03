import { headers } from "next/headers";
import { notFound } from "next/navigation";
import IdeaLab from "@/components/idea-lab/IdeaLab";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Idea Lab local preview",
  robots: { index: false, follow: false },
};

export default async function IdeaLabPreview() {
  const host = (await headers()).get("host")?.split(":")[0];
  if (
    process.env.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1"].includes(host ?? "")
  )
    notFound();
  return <IdeaLab preview />;
}
