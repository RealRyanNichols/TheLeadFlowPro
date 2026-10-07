import { deflateRawSync, inflateRawSync } from "node:zlib";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, link, unlink, readFile } from "node:fs/promises";
import path from "node:path";
export type VerifiedSalesEvent = { id: string; clientKey: "leadflow"; type: "appointment_booked" | "proposal_sent" | "discovery_completed"; at: string; leadId: string; leadName: string; actor: string; startsAt?: string; href: string; sourceId: string; verified: true };
const DIRECTORY = "/var/lib/leadflow-sales-reporting/inbox";
const fields = ["id", "clientKey", "type", "at", "leadId", "leadName", "actor", "startsAt", "href", "sourceId", "verified"] as const;
const iso = (v: unknown) => typeof v === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
export function validateSalesEvent(input: unknown): VerifiedSalesEvent {
  if (!input || typeof input !== "object") throw new Error("Event required");
  const r = input as Record<string, unknown>;
  if (r.verified !== true || r.clientKey !== "leadflow" || !["appointment_booked", "proposal_sent", "discovery_completed"].includes(String(r.type))) throw new Error("Unverified event scope");
  for (const key of ["id", "leadId", "leadName", "actor", "sourceId"]) if (typeof r[key] !== "string" || !(r[key] as string).trim() || (r[key] as string).length > 180 || /[\x00-\x1f]/.test(r[key] as string)) throw new Error("Invalid event identity");
  if (!/^[0-9a-f-]{36}$/i.test(String(r.leadId)) || !iso(r.at) || (r.startsAt !== undefined && !iso(r.startsAt)) || (r.type === "appointment_booked" && !iso(r.startsAt))) throw new Error("Invalid event time or lead");
  if (r.href !== `https://www.theleadflowpro.com/admin/leads/${r.leadId}`) throw new Error("Private lead link required");
  return Object.fromEntries(fields.filter(k => r[k] !== undefined).map(k => [k, r[k]])) as VerifiedSalesEvent;
}
export function salesEventMarker(input: VerifiedSalesEvent): string { return `TeamEvent:${deflateRawSync(Buffer.from(JSON.stringify(validateSalesEvent(input)))).toString("base64url")}`; }
export function savedSalesEvent(detail: string): VerifiedSalesEvent | null {
  const found = detail.match(/(?:^|\s)TeamEvent:([A-Za-z0-9_-]{1,2400})(?=\s|$)/);
  if (!found) return null;
  try { return validateSalesEvent(JSON.parse(inflateRawSync(Buffer.from(found[1], "base64url"), { maxOutputLength: 6000 }).toString("utf8"))); } catch { return null; }
}
/** Test-only destination injection is never passed from route/request data. */
export async function recordVerifiedSalesEvent(input: VerifiedSalesEvent, testDirectory?: string): Promise<{ duplicate: boolean }> {
  const event = validateSalesEvent(input), directory = testDirectory || DIRECTORY;
  if (testDirectory && process.env.NODE_ENV !== "test") throw new Error("Test directory denied");
  await mkdir(directory, { recursive: true, mode: 0o750 });
  const filename = createHash("sha256").update(event.id).digest("hex") + ".json";
  const target = path.join(directory, filename), temporary = path.join(directory, `.${randomUUID()}.tmp`);
  const payload = JSON.stringify(event) + "\n";
  const handle = await open(temporary, "wx", 0o640);
  try { await handle.writeFile(payload); await handle.sync(); } finally { await handle.close(); }
  try {
    try { await link(temporary, target); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await readFile(target, "utf8") !== payload) throw new Error("Event ID conflict");
      return { duplicate: true };
    }
    const dir = await open(directory, "r"); try { await dir.sync(); } finally { await dir.close(); }
    return { duplicate: false };
  } finally { await unlink(temporary).catch(() => {}); }
}
