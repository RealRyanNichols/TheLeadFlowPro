import "server-only";
import fs from "node:fs/promises";
import { requireDashboardOwner } from "./adminOwnerSnapshot";
import type { SalesReport } from "./clientSalesTypes";

const FILE = "/var/lib/leadflow-sales-reporting/owner-report.json";
const CLIENTS = new Set(["leadflow", "premier-dental-academy-of-longview", "ol-guy-farms"]);

/** The contact projection is restricted to the two existing dashboard owners. */
export async function ownerClientSalesReport(): Promise<SalesReport | null> {
  await requireDashboardOwner();
  try {
    const handle = await fs.open(FILE, "r");
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 5_000_000) return null;
      const report = JSON.parse(await handle.readFile("utf8")) as SalesReport;
      if (report.schema !== 1 || !Array.isArray(report.clients) || report.clients.length !== 3 ||
          new Set(report.clients.map(client => client.key)).size !== 3 ||
          report.clients.some(client => !CLIENTS.has(client.key)) ||
          !Number.isFinite(Date.parse(report.publishedAt)) || Date.parse(report.publishedAt) > Date.now() + 300_000) return null;
      if (Date.now() - Date.parse(report.publishedAt) > 15 * 60_000) {
        for (const client of report.clients) {
          client.message = "The latest refresh is delayed. These are the last saved records.";
          if (client.status === "available") client.status = "partial";
        }
      }
      return report;
    } finally { await handle.close(); }
  } catch { return null; }
}
