import { redirect } from "next/navigation";
/** Older CRM links use this collection URL; the native contact list lives at /admin. */
export default function LeadsCollection() { redirect("/admin"); }
