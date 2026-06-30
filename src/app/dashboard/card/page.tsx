import { redirect } from "next/navigation";

export default function DataProfileRedirectPage() {
  redirect("/dashboard/data-requests");
}
