import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, DollarSign, Megaphone, Phone, Users } from "lucide-react";
import {
  BOARD_WINDOWS,
  bottleneckLine,
  money,
  moneyExact,
  type AdSummary,
  type BoardWindow,
  type BreakEven,
  type MoneyBoard,
  type Promise_,
  type ProposalRow,
} from "@/lib/commandCenter";
import type { LeadFlowAdCampaign, LeadFlowAdInsights } from "@/lib/metaInsights";
import { formatCentral } from "@/lib/businessTime";
import { formatPhone, dialHref } from "@/lib/salesQueue";

// The money board, lead to cash, over 7 or 28 days. One component so Ryan's
// command center and Pat's sales board show the same numbers with the same
// definitions. Every tile prints what it counts. Nothing here reads or writes.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

export type AdsPanel =
  | { state: "ok"; summary: AdSummary; campaigns: LeadFlowAdCampaign[]; generatedAt: string; cached: boolean }
  | { state: "not_configured" }
  | { state: "unavailable"; detail: string };

export function adsPanelFrom(insights: LeadFlowAdInsights | null, summary: AdSummary | null): AdsPanel {
  if (!insights) return { state: "unavailable", detail: "Meta reporting was not read for this page." };
  if (!insights.ok) return insights.reason === "not_configured" ? { state: "not_configured" } : { state: "unavailable", detail: insights.detail };
  if (!summary) return { state: "unavailable", detail: "Meta rows could not be summarised." };
  return { state: "ok", summary, campaigns: insights.campaigns, generatedAt: insights.generatedAt, cached: insights.cached };
}

