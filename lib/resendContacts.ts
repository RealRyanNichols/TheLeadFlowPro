const RESEND_CONTACTS_ENDPOINT = "https://api.resend.com/contacts";
const DEFAULT_MAX_MUTATIONS = 80;
const WRITE_INTERVAL_MS = 550;

export type ResendContactLead = {
  full_name: string | null;
  email: string | null;
  marketing_email_consent: boolean | null;
  email_unsubscribed_at: string | null;
};

type ExistingResendContact = {
  id: string;
  email: string;
  unsubscribed?: boolean;
};

type ResendContactList = {
  data?: ExistingResendContact[];
  has_more?: boolean;
};

export type ResendContactSyncResult = {
  ok: boolean;
  eligible: number;
  contacts_before: number;
  segment_members_before: number;
  created: number;
  added_to_segment: number;
  marked_unsubscribed: number;
  preserved_provider_opt_out: number;
  already_present: number;
  deferred: number;
  failed: number;
  errors: string[];
};

type Fetcher = typeof fetch;

function normalizedEmail(value: string | null): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email || email.includes("@no-email.") || !/^\S+@\S+\.\S+$/.test(email)) return null;
  return email;
}

function nameParts(fullName: string | null): { first_name?: string; last_name?: string } {
  const parts = String(fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length || String(fullName).toLowerCase() === "facebook lead") return {};
  return {
    first_name: parts[0].slice(0, 100),
    ...(parts.length > 1 ? { last_name: parts.slice(1).join(" ").slice(0, 100) } : {}),
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRateLimit(
  fetcher: Fetcher,
  url: string,
  init: RequestInit,
  deadlineAt?: number,
): Promise<Response> {
  if (deadlineAt !== undefined && Date.now() >= deadlineAt) throw new Error("Provider read deadline");
  let response = await fetcher(url, init);
  for (let attempt = 0; response.status === 429 && attempt < 2; attempt++) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) ? Math.max(550, retryAfter * 1000) : 1000;
    if (deadlineAt !== undefined && Date.now() + delay >= deadlineAt) throw new Error("Provider read deadline");
    await wait(delay);
    response = await fetcher(url, init);
  }
  return response;
}

async function listContacts(
  apiKey: string,
  fetcher: Fetcher,
  endpoint = RESEND_CONTACTS_ENDPOINT,
  deadlineAt?: number,
): Promise<{ contacts: ExistingResendContact[]; error?: string }> {
  const contacts: ExistingResendContact[] = [];
  let after: string | null = null;

  for (let page = 0; page < 100; page++) {
    const url = new URL(endpoint);
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    const response = await requestWithRateLimit(fetcher, url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, deadlineAt);
    if (!response.ok) return { contacts, error: `list:${response.status}` };
    const body = (await response.json()) as ResendContactList;
    if (!Array.isArray(body.data) || typeof body.has_more !== "boolean") {
      return { contacts, error: "list:invalid_response" };
    }
    const pageContacts = body.data;
    contacts.push(...pageContacts);
    if (!body.has_more) return { contacts };
    const next = pageContacts.at(-1)?.id;
    if (!next || next === after) return { contacts, error: "list:invalid_cursor" };
    after = next;
  }

  return { contacts, error: "list:page_limit" };
}

export type ResendContactOptOutRead =
  | { ok: true; emails: ReadonlySet<string> }
  | { ok: false; error: string };

