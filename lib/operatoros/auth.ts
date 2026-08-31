import "server-only";
import { createClient } from "@/lib/supabase/server";

export class OperatorAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireOperatorAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new OperatorAuthError(401, "Not signed in");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || profile?.role !== "admin") throw new OperatorAuthError(403, "Admins only");

  return { user, supabase };
}
