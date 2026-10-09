import Link from "next/link";
import { ChevronRight, Mail, MessageSquare, Phone } from "lucide-react";
import { formatCentral } from "@/lib/businessTime";
import { CALL_PLANS, CALL_WINDOW, EMAIL_SERIES, PROPOSAL_FOLLOW_UP_DAYS, companionCounts, seriesLength, type CallStep, type PlanId } from "@/lib/followUpPlan";
import { ACTION_LABELS, GROUP_LABELS, type NextAction, type NextActionBoard } from "@/lib/nextAction";
import { scriptFirstName, scriptsFor, type Script } from "@/lib/nextActionTemplates";
import { VERDICT_LABELS, VERDICT_ORDER, type Scorecard, type SignalVerdict } from "@/lib/growthSignals";
import { dialHref, formatPhone } from "@/lib/salesQueue";
import CopyButton from "./CopyButton";

// The Next actions page, drawn. Everything on it is computed by
// lib/nextAction.ts, lib/followUpPlan.ts, lib/nextActionTemplates.ts and
// lib/growthSignals.ts; this file only lays it out, phone first.
//
// Nothing here sends anything. Call and Text hand off to the phone's own
// dialer and messages app, Email opens the person's own mail app with the
// script filled in, and Copy puts a script on the clipboard. A text button and
// a text script appear only with recorded consent and no STOP.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const PANEL = "rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5";
const PRIMARY = `inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--blue)] px-4 text-sm font-bold text-white ${FOCUS}`;
const OUTLINE = `inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-4 text-sm font-bold text-[var(--text)] ${FOCUS}`;
const QUIET = `inline-flex min-h-[44px] items-center gap-1 px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`;
const EYEBROW = "text-[11px] font-black uppercase tracking-[0.22em] text-[var(--blue)]";

/** Rows shown before the list is cut with a count. A person works from the top. */
export const DUE_LIMIT = 30;
export const UPCOMING_LIMIT = 12;
/** leads.source for somebody who called or texted the line and never filled out a form. */
const PHONE_SOURCES = new Set(["quo_inbound", "quo_call"]);

function lateness(row: NextAction): { text: string; late: boolean } | null {
  if (!row.dueAt) return null;
  if (!row.due) return { text: `Due ${formatCentral(new Date(row.dueAt))}`, late: false };
  const hours = row.overdueHours;
  if (hours < 1) return { text: "Due now", late: true };
  if (hours < 48) return { text: `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"} late`, late: true };
  const days = Math.round(hours / 24);
  return { text: `${days} day${days === 1 ? "" : "s"} late`, late: true };
}

