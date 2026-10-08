// Regular newsletters have their own membership. This code never selects a
// daily lane, edits CRM consent/history, or changes a native subscription.
export const GENERAL_NEWSLETTER_SEGMENT_ID = "c9c45654-e1dd-4874-9286-d9da525a59da";
export const BUSINESS_OFFERS_TOPIC_ID = "123caa19-4f2d-49da-bec6-7628dfa0f5cf";
const API = "https://api.resend.com";
const PAGE_SIZE = 500;

type Row = Record<string, unknown>;
export type NewsletterCrmPage = { data: unknown; count: number | null; error?: unknown };
export type NewsletterCrmPageReader = (from: number, to: number) => Promise<NewsletterCrmPage>;
export type NewsletterSyncResult = {
  ok: boolean; crm_rows: number; crm_eligible: number; contacts_before: number;
  members_before: number; created: number; added: number; removed: number;
  provider_held: number; already_present: number; deferred: number; failed: number; errors: string[];
};
type Contact = { id: string; email: string; unsubscribed: boolean };
const record = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
function fail(code: string): never { throw new Error(code); }
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function providerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@<>";,]+@[^\s@<>";,]+\.[^\s@<>";,]+$/.test(email) ? email : null;
}

export function newsletterEmail(value: unknown): string | null {
  const email = providerEmail(value);
  if (!email || email.length > 254 || email.includes("@no-email.")) return null;
  const [local, domain] = email.split("@");
  if (local.length > 64 || !/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (domain.endsWith(".invalid") || domain === "invalid" || domain.split(".").some(x => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x))) return null;
  return email;
}

/** Complete stable CRM snapshot, before any provider mutation. */
export async function readNewsletterCrm(reader: NewsletterCrmPageReader): Promise<Row[]> {
  const rows: Row[] = [], ids = new Set<string>();
  let expected: number | null = null;
  for (let from = 0; from < 50_000; from += PAGE_SIZE) {
    const page = await reader(from, from + PAGE_SIZE - 1);
    if (page.error || !Array.isArray(page.data) || !Number.isSafeInteger(page.count) || page.count! < 0) fail("crm:incomplete_page");
    if (expected === null) expected = page.count;
    if (page.count !== expected || page.data.length > PAGE_SIZE || rows.length + page.data.length > expected!) fail("crm:count_changed");
    for (const value of page.data) {
      const row = record(value);
      if (typeof row.id !== "string" || !row.id || ids.has(row.id) ||
          !(row.email === null || typeof row.email === "string") ||
          !(row.marketing_email_consent === null || typeof row.marketing_email_consent === "boolean") ||
          !(row.email_unsubscribed_at === null || typeof row.email_unsubscribed_at === "string") ||
          !(row.deleted_at === null || typeof row.deleted_at === "string") ||
          !(row.is_test === null || typeof row.is_test === "boolean")) fail("crm:invalid_row");
      ids.add(row.id); rows.push(row);
    }
    if (rows.length === expected) return rows;
    if (page.data.length !== PAGE_SIZE) fail("crm:truncated_page");
  }
  return fail("crm:page_limit");
}

/** Any active conflicting permission or stored non-test email hold wins. */
export function newsletterCrmEligibility(rows: Row[]): Set<string> {
  const state = new Map<string, { permitted: boolean; held: boolean }>();
  for (const row of rows) {
    const email = newsletterEmail(row.email);
    if (!email || row.is_test === true) continue;
    const prior = state.get(email) ?? { permitted: false, held: false };
    const active = row.deleted_at === null;
    state.set(email, {
      permitted: prior.permitted || (active && row.marketing_email_consent === true),
      held: prior.held || !!row.email_unsubscribed_at || (active && row.marketing_email_consent !== true),
    });
  }
  return new Set([...state].filter(([, x]) => x.permitted && !x.held).map(([email]) => email));
}

/**
 * Membership only: no emails, subscription PATCH, topics writes, f500 changes,
 * or CRM writes. Complete list failures stop all mutations. Unknown per-contact
 * topic/state defers that contact. Bounded work rotates so larger lists progress.
 */
