import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getWorkspaceForUser, type Db } from "./server";
import type { Workspace } from "./types";

// Who is at the keyboard in HQ. Pages and the management API resolve the
// signed-in person and their workspace once, then work with the service
// client filtered by that workspace id. RLS would also allow the anon
// client for reads, but the engine's writes (events with dedupe keys,
// connection secrets) are service-only by design, so HQ uses one path.

export type HqSession = {
  user: { id: string; email: string | null };
  workspace: Workspace | null;
  db: Db;
};

export async function getHqSession(): Promise<HqSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const db = createServiceClient();
  const workspace = await getWorkspaceForUser(db, user.id);
  return { user: { id: user.id, email: user.email ?? null }, workspace, db };
}
