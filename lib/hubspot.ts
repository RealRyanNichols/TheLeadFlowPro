/**
 * Supabase -> HubSpot contact sync. ONE DIRECTION ONLY.
 *
 * Supabase is the system of record (see claude/crm-activity-logger-2026-09-15.md
 * and claude/meta-crm-signal-trace-2026-09-18.md). HubSpot is a working surface:
 * a mobile app and a pipeline view Pat can work leads in. Nothing HubSpot writes
 * ever flows back here. If the two ever disagree, Supabase is right.
 *
 * Phase 1 deliberately syncs contact fields only. Call and text activity is NOT
 * synced yet, because that is the exact data currently in dispute between
 * Supabase and the Meta CRM dataset.
 */

const HUBSPOT_API = "https://api.hubapi.com";

/** Quo auto-creates leads with a non-routable address. Those are not real contacts. */
const PLACEHOLDER_EMAIL_DOMAIN = "@unknown.invalid";

export type SyncableLead = {
  id: string;
  created_at: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  website_url: string | null;
  status: string | null;
  source: string | null;
  utm_campaign: string | null;
  interest: string | null;
  timeline: string | null;
};

export type HubSpotSyncResult = {
  considered: number;
  skippedPlaceholder: number;
  skippedNoEmail: number;
  upserted: number;
  failed: number;
  errors: string[];
};

function token(): string | null {
  return process.env.HUBSPOT_PRIVATE_APP_TOKEN?.trim() || null;
}

async function hubspotFetch(path: string, init: RequestInit): Promise<Response> {
  const key = token();
  if (!key) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN is not set");
  return fetch(`${HUBSPOT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/** Custom properties this sync writes. Created on first run if absent. */
const CUSTOM_PROPERTIES = [
  { name: "leadflow_supabase_id", label: "LeadFlow Supabase ID", type: "string", fieldType: "text" },
  { name: "leadflow_source", label: "LeadFlow Source", type: "string", fieldType: "text" },
  { name: "leadflow_campaign", label: "LeadFlow Campaign", type: "string", fieldType: "text" },
  { name: "leadflow_interest", label: "LeadFlow Interest", type: "string", fieldType: "text" },
  { name: "leadflow_timeline", label: "LeadFlow Timeline", type: "string", fieldType: "text" },
  { name: "leadflow_status", label: "LeadFlow Status", type: "string", fieldType: "text" },
] as const;

const PROPERTY_GROUP = "contactinformation";

/**
 * Idempotent. A 409 means the property already exists, which is the normal case
 * on every run after the first.
 */
export async function ensureHubSpotProperties(): Promise<string[]> {
  const problems: string[] = [];
  for (const property of CUSTOM_PROPERTIES) {
    try {
      const res = await hubspotFetch("/crm/v3/properties/contacts", {
        method: "POST",
        body: JSON.stringify({ ...property, groupName: PROPERTY_GROUP }),
      });
      if (!res.ok && res.status !== 409) {
        problems.push(`${property.name}: ${res.status} ${await res.text()}`);
      }
    } catch (error) {
      problems.push(`${property.name}: ${(error as Error).message}`);
    }
  }
  return problems;
}

function splitName(fullName: string | null): { firstname: string; lastname: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: "", lastname: "" };
  if (parts.length === 1) return { firstname: parts[0], lastname: "" };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

function toHubSpotProperties(lead: SyncableLead): Record<string, string> {
  const { firstname, lastname } = splitName(lead.full_name);
  const properties: Record<string, string> = {
    email: (lead.email ?? "").trim().toLowerCase(),
    leadflow_supabase_id: lead.id,
  };
  if (firstname) properties.firstname = firstname;
  if (lastname) properties.lastname = lastname;
  if (lead.phone) properties.phone = lead.phone;
  if (lead.business_name) properties.company = lead.business_name;
  if (lead.website_url) properties.website = lead.website_url;
  if (lead.source) properties.leadflow_source = lead.source;
  if (lead.utm_campaign) properties.leadflow_campaign = lead.utm_campaign;
  if (lead.interest) properties.leadflow_interest = lead.interest;
  if (lead.timeline) properties.leadflow_timeline = lead.timeline;
  if (lead.status) properties.leadflow_status = lead.status;
  return properties;
}

export function isSyncable(lead: SyncableLead): "ok" | "no_email" | "placeholder" {
  const email = (lead.email ?? "").trim().toLowerCase();
  if (!email) return "no_email";
  if (email.endsWith(PLACEHOLDER_EMAIL_DOMAIN)) return "placeholder";
  return "ok";
}

/**
 * Upserts on email, so a re-run updates the existing contact instead of
 * creating a duplicate. HubSpot caps batch upsert at 100 inputs.
 */
export async function upsertContacts(leads: SyncableLead[]): Promise<HubSpotSyncResult> {
  const result: HubSpotSyncResult = {
    considered: leads.length,
    skippedPlaceholder: 0,
    skippedNoEmail: 0,
    upserted: 0,
    failed: 0,
    errors: [],
  };

  const syncable: SyncableLead[] = [];
  for (const lead of leads) {
    const verdict = isSyncable(lead);
    if (verdict === "placeholder") result.skippedPlaceholder += 1;
    else if (verdict === "no_email") result.skippedNoEmail += 1;
    else syncable.push(lead);
  }
  if (syncable.length === 0) return result;

  // One contact per email. Later rows win, so the freshest record is what lands.
  const byEmail = new Map<string, SyncableLead>();
  for (const lead of syncable) {
    byEmail.set((lead.email ?? "").trim().toLowerCase(), lead);
  }
  const deduped = [...byEmail.values()];

  for (let index = 0; index < deduped.length; index += 100) {
    const chunk = deduped.slice(index, index + 100);
    const inputs = chunk.map((lead) => ({
      idProperty: "email",
      id: (lead.email ?? "").trim().toLowerCase(),
      properties: toHubSpotProperties(lead),
    }));
    try {
      const res = await hubspotFetch("/crm/v3/objects/contacts/batch/upsert", {
        method: "POST",
        body: JSON.stringify({ inputs }),
      });
      if (res.ok) {
        result.upserted += chunk.length;
      } else {
        result.failed += chunk.length;
        result.errors.push(`batch ${index / 100}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      }
    } catch (error) {
      result.failed += chunk.length;
      result.errors.push(`batch ${index / 100}: ${(error as Error).message}`);
    }
  }

  return result;
}

export function hubspotConfigured(): boolean {
  return Boolean(token());
}