/** Reads current native opt-outs without changing any provider contact. */
export async function readResendContactOptOuts(input: {
  apiKey: string;
  fetcher?: Fetcher;
  /** Tests may shorten the bound; callers cannot extend the eight-second cap. */
  timeoutMs?: number;
}): Promise<ResendContactOptOutRead> {
  const timeoutMs = Number.isFinite(input.timeoutMs)
    ? Math.min(8000, Math.max(1, input.timeoutMs!)) : 8000;
  const deadlineAt = Date.now() + timeoutMs;
  const controller = new AbortController();
  const fetcher: Fetcher = (url, init) => (input.fetcher ?? fetch)(url, {
    ...init, signal: controller.signal,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Provider read deadline"));
    }, timeoutMs);
  });
  try {
    const listed = await Promise.race([
      listContacts(input.apiKey, fetcher, RESEND_CONTACTS_ENDPOINT, deadlineAt),
      deadline,
    ]);
    if (listed.error) return { ok: false, error: listed.error };
    const emails = new Set<string>();
    for (const contact of listed.contacts) {
      const email = normalizedEmail(contact.email);
      // Unknown provider state is not permission to continue sending.
      if (!email || typeof contact.unsubscribed !== "boolean") {
        return { ok: false, error: "list:invalid_contact_state" };
      }
      if (contact.unsubscribed) emails.add(email);
    }
    return { ok: true, emails };
  } catch {
    // Provider bodies and thrown messages may contain recipient information.
    return { ok: false, error: controller.signal.aborted ? "list:deadline_exceeded" : "list:request_failed" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reconciles CRM leads into Resend's global Contacts list.
 *
 * The database and Resend can both record an opt-out. This sync always keeps
 * the stricter state: it may unsubscribe a contact, but it never re-subscribes
 * an existing Resend contact. Creating a Contact does not send an email.
 */
export async function syncResendContacts(input: {
  apiKey: string;
  leads: ResendContactLead[];
  segmentId?: string;
  fetcher?: Fetcher;
  maxMutations?: number;
}): Promise<ResendContactSyncResult> {
  const fetcher = input.fetcher ?? fetch;
  const maxMutations = input.maxMutations ?? DEFAULT_MAX_MUTATIONS;
  const desired = new Map<
    string,
    { full_name: string | null; unsubscribed: boolean }
  >();

  for (const lead of input.leads) {
    const email = normalizedEmail(lead.email);
    if (!email) continue;
    const mustBeUnsubscribed =
      lead.marketing_email_consent !== true || !!lead.email_unsubscribed_at;
    const prior = desired.get(email);
    desired.set(email, {
      full_name: prior?.full_name || lead.full_name,
      // Any opt-out or missing consent wins when duplicate CRM rows share an
      // address. We never infer permission from another row.
      unsubscribed: (prior?.unsubscribed ?? false) || mustBeUnsubscribed,
    });
  }

  const result: ResendContactSyncResult = {
    ok: true,
    eligible: desired.size,
    contacts_before: 0,
    segment_members_before: 0,
    created: 0,
    added_to_segment: 0,
    marked_unsubscribed: 0,
    preserved_provider_opt_out: 0,
    already_present: 0,
    deferred: 0,
    failed: 0,
    errors: [],
  };

  const listed = await listContacts(input.apiKey, fetcher);
  result.contacts_before = listed.contacts.length;
  if (listed.error) {
    result.ok = false;
    result.failed = desired.size;
    result.errors.push(listed.error);
    return result;
  }

  const existing = new Map(
    listed.contacts
      .map((contact) => [normalizedEmail(contact.email), contact] as const)
      .filter((entry): entry is [string, ExistingResendContact] => !!entry[0]),
  );
  const segmentId = input.segmentId?.trim() || null;
  const segmentMembers = new Set<string>();
  if (segmentId) {
    const listedSegment = await listContacts(
      input.apiKey,
      fetcher,
      `https://api.resend.com/segments/${encodeURIComponent(segmentId)}/contacts`,
    );
    if (listedSegment.error) {
      result.ok = false;
      result.failed = desired.size;
      result.errors.push(`segment_${listedSegment.error}`);
      return result;
    }
    result.segment_members_before = listedSegment.contacts.length;
    for (const contact of listedSegment.contacts) {
      const email = normalizedEmail(contact.email);
      if (email) segmentMembers.add(email);
    }
  }
  let mutations = 0;
  let lastMutationAt = 0;

  const mutationSlot = async (): Promise<boolean> => {
    if (mutations >= maxMutations) {
      result.deferred++;
      return false;
    }
    const remainingDelay = WRITE_INTERVAL_MS - (Date.now() - lastMutationAt);
    if (remainingDelay > 0) await wait(remainingDelay);
    return true;
  };

  const recordMutation = () => {
    lastMutationAt = Date.now();
    mutations++;
  };

  for (const [email, contact] of desired) {
    const current = existing.get(email);
    let contactId = current?.id?.trim() || null;
    if (current) {
      result.already_present++;
      // Resend identifies writes by the provider's contact ID. An email path
      // can return 404 even when that address is present in the Contacts list.
      if (!contactId) {
        result.deferred++;
        continue;
      }
      if (!contact.unsubscribed && current.unsubscribed) {
        result.preserved_provider_opt_out++;
      } else if (contact.unsubscribed && !current.unsubscribed) {
        if (!(await mutationSlot())) continue;
        const response = await requestWithRateLimit(
          fetcher,
          `${RESEND_CONTACTS_ENDPOINT}/${encodeURIComponent(contactId)}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${input.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ unsubscribed: true }),
          },
        );
        recordMutation();
        if (response.ok) result.marked_unsubscribed++;
        else {
          result.failed++;
          result.errors.push(`update:${response.status}`);
          // Do not add this contact to a marketing segment while the stricter
          // CRM opt-out has not been saved at the provider.
          continue;
        }
      }
    } else {
      if (!(await mutationSlot())) continue;
      const response = await requestWithRateLimit(fetcher, RESEND_CONTACTS_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            ...nameParts(contact.full_name),
            unsubscribed: contact.unsubscribed,
            ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
          }),
        });
      recordMutation();
      if (response.ok) {
        const created = (await response.json().catch(() => ({}))) as { id?: string };
        contactId = typeof created.id === "string" ? created.id.trim() || null : null;
        result.created++;
        if (segmentId) {
          segmentMembers.add(email);
          result.added_to_segment++;
        }
      } else if (response.status === 409) {
        result.already_present++;
        // Another writer created the contact after our list read. Its ID and
        // unsubscribe state are unknown; the next poll must refetch both.
        result.deferred++;
        continue;
      } else {
        result.failed++;
        result.errors.push(`create:${response.status}`);
        continue;
      }
    }

    if (segmentId && !segmentMembers.has(email)) {
      if (!contactId) {
        result.deferred++;
        continue;
      }
      if (!(await mutationSlot())) continue;
      const response = await requestWithRateLimit(
        fetcher,
        `${RESEND_CONTACTS_ENDPOINT}/${encodeURIComponent(contactId)}/segments/${encodeURIComponent(segmentId)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${input.apiKey}` },
        },
      );
      recordMutation();
      if (response.ok || response.status === 409) {
        segmentMembers.add(email);
        result.added_to_segment++;
      } else {
        result.failed++;
        result.errors.push(`add_segment:${response.status}`);
      }
    }
  }

  result.ok = result.failed === 0 && result.deferred === 0;
  return result;
}
