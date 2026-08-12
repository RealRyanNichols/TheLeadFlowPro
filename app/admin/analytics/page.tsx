import { createClient } from "@/lib/supabase/server";

type Summary = {
  total_views: number;
  unique_visitors: number;
  total_leads: number;
  total_registrations: number;
  views_by_day: { day: string; views: number }[];
  top_pages: { path: string; views: number }[];
  top_sources: { source: string; views: number }[];
  leads_by_source: { source: string; leads: number }[];
};

export default async function AdminAnalytics() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("analytics_summary", { days: 30 });
  const s = (data ?? {
    total_views: 0,
    unique_visitors: 0,
    total_leads: 0,
    total_registrations: 0,
    views_by_day: [],
    top_pages: [],
    top_sources: [],
    leads_by_source: [],
  }) as Summary;

  const maxDay = Math.max(1, ...s.views_by_day.map((d) => d.views));

  return (
    <div>
      <p className="mb-6 text-[var(--muted)]">
        Last 30 days. First-party data from YOUR database — no Google Analytics
        account required. Once your Meta Pixel and Google tag are in Settings,
        the ad platforms get their own copy for optimization.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-[var(--heading)]">{s.total_views}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Page views</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-flow-400">{s.unique_visitors}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Visitors</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-warn">{s.total_leads}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Leads</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-mint">{s.total_registrations}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Event signups</div>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 font-bold text-[var(--heading)]">Views by day</h2>
        <div className="flex h-32 items-end gap-1">
          {s.views_by_day.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No traffic logged yet.</p>
          )}
          {s.views_by_day.map((d) => (
            <div key={d.day} className="group relative flex-1">
              <div
                className="rounded-t bg-flow-500 transition group-hover:bg-flow-400"
                style={{ height: `${Math.max(4, (d.views / maxDay) * 120)}px` }}
              />
              <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-line px-1.5 py-0.5 text-[10px] text-[var(--heading)] group-hover:block">
                {d.day.slice(5)}: {d.views}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="card">
          <h2 className="mb-3 font-bold text-[var(--heading)]">Top pages</h2>
          <ul className="space-y-2 text-sm">
            {s.top_pages.map((p) => (
              <li key={p.path} className="flex justify-between gap-2">
                <span className="truncate text-[var(--text)]">{p.path}</span>
                <span className="font-bold text-flow-400">{p.views}</span>
              </li>
            ))}
            {s.top_pages.length === 0 && <li className="text-[var(--muted)]">No data yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold text-[var(--heading)]">Traffic sources (UTM)</h2>
          <ul className="space-y-2 text-sm">
            {s.top_sources.map((p) => (
              <li key={p.source} className="flex justify-between gap-2">
                <span className="truncate text-[var(--text)]">{p.source}</span>
                <span className="font-bold text-flow-400">{p.views}</span>
              </li>
            ))}
            {s.top_sources.length === 0 && <li className="text-[var(--muted)]">No data yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-3 font-bold text-[var(--heading)]">Leads by source</h2>
          <ul className="space-y-2 text-sm">
            {s.leads_by_source.map((p) => (
              <li key={p.source} className="flex justify-between gap-2">
                <span className="truncate text-[var(--text)]">{p.source}</span>
                <span className="font-bold text-mint">{p.leads}</span>
              </li>
            ))}
            {s.leads_by_source.length === 0 && <li className="text-[var(--muted)]">No data yet.</li>}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Ad campaign tip: tag every ad URL with UTMs, e.g.
        theleadflowpro.com/go?utm_source=facebook&utm_medium=paid&utm_campaign=own-your-platform
        — leads and views will attribute automatically in these tables.
      </p>
    </div>
  );
}