function mailto(email: string, script: Script | undefined): string {
  if (!script) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(script.subject ?? "")}&body=${encodeURIComponent(script.body)}`;
}

function ScriptBlock({ script }: { script: Script }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--fill-1)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">{script.title}</p>
        {script.channel === "checklist" ? null : <CopyButton text={script.subject ? `${script.subject}\n\n${script.body}` : script.body} label={script.title} />}
      </div>
      {script.subject ? <p className="mt-2 text-sm font-bold text-[var(--heading)]">Subject: {script.subject}</p> : null}
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--text)]">{script.body}</p>
    </div>
  );
}

function ActionRow({ row, sender }: { row: NextAction; sender: string | null }) {
  const lead = row.lead;
  // The phone system's own name for a number ("Unknown") is not printed as if it were a person's.
  const title = lead.unknown_caller ? "Unknown number" : lead.business_name || lead.full_name || "Unnamed lead";
  const tel = dialHref(lead.phone, "tel");
  const sms = lead.can_text ? dialHref(lead.phone, "sms") : null;
  const due = lateness(row);
  const scripts = scriptsFor(row.templateKeys, {
    firstName: scriptFirstName(lead.full_name),
    service: lead.service,
    group: lead.group,
    day: row.day,
    sender,
    contractor: lead.series === "contractor_owner" || lead.group !== null || Boolean(lead.service),
    byPhone: PHONE_SOURCES.has(lead.source ?? ""),
  });
  const emailScript = scripts.find((s) => s.channel === "email");
  const reading = [row.opens ? `${row.opens} email${row.opens === 1 ? "" : "s"} opened` : "", row.clicks ? `${row.clicks} link${row.clicks === 1 ? "" : "s"} clicked` : ""].filter(Boolean).join(" · ");
  return (
    <li className="px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--quiet)]">
            {ACTION_LABELS[row.kind]}
            {lead.group ? ` · ${GROUP_LABELS[lead.group]}` : ""}
          </p>
          <p className="mt-0.5 truncate font-black text-[var(--heading)]">{title}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {!lead.unknown_caller && lead.business_name && lead.full_name ? `${lead.full_name} · ` : ""}
            {lead.phone ? formatPhone(lead.phone) : "no phone on file"}
          </p>
          <p className="mt-2 text-xl font-black tabular-nums text-[var(--heading)]">{row.headline}</p>
          {due ? <p className={`text-xs font-bold ${due.late ? "text-[var(--warn)]" : "text-[var(--muted)]"}`}>{due.text}</p> : null}
          <p className="mt-1 text-sm text-[var(--text)]">{row.why}</p>
          <p className="mt-2 text-xs font-bold text-[var(--muted)]">
            {row.position}
            {reading ? ` · ${reading}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          {tel ? (
            <a href={tel} className={PRIMARY} aria-label={`Call ${title}`}>
              <Phone className="h-4 w-4" aria-hidden="true" /> Call
            </a>
          ) : null}
          {sms ? (
            <a href={sms} className={OUTLINE} aria-label={`Text ${title}`}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" /> Text
            </a>
          ) : null}
          {lead.can_email && lead.email ? (
            <a href={mailto(lead.email, emailScript)} className={OUTLINE} aria-label={`Email ${title}`}>
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </a>
          ) : null}
          <Link href={row.href} className={QUIET} aria-label={`Log the outcome for ${title}`}>
            Log the outcome <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {scripts.length > 0 ? (
        <details className="mt-3">
          <summary className={`inline-flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-[var(--blue)] ${FOCUS}`}>What to say</summary>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {scripts.map((s) => (
              <ScriptBlock key={s.key} script={s} />
            ))}
          </div>
        </details>
      ) : null}
    </li>
  );
}

function RowList({ rows, sender }: { rows: NextAction[]; sender: string | null }) {
  return (
    <ol className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
      {rows.map((row) => (
        <ActionRow key={row.lead.id} row={row} sender={sender} />
      ))}
    </ol>
  );
}

const VERDICT_TONE: Record<SignalVerdict, string> = {
  fix: "border-[var(--danger-line)] bg-[var(--danger-tint)]",
  less: "border-[var(--warn-line)] bg-[var(--warn-tint)]",
  more: "border-[var(--green-line)] bg-[var(--green-tint)]",
  keep: "border-[var(--green-line)] bg-[var(--panel)]",
  watch: "border-[var(--line)] bg-[var(--panel)]",
};

