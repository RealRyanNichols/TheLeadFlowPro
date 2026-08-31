import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export const ACADEMY_ACCESS_COOKIE = "lfp_academy_access";
export const ACADEMY_ACCESS_DAYS = 180;

export function createAcademyAccessToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function academyAccessTokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hasAcademyLeadAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACADEMY_ACCESS_COOKIE)?.value;
  if (!token || token.length < 32 || token.length > 100) return false;
  const service = createServiceClient();
  const { data } = await service
    .from("academy_lead_access_tokens")
    .select("id")
    .eq("token_hash", academyAccessTokenHash(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !!data;
}
