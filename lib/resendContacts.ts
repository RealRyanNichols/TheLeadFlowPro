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
  created: number;
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
): Promise<Response> {
  let response = await fetcher(url, init);
  for (let attempt = 0; response.status === 429 && attempt < 2; attempt++) {
    const retryAfter = Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfter) ? Math.max(550, retryAfter * 1000) : 1000);
    response = await fetcher(url, init);
  }
  return response;
}

async function listContacts(
  apiKey: string,
  fetcher: Fetcher,
): Promise<{ contacts: ExistingResendContact[]; error?: string }> {
  const contacts: ExistingResendContact[] = [];
  let after: string | null = null;

  for (let page = 0; page < 100; page++) {
    const url = new URL(RESEND_CONTACTS_ENDPOINT);
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    const response = await fetcher(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return { contacts, error: `list:${response.status}` };
    const body = (await response.json()) as ResendContactList;
    const pageContacts = body.data ?? [];
    contacts.push(...pageContacts);
    if (!body.has_more) return { contacts };
    const next = pageContacts.at(-1)?.id;
    if (!next || next === after) return { contacts, error: "list:invalid_cursor" };
    after = next;
  }

  return { contacts, error: "list:page_limit" };
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
    created: 0,
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
  let mutations = 0;
  let lastMutationAt = 0;

  for (const [email, contact] of desired) {
    const current = existing.get(email);
    if (current) {
      if (!contact.unsubscribed && current.unsubscribed) {
        result.preserved_provider_opt_out++;
        result.already_present++;
        continue;
      }
      if (!contact.unsubscribed || current.unsubscribed) {
        result.already_present++;
        continue;
      }
    }

    if (mutations >= maxMutations) {
      result.deferred++;
      continue;
    }
    const remainingDelay = WRITE_INTERVAL_MS - (Date.now() - lastMutationAt);
    if (remainingDelay > 0) await wait(remainingDelay);

    const response = current
      ? await requestWithRateLimit(
          fetcher,
          `${RESEND_CONTACTS_ENDPOINT}/${encodeURIComponent(email)}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${input.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ unsubscribed: true }),
          },
        )
      : await requestWithRateLimit(fetcher, RESEND_CONTACTS_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            ...nameParts(contact.full_name),
            unsubscribed: contact.unsubscribed,
          }),
        });
    lastMutationAt = Date.now();
    mutations++;

    if (response.ok || (!current && response.status === 409)) {
      if (current) result.marked_unsubscribed++;
      else if (response.ok) result.created++;
      else result.already_present++;
      continue;
    }

    result.failed++;
    result.errors.push(`${current ? "update" : "create"}:${response.status}`);
  }

  result.ok = result.failed === 0 && result.deferred === 0;
  return result;
}
