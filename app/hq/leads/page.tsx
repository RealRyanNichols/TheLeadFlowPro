import Link from "next/link";
import { redirect } from "next/navigation";
import { Facebook, Globe, MessageSquare, Search } from "lucide-react";
import { getHqSession } from "@/lib/hq/session";
import { listLeads } from "@/lib/hq/server";
import { formatPhone } from "@/lib/hq/phone";
import { ago } from "@/lib/hq/time";
import { LEAD_STATUSES, OPEN_STATUSES, type LeadStatus } from "@/lib/hq/types";
import AddLeadForm from "../_components/AddLeadForm";
import { SOURCE_LABEL, STATUS_LABEL, STATUS_TONE } from "../_components/labels";

// Every lead in one list. The default view is the three statuses that still
// need something from the owner; the tabs are there for looking back.

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; statuses?: LeadStatus[] }[] = [
  { key: "open", label: "Open", statuses: OPEN_STATUSES },
  ...LEAD_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], statuses: [s] })),
  { key: "all", label: "All" },
];

function nextFollowUpText(iso: string | null, now: Date): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const days = Math.round((at.getTime() - now.getTime()) / 86_400_000);
  if (at.getTime() <= now.getTime()) return "Follow-up due";
  if (days <= 0) return "Follow-up today";
  if (days === 1) return "Follow-up tomorrow";
  return `Follow-up in ${days} days`;
}

export default async function HqLeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq/leads");
  if (!session.workspace) redirect("/hq/start");

  const ws = session.workspace;
  const now = new Date();
  const statusParam = typeof params.status === "string" ? params.status : "open";
  const tab = TABS.find((t) => t.key === statusParam) ?? TABS[0];
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";

  const leads = await listLeads(session.db, ws.id, {
    statuses: tab.statuses,
    search: query || undefined,
    limit: 200,
  });

  // An empty view is two different things. Nobody has ever come in, or this
  // filter is just narrow. Only the first one deserves the how-leads-arrive
  // explainer, so ask for a single row before showing it.
  const anyLeadEver = leads.length > 0 || (await listLeads(session.db, ws.id, { limit: 1 })).length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hq-eyebrow">Leads</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">Everyone who raised a hand</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Website forms, texts, Meta lead ads and the ones you add yourself, in one list. Tap a name to see the whole history and send a message.
          </p>
        </div>
        <AddLeadForm />
      </div>

      <div className="mt-6 hq-scroll">
        <nav aria-label="Filter leads by status" className="flex gap-2 pb-1">
          {TABS.map((t) => {
            const href = t.key === "open" ? "/hq/leads" : `/hq/leads?status=${t.key}`;
            const current = t.key === tab.key;
            return (
              <Link
                key={t.key}
                href={query ? `${href}${href.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}` : href}
                className={current ? "tool-chip is-on" : "tool-chip"}
                aria-current={current ? "page" : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <form method="get" action="/hq/leads" className="mt-4 flex flex-wrap gap-2">
        {tab.key !== "open" && <input type="hidden" name="status" value={tab.key} />}
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="lead-search">
            Search leads by name, email, phone or service
          </label>
          <input
            id="lead-search"
            name="q"
            defaultValue={query}
            className="hq-input"
            placeholder="Search a name, number, email or service"
            type="search"
          />
        </div>
        <button type="submit" className="hq-btn">
          <Search aria-hidden="true" className="h-4 w-4" /> Search
        </button>
        {query && (
          <Link href={tab.key === "open" ? "/hq/leads" : `/hq/leads?status=${tab.key}`} className="hq-btn">
            Clear
          </Link>
        )}
      </form>

      {(leads.length > 0 || anyLeadEver) && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {leads.length === 0 ? "No leads match this view. Try another tab, or clear the search." : `${leads.length} lead${leads.length === 1 ? "" : "s"} in this view.`}
        </p>
      )}

      {leads.length > 0 && (
        <ul className="mt-3 grid gap-3">
          {leads.map((lead) => {
            const follow = nextFollowUpText(lead.next_follow_up_at, now);
            return (
              <li key={lead.id} className="hq-card p-4 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/hq/leads/${lead.id}`} className="text-base font-black text-[var(--heading)] hover:text-[var(--blue)]">
                      {lead.name || "No name given"}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                      <span>{SOURCE_LABEL[lead.source] ?? lead.source}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ago(new Date(lead.created_at), now)}</span>
                      {follow && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-[var(--warn)]">{follow}</span>
                        </>
                      )}
                    </p>
                    {lead.service && <p className="mt-1 text-sm text-[var(--text)]">{lead.service}</p>}
                  </div>
                  <span className="hq-pill" data-tone={STATUS_TONE[lead.status]}>
                    {STATUS_LABEL[lead.status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="hq-btn hq-btn-sm">
                      {formatPhone(lead.phone)}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="hq-btn hq-btn-sm">
                      Email
                    </a>
                  )}
                  <Link href={`/hq/leads/${lead.id}`} className="hq-btn hq-btn-sm">
                    Open
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!anyLeadEver && (
        <section className="hq-card mt-4">
          <h2 className="text-lg font-black text-[var(--heading)]">No leads here yet. Here is how they arrive.</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            You do not have to change how you work. Point the places people already contact you at this workspace and every one of them lands in this list.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            <li className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
              <Globe aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
              <h3 className="mt-2 text-sm font-black text-[var(--heading)]">Your website form</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Point your contact form at your lead endpoint. Settings has the address and a form you can paste straight into your site.
              </p>
            </li>
            <li className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
              <MessageSquare aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
              <h3 className="mt-2 text-sm font-black text-[var(--heading)]">Texts to your business line</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Connect OpenPhone or Twilio in Settings. A text from a new number becomes a lead and can get an answer in seconds.
              </p>
            </li>
            <li className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
              <Facebook aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
              <h3 className="mt-2 text-sm font-black text-[var(--heading)]">Meta lead ads</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Connect your Facebook Page and anyone who fills in a lead form on Facebook or Instagram shows up here.
              </p>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/hq/settings" className="pro-buy-button">
              Set up your channels
            </Link>
            <Link href="/hq/plugin" className="hq-btn">
              Install the plugin
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
