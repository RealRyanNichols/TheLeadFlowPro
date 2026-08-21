import { createClient as createServiceClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

// Signed download links for deliverable files in the private "deliverables"
// bucket. Server-only: uses the service role key, so call it ONLY after the
// deliverable row itself came back through RLS for the current viewer (the
// row is the permission; the signature is just the door key). Links expire
// after an hour and the client can always reload for a fresh one.

const BUCKET = "deliverables";

export async function signDeliverableFile(filePath: string | null | undefined): Promise<string | null> {
  if (!filePath) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  try {
    const supabase = createServiceClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
