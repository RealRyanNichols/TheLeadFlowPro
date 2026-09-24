import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/requestOrigin";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Clear this browser's session without signing the account out everywhere.
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");

  const response = NextResponse.redirect(new URL("/login?logged_out=1", requestOrigin(request)), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
