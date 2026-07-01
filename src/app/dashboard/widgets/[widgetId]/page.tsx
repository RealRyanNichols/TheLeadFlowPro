import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Code2, ExternalLink } from "lucide-react";
import { getAdminWidgetDetailData } from "@/lib/leadflow-widgets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Widget Detail | The LeadFlow Pro",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default async function DashboardWidgetDetailPage({ params }: { params: { widgetId: string } }) {
  const data = await getAdminWidgetDetailData(params.widgetId);
  const summary = data.currentWidget;

  if (!summary) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#060a11]/92 p-8 text-white">
        <Link href="/dashboard/widgets" className="inline-flex items-center gap-2 text-sm font-black text-cyan-200">
          <ArrowLeft className="h-4 w-4" /> Back to widgets
        </Link>
        <h1 className="mt-6 text-4xl font-black">Widget not found.</h1>
        <p className="mt-3 text-ink-300">Create the widget first or check the slug.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),linear-gradient(135deg,#07101b,#050711)] p-5 text-white shadow-2xl shadow-black/30 md:p-7">
        <Link href="/dashboard/widgets" className="inline-flex items-center gap-2 text-sm font-black text-cyan-200">
          <ArrowLeft className="h-4 w-4" /> Back to widgets
        </Link>
        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
              <Code2 className="h-4 w-4" />
              {summary.widget.status.replace(/_/g, " ")}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">{summary.widget.name}</h1>
            <p className="mt-3 font-mono text-sm text-ink-400">{summary.widget.slug}</p>
          </div>
          <Link href={`/widgets/${summary.widget.slug}/embed`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50">
            Preview <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-6">
        <Stat label="Loads" value={String(summary.loads)} />
        <Stat label="Starts" value={String(summary.starts)} />
        <Stat label="Completions" value={String(summary.completions)} />
        <Stat label="Contacts" value={String(summary.contacts)} />
        <Stat label="Conversion" value={`${summary.conversionRate}%`} />
        <Stat label="Avg score" value={String(summary.averageScore)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[460px_minmax(0,1fr)]">
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 text-white shadow-2xl shadow-black/25">
          <h2 className="text-2xl font-black">Embed code</h2>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-xs leading-6 text-cyan-50">{data.embedCode}</pre>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-ink-300">
            <p><strong className="text-white">Allowed domains:</strong> {summary.widget.allowed_domains?.join(", ") || "*"}</p>
            <p><strong className="text-white">Consent:</strong> {summary.widget.consent_required ? "required" : "not required"}</p>
            <p><strong className="text-white">Updated:</strong> {formatDate(summary.widget.updated_at)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 text-white shadow-2xl shadow-black/25">
          <h2 className="text-2xl font-black">Recent submissions</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr>
                  {["Submission", "Domain", "Score", "Tags", "Created"].map((header) => (
                    <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-black uppercase tracking-wider text-ink-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.submissions.length ? data.submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-400">{submission.id.slice(0, 8)}</td>
                    <td className="border-t border-white/10 px-3 py-3 text-ink-200">{submission.domain || "unknown"}</td>
                    <td className="border-t border-white/10 px-3 py-3 font-black text-white">{submission.score || "0"}</td>
                    <td className="border-t border-white/10 px-3 py-3 text-ink-300">{submission.tags?.slice(0, 4).join(", ") || "none"}</td>
                    <td className="border-t border-white/10 px-3 py-3 text-ink-400">{formatDate(submission.created_at)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No submissions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 text-white shadow-2xl shadow-black/25">
        <h2 className="text-2xl font-black">Recent widget events</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.events.slice(0, 18).map((event) => (
            <article key={event.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-black text-white">{event.event_name.replace(/_/g, " ")}</p>
              <p className="mt-1 text-xs text-ink-500">{event.domain || "unknown domain"} | {formatDate(event.created_at)}</p>
              <p className="mt-2 font-mono text-[11px] leading-5 text-ink-400">
                {Object.keys(event.properties || {}).slice(0, 8).join(", ") || "safe event"}
              </p>
            </article>
          ))}
          {!data.events.length ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center text-sm text-ink-300">Events appear after embeds load, start, complete, or request contact.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 text-white shadow-2xl shadow-black/20">
      <p className="text-xs font-black uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
