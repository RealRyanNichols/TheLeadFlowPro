import Link from "next/link";
import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadMoneyBoard } from "@/lib/commandCenterServer";
import { parseWindow } from "@/lib/commandCenter";
import { formatCentral } from "@/lib/businessTime";
import { operatorLinks } from "@/lib/operatorLinks";
import { MoneyLine, PeopleLine, PromisesPanel, ProposalsPanel, WindowToggle } from "@/app/admin/command-center/MoneyBoardView";

// The board, for the sales desk: the same money line Ryan sees, read with the
// signed-in person's own client. The layout has already required the sales or
// admin role. What the role cannot read (owner notes) is reported as not
// counted, never as zero. Nothing here sends anything.

export const metadata = { title: "Board | LeadFlow Pro Sales Desk" };
export const dynamic = "force-dynamic";

const PANEL = "rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SalesBoard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient();
  const now = new Date();
  const days = parseWindow(((await searchParams) ?? {}).window);
  const load = await loadMoneyBoard(supabase, now, days);

  if (!load.ok) {
    return (
      <section role="alert" className="card border-[var(--danger-line)]">
        <h2 className="text-xl font-bold text-[var(--heading)]">The board could not load.</h2>
        <p className="mt-2 text-[var(--muted)]">This is a connection or access error, not an empty board. Refresh to try again. No lead has been changed.</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{load.error}</p>
        <Link href="/admin/sales" className="btn-primary mt-4 inline-flex min-h-[44px] items-center">Back to Today</Link>
      </section>
    );
  }

  // Pat's board reads only what the sales role can read; Meta spend stays on Ryan's board.
  const links = operatorLinks().filter((l) => !l.ownerOnly && ["uncalled", "hub", "calldesk"].includes(l.key));

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--blue)]">Lead to cash</p>
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)]">Board</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{formatCentral(now)} Central</p>
        </div>
        <WindowToggle days={days} basePath="/admin/sales/board" />
      </section>

      <section className={PANEL}>
        <MoneyLine board={load.board} ads={{ state: "unavailable", detail: "Spend shows on the owner's command center." }} partial={load.partial} unavailable={load.unavailable} />
        <div className="mt-3">
          <PeopleLine board={load.board} />
        </div>
        <Link href="/admin/sales" className={`mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--blue)] px-4 text-sm font-black text-white ${FOCUS}`}>
          <Phone className="h-4 w-4" aria-hidden="true" /> Who to touch now
        </Link>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <PromisesPanel promises={load.promises} now={now} />
        <ProposalsPanel proposals={load.proposals} proposalBase="/admin/sales/leads" />
      </div>

      <section className={PANEL}>
        <h3 className="font-black text-[var(--heading)]">Doors</h3>
        <ul className="mt-3 flex flex-wrap gap-3">
          {links.map((link) =>
            link.external ? (
              <li key={link.key}>
                <a href={link.href} target="_blank" rel="noreferrer" className={`inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 text-sm font-bold text-[var(--text)] ${FOCUS}`}>
                  {link.label} ↗
                </a>
              </li>
            ) : (
              <li key={link.key}>
                <Link href={link.href} className={`inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 text-sm font-bold text-[var(--text)] ${FOCUS}`}>
                  {link.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  );
}
