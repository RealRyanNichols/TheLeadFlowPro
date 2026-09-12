import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Phone, Sparkles, X } from "lucide-react";
import { getHqSession } from "@/lib/hq/session";
import { listContent, listEvents, listLeads } from "@/lib/hq/server";
import { buildDailyBrief } from "@/lib/hq/brief";
import { profileGaps } from "@/lib/hq/settings";
import { localClock, localDateShift, localParts } from "@/lib/hq/time";
import { HQ_PLAN, planIsLive, type Lead } from "@/lib/hq/types";
import LogTouch from "./_components/LogTouch";

// Today. The daily brief, built live from this workspace's own rows every
// time the page loads, so what the owner reads here is the same thing the
// engine emails at the brief hour and the same thing the assistant reads
// back. Every number on this page counts real leads. Nothing is estimated.

export const dynamic = "force-dynamic";

const TONE_ATTR: Record<string, string | undefined> = { good: "good", warn: "warn", bad: "bad", neutral: undefined };

function weekdayLabel(date: string): string {
  const at = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(at);
}

export default async function HqTodayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq");
  if (!session.workspace) redirect("/hq/start");

  const ws = session.workspace;
  const now = new Date();
  const [leads, events, content] = await Promise.all([
    listLeads(session.db, ws.id, { limit: 1000, sinceDays: 120 }),
    listEvents(session.db, ws.id, { sinceDays: 14, limit: 500 }),
    listContent(session.db, ws.id, { limit: 100 }),
  ]);

  const brief = buildDailyBrief({ workspace: ws, leads, events, content, now });
  const byId = new Map<string, Lead>(leads.map((l) => [l.id, l]));
  const gaps = profileGaps(ws);
  const live = planIsLive(ws.plan, ws.trial_ends_at, now);
  const welcome = params.welcome === "1";

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = localDateShift(now, ws.timezone, i - 6);
    return {
      date,
      label: weekdayLabel(date),
      count: leads.filter((l) => l.status !== "spam" && localParts(new Date(l.created_at), ws.timezone).date === date).length,
    };
  });
  const chartMax = Math.max(1, ...days.map((d) => d.count));
  const weekTotal = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {welcome && (
        <section className="hq-card mb-6 border-[var(--accent-line)] bg-[var(--accent-tint)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="hq-eyebrow text-[var(--blue)]">You are in</p>
              <h2 className="mt-1 text-xl font-black text-[var(--heading)]">Welcome to HQ, {ws.owner_name?.split(" ")[0] || ws.name}.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text)]">
                Autopilot is running for {ws.name}. Next: install the plugin in ChatGPT or Claude so you can ask it who to call, and point your website
                form at your lead endpoint so new leads land here on their own.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/hq/plugin" className="pro-buy-button">
                  Install the plugin
                </Link>
                <Link href="/hq/settings" className="hq-btn">
                  Connect your channels
                </Link>
              </div>
            </div>
            <Link href="/hq" className="hq-btn hq-btn-sm" aria-label="Dismiss the welcome message">
              <X aria-hidden="true" className="h-4 w-4" /> Dismiss
            </Link>
          </div>
        </section>
      )}

      {!live && (
        <section className="hq-card mb-6 border-[var(--danger-line)] bg-[var(--danger-tint)]">
          <div className="flex flex-wrap items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none text-[var(--danger)]" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-[var(--heading)]">Autopilot is paused</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text)]">
                {ws.plan === "canceled"
                  ? "Your plan is canceled, so nothing is answering leads, sending alerts or drafting follow-ups right now. Your leads and history are still here."
                  : "There is no active plan on this workspace yet, so nothing is answering leads, sending alerts or drafting follow-ups. Your leads and history are still here."}{" "}
                Restart it for ${HQ_PLAN.priceUsd} a month.
              </p>
              <Link href="/hq/billing" className="pro-buy-button mt-4">
                Restart the plan
              </Link>
            </div>
          </div>
        </section>
      )}

      {gaps.length > 0 && (
        <section className="hq-card mb-6">
          <div className="flex flex-wrap items-start gap-3">
            <ClipboardList aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none text-[var(--blue)]" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-[var(--heading)]">Finish your setup</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Drafts and alerts use these. Until they are filled in, the messages Autopilot writes will read generic.
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {gaps.map((gap) => (
                  <li key={gap} className="flex items-center gap-2 text-sm text-[var(--text)]">
                    <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-[var(--warn)]" />
                    Missing: {gap}
                  </li>
                ))}
              </ul>
              <Link href="/hq/settings" className="hq-btn mt-4">
                Fill these in <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <header>
        <p className="hq-eyebrow">{brief.title}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">{brief.headline}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Built from your own leads at {localClock(now, ws.timezone)} your time.
        </p>
      </header>

      <section aria-label="Today's numbers" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {brief.numbers.map((n) => (
          <div key={n.label} className="hq-tile" data-tone={TONE_ATTR[n.tone ?? "neutral"]}>
            <p className="hq-eyebrow">{n.label}</p>
            <p className="hq-tile-value mt-1">{n.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <div className="hq-card">
            <div className="flex items-center gap-2">
              <Phone aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="text-lg font-black text-[var(--heading)]">Call now</h2>
            </div>
            {brief.callNow.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Nobody is waiting on a first call. When a new lead lands, it shows up here with the reason to call and the number to dial.
              </p>
            ) : (
              <ul className="mt-2">
                {brief.callNow.map((c) => {
                  const lead = byId.get(c.leadId);
                  return (
                    <li key={c.leadId} className="hq-row">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link href={`/hq/leads/${c.leadId}`} className="text-base font-black text-[var(--heading)] hover:text-[var(--blue)]">
                          {c.name}
                        </Link>
                        <span className="text-xs font-bold text-[var(--muted)]">waiting {c.waiting}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{c.why}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {lead?.phone && (
                          <a href={`tel:${lead.phone}`} className="pro-buy-button">
                            <Phone aria-hidden="true" className="h-4 w-4" /> Call {c.phone}
                          </a>
                        )}
                        <Link href={`/hq/leads/${c.leadId}`} className="hq-btn">
                          Open the lead
                        </Link>
                      </div>
                      <div className="mt-3">
                        <LogTouch leadId={c.leadId} outcomes={["contacted", "no_answer", "booked"]} heading="Log the call" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="hq-card">
            <h2 className="text-lg font-black text-[var(--heading)]">Do this</h2>
            <ol className="mt-3 grid gap-2">
              {brief.actions.map((action, i) => (
                <li key={`${action.kind}-${i}`} className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-3">
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-[var(--accent-tint)] text-sm font-black text-[var(--blue)]"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--text)]">
                    {action.text}
                    {action.href && (
                      <>
                        {" "}
                        <Link href={action.href} className="font-bold text-[var(--blue)] hover:underline">
                          Open
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="hq-card">
            <h2 className="text-base font-black text-[var(--heading)]">Leads in the last 7 days</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {weekTotal === 0 ? "No leads yet this week." : `${weekTotal} lead${weekTotal === 1 ? "" : "s"}, spam left out.`}
            </p>
            <svg
              viewBox="0 0 280 96"
              className="mt-4 h-auto w-full"
              role="img"
              aria-label={`Leads per day for the last seven days. ${days.map((d) => `${d.label} ${d.count}`).join(", ")}.`}
            >
              {days.map((d, i) => {
                const x = i * 40 + 8;
                const height = Math.round((d.count / chartMax) * 40);
                return (
                  <g key={d.date}>
                    <rect x={x} y={24} width={24} height={40} rx={5} fill="var(--fill-3)" />
                    {d.count > 0 && <rect x={x} y={64 - height} width={24} height={height} rx={5} fill="var(--blue)" />}
                    <text x={x + 12} y={18} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--heading)">
                      {d.count}
                    </text>
                    <text x={x + 12} y={80} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--muted)">
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="hq-card">
            <h2 className="text-base font-black text-[var(--heading)]">Follow-ups</h2>
            {brief.followUps.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">Nothing due in the next day.</p>
            ) : (
              <ul className="mt-2">
                {brief.followUps.map((f) => (
                  <li key={f.leadId} className="hq-row flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[var(--heading)]">{f.name}</span>
                      <span className="text-xs text-[var(--muted)]">
                        Follow-up {f.step}
                        {f.phone ? ` · ${f.phone}` : ""}
                      </span>
                    </span>
                    <Link href={`/hq/leads/${f.leadId}`} className="hq-btn hq-btn-sm">
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="hq-card">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="text-base font-black text-[var(--heading)]">Waiting on your approval</h2>
            </div>
            {brief.approvals.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[var(--green)]" /> Nothing waiting.
              </p>
            ) : (
              <ul className="mt-2">
                {brief.approvals.map((a) => (
                  <li key={a.contentId} className="hq-row flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[var(--heading)]">{a.title}</span>
                      <span className="hq-eyebrow">{a.kind.replace("_", " ")}</span>
                    </span>
                    <Link href={`/hq/content#content-${a.contentId}`} className="hq-btn hq-btn-sm">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
