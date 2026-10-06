import { redirect } from "next/navigation";
/** Keep older collection links working without changing the sales role boundary. */
export default function SalesLeadsCollection() { redirect("/admin/sales/pipeline"); }
