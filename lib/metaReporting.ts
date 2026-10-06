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
