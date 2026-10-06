import Link from "next/link";
import { ArrowRight, Bot, Building2, CircleAlert, Clock3, DollarSign, ExternalLink, MessageSquareText, Phone, Users } from "lucide-react";
import { stripActivityMarkers } from "@/lib/leadTimeline";
import { requireOperatorAdmin } from "@/lib/operatoros/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { loadCallSheet } from "@/lib/callSheetServer";
import { CASH_LEDGER_COLUMNS, loadClientWorkspaces, loadMoneyBoard, purchasesFromLedger, type CashLedgerRow } from "@/lib/commandCenterServer";
import { adSummary, breakEven, businessCounts, cashSourceLabel, money, moneyBoard, parseUsd, parseWindow, type BusinessRow } from "@/lib/commandCenter";
import { MANAGED_COMMERCIAL_TERMS } from "@/lib/site/managedPlans";
import { fetchLeadFlowAdInsights } from "@/lib/metaInsights";
import { centralDate, formatCentral } from "@/lib/businessTime";
import { operatorLinks } from "@/lib/operatorLinks";
import { commandCenterSwitches } from "@/lib/commandCenterSwitches";
import { pulse } from "@/lib/commandCenterPulse";
import { jobsMath, parseCount, parseDollars, planRows } from "@/lib/commandCenterPlan";
import { EXTERNAL_LINKS } from "@/lib/site/external-links";
import TodaysCallsBanner from "../TodaysCallsBanner";
import LiveRefresh from "./LiveRefresh";
import Rn1DeskPanel from "./Rn1DeskPanel";
import CallNowList, { CALL_NOW_LIMIT } from "./CallNowList";
import { AdsPanelView, BreakEvenPanel, MoneyLine, PeopleLine, PromisesPanel, ProposalsPanel, WindowToggle, adsPanelFrom, type AdsPanel } from "./MoneyBoardView";
import { PlanPanel, PulsePanel, SnapshotLink } from "./PulsePlanView";

// The board installs as a home-screen app from this manifest (static text, no data).
export const metadata = { title: "Command Center | The LeadFlow Pro", manifest: "/admin/command-center/manifest.webmanifest" };
export const dynamic = "force-dynamic";

// The command center: lead to cash on one screen, for a phone first.
//
// Rebuilt October 6, 2026 from what Ryan and Pat asked for on the recordings:
// 7 and 28 day windows; leads in, reached by a person, waiting, proposals,
// paid; ad spend and cost per lead; who to call now with the dialer one tap
// away; promises due; money on the table; every business on one board; and
// the doors to the Hub, the Call Desk and the Fieldy archive. No flow score,
// no imaginary agents: every number is a row that exists.
//
// Reads happen after the admin check, with the admin's own client. The one
// service read is the approval queue, which is service-only by design. A
// failed lead read shows a recovery view rather than zeros; a failed optional
// read (approvals, clients, analytics, Meta) says so in its own panel.

type LeadActivity = { id: string; lead_id: string; kind: string; detail: string; created_at: string };
type Approval = { id: string; source_agent: string | null; target_agent: string | null; status: string; approval_required: boolean; created_at: string };
type TimelineItem = { id: string; at: string; title: string; detail: string; tone: "blue" | "green" | "warn" | "violet" };

const PENDING_APPROVAL_STATUSES = new Set(["pending", "awaiting_approval", "needs_approval", "queued", "ready"]);
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const PANEL = "rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5";

function shortTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(new Date(value));
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CommandCenter({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // Verify the signed-in admin before touching anything private.
  const { supabase, user } = await requireOperatorAdmin();
  const now = new Date();
  const query = (await searchParams) ?? {};
  const days = parseWindow(query.window);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [boardLoad, sheetLoad, activityResult, purchaseResult, approvalResult, clientsLoad, insights] = await Promise.all([
    loadMoneyBoard(supabase, now, days).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "The board could not be read." })),
    loadCallSheet(supabase, now).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "The call sheet could not be read." })),
    supabase.from("lead_activity").select("id, lead_id, kind, detail, created_at").gte("created_at", since24h).order("created_at", { ascending: false }).limit(60),
    // Money that landed in the last day: the verified cash ledger (Stripe, paid invoices, hand-recorded cash), admin only.
    supabase.from("operator_verified_cash_entries").select(CASH_LEDGER_COLUMNS).gte("received_at", since24h).order("received_at", { ascending: false }).limit(50),
    (async () => {
      try {
        // approval_queue is service-only by design. Never loosen its grants.
        return await createServiceClient()
          .from("approval_queue")
          .select("id, source_agent, target_agent, status, approval_required, created_at")
          .eq("repo", "RealRyanNichols/TheLeadFlowPro")
          .order("created_at", { ascending: false })
          .limit(100);
      } catch {
        return { data: null, error: { message: "Approval summary unavailable" } };
      }
    })(),
    (async () => {
      try {
        // HQ tables are member-read; the admin is verified above.
        return await loadClientWorkspaces(createServiceClient(), now);
      } catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : "Client workspaces unavailable" };
      }
    })(),
    (async () => {
      try {
        // Bounded so a slow Meta answer never holds the board.
        return await fetchLeadFlowAdInsights({ days: 35, timeoutMs: 8_000, now });
      } catch (error) {
        return { ok: false as const, reason: "unavailable" as const, detail: error instanceof Error ? error.message : "Meta did not answer." };
      }
    })(),
  ]);

  if (!boardLoad.ok) {
    // The CRM must stay reachable when reporting fails. Never show zeros.
    return (
      <div className="space-y-6">
        <TodaysCallsBanner supabase={supabase} className="" />
        <h2 className="text-2xl font-black text-[var(--heading)]">Command Center</h2>
        <div role="alert" className="card border-[var(--warn-line)]">
          <h3 className="font-bold">Part of the overview could not be loaded.</h3>
          <p className="mt-2 text-sm">
            Open leads, the call sheet, or the sales desk directly. The overview will try again automatically. Unavailable totals are not shown as zero.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">{boardLoad.error}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href="/admin" className={`font-bold text-[var(--blue)] ${FOCUS}`}>Leads</Link>
            <Link href="/admin/call-sheet" className={`font-bold text-[var(--blue)] ${FOCUS}`}>Call sheet</Link>
            <Link href="/admin/sales" className={`font-bold text-[var(--blue)] ${FOCUS}`}>Sales desk</Link>
            <LiveRefresh />
          </div>
        </div>
        {/* The trading desk reads its own server, so a CRM outage never hides it. */}
        <Rn1DeskPanel />
      </div>
    );
  }

  const { board, promises, proposals, partial, unavailable, crmMetaLeads } = boardLoad;
  const ads: AdsPanel = adsPanelFrom(insights, insights.ok ? adSummary(insights.rows, days, centralDate(now), crmMetaLeads) : null);

  const sheetRows = sheetLoad.ok ? sheetLoad.sheet.rows : [];
  const activity = (activityResult.error ? [] : (activityResult.data ?? [])) as LeadActivity[];
  const purchases24h = purchaseResult.error ? [] : purchasesFromLedger((purchaseResult.data ?? []) as CashLedgerRow[]);
  const approvals = approvalResult.error ? null : ((approvalResult.data ?? []) as Approval[]);
  const approvalsWaiting = approvals ? approvals.filter((a) => a.approval_required && PENDING_APPROVAL_STATUSES.has(a.status)) : null;

  const leadById = new Map(boardLoad.leads.map((lead) => [lead.id, lead]));
  const leads24h = boardLoad.leads.filter((lead) => lead.created_at >= since24h);
  const timeline: TimelineItem[] = [
    ...leads24h.map((lead) => ({ id: `lead-${lead.id}`, at: lead.created_at, title: "Lead captured", detail: `${lead.business_name || lead.full_name} entered from ${lead.source || "direct"}.`, tone: "blue" as const })),
    ...activity.map((entry) => {
      const lead = leadById.get(entry.lead_id);
      return {
        id: `activity-${entry.id}`,
        at: entry.created_at,
        title: entry.kind.replace(/_/g, " "),
        // The Call Closer's Outcome, Offer ids and Ref markers are bookkeeping, not owner copy.
        detail: `${lead?.business_name || lead?.full_name || "Lead"}: ${stripActivityMarkers(entry.detail)}`,
        tone: "violet" as const,
      };
    }),
    ...purchases24h.map((purchase) => ({ id: `purchase-${purchase.id}`, at: purchase.created_at, title: "Payment recorded", detail: `${money(purchase.amount_cents ?? 0)} · ${cashSourceLabel(purchase.kind)}`, tone: "green" as const })),
    ...(approvalsWaiting ?? []).slice(0, 5).map((approval) => ({ id: `approval-${approval.id}`, at: approval.created_at, title: "Human stopline", detail: `${approval.source_agent || "Agent"} → ${approval.target_agent || "operator"} needs approval.`, tone: "warn" as const })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);
  const timelineTone: Record<TimelineItem["tone"], string> = {
    blue: "bg-[var(--accent-tint)] text-[var(--blue)]",
    green: "bg-[var(--green-tint)] text-[var(--green)]",
    warn: "bg-[var(--warn-tint)] text-[var(--warn)]",
    violet: "bg-[var(--fill-2)] text-[var(--violet)]",
  };

  // Every business on one board. LeadFlow is this database; plugin clients
  // are HQ workspaces; Premier Dental Academy keeps its own database, so it
  // is a door, not a count.
  const leadflowRow: BusinessRow = businessCounts(
    boardLoad.leads.map((lead) => ({ key: "leadflow", created_at: lead.created_at })),
    [{ key: "leadflow", name: "The LeadFlow Pro", href: "/admin" }],
    now,
  )[0];
  const clientRows: BusinessRow[] = clientsLoad.ok
    ? businessCounts(
        clientsLoad.leads.map((lead) => ({ key: lead.workspace_id, created_at: lead.created_at })),
        clientsLoad.workspaces.map((w) => ({ key: w.id, name: w.name, href: `/hq/leads?workspace=${encodeURIComponent(w.slug ?? w.id)}` })),
        now,
      )
    : [];
  const links = operatorLinks();
  const adsManager = links.find((l) => l.key === "ads")?.href ?? "#";
  const switches = commandCenterSwitches();

  // The live counter: paid in the last 28 days against the costs the owner typed.
  const paid28Cents = days === 28 ? board.paid.cents : moneyBoard({ leads: boardLoad.leads, touches: boardLoad.touches, purchases: boardLoad.purchases, notes: [], calls: [], now, days: 28 }).paid.cents;
  const monthlyCostsCents = parseUsd(process.env.COMMAND_CENTER_MONTHLY_COSTS_USD);
  const counter = monthlyCostsCents === null ? null : breakEven({ monthlyCostsCents, paidCents: paid28Cents, pricePerClientCents: MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd * 100 });

  // The pulse: when each lane last moved. Meta's live campaign status decides
  // whether a quiet Meta lane is a problem or just no ad running.
  const pulseRows = pulse({
    leads: boardLoad.leads,
    calls: boardLoad.calls,
    messages: boardLoad.messages,
    purchases: boardLoad.purchases,
    now,
    metaCampaignActive: insights.ok ? insights.campaigns.some((c) => c.effective_status.toUpperCase() === "ACTIVE") : null,
  });

  // Plan and call: planning rates from the pricing page; the jobs arithmetic
  // from what was typed into the form (query string, so nothing is stored).
  const plans = planRows();
  const rateUsd = parseDollars(query.rate, 1, 1_000_000) ?? plans[0]?.rateUsd ?? MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd;
  const math = jobsMath({
    jobs: parseCount(query.jobs, Math.max(1, Math.floor(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd / rateUsd)), 1, 500),
    rateUsd,
    profitPerJobUsd: parseDollars(query.profit, 1, 10_000_000),
  });
  const profitTyped = math.profitPerJobUsd === null ? "" : String(math.profitPerJobUsd);

  return (
    <div className="space-y-6">
      <TodaysCallsBanner supabase={supabase} className="" />

      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--blue)]">Lead to cash</p>
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">Command Center</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {formatCentral(now)} Central · signed in as {user.email ?? "admin"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WindowToggle days={days} basePath="/admin/command-center" />
          <SnapshotLink days={days} />
          <LiveRefresh />
        </div>
      </section>

      <section className={PANEL} aria-labelledby="money-line">
        <h3 id="money-line" className="sr-only">The money line</h3>
        <MoneyLine board={board} ads={ads} partial={partial} unavailable={unavailable} />
        <div className="mt-3">
          <PeopleLine board={board} />
        </div>
      </section>

      <PulsePanel rows={pulseRows} metaRead={insights.ok} />

      <section className={PANEL} aria-labelledby="call-now">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
            <h3 id="call-now" className="font-black text-[var(--heading)]">Call now</h3>
          </div>
          <p className="text-xs text-[var(--muted)]">{sheetLoad.ok ? `${sheetRows.length} waiting on a person` : "The call sheet could not be read."}</p>
        </div>
        <div className="mt-4">
          <CallNowList rows={sheetRows.slice(0, CALL_NOW_LIMIT)} total={sheetRows.length} listHref="/admin/call-sheet" canRunCards />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <PromisesPanel promises={promises} now={now} />
        <ProposalsPanel proposals={proposals} proposalBase="/admin/proposals" />
      </div>

      <BreakEvenPanel counter={counter} paid28Cents={paid28Cents} />

      <PlanPanel rows={plans} math={math} basePath="/admin/command-center" days={days} profitTyped={profitTyped} />

      <AdsPanelView ads={ads} days={days} adsManagerHref={adsManager} />

      <section className={PANEL} aria-labelledby="every-business">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
          <h3 id="every-business" className="font-black text-[var(--heading)]">Every business</h3>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">Leads in the last 7 and 28 days, per business. Click through to work them.</p>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {[leadflowRow, ...clientRows].map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--heading)]">{row.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {row.lastLeadAt ? `Last lead ${formatCentral(new Date(row.lastLeadAt))}` : "No lead in 28 days"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-sm">
                <span className="tabular-nums"><strong className="text-[var(--heading)]">{row.leads7}</strong> <span className="text-[var(--muted)]">7d</span></span>
                <span className="tabular-nums"><strong className="text-[var(--heading)]">{row.leads28}</strong> <span className="text-[var(--muted)]">28d</span></span>
                <Link href={row.href} className={`font-semibold text-[var(--blue)] ${FOCUS}`} aria-label={`Open ${row.name}`}>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-[var(--heading)]">Premier Dental Academy of Longview</p>
              <p className="text-xs text-[var(--muted)]">Counted in its own system. Open it to see the leads.</p>
            </div>
            <a href={EXTERNAL_LINKS.premierDentalAcademy} target="_blank" rel="noreferrer" className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--blue)] ${FOCUS}`}>
              Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
        </ul>
        {!clientsLoad.ok ? <p className="mt-2 text-xs text-[var(--muted)]">Client workspaces could not be read: {clientsLoad.error}</p> : null}
      </section>

      <section className={PANEL} aria-labelledby="doors">
        <h3 id="doors" className="font-black text-[var(--heading)]">Doors</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {links.map((link) => (
            <li key={link.key}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noreferrer" className={`flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-2 hover:border-[var(--accent-line)] ${FOCUS}`}>
                  <span className="min-w-0">
                    <span className="block font-bold text-[var(--heading)]">{link.label}</span>
                    <span className="block text-xs text-[var(--muted)]">{link.detail}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-[var(--quiet)]" aria-hidden="true" />
                </a>
              ) : (
                <Link href={link.href} className={`flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-2 hover:border-[var(--accent-line)] ${FOCUS}`}>
                  <span className="min-w-0">
                    <span className="block font-bold text-[var(--heading)]">{link.label}</span>
                    <span className="block text-xs text-[var(--muted)]">{link.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--quiet)]" aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={PANEL} aria-labelledby="switches">
        <h3 id="switches" className="font-black text-[var(--heading)]">Switches</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">What the follow-up machine is doing on its own right now. Each one is set in the site's env file on the droplet; a change needs a restart and the owner's say-so.</p>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {switches.map((s) => (
            <li key={s.key} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-bold text-[var(--heading)]">{s.label}</p>
                <p className="text-xs text-[var(--muted)]">{s.detail}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${s.on ? "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]" : "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]"}`}
                title={s.variable}
              >
                {s.on ? "on" : "off"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--panel)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <h3 className="font-black text-[var(--heading)]">Last 24 hours</h3>
            <Link href="/admin" className={`inline-flex items-center gap-1 text-sm font-bold text-[var(--blue)] ${FOCUS}`}>
              Open CRM <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {timeline.length ? (
            <ol className="divide-y divide-[var(--line)]">
              {timeline.map((item) => (
                <li key={item.id} className="flex gap-4 px-5 py-3">
                  <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${timelineTone[item.tone]}`}>
                    {item.tone === "green" ? <DollarSign className="h-4 w-4" aria-hidden="true" /> : item.tone === "warn" ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : item.tone === "violet" ? <MessageSquareText className="h-4 w-4" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-black capitalize text-[var(--heading)]">{item.title}</p>
                      <p className="text-[11px] font-bold text-[var(--quiet)]">{shortTime(item.at)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-6 py-10 text-center">
              <Clock3 className="mx-auto h-7 w-7 text-[var(--quiet)]" aria-hidden="true" />
              <p className="mt-3 font-bold text-[var(--heading)]">No handoffs recorded in the last 24 hours.</p>
              <p className="mt-1 text-sm text-[var(--muted)]">The next lead, call, payment, or approval will appear here.</p>
            </div>
          )}
        </section>

        <section className={PANEL}>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
            <h3 className="font-black text-[var(--heading)]">Human stopline</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Anything that sends, spends, publishes, or changes a price stops here first.</p>
          {approvalsWaiting === null ? (
            <p className="mt-4 text-sm text-[var(--muted)]">The approval queue could not be read. Not zero, unread.</p>
          ) : (
            <div className={`mt-4 rounded-2xl border p-4 ${approvalsWaiting.length ? "border-[var(--warn-line)] bg-[var(--warn-tint)]" : "border-[var(--green-line)] bg-[var(--green-tint)]"}`}>
              <p className={`text-3xl font-black ${approvalsWaiting.length ? "text-[var(--warn)]" : "text-[var(--green)]"}`}>{approvalsWaiting.length}</p>
              <p className="mt-1 text-xs font-bold text-[var(--text)]">actions waiting for a human yes</p>
            </div>
          )}
        </section>
      </div>

      <Rn1DeskPanel />
    </div>
  );
}
