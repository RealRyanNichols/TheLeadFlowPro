import { createClient } from "@/lib/supabase/server";
import {
  SOCIAL_PAGE_ID,
  createSocialServiceClient,
  getSocialCredentialStatus,
  getSocialRuntimeIdentityIssues,
} from "@/lib/social-server";
import SocialPublisher from "./SocialPublisher";

export const metadata = { title: "Facebook Publisher | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

export default async function AdminSocialPublisher() {
  const identityIssues = getSocialRuntimeIdentityIssues();
  if (identityIssues.length) {
    throw new Error("LeadFlow social identity check failed.");
  }
  const supabase = await createClient();
  const pageId = SOCIAL_PAGE_ID;
  const service = createSocialServiceClient();
  const credentialStatus = service
    ? await getSocialCredentialStatus(service).catch(() => null)
    : null;
  const [{ data: posts }, { data: settings }, { data: connection }] = await Promise.all([
    supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("social_schedule_settings").select("*").eq("singleton", true).maybeSingle(),
    supabase
      .from("social_connections")
      .select("*")
      .eq("provider", "facebook")
      .eq("page_id", pageId)
      .maybeSingle(),
  ]);

  return (
    <SocialPublisher
      initialPosts={posts ?? []}
      initialSettings={settings ?? null}
      initialConnection={connection ?? null}
      pageId={pageId}
      tokenConfigured={
        credentialStatus?.page_token_configured ?? Boolean(process.env.META_PAGE_ACCESS_TOKEN)
      }
    />
  );
}