export async function reconcileGeneralNewsletter(input: {
  apiKey: string; readCrmPage: NewsletterCrmPageReader; fetcher?: typeof fetch;
  timeoutMs?: number; requestIntervalMs?: number; maxMutations?: number; nowMs?: number;
}): Promise<NewsletterSyncResult> {
  const result: NewsletterSyncResult = { ok: false, crm_rows: 0, crm_eligible: 0, contacts_before: 0,
    members_before: 0, created: 0, added: 0, removed: 0, provider_held: 0, already_present: 0,
    deferred: 0, failed: 0, errors: [] };
  const deadline = Date.now() + Math.min(45_000, Math.max(1, input.timeoutMs ?? 45_000));
  const interval = Math.max(0, input.requestIntervalMs ?? 550);
  const maxMutations = Math.max(0, Math.min(80, input.maxMutations ?? 80));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, deadline - Date.now()));
  let lastRequest = 0, mutations = 0;
  const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = Math.max(0, interval - (Date.now() - lastRequest));
      if (Date.now() + wait >= deadline || controller.signal.aborted) return fail("provider:deadline");
      if (wait) await pause(wait);
      lastRequest = Date.now();
      const response = await (input.fetcher ?? fetch)(API + path, { ...init, signal: controller.signal,
        headers: { Authorization: `Bearer ${input.apiKey}`, ...init.headers } });
      if (response.status !== 429) return response;
      const retry = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retry) ? Math.max(550, retry * 1000) : 1000;
      if (Date.now() + delay >= deadline) return fail("provider:deadline");
      await pause(delay);
    }
    return fail("provider:rate_limit");
  };
  const list = async (path: string): Promise<Row[]> => {
    const rows: Row[] = [], seen = new Set<string>();
    let after = "";
    for (let page = 0; page < 100; page++) {
      const response = await request(path + "?limit=100" + (after ? "&after=" + encodeURIComponent(after) : ""));
      if (!response.ok) return fail("provider:list_" + response.status);
      const body = record(await response.json());
      if (!Array.isArray(body.data) || typeof body.has_more !== "boolean") return fail("provider:invalid_list");
      for (const value of body.data) {
        const row = record(value);
        if (typeof row.id !== "string" || !row.id || seen.has(row.id)) return fail("provider:duplicate_id");
        seen.add(row.id); rows.push(row);
      }
      if (!body.has_more) return rows;
      const next = record(body.data.at(-1)).id;
      if (typeof next !== "string" || !next || next === after) return fail("provider:invalid_cursor");
      after = next;
    }
    return fail("provider:page_limit");
  };
  const contact = (row: Row): Contact => {
    const email = providerEmail(row.email);
    if (typeof row.id !== "string" || !row.id || !email || typeof row.unsubscribed !== "boolean") return fail("provider:invalid_contact");
    return { id: row.id, email, unsubscribed: row.unsubscribed };
  };
  const topicAllowed = async (id: string): Promise<boolean> => {
    const rows = await list("/contacts/" + encodeURIComponent(id) + "/topics");
    const topic = rows.find(row => row.id === BUSINESS_OFFERS_TOPIC_ID);
    if (!topic || typeof topic.subscription !== "string" || !["opt_in", "opt_out"].includes(topic.subscription)) return fail("provider:unknown_topic");
    return topic.subscription === "opt_in";
  };
  const mutation = async (path: string, method: string, body?: Row): Promise<Response | null> => {
    if (mutations >= maxMutations) { result.deferred++; return null; }
    mutations++;
    return request(path, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  };
  const memberPath = (id: string) => "/contacts/" + encodeURIComponent(id) + "/segments/" + GENERAL_NEWSLETTER_SEGMENT_ID;
  const remove = async (id: string) => {
    const response = await mutation(memberPath(id), "DELETE");
    if (!response) return;
    if (response.ok || response.status === 404) result.removed++;
    else fail("provider:remove_" + response.status);
  };
  try {
    const rows = await readNewsletterCrm(input.readCrmPage);
    const eligible = newsletterCrmEligibility(rows);
    result.crm_rows = rows.length; result.crm_eligible = eligible.size;
    const contacts = (await list("/contacts")).map(contact);
    const members = (await list("/segments/" + GENERAL_NEWSLETTER_SEGMENT_ID + "/contacts")).map(contact);
    const suppressionRows = await list("/suppressions");
    const suppressed = new Set<string>();
    for (const row of suppressionRows) {
      const email = providerEmail(row.email);
      if (!email || typeof row.origin !== "string" || !["manual", "bounce", "complaint"].includes(row.origin)) fail("provider:invalid_suppression");
      suppressed.add(email!);
    }
    const byEmail = new Map<string, Contact>(), byId = new Map<string, Contact>();
    for (const c of contacts) {
      if (byEmail.has(c.email)) fail("provider:duplicate_email");
      byEmail.set(c.email, c); byId.set(c.id, c);
    }
    const membership = new Map<string, Contact>();
    for (const c of members) {
      const native = byId.get(c.id);
      if (!native || native.email !== c.email || native.unsubscribed !== c.unsubscribed || membership.has(c.email)) fail("provider:inconsistent_segment");
      membership.set(c.email, c);
    }
    result.contacts_before = contacts.length; result.members_before = members.length;
    // Safe exclusions first; removing General membership does not unsubscribe
    // the contact globally and cannot alter its daily follow-up lane.
    for (const c of members) {
      if (!eligible.has(c.email) || c.unsubscribed || suppressed.has(c.email)) {
        await remove(c.id); membership.delete(c.email);
      }
    }
    const pending = [...eligible].filter(email => !membership.has(email)).sort();
    const existing = [...eligible].filter(email => membership.has(email)).sort();
    const rotate = (emails: string[]) => {
      // Advance one starting position each poll. A fixed multiplied stride
      // can share a factor with list length and permanently skip contacts.
      const offset = emails.length ? Math.floor((input.nowMs ?? Date.now()) / 300_000) % emails.length : 0;
      return [...emails.slice(offset), ...emails.slice(0, offset)];
    };
    const work = [...rotate(pending), ...rotate(existing)];
    for (let index = 0; index < work.length; index++) {
      if (Date.now() >= deadline - interval * 3 || mutations >= maxMutations) { result.deferred += work.length - index; break; }
      const email = work[index]; let c = byEmail.get(email);
      if (suppressed.has(email) || c?.unsubscribed) { result.provider_held++; continue; }
      try {
        if (!c) {
          // Resolve a contact created since the list snapshot before a create.
          // Unknown reads cannot authorize writing native contact state.
          const beforeCreate = await request("/contacts/" + encodeURIComponent(email));
          if (beforeCreate.ok) {
            c = contact(record(await beforeCreate.json()));
            if (c.email !== email || byId.has(c.id)) fail("provider:contact_changed");
          } else if (beforeCreate.status === 404) {
            // Omit all subscription setters. The subsequent native/topic read
            // remains mandatory; a create race never authorizes membership.
            const response = await mutation("/contacts", "POST", { email });
            if (!response) continue;
            if (response.status === 409) { result.deferred++; continue; }
            if (!response.ok) fail("provider:create_" + response.status);
            const created = record(await response.json());
            if (typeof created.id !== "string" || !created.id) fail("provider:unknown_created_id");
            c = { id: created.id, email, unsubscribed: false }; result.created++;
          } else fail("provider:precreate_" + beforeCreate.status);
        }
        if (membership.has(email)) {
          // No addition is being made. Existing native opt-outs are still
          // enforced by Resend; a topic opt-out removes only General membership.
          if (!(await topicAllowed(c.id))) { result.provider_held++; await remove(c.id); membership.delete(email); }
          else result.already_present++;
          continue;
        }
        // Re-read current native state immediately before any addition. Never
        // trust an earlier list read as permission to override a later opt-out.
        const response = await request("/contacts/" + encodeURIComponent(c.id));
        if (!response.ok) fail("provider:contact_" + response.status);
        const fresh = contact(record(await response.json()));
        if (fresh.id !== c.id || fresh.email !== email) fail("provider:contact_changed");
        if (fresh.unsubscribed || !(await topicAllowed(c.id))) {
          result.provider_held++;
          if (membership.has(email)) { await remove(c.id); membership.delete(email); }
          continue;
        }
        const suppression = await request("/suppressions/" + encodeURIComponent(email));
        if (suppression.status === 200) { result.provider_held++; continue; }
        if (suppression.status !== 404) fail("provider:suppression_" + suppression.status);
        const added = await mutation(memberPath(c.id), "POST");
        if (!added) continue;
        if (added.ok) { result.added++; membership.set(email, fresh); }
        else fail("provider:add_" + added.status);
      } catch {
        result.failed++; result.errors.push("provider:contact_deferred");
      }
    }
    result.ok = result.failed === 0 && result.deferred === 0;
  } catch {
    // Query/provider errors can contain addresses or credentials. Fixed error
    // labels and counts are the entire public/log surface.
    result.failed++; result.errors.push("newsletter:reconciliation_deferred");
  } finally { clearTimeout(timer); }
  return result;
}
