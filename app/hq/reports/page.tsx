import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
export const metadata = PRIVATE_PAGE_METADATA;

import Link from "next/link";
import { redirect } from "next/navigation";
import { getHqSession } from "@/lib/hq/session";
import { listConnections, listLeads } from "@/lib/hq/server";
import { buildAdsWeeklyReport, usdCents, type WeeklyAdsReport } from "@/lib/ads/report";
import { listAdsDaily } from "@/lib/ads/server";
import { SAMPLE_LABEL, SAMPLE_NOW, sampleAdsRows, sampleLeads, sampleWorkspace } from "@/lib/ads/fixtures";
import { PLATFORM_LABEL } from "@/lib/ads/types";
import CopyButton from "../_components/CopyButton";

// The weekly ads report, built live from this workspace's own ad rows and
// its own lead list. A business with no ad account connected sees the
// fictional sample, labelled as such on every screen, so the owner can see
// what the report looks like before connecting anything. Nothing on this
// page sends the email: the draft is here to copy or to approve later.

export const dynamic = "force-dynamic";

function isoShift(at: Date, days: number): string {
  return new Date(at.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export default async function HqReportsPage() {
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq/reports");
  if (!session.workspace) redirect("/hq/start");
  const ws = session.workspace;
  const now = new Date();

  let report: WeeklyAdsReport;
  let sample = false;
  let connected: string[] = [];
  try {
    const [rows, leads, connections] = await Promise.all([
      listAdsDaily(session.db, ws.id, { start: isoShift(now, -15), end: isoShift(now, 0) }),
      listLeads(session.db, ws.id, { limit: 1000, sinceDays: 30 }),
      listConnections(session.db, ws.id),
    ]);
    connected = connections.filter((c) => (c.kind === "meta_ads" || c.kind === "google_ads") && c.status === "connected").map((c) => c.kind);
    if (rows.length === 0 && connected.length === 0) {
      sample = true;
      report = buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: sampleAdsRows(), leads: sampleLeads(), now: SAMPLE_NOW });
    } else {
      report = buildAdsWeeklyReport({ workspace: ws, rows, leads, now });
    }
  } catch {
    // The ads tables may not exist yet on this database: show the sample rather than a blank page.
    sample = true;
    report = buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: sampleAdsRows(), leads: sampleLeads(), now: SAMPLE_NOW });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="hq-eyebrow">Ads report</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--heading)]">{sample ? "What your weekly ads report will look like" : report.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text)]">
          Spend from your own ad account, leads from your own list, and one decision for the week. Every term is defined at the bottom. Nothing is estimated.
        </p>
      </header>

      {sample && (
        <section className="hq-card mb-6 border-[var(--warn-line)] bg-[var(--warn-tint)]" role="status">
          <p className="text-sm font-bold text-[var(--heading)]">{SAMPLE_LABEL}</p>
          <p className="mt-1 text-sm text-[var(--text)]">
            No ad account is connected to {ws.name} yet. Connecting one is done with Ryan on a call so the token stays in your name and your account.{" "}
            <Link href="/agency/meta-ads" className="font-bold text-[var(--blue)] underline">
              How ads management works
            </Link>
            .
          </p>
        </section>
      )}

      {!sample && !report.hasAdsData && (
        <section className="hq-card mb-6" role="status">
          <p className="text-sm text-[var(--text)]">
            {connected.length ? `Connected: ${connected.map((k) => (k === "meta_ads" ? "Meta" : "Google")).join(", ")}. ` : ""}
            No spend rows have been pulled for this week yet.
          </p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {report.platforms.map((p) => (
          <article key={p.platform} className="hq-card">
            <p className="hq-eyebrow">{p.label}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Spend</dt>
                <dd className="text-xl font-black text-[var(--heading)]">{usdCents(p.spendCents, p.currency)}</dd>
                {p.priorSpendCents !== null && <dd className="text-xs text-[var(--muted)]">Prior week {usdCents(p.priorSpendCents, p.currency)}</dd>}
              </div>
              <div>
                <dt className="text-[var(--muted)]">Leads (your records)</dt>
                <dd className="text-xl font-black text-[var(--heading)]">{p.leads}</dd>
                {p.priorLeads !== null && <dd className="text-xs text-[var(--muted)]">Prior week {p.priorLeads}</dd>}
              </div>
              <div>
                <dt className="text-[var(--muted)]">Cost per lead</dt>
                <dd className="text-xl font-black text-[var(--heading)]">{p.costPerLeadCents === null ? "n/a" : usdCents(p.costPerLeadCents, p.currency)}</dd>
                {p.priorCostPerLeadCents !== null && <dd className="text-xs text-[var(--muted)]">Prior week {usdCents(p.priorCostPerLeadCents, p.currency)}</dd>}
              </div>
              <div>
                <dt className="text-[var(--muted)]">Platform-reported leads</dt>
                <dd className="text-xl font-black text-[var(--heading)]">{p.platformLeads}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-[var(--text)]">
              Contacted {p.contacted} of {p.leads}. Booked {p.booked}. Won {p.won}
              {p.wonValueCents !== null ? ` (${usdCents(p.wonValueCents)} recorded)` : ""}.
            </p>
            {p.campaigns.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-[var(--text)]">
                {p.campaigns.map((c) => (
                  <li key={c.campaign}>
                    <span className="font-bold">{c.campaign}</span>: {usdCents(c.spendCents, p.currency)}, {c.leads} in your records, {c.platformLeads} platform-reported
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <section className="hq-card mt-6">
        <p className="hq-eyebrow">One decision for this week</p>
        <h2 className="mt-2 text-lg font-black text-[var(--heading)]">{report.decision.headline}</h2>
        <p className="mt-2 text-sm text-[var(--text)]">{report.decision.why}</p>
      </section>

      <section className="hq-card mt-6">
        <p className="hq-eyebrow">Trace the sale</p>
        <p className="mt-2 text-sm text-[var(--text)]">
          {report.chain.leads} ad leads → {report.chain.contacted} contacted → {report.chain.booked} booked → {report.chain.won} won
          {report.chain.wonValueCents !== null ? ` (${usdCents(report.chain.wonValueCents)} recorded)` : ""}
        </p>
        {report.trace.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Arrived</th>
                  <th className="py-2 pr-3">Lead</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {report.trace.map((t) => (
                  <tr key={t.leadId} className="border-t border-[var(--line)]">
                    <td className="py-2 pr-3 whitespace-nowrap">{t.arrived}</td>
                    <td className="py-2 pr-3">{sample ? t.name : <Link href={`/hq/leads/${t.leadId}`} className="font-bold text-[var(--blue)]">{t.name}</Link>}</td>
                    <td className="py-2 pr-3">
                      {PLATFORM_LABEL[t.platform]}
                      {t.campaign ? ` / ${t.campaign}` : ""}
                    </td>
                    <td className="py-2 pr-3">{t.action}</td>
                    <td className="py-2">{t.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No ad-tagged leads this week.</p>
        )}
      </section>

      <section className="hq-card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="hq-eyebrow">Email draft</p>
            <p className="mt-1 text-sm text-[var(--text)]">The same report as plain text. Nothing is sent from this page.</p>
          </div>
          <CopyButton value={report.text} label="Copy report" />
        </div>
        <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-[var(--fill-2)] p-4 text-xs leading-relaxed text-[var(--text)]">{report.text}</pre>
      </section>

      <section className="hq-card mt-6">
        <p className="hq-eyebrow">Definitions</p>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          {report.definitions.map((d) => (
            <div key={d.term}>
              <dt className="font-bold text-[var(--heading)]">{d.term}</dt>
              <dd className="text-[var(--text)]">{d.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
