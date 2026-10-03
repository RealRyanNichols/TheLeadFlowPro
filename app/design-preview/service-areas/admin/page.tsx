import { headers } from "next/headers";
import { notFound } from "next/navigation";
import TerritoryAdmin from "@/components/service-areas/TerritoryAdmin";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Territory editor local preview",
  robots: { index: false, follow: false },
};
export default async function Preview() {
  const host = (await headers()).get("host")?.split(":")[0];
  if (
    process.env.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1"].includes(host ?? "")
  )
    notFound();
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <TerritoryAdmin preview initial={{ version: 1, territories: [] }} />
    </div>
  );
}
