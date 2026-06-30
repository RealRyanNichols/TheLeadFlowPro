import { redirect } from "next/navigation";

export default function MissedCallPage() {
  redirect("/dashboard/leads");
}
