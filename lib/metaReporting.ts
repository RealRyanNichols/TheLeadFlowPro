/** Server-only credential boundary for the read-only Meta reporting worker. */
export function metaAdsReadToken(env: Record<string, string | undefined>): string {
  // A lead credential is intentionally not a substitute for ad-account access.
  return (env.META_ADS_READ_TOKEN ?? "").trim();
}

/** Accept an existing Page token or derive it from the preserved system-user token. */
export async function metaReportingPageToken(input: {
  credential: string;
  pageId: string;
  graphVersion: string;
  fetcher?: typeof fetch;
}): Promise<string> {
  if (!input.credential.trim()) throw new Error("Meta Page access is not configured.");
  const url = new URL(`https://graph.facebook.com/${input.graphVersion}/${input.pageId}`);
  url.searchParams.set("fields", "id,access_token");
  const response = await (input.fetcher ?? fetch)(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${input.credential}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    access_token?: string;
    error?: { code?: number };
  };
  if (!response.ok || body.error) {
    // Provider text and request URLs can contain credentials. Keep errors numeric.
    throw new Error(`Meta Page access failed (HTTP ${response.status}, code ${body.error?.code ?? "unknown"}).`);
  }
  if (String(body.id ?? "") !== input.pageId) {
    throw new Error("Meta returned a different Page than the LeadFlow allowlist.");
  }
  return body.access_token?.trim() || input.credential;
}

/** Verify the reporting app and exact ad account before reading its inventory.
 * Business metadata requires a separate permission and is not needed to read
 * this allowlisted account. Portfolio ownership remains unverified here.
 */
export async function metaReportingAccount(input: {
  credential: string;
  appId: string;
  accountId: string;
  graphVersion: string;
  fetcher?: typeof fetch;
}): Promise<Record<string, unknown>> {
  if (!input.credential.trim()) throw new Error("Meta reporting access is not configured.");
  async function get(path: string, fields: string): Promise<Record<string, unknown>> {
    const url = new URL(`https://graph.facebook.com/${input.graphVersion}/${path}`);
    url.searchParams.set("fields", fields);
    const response = await (input.fetcher ?? fetch)(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${input.credential}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: { code?: number } };
    if (!response.ok || body.error) {
      throw new Error(`Meta reporting access failed (HTTP ${response.status}, code ${body.error?.code ?? "unknown"}).`);
    }
    return body;
  }
  const app = await get("app", "id");
  if (String(app.id ?? "") !== input.appId) {
    throw new Error("Meta returned a different app than the LeadFlow allowlist.");
  }
  const account = await get(`act_${input.accountId}`, "id,account_id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap");
  if (String(account.id ?? "") !== `act_${input.accountId}` || String(account.account_id ?? "") !== input.accountId) {
    throw new Error("Meta returned a different ad account than the LeadFlow allowlist.");
  }
  return account;
}
