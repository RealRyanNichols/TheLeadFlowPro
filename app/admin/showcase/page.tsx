import { redirect } from "next/navigation";
import { nativeOwnerOverview } from "@/lib/adminOwnerSnapshot";
import { OperatorAuthError } from "@/lib/operatoros/auth";
import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import { showcaseData } from "@/lib/showcaseData";
import Showcase from "./Showcase";
export const dynamic = "force-dynamic";
export const metadata = { title: "Special Effects | The LeadFlow Pro", ...PRIVATE_PAGE_METADATA };
export default async function Page() {
  let source;
  try { source = await nativeOwnerOverview(); }
  catch (e) { if (e instanceof OperatorAuthError) redirect(e.status === 401 ? "/login?next=%2Fadmin%2Fshowcase" : "/admin"); throw e; }
  return <Showcase data={showcaseData(source)} />;
}
