export class LeadFlowDataApiConfigError extends Error {
  constructor(message = "LeadFlow Supabase Data API is not configured.") {
    super(message);
    this.name = "LeadFlowDataApiConfigError";
  }
}

function dataApiUrl() {
  return process.env.SUPABASE_URL || process.env.LEADREP_BUS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LEADREP_BUS_SERVICE_KEY || "";
}

export function hasLeadFlowDataApiConfig() {
  return Boolean(dataApiUrl() && serviceKey());
}

function requireLeadFlowDataApiConfig() {
  const url = dataApiUrl().replace(/\/$/, "");
  const key = serviceKey();
  if (!url || !key) throw new LeadFlowDataApiConfigError();
  return { url, key };
}

export function leadflowQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

export async function leadflowDataApi<T>(
  table: string,
  init: RequestInit & { query?: string } = {},
): Promise<T> {
  const { url, key } = requireLeadFlowDataApiConfig();
  const path = `${url}/rest/v1/${table}${init.query ? `?${init.query}` : ""}`;
  const response = await fetch(path, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "content-profile": "leadflow",
      "accept-profile": "leadflow",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`LeadFlow Data API ${table} request failed: ${response.status}`);
  }

  return data as T;
}

export async function selectLeadFlowRows<T>(table: string, params: Record<string, string | number | boolean | null | undefined>) {
  return leadflowDataApi<T[]>(table, { method: "GET", query: leadflowQuery(params) });
}

export async function insertLeadFlowRow<T>(table: string, row: Record<string, unknown>) {
  return leadflowDataApi<T[]>(table, {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(row),
  });
}

export async function patchLeadFlowRows<T>(
  table: string,
  params: Record<string, string | number | boolean | null | undefined>,
  patch: Record<string, unknown>,
) {
  return leadflowDataApi<T[]>(table, {
    method: "PATCH",
    query: leadflowQuery(params),
    headers: { prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
}
