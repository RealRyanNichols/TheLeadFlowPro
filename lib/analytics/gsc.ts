// Google Search Console client. Server-side only.
//
// Uses a Google service account (JWT signed with node:crypto — no new
// dependency) with the webmasters.readonly scope. The service account email
// must be added as a user on the Search Console property.
//
// Required env:
//   GSC_CLIENT_EMAIL  service account email
//   GSC_PRIVATE_KEY   service account private key (PEM; \n-escaped is fine)
//   GSC_SITE_URL      property, e.g. "sc-domain:theleadflowpro.com" or
//                     "https://www.theleadflowpro.com/"

import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type GscConfig = {
  clientEmail: string;
  privateKey: string;
  siteUrl: string;
};

export function gscConfig(): GscConfig | null {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const siteUrl = process.env.GSC_SITE_URL;
  if (!clientEmail || !privateKey || !siteUrl) return null;
  return { clientEmail, privateKey, siteUrl };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let cachedToken: { token: string; expires: number } | null = null;

export async function getAccessToken(config: GscConfig): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(config.privateKey));
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`GSC token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export type SearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function searchAnalytics(
  config: GscConfig,
  body: {
    startDate: string;
    endDate: string;
    dimensions: string[];
    rowLimit?: number;
    startRow?: number;
  }
): Promise<SearchAnalyticsRow[]> {
  const token = await getAccessToken(config);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    config.siteUrl
  )}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rowLimit: 5000, ...body }),
  });
  if (!res.ok) {
    throw new Error(`GSC query failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { rows?: SearchAnalyticsRow[] };
  return json.rows ?? [];
}

export type InspectionResult = {
  verdict: string;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawlTime: string | null;
};

/**
 * URL Inspection API. Quota is roughly 2,000/day and 600/minute per property,
 * but we stay far below it: only the priority URLs from settings, once a day.
 */
export async function inspectUrl(
  config: GscConfig,
  url: string
): Promise<InspectionResult> {
  const token = await getAccessToken(config);
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: config.siteUrl }),
    }
  );
  if (!res.ok) {
    throw new Error(`URL inspection failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: string;
        coverageState?: string;
        robotsTxtState?: string;
        indexingState?: string;
        googleCanonical?: string;
        userCanonical?: string;
        lastCrawlTime?: string;
      };
    };
  };
  const r = json.inspectionResult?.indexStatusResult ?? {};
  return {
    verdict: r.verdict ?? "VERDICT_UNSPECIFIED",
    coverageState: r.coverageState ?? null,
    robotsTxtState: r.robotsTxtState ?? null,
    indexingState: r.indexingState ?? null,
    googleCanonical: r.googleCanonical ?? null,
    userCanonical: r.userCanonical ?? null,
    lastCrawlTime: r.lastCrawlTime ?? null,
  };
}

/**
 * Maps a Google inspection result onto our honest verdict vocabulary. Only
 * this function may ever claim a page is "indexed".
 */
export function verdictFromInspection(r: InspectionResult): string {
  const coverage = (r.coverageState ?? "").toLowerCase();
  if (r.robotsTxtState === "DISALLOWED") return "blocked";
  if (coverage.includes("indexed") && !coverage.includes("not indexed")) {
    if (
      r.googleCanonical && r.userCanonical &&
      r.googleCanonical !== r.userCanonical
    ) {
      return "canonical_mismatch";
    }
    return "indexed";
  }
  if (coverage.includes("crawled")) return "crawled_not_indexed";
  if (coverage.includes("discovered")) return "discovered";
  if (coverage.includes("redirect")) return "redirected";
  if (coverage.includes("blocked") || coverage.includes("robots")) return "blocked";
  if (r.verdict === "PASS") return "indexed";
  if (r.verdict === "VERDICT_UNSPECIFIED") return "awaiting_data";
  return "not_indexed";
}