export function ScorecardPanel({ score, adsNote }: { score: Scorecard; adsNote: string | null }) {
  return (
    <section className={PANEL} aria-labelledby="scorecard-title">
      <p className={EYEBROW}>Last {score.days} days</p>
      <h3 id="scorecard-title" className="mt-1 text-xl font-black text-[var(--heading)]">
        The numbers, and what they say to do
      </h3>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {score.kpis.map((k) => (
          <div key={k.key} className={`rounded-2xl border p-4 ${k.tone === "warn" ? "border-[var(--warn-line)] bg-[var(--warn-tint)]" : k.tone === "good" ? "border-[var(--green-line)] bg-[var(--green-tint)]" : "border-[var(--line)] bg-[var(--panel)]"}`}>
            <dt className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{k.label}</dt>
            <dd className="mt-1 text-3xl font-black tabular-nums text-[var(--heading)]">{k.value}</dd>
            <dd className="mt-1 text-xs text-[var(--muted)]">{k.detail}</dd>
          </div>
        ))}
      </dl>
      {adsNote ? <p className="mt-3 text-xs text-[var(--muted)]">{adsNote}</p> : null}
      {score.signals.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--text)]">Nothing stands out in this window. That is a read of the records, not a loading error.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {VERDICT_ORDER.flatMap((verdict) =>
            score.signals
              .filter((s) => s.verdict === verdict)
              .map((s) => (
                <li key={s.id} className={`rounded-2xl border px-4 py-3 ${VERDICT_TONE[s.verdict]}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{VERDICT_LABELS[s.verdict]}</p>
                  <p className="mt-0.5 font-black text-[var(--heading)]">{s.title}</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{s.detail}</p>
                  <p className="mt-1 text-sm font-bold text-[var(--heading)]">{s.action}</p>
                </li>
              )),
          )}
        </ul>
      )}
    </section>
  );
}

const SLOT_WORDS: Record<CallStep["slot"], string> = { now: "right away", later: "a few hours later", morning: "morning", afternoon: "afternoon" };

function PlanTable({ planId }: { planId: PlanId }) {
  const plan = CALL_PLANS[planId];
  const counts = companionCounts(planId);
  const last = plan.steps[plan.steps.length - 1];
  return (
    <div className="rounded-2xl border border-[var(--line)] p-4">
      <p className="font-black text-[var(--heading)]">
        {plan.name}: {plan.steps.length} calls over {last.day} days
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">{plan.who}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        With {counts.voicemail} voicemails, up to {counts.text} texts and {counts.email} personal emails when nobody picks up.
      </p>
      <ol className="mt-3 space-y-1 text-sm text-[var(--text)]">
        {plan.steps.map((s) => (
          <li key={s.n} className="flex gap-2">
            <span className="w-14 shrink-0 font-black tabular-nums text-[var(--heading)]">Call {s.n}</span>
            <span>
              Day {s.day}, {SLOT_WORDS[s.slot]}. {s.label}.{s.with.length ? ` No answer: ${s.with.join(", ")}.` : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PlanPanel() {
  const contractor = EMAIL_SERIES.find((s) => s.key === "contractor_owner");
  return (
    <section className={PANEL} aria-labelledby="plan-title">
      <details>
        <summary className={`cursor-pointer text-xl font-black text-[var(--heading)] ${FOCUS}`} id="plan-title">
          The plan every lead is on
        </summary>
        <p className="mt-3 text-sm text-[var(--text)]">
          Calls go out Monday to Saturday, {CALL_WINDOW.startHour}:00 AM to {CALL_WINDOW.endHourExclusive - 12}:00 PM Central. A time a person promised always wins over the plan. A text only goes to
          someone with texting consent on file and no STOP.
        </p>
        {contractor ? (
          <p className="mt-2 text-sm text-[var(--text)]">
            Emails are automatic and already running: the contractor series is a welcome plus {seriesLength(contractor)} emails over {contractor.lastDay} days, {seriesLength(contractor) + 1} in all. It stops
            on its own when the lead books, gets a proposal, is won or lost, or unsubscribes.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--text)]">
          After a proposal goes out: {PROPOSAL_FOLLOW_UP_DAYS.length} follow-ups, on days {PROPOSAL_FOLLOW_UP_DAYS.join(", ")}. Then it is a yes, a no, or parked for 30 days.
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <PlanTable planId="full" />
          <PlanTable planId="standard" />
          <PlanTable planId="light" />
        </div>
      </details>
    </section>
  );
}

export default function NextActionsView({
  board,
  line,
  sender,
  listHref,
}: {
  board: NextActionBoard;
  /** The one sentence at the top (lib/nextAction.ts nextActionLine). */
  line: string;
  /** Who is making the calls, for the scripts. */
  sender: string | null;
  /** Where "the whole list" goes: the call sheet for admins, Today for the sales desk. */
  listHref: string;
}) {
  const today = board.today.slice(0, DUE_LIMIT);
  const backlog = board.backlog.slice(0, DUE_LIMIT);
  const upcoming = board.upcoming.slice(0, UPCOMING_LIMIT);
  const stale = board.rows.filter((r) => r.kind === "stale");
  const done = board.rows.filter((r) => r.kind === "email_only");
  const callers = board.rows.filter((r) => r.kind === "sort_caller");
  return (
    <div className="space-y-6">
      <section className={PANEL} aria-labelledby="due-title">
        <p className={EYEBROW}>Do this now</p>
        <h3 id="due-title" className="mt-1 text-xl font-black text-[var(--heading)]">
          {board.today.length === 0 ? "Nothing new is due" : `${board.today.length} due`}
        </h3>
        <p className="mt-1 text-sm text-[var(--text)]">{line}</p>
        <div className="mt-4">
          {today.length === 0 ? (
            <p className="rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-3 text-sm text-[var(--text)]">
              {board.backlog.length === 0
                ? "Nobody is owed a call, a reply or a follow-up right now, by the record. That is the whole list, not a loading error."
                : "Nothing from the last week is waiting, by the record. The older follow-ups are in the backlog below."}
            </p>
          ) : (
            <RowList rows={today} sender={sender} />
          )}
        </div>
        {board.today.length > today.length ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Showing the first {today.length} of {board.today.length}. Work from the top; the rest move up as these are logged.
          </p>
        ) : null}
        <p className="mt-3 text-xs text-[var(--muted)]">
          This list only knows what is on the record. After each call, save the outcome so the count moves. Then move the lead in Meta&apos;s Leads Center too: Meta uses those stages to look for more
          people like your best leads.{" "}
          <Link href={listHref} className={`font-bold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`}>
            See the whole call list
          </Link>
        </p>
      </section>

      {board.backlog.length > 0 ? (
        <section className={PANEL} aria-labelledby="backlog-title">
          <details>
            <summary id="backlog-title" className={`cursor-pointer text-xl font-black text-[var(--heading)] ${FOCUS}`}>
              Backlog: {board.backlog.length} follow-up{board.backlog.length === 1 ? "" : "s"} more than a week late
            </summary>
            <p className="mt-3 text-sm text-[var(--text)]">
              Real follow-ups, each more than a week past due, kept under today&apos;s work so they do not bury it. Give each one a call, or close it.
            </p>
            <div className="mt-4">
              <RowList rows={backlog} sender={sender} />
            </div>
            {board.backlog.length > backlog.length ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Showing the first {backlog.length} of {board.backlog.length}.
              </p>
            ) : null}
          </details>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className={PANEL} aria-labelledby="upcoming-title">
          <p className={EYEBROW}>Coming up</p>
          <h3 id="upcoming-title" className="mt-1 text-xl font-black text-[var(--heading)]">
            Next on the plan
          </h3>
          <div className="mt-4">
            <RowList rows={upcoming} sender={sender} />
          </div>
          {board.upcoming.length > upcoming.length ? <p className="mt-3 text-sm text-[var(--muted)]">And {board.upcoming.length - upcoming.length} more after these.</p> : null}
        </section>
      ) : null}

      {callers.length > 0 ? (
        <section className={PANEL} aria-labelledby="callers-title">
          <details>
            <summary id="callers-title" className={`cursor-pointer text-xl font-black text-[var(--heading)] ${FOCUS}`}>
              Unknown callers: {callers.length} to name or close
            </summary>
            <p className="mt-3 text-sm text-[var(--text)]">
              The phone line saves a lead record for every number it does not know, sales calls and robocalls included. These are not due and are not counted as leads. Put a name on the real ones.
              Close the rest.
            </p>
            <div className="mt-4">
              <RowList rows={callers.slice(0, DUE_LIMIT)} sender={sender} />
              {callers.length > DUE_LIMIT ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Showing the first {DUE_LIMIT} of {callers.length}.
                </p>
              ) : null}
            </div>
          </details>
        </section>
      ) : null}

      {stale.length > 0 || done.length > 0 ? (
        <section className={PANEL} aria-labelledby="apart-title">
          <details>
            <summary id="apart-title" className={`cursor-pointer text-xl font-black text-[var(--heading)] ${FOCUS}`}>
              Off the plan: {stale.length} past it, {done.length} with every call made
            </summary>
            <p className="mt-3 text-sm text-[var(--text)]">
              These are not due and are not counted above. Past the plan means the lead sat beyond its last call day with no call on the record, or has had nothing on the record for a month. Give each
              one call, or close it.
            </p>
            {stale.length > 0 ? (
              <div className="mt-4">
                <RowList rows={stale.slice(0, DUE_LIMIT)} sender={sender} />
                {stale.length > DUE_LIMIT ? <p className="mt-3 text-sm text-[var(--muted)]">Showing the first {DUE_LIMIT} of {stale.length}.</p> : null}
              </div>
            ) : null}
            {done.length > 0 ? (
              <div className="mt-4">
                <RowList rows={done.slice(0, DUE_LIMIT)} sender={sender} />
              </div>
            ) : null}
          </details>
        </section>
      ) : null}
    </div>
  );
}