function Tile({ label, value, detail, tone = "plain" }: { label: string; value: string; detail: string; tone?: "plain" | "warn" | "good" }) {
  const ring = tone === "warn" ? "border-[var(--warn-line)] bg-[var(--warn-tint)]" : tone === "good" ? "border-[var(--green-line)] bg-[var(--green-tint)]" : "border-[var(--line)] bg-[var(--panel)]";
  return (
    <div className={`rounded-2xl border p-4 ${ring}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums text-[var(--heading)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

export function WindowToggle({ days, basePath }: { days: BoardWindow; basePath: string }) {
  return (
    <nav aria-label="Board window" className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
      {BOARD_WINDOWS.map((w) => (
        <Link
          key={w}
          href={w === 7 ? basePath : `${basePath}?window=${w}`}
          aria-current={w === days ? "page" : undefined}
          className={`inline-flex min-h-[40px] items-center rounded-lg px-4 text-sm font-black ${FOCUS} ${w === days ? "bg-[var(--blue)] text-white" : "text-[var(--text)] hover:bg-[var(--accent-tint)]"}`}
        >
          {w} days
        </Link>
      ))}
    </nav>
  );
}

export function MoneyLine({ board, ads, partial, unavailable }: { board: MoneyBoard; ads: AdsPanel; partial: boolean; unavailable: string[] }) {
  const sources = board.bySource.map((s) => `${s.label} ${s.count}`).join(" · ") || "no leads";
  const spendTile =
    ads.state === "ok"
      ? {
          value: ads.summary.spendCents > 0 ? moneyExact(ads.summary.spendCents) : "$0",
          detail:
            ads.summary.costPerCrmLeadCents !== null
              ? `${money(ads.summary.costPerCrmLeadCents)} per Meta lead in our records · ${ads.summary.platformLeads} leads by Meta's count`
              : ads.summary.platformLeads > 0
                ? `${ads.summary.platformLeads} leads by Meta's count, none tagged Meta in our records yet`
                : "No Meta leads in this window",
        }
      : ads.state === "not_configured"
        ? { value: "Not connected", detail: "Set META_ADS_READ_TOKEN on the server to show spend and cost per lead here." }
        : { value: "No answer", detail: `Meta reporting did not load: ${ads.detail}` };
  return (
    <div>
      <p className="rounded-2xl border-2 border-[var(--accent-line)] bg-[var(--accent-tint)] px-4 py-3 text-base font-black text-[var(--heading)] sm:text-lg">
        {bottleneckLine(board)}
      </p>
      {partial || unavailable.length ? (
        <p className="mt-2 flex items-start gap-2 text-xs text-[var(--muted)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warn)]" aria-hidden="true" />
          <span>
            {partial ? "Some history did not load in full, so a person may have reached more leads than shown. " : ""}
            {unavailable.length ? `This login cannot read ${unavailable.join(", ")}; those lanes are not counted, not zero.` : ""}
          </span>
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Tile label={`Leads in · ${board.days}d`} value={String(board.leadsIn)} detail={sources} />
        <Tile
          label="Reached by a person"
          value={board.reachedPct === null ? "–" : `${board.reached} of ${board.leadsIn}`}
          detail={`${board.reachedIn24h} inside 24 hours. A note, a call somebody had, or a text a person typed. The software's emails and texts do not count.`}
          tone={board.leadsIn > 0 && board.reached < board.leadsIn ? "warn" : board.leadsIn > 0 ? "good" : "plain"}
        />
        <Tile
          label="Waiting on a person"
          value={String(board.repliesOwed + board.untouched)}
          detail={`${board.repliesOwed} replied or called and are owed an answer · ${board.untouched} of this window's leads never heard from anyone`}
          tone={board.repliesOwed + board.untouched > 0 ? "warn" : "good"}
        />
        <Tile
          label="Proposals out"
          value={board.proposalsOut.count ? `${board.proposalsOut.count} · ${board.proposalsOut.cents ? money(board.proposalsOut.cents) : "unvalued"}` : "0"}
          detail={`Open leads in the proposal stage, any age. ${board.proposalsOut.valued} of ${board.proposalsOut.count} carry a dollar value. ${board.stages.booked} sit-downs booked, ${board.stages.contacted} contacted.`}
        />
        <Tile
          label={`Paid · ${board.days}d`}
          value={board.paid.count ? moneyExact(board.paid.cents) : "$0"}
          detail={board.paid.count ? `${board.paid.count} paid checkout${board.paid.count === 1 ? "" : "s"} recorded by Stripe.` : "No paid checkout recorded. A check or a card taken by hand is not in this number."}
          tone={board.paid.count ? "good" : "plain"}
        />
        <Tile label={`Ad spend · ${board.days}d`} value={spendTile.value} detail={spendTile.detail} />
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Calls somebody had: {board.callsHad}.{" "}
        {board.notesByAuthor.length ? `Notes logged: ${board.notesByAuthor.map((n) => `${n.author} ${n.count}`).join(", ")}.` : "No notes logged in this window."}
      </p>
    </div>
  );
}

export function PromisesPanel({ promises, now }: { promises: Promise_[]; now: Date }) {
  return (
    <section className="rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="flex items-center gap-2">
        <Clock3 className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
        <h3 className="font-black text-[var(--heading)]">You said you would call</h3>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">Promised times that have come, earliest first. Keeping these is the whole reputation.</p>
      {promises.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text)]">No promise is due today.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {promises.slice(0, 8).map((p) => {
            const name = p.lead.business_name || p.lead.full_name;
            const tel = dialHref(p.lead.phone, "tel");
            const overdue = p.overdueHours > 0;
            return (
              <li key={p.lead.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--heading)]">{name}</p>
                  <p className={`text-xs ${overdue ? "text-[var(--warn)]" : "text-[var(--muted)]"}`}>
                    {overdue ? `Promised ${formatCentral(new Date(p.at))}, ${Math.round(p.overdueHours)}h ago` : `Promised ${formatCentral(new Date(p.at))}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {tel ? (
                    <a href={tel} className={`inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-[var(--blue)] px-3 text-sm font-bold text-white ${FOCUS}`} aria-label={`Call ${name}`}>
                      <Phone className="h-4 w-4" aria-hidden="true" /> {formatPhone(p.lead.phone)}
                    </a>
                  ) : null}
                  <Link href={`/admin/call-sheet/${encodeURIComponent(p.lead.id)}`} className={`text-sm font-semibold text-[var(--blue)] ${FOCUS}`}>
                    Card
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="sr-only">Board time {formatCentral(now)}</p>
    </section>
  );
}

export function ProposalsPanel({ proposals, proposalBase }: { proposals: ProposalRow[]; proposalBase: string }) {
  return (
    <section className="rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
        <h3 className="font-black text-[var(--heading)]">Money on the table</h3>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">Open proposals, quietest first. A proposal nobody follows is a no.</p>
      {proposals.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text)]">No proposal is out. The next yes on a call becomes one.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {proposals.slice(0, 8).map((p) => {
            const name = p.lead.business_name || p.lead.full_name;
            return (
              <li key={p.lead.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--heading)]">{name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {p.cents ? money(p.cents) : "No value typed"} · {p.quietDays === null ? "never touched by a person" : p.quietDays === 0 ? "touched today" : `quiet ${p.quietDays} day${p.quietDays === 1 ? "" : "s"}`}
                  </p>
                </div>
                <Link href={`${proposalBase}/${encodeURIComponent(p.lead.id)}`} className={`inline-flex min-h-[40px] shrink-0 items-center gap-1 text-sm font-semibold text-[var(--blue)] ${FOCUS}`}>
                  Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function statusWord(status: string): string {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "running";
  if (s.includes("PAUSED")) return "paused";
  if (s === "IN_PROCESS" || s === "PENDING_REVIEW") return "in review";
  if (s === "WITH_ISSUES") return "with issues";
  if (!s) return "unknown";
  return s.toLowerCase().replace(/_/g, " ");
}

export function AdsPanelView({ ads, days, adsManagerHref }: { ads: AdsPanel; days: BoardWindow; adsManagerHref: string }) {
  return (
    <section className="rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
          <h3 className="font-black text-[var(--heading)]">Ads · last {days} days</h3>
        </div>
        <a href={adsManagerHref} target="_blank" rel="noreferrer" className={`text-sm font-semibold text-[var(--blue)] ${FOCUS}`}>
          Open Ads Manager ↗
        </a>
      </div>
      {ads.state === "not_configured" ? (
        <p className="mt-3 text-sm text-[var(--text)]">
          Spend and cost per lead show here once the server holds Meta read access (the Ads Brain token). Until then, read them in Ads Manager. This board never changes an ad.
        </p>
      ) : ads.state === "unavailable" ? (
        <p className="mt-3 text-sm text-[var(--text)]">Meta did not answer this time: {ads.detail}</p>
      ) : (
        <div className="mt-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Tile label="Spend" value={moneyExact(ads.summary.spendCents)} detail={`From ${ads.summary.fromDate}, Meta's own report.`} />
            <Tile label="Link clicks" value={String(ads.summary.linkClicks)} detail={`${ads.summary.impressions.toLocaleString()} impressions`} />
            <Tile label="Leads (Meta count)" value={String(ads.summary.platformLeads)} detail={ads.summary.costPerPlatformLeadCents !== null ? `${money(ads.summary.costPerPlatformLeadCents)} each by Meta's count` : "No lead counted by Meta"} />
            <Tile label="Cost per lead (ours)" value={ads.summary.costPerCrmLeadCents !== null ? money(ads.summary.costPerCrmLeadCents) : "–"} detail="Spend over Meta leads that landed in our own records in the same window." />
          </div>
          {ads.summary.campaigns.length ? (
            <ul className="mt-4 divide-y divide-[var(--line)] text-sm">
              {ads.summary.campaigns.map((c) => {
                const live = ads.campaigns.find((k) => k.id === c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate font-bold text-[var(--heading)]">{c.name}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {live ? `${statusWord(live.effective_status)}${live.daily_budget_cents ? ` · ${money(live.daily_budget_cents)}/day` : ""} · ` : ""}
                      {moneyExact(c.spendCents)} · {c.platformLeads} leads{c.costPerPlatformLeadCents !== null ? ` · ${money(c.costPerPlatformLeadCents)} each` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">No campaign spent in this window.</p>
          )}
          <p className="mt-2 text-[11px] text-[var(--quiet)]">
            Read {ads.cached ? "from the last ten minutes" : "just now"} at {formatCentral(new Date(ads.generatedAt))}. Read only.
          </p>
        </div>
      )}
    </section>
  );
}

export function BreakEvenPanel({ counter, paid28Cents }: { counter: BreakEven | null; paid28Cents: number }) {
  return (
    <section className="rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5">
      <h3 className="font-black text-[var(--heading)]">The number</h3>
      {counter ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Tile label="Known monthly costs" value={money(counter.monthlyCostsCents)} detail="What the owner typed into the server's env file. Change it there when a bill changes." />
          <Tile label="Paid · last 28 days" value={moneyExact(counter.paidCents)} detail={counter.marginCents >= 0 ? `${money(counter.marginCents)} past the costs. Profit zone.` : `${money(-counter.marginCents)} short of the month's costs.`} tone={counter.marginCents >= 0 ? "good" : "warn"} />
          <Tile
            label="Clients to cover it"
            value={String(counter.clientsRemaining)}
            detail={`At ${money(counter.pricePerClientCents)} up front. ${counter.clientsToCover} from zero; ${counter.clientsRemaining} still to close this month.`}
            tone={counter.clientsRemaining === 0 ? "good" : "plain"}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text)]">
          Type the month&apos;s known costs into <code className="rounded bg-[var(--fill-2)] px-1">COMMAND_CENTER_MONTHLY_COSTS_USD</code> on the server and this becomes the live counter: costs, money in, and how many clients at the campaign price put the month in the profit zone. Paid in the last 28 days so far: {moneyExact(paid28Cents)}.
        </p>
      )}
    </section>
  );
}

export function PeopleLine({ board }: { board: MoneyBoard }) {
  return (
    <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
      <Users className="h-3.5 w-3.5" aria-hidden="true" />
      Stages right now: {board.stages.contacted} contacted · {board.stages.booked} booked · {board.stages.proposal} proposal.
    </p>
  );
}
