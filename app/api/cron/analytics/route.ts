import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  gscConfig,
  searchAnalytics,
  inspectUrl,
  verdictFromInspection,
} from "@/lib/analytics/gsc";

// Daily analytics maintenance (vercel.json cron):
//   1. Sync Search Console snapshots (site / page / query / page+query).
//   2. Refresh index monitoring for the priority URLs in settings.
//   3. Purge raw events past the retention window.
// Every step reports honestly into analytics_integrations — a failed sync is
// recorded as an error state, never papered over.

export const maxDuration = 120;

const BASE = "https://www.theleadflowpro.com";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ ok: true, skipped: "missing SUPABASE_SERVICE_ROLE_KEY" });
  }
  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const summary: Record<string, unknown> = {};

  async function setIntegration(key: string, status: string, detail: string, synced = false) {
    await supabase.from("analytics_integrations").upsert({
      key,
      status,
      detail,
      ...(synced ? { last_sync_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    });
  }

  // ---- 1. Search Console sync -------------------------------------------
  const config = gscConfig();
  if (!config) {
    await setIntegration(
      "search_console",
      "not_connected",
      "Add GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, and GSC_SITE_URL to enable Search Console sync."
    );
    await setIntegration(
      "url_inspection",
      "not_connected",
      "Uses the same Search Console service account; enables per-URL index verification."
    );
    summary.gsc = "not_configured";
  } else {
    try {
      // GSC data lags ~2 days; ask for a window ending 2 days ago.
      const end = new Date(Date.now() - 2 * 86400e3);
      const startSite = new Date(end.getTime() - 90 * 86400e3);
      const startDetail = new Date(end.getTime() - 28 * 86400e3);

      const siteRows = await searchAnalytics(config, {
        startDate: iso(startSite),
        endDate: iso(end),
        dimensions: ["date"],
      });
      if (siteRows.length > 0) {
        await supabase.from("gsc_site_daily").upsert(
          siteRows.map((r) => ({
            date: r.keys[0],
            clicks: Math.round(r.clicks),
            impressions: Math.round(r.impressions),
            ctr: r.ctr,
            position: r.position,
            fetched_at: new Date().toISOString(),
          }))
        );
      }

      const pageRows = await searchAnalytics(config, {
        startDate: iso(startDetail),
        endDate: iso(end),
        dimensions: ["date", "page"],
      });
      if (pageRows.length > 0) {
        await supabase.from("gsc_page_daily").upsert(
          pageRows.map((r) => ({
            date: r.keys[0],
            page: r.keys[1].slice(0, 500),
            clicks: Math.round(r.clicks),
            impressions: Math.round(r.impressions),
            ctr: r.ctr,
            position: r.position,
          }))
        );
      }

      const queryRows = await searchAnalytics(config, {
        startDate: iso(startDetail),
        endDate: iso(end),
        dimensions: ["date", "query"],
      });
      if (queryRows.length > 0) {
        await supabase.from("gsc_query_daily").upsert(
          queryRows.map((r) => ({
            date: r.keys[0],
            query: r.keys[1].slice(0, 300),
            clicks: Math.round(r.clicks),
            impressions: Math.round(r.impressions),
            ctr: r.ctr,
            position: r.position,
          }))
        );
      }

      const pageQueryRows = await searchAnalytics(config, {
        startDate: iso(startDetail),
        endDate: iso(end),
        dimensions: ["date", "page", "query"],
        rowLimit: 5000,
      });
      if (pageQueryRows.length > 0) {
        await supabase.from("gsc_page_query_daily").upsert(
          pageQueryRows.map((r) => ({
            date: r.keys[0],
            page: r.keys[1].slice(0, 500),
            query: r.keys[2].slice(0, 300),
            clicks: Math.round(r.clicks),
            impressions: Math.round(r.impressions),
            position: r.position,
          }))
        );
      }

      await setIntegration(
        "search_console",
        "connected",
        `Synced ${siteRows.length} site days, ${pageRows.length} page rows, ${queryRows.length} query rows.`,
        true
      );
      summary.gsc = {
        site_days: siteRows.length,
        page_rows: pageRows.length,
        query_rows: queryRows.length,
        page_query_rows: pageQueryRows.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 300) : "sync failed";
      await setIntegration("search_console", "error", message);
      summary.gsc = { error: message };
    }
  }

  // ---- 2. Index monitoring ----------------------------------------------
  try {
    const { data: settingRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "inspect_urls")
      .maybeSingle();
    const paths = (settingRow?.value ?? "/")
      .split(",")
      .map((p: string) => p.trim())
      .filter((p: string) => p.startsWith("/"))
      .slice(0, 25);

    // Which URLs does the sitemap actually list?
    let sitemapUrls = new Set<string>();
    try {
      const res = await fetch(`${BASE}/sitemap.xml`, { cache: "no-store" });
      if (res.ok) {
        const xml = await res.text();
        sitemapUrls = new Set(
          [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim().replace(/\/$/, ""))
        );
      }
    } catch {
      /* sitemap unreachable — inspection rows will say so */
    }

    let inspected = 0;
    for (const path of paths) {
      const url = path === "/" ? BASE : `${BASE}${path.replace(/\/$/, "")}`;
      const row: Record<string, unknown> = {
        url,
        sitemap_listed: sitemapUrls.has(url),
        updated_at: new Date().toISOString(),
      };

      // Plain HTTP reality check — status and declared canonical.
      try {
        const res = await fetch(url, { redirect: "manual", cache: "no-store" });
        row.http_status = res.status;
        if (res.status >= 300 && res.status < 400) {
          row.verdict = "redirected";
          row.note = `HTTP ${res.status} → ${res.headers.get("location") ?? "?"}`;
        } else if (res.ok) {
          const html = await res.text();
          const canonical = html.match(
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
          )?.[1];
          if (canonical) row.user_canonical = canonical.slice(0, 500);
        }
      } catch {
        row.note = "Fetch failed";
      }

      // Google's verdict — only when the inspection API is available.
      if (config) {
        try {
          const result = await inspectUrl(config, url);
          row.verdict = verdictFromInspection(result);
          row.coverage_state = result.coverageState;
          row.robots_state = result.robotsTxtState;
          row.indexing_state = result.indexingState;
          row.google_canonical = result.googleCanonical;
          row.user_canonical = result.userCanonical ?? row.user_canonical ?? null;
          row.last_crawl_time = result.lastCrawlTime;
          row.inspected_at = new Date().toISOString();
          row.method = "inspection_api";
          inspected++;
        } catch (err) {
          if (!row.verdict) row.verdict = "inspection_unavailable";
          row.method = "sitemap_http";
          row.note = err instanceof Error ? err.message.slice(0, 200) : "inspection failed";
        }
      } else {
        // Without credentials we can verify HTTP + sitemap, but we must not
        // claim Google has (or hasn't) indexed anything.
        if (!row.verdict) row.verdict = "inspection_unavailable";
        row.method = "sitemap_http";
      }

      await supabase.from("url_inspections").upsert(row);
    }

    if (config) {
      await setIntegration(
        "url_inspection",
        "connected",
        `Inspected ${inspected} of ${paths.length} monitored URLs.`,
        true
      );
    }
    summary.index_monitoring = { monitored: paths.length, inspected };
  } catch (err) {
    summary.index_monitoring = {
      error: err instanceof Error ? err.message.slice(0, 200) : "failed",
    };
  }

  // ---- 3. Meta pixel status + retention ----------------------------------
  try {
    const { data: pixel } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "meta_pixel_id")
      .maybeSingle();
    await setIntegration(
      "meta_pixel",
      pixel?.value ? "connected" : "not_connected",
      pixel?.value ? "Pixel id configured in Settings." : "No pixel id in Settings."
    );

    const { data: purged } = await supabase.rpc("analytics_purge", { p_days: 400 });
    summary.purged_events = purged ?? 0;
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true, ...summary });
}
