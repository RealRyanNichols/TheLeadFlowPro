import TerritoryAdmin from "@/components/service-areas/TerritoryAdmin";
import { requireOperatorAdmin } from "@/lib/operatoros/auth";
export const metadata = {
  title: "Territories | The LeadFlow Pro",
  robots: { index: false, follow: false },
};
export default async function TerritoryAdminPage() {
  await requireOperatorAdmin();
  return <TerritoryAdmin initial={{ version: 1, territories: [] }} />;
}
