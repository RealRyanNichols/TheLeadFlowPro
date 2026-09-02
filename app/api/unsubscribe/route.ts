import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import { verifyUnsubscribeAny } from "@/lib/unsubscribe";

// One-click unsubscribe. POST is the only mutating method. A visible GET link
// is routed to a confirmation page because email-security scanners routinely
// visit every link in a message before the recipient sees it.

async function unsubscribe(request: Request): Promise<{ ok: boolean; status: number }> {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "");
  const token = String(url.searchParams.get("t") ?? "");
  const runtimeIdentityIssues = leadFlowSupabaseRuntimeIssues(SUPABASE_URL);
  if (runtimeIdentityIssues.length) {
    console.error("Unsubscribe identity check failed:", runtimeIdentityIssues.join("; "));
    return { ok: false, status: 503 };
  }
  // The Supabase client needs the SERVICE ROLE KEY. It used to be handed the
  // unsubscribe signing secret, which only ever worked by accident: while
  // UNSUBSCRIBE_SECRET was unset, the signing secret fell back to the service
  // role key and happened to be a valid Supabase credential. The day
  // UNSUBSCRIBE_SECRET was actually set, every unsubscribe click started
  // authenticating to Supabase with a random string, 401ing, and redirecting
  // to /unsubscribed?e=1 without ever stamping the row. The person saw a
  // confirmation-ish page and kept receiving the daily sequence.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!id || !token || !serviceKey) return { ok: false, status: 400 };
  if (!verifyUnsubscribeAny(id, token)) return { ok: false, status: 403 };

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("leads")
    .update({ email_unsubscribed_at: now, marketing_email_consent: false })
    .eq("id", id)
    .is("email_unsubscribed_at", null);

  // A second click on the same link is not an error. The person is already
  // unsubscribed, which is exactly what they asked for.
  if (error) {
    console.error("Unsubscribe update failed:", error.message);
    return { ok: false, status: 500 };
  }

  await supabase
    .from("lead_activity")
    .insert({ lead_id: id, kind: "system", detail: "Unsubscribed from email" })
    .then(
      () => undefined,
      () => undefined,
    );

  return { ok: true, status: 200 };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "");
  const token = String(url.searchParams.get("t") ?? "");
  const site = "https://www.theleadflowpro.com";
  if (!id || !token || !verifyUnsubscribeAny(id, token)) {
    return NextResponse.redirect(`${site}/unsubscribed?e=1`, { status: 302 });
  }
  const confirm = new URL("/unsubscribe", site);
  confirm.searchParams.set("id", id);
  confirm.searchParams.set("t", token);
  return NextResponse.redirect(confirm, { status: 302 });
}

export async function POST(request: Request) {
  const result = await unsubscribe(request);
  if (request.headers.get("accept")?.includes("text/html")) {
    const site = "https://www.theleadflowpro.com";
    return NextResponse.redirect(result.ok ? `${site}/unsubscribed` : `${site}/unsubscribed?e=1`, {
      status: 303,
    });
  }
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : result.status });
}
