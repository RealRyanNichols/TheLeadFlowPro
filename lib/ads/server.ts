// Data layer for the ads reporting engine. Every function takes a
// workspace id and filters by it in code; RLS on hq_ads_daily and
// hq_ads_reports is the backstop. Nothing here reads another workspace's
// rows, and nothing here sends.

import type { Db } from "../hq/server";
import { getConnectionWithSecret } from "../hq/server";
import { adsReportEmail, buildAdsWeeklyReport, type WeeklyAdsReport } from "./report";
import { fetchAdsDaily } from "./providers";
import type { AdPlatform, AdsDailyRow, AdsRange, AdsReportStatus } from "./types";
import type { Lead, Workspace } from "../hq/types";

function fail(where: string, error: { message?: string } | null): never {
  throw new Error(`${where}: ${error?.message ?? "unknown database error"}`);
}

export async function listAdsDaily(db: Db, workspaceId: string, range: AdsRange): Promise<AdsDailyRow[]> {
  const { data, error } = await db
    .from("hq_ads_daily")
    .select("workspace_id, platform, account_id, campaign, date, spend_cents, currency, impressions, clicks, platform_leads")
    .eq("workspace_id", workspaceId)
    .gte("date", range.start)
    .lte("date", range.end)
    .order("date", { ascending: true })
    .limit(5000);
  if (error) fail("listAdsDaily", error);
  return (data ?? []) as AdsDailyRow[];
}

/** Idempotent: the same (platform, account, campaign, date) replaces itself. */
export async function upsertAdsDaily(db: Db, workspaceId: string, rows: AdsDailyRow[]): Promise<number> {
  const own = rows.filter((r) => r.workspace_id === workspaceId);
  if (own.length !== rows.length) throw new Error("upsertAdsDaily: rows for another workspace were refused");
  if (own.length === 0) return 0;
  const { error } = await db.from("hq_ads_daily").upsert(
    own.map((r) => ({ ...r, fetched_at: new Date().toISOString() })),
    { onConflict: "workspace_id,platform,account_id,campaign,date" },
  );
  if (error) fail("upsertAdsDaily", error);
  return own.length;
}

/** Pull one platform for one workspace through the client's own connection. Returns what happened, never the token. */
export async function syncPlatform(db: Db, workspace: Workspace, platform: AdPlatform, range: AdsRange): Promise<{ ok: boolean; rows: number; error?: string }> {
  const kind = platform === "meta" ? "meta_ads" : "google_ads";
  const conn = await getConnectionWithSecret(db, workspace.id, kind);
  if (!conn || conn.connection.status !== "connected") return { ok: false, rows: 0, error: `${platform} is not connected for this business.` };
  const accountId = typeof conn.connection.config.account_id === "string" ? conn.connection.config.account_id : "";
  if (!accountId) return { ok: false, rows: 0, error: `${platform} connection has no account id.` };
  const result = await fetchAdsDaily({ workspaceId: workspace.id, platform, accountId, token: conn.secret, range });
  if (!result.ok) return { ok: false, rows: 0, error: result.error };
  const count = await upsertAdsDaily(db, workspace.id, result.rows);
  return { ok: true, rows: count };
}

export async function buildAndStoreReport(db: Db, workspace: Workspace, leads: Lead[], now: Date): Promise<WeeklyAdsReport> {
  const end = new Date(now.getTime());
  const rows = await listAdsDaily(db, workspace.id, { start: shiftIso(end, -15), end: shiftIso(end, 0) });
  const report = buildAdsWeeklyReport({ workspace, rows, leads, now });
  const email = adsReportEmail(report);
  const { error } = await db.from("hq_ads_reports").upsert(
    { workspace_id: workspace.id, week_start: report.weekStart, report, email_subject: email.subject, email_text: email.text },
    { onConflict: "workspace_id,week_start", ignoreDuplicates: false },
  );
  if (error) fail("buildAndStoreReport", error);
  return report;
}

export async function getStoredReport(db: Db, workspaceId: string, weekStart: string): Promise<{ report: WeeklyAdsReport; status: AdsReportStatus; email_subject: string; email_text: string } | null> {
  const { data, error } = await db
    .from("hq_ads_reports")
    .select("report, status, email_subject, email_text")
    .eq("workspace_id", workspaceId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) fail("getStoredReport", error);
  return (data as { report: WeeklyAdsReport; status: AdsReportStatus; email_subject: string; email_text: string } | null) ?? null;
}

function shiftIso(at: Date, days: number): string {
  const d = new Date(at.getTime() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}
