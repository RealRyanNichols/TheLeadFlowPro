import "server-only";
import fs from "node:fs/promises";
import { ownerDashboardLoginFor } from "./adminOwnerAccess";
import { requireOperatorAdmin, OperatorAuthError } from "./operatoros/auth";

const FILE = "/var/lib/leadflow-admin-dashboard/overview.json";
const MAX_BYTES = 1_500_000;

export async function requireDashboardOwner() {
  const { user } = await requireOperatorAdmin();
  const login = ownerDashboardLoginFor(user.email);
  if (!login) throw new OperatorAuthError(403, "Owner reports are restricted to the existing linked LeadFlow owners");
  return { user, login };
}

/** Authorization precedes every filesystem read. The source contains only the existing reviewed owner projection. */
export async function nativeOwnerOverview() {
  const { login } = await requireDashboardOwner();
  const handle = await fs.open(FILE, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error("Owner snapshot unavailable");
    const raw = JSON.parse(await handle.readFile("utf8"));
    if (raw.schema !== 1 || raw.business !== "leadflow" || !raw.overview || !Number.isFinite(Date.parse(raw.publishedAt)) || Date.parse(raw.publishedAt) > Date.now() + 300_000) throw new Error("Invalid owner snapshot");
    const out = raw.overview;
    out.tools = raw.toolSets?.[login] || { common: [], operations: [], ryan: [] };
    out.viewer = { login, name: login === "ryan" ? "Ryan Nichols" : "Patrick Grabbs", workAccess: true, avatarUrl: `/admin-workspace/owner-${login}.${login === "pat" ? "jpg" : "webp"}` };
    const stale = Date.now() - Date.parse(raw.publishedAt) > 2 * 3_600_000;
    out.snapshot = { publishedAt: raw.publishedAt, status: stale ? "stale" : "available", mode: "Existing hourly source snapshots and reviewed work; CRM edits save in the native CRM." };
    if (stale) {
      out.errors = [...(Array.isArray(out.errors) ? out.errors : []), "The owner snapshot is over two hours old. Source timestamps remain visible; these are historical results."];
      if (out.performance) out.performance.status = "stale";
      if (out.ownerActions) out.ownerActions.note += " Owner snapshot is stale; recheck source evidence before acting.";
    }
    return out;
  } finally { await handle.close(); }
}
