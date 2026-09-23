import { createSocialServiceClient } from "@/lib/social-server";
import { emptyContentCommandState, loadContentCommandState } from "@/lib/content-command/state";
import ContentCommandCenter from "./ContentCommandCenter";

export const metadata = { title: "Content Command Center | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

export default async function ContentCommandPage() {
  const service = createSocialServiceClient();
  const initialState = service
    ? await loadContentCommandState(service)
    : emptyContentCommandState("SUPABASE_SERVICE_ROLE_KEY is not configured in this runtime.");

  return <ContentCommandCenter initialState={initialState} />;
}
