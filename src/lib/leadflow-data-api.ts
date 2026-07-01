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

type DataApiProfile = "leadflow" | "public";

class LeadFlowDataApiRequestError extends Error {
  status: number;
  table: string;
  profile: DataApiProfile;
  body: unknown;

  constructor(input: { table: string; profile: DataApiProfile; status: number; body: unknown }) {
    super(`LeadFlow Data API ${input.table} request failed: ${input.status}`);
    this.name = "LeadFlowDataApiRequestError";
    this.table = input.table;
    this.profile = input.profile;
    this.status = input.status;
    this.body = input.body;
  }
}

function profileHeaders(profile: DataApiProfile) {
  if (profile === "public") return [];
  return {
    "content-profile": "leadflow",
    "accept-profile": "leadflow",
  };
}

function shouldRetryPublicFallback(error: unknown) {
  if (!(error instanceof LeadFlowDataApiRequestError)) return false;
  if (error.profile !== "leadflow") return false;
  return [400, 404, 406, 500, 503].includes(error.status);
}

function parseDataApiResponse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

async function leadflowDataApiWithProfile<T>(
  table: string,
  init: RequestInit & { query?: string } = {},
  profile: DataApiProfile,
): Promise<T> {
  const { url, key } = requireLeadFlowDataApiConfig();
  const path = `${url}/rest/v1/${table}${init.query ? `?${init.query}` : ""}`;
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("authorization", `Bearer ${key}`);
  headers.set("content-type", "application/json");
  for (const [name, value] of Object.entries(profileHeaders(profile))) {
    headers.set(name, value);
  }
  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  const text = await response.text();
  const data = parseDataApiResponse(text);

  if (!response.ok) {
    throw new LeadFlowDataApiRequestError({
      table,
      profile,
      status: response.status,
      body: data,
    });
  }

  return data as T;
}

export async function leadflowDataApi<T>(
  table: string,
  init: RequestInit & { query?: string } = {},
): Promise<T> {
  try {
    return await leadflowDataApiWithProfile<T>(table, init, "leadflow");
  } catch (error) {
    if (!shouldRetryPublicFallback(error)) throw error;
  }
  return leadflowDataApiWithProfile<T>(table, init, "public");
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
