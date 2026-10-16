import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parseWindow } from "@/lib/commandCenter";
import { formatCentral } from "@/lib/businessTime";
import { nextActionLine } from "@/lib/nextAction";
import { loadNextActions } from "@/lib/nextActionServer";
import { fetchLeadFlowAdRows } from "@/lib/metaAdLevel";
import { scriptFirstName } from "@/lib/nextActionTemplates";
import { WindowToggle } from "@/app/admin/command-center/MoneyBoardView";
import NextActionsView, { PlanPanel, ScorecardPanel } from "./NextActionsView";

// Next actions: for every open lead, the one thing to do next, when it is
// due, where the lead stands on the follow-up plan ("Call 3 of 25 · Emails 8
// of 81"), and the words to use. Under it, the scorecard: the numbers for the
// window and what they say to do more of, less of, or fix.
//
// Served at /admin/sales/next-actions (the middleware maps /admin/sales to
// this folder), so the sales desk and the owner open the same page. The
// layout has already required the sales or admin role; every read here uses
// the signed-in person's own client, so row level security decides what they
// see. Ad spend is read for admins only, the same line the command center
// draws for Pat's board.
//
// Strictly read-only. Nothing on this page sends a message, changes a lead or
// touches an ad.

export const metadata = { title: "Next actions | LeadFlow Pro Sales Desk" };
export const dynamic = "force-dynamic";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const NEXT_ACTIONS_PATH = "/admin/sales/next-actions";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NextActionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient();
  const now = new Date();
  const days = parseWindow(((await searchParams) ?? {}).window);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).single() : null;
  const isAdmin = profile?.data?.role === "admin";
  // The scripts say who is calling. A blank profile falls back to the operator's name.
  const sender = scriptFirstName(profile?.data?.full_name) || null;

  // Meta spend is the owner's to see. Bounded so a slow answer never holds the page.
  const adRead = isAdmin
    ? await fetchLeadFlowAdRows({ days, timeoutMs: 8_000, now }).catch((error: unknown) => ({
        ok: false as const,
        reason: "unavailable" as const,
        detail: error instanceof Error ? error.message : "Meta did not answer.",
      }))
    : null;

  const load = await loadNextActions(supabase, now, {
    days,
    ads: adRead?.ok ? adRead.rows : null,
    // The call card is the owner's; the sales desk logs the same outcome on its own lead page.
    hrefFor: (leadId) => (isAdmin ? `/admin/call-sheet/${leadId}` : `/admin/sales/leads/${leadId}`),
  }).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "The leads could not be read." }));

  if (!load.ok) {
    return (
      <section role="alert" className="card border-[var(--danger-line)]">
        <h2 className="text-xl font-bold text-[var(--heading)]">Next actions could not load.</h2>
        <p className="mt-2 text-[var(--muted)]">This is a connection or access error, not an empty list. Refresh to try again. No lead has been changed.</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{load.error}</p>
        <Link href="/admin/sales" className="btn-primary mt-4 inline-flex min-h-[44px] items-center">
          Back to Today
        </Link>
      </section>
    );
  }

  const adsNote = !isAdmin
    ? "Ad spend shows for the owner."
    : adRead && !adRead.ok
      ? adRead.reason === "not_configured"
        ? "Ad spend is not read on this server yet, so there are no ad numbers and no ad verdicts here. It turns on when the read-only Meta token is set."
        : `Meta did not answer just now, so ad numbers are left out rather than shown as zero. ${adRead.detail}`
      : adRead?.ok
        ? `Ad numbers are Meta's own, read ${formatCentral(new Date(adRead.generatedAt))} Central.`
        : null;

  const notices: string[] = [];
  if (load.leadsCapped) notices.push("More leads exist than this page reads at once. The oldest are left off.");
  if (load.partial) notices.push("Some history came back cut short, so a count here may be low.");
  if (load.unavailable.includes("email history")) notices.push("The email history could not be read with this sign-in. Email counts are left out, not shown as zero.");
  else if (load.unavailable.includes("welcome emails")) notices.push("The welcome emails could not be read with this sign-in, so the email counts leave the welcome out.");
  if (load.unavailable.includes("email opens")) notices.push("Email opens could not be read with this sign-in, so no open count shows on any lead or in the numbers.");

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--blue)]">The follow-up plan</p>
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)]">Next actions</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{formatCentral(now)} Central</p>
        </div>
        <WindowToggle days={days} basePath={NEXT_ACTIONS_PATH} />
      </section>

      {notices.length > 0 ? (
        <ul role="status" className="space-y-1 rounded-2xl border border-[var(--warn-line)] bg-[var(--warn-tint)] px-4 py-3 text-sm text-[var(--text)]">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <NextActionsView board={load.board} line={nextActionLine(load.board)} sender={sender} listHref={isAdmin ? "/admin/call-sheet" : "/admin/sales"} />

      <ScorecardPanel score={load.score} adsNote={adsNote} />

      <PlanPanel />

      <p className="text-xs text-[var(--muted)]">
        Read only. Nothing on this page sends a message or changes a lead.{" "}
        <Link href="/admin/sales/board" className={`font-bold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`}>
          Open the board
        </Link>
      </p>
    </div>
  );
}
