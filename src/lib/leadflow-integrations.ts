import "server-only";

import crypto from "crypto";
import {
  buyerAccountIsRestricted,
  getBuyerPortalData,
  type BuyerAccount,
  type BuyerEntitlement,
  type BuyerListingSummary,
  type BuyerPortalData,
} from "@/lib/buyer-portal";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";

export const INTEGRATION_PROVIDERS = [
  "webhook",
  "csv",
  "google_sheets",
  "hubspot",
  "gohighlevel",
  "salesforce",
  "zapier",
  "make",
  "airtable",
  "email",
] as const;

export const INTEGRATION_STATUSES = ["draft", "active", "paused", "failed", "revoked"] as const;
export const INTEGRATION_RUN_TYPES = ["test", "manual", "scheduled", "webhook_retry", "csv_export", "email_notification"] as const;
export const INTEGRATION_RUN_STATUSES = ["queued", "running", "completed", "failed", "blocked"] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];
export type IntegrationRunType = (typeof INTEGRATION_RUN_TYPES)[number];
export type IntegrationRunStatus = (typeof INTEGRATION_RUN_STATUSES)[number];

type JsonRecord = Record<string, unknown>;
type AuthenticatedBuyerContext = Extract<BuyerPortalData, { authenticated: true }> & { account: BuyerAccount };

export type LeadFlowIntegrationRecord = {
  id: string;
  buyer_account_id: string;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  config_encrypted: JsonRecord;
  field_mapping: JsonRecord;
  allowed_listing_ids: string[];
  allowed_verticals: string[];
  delivery_settings: JsonRecord;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LeadFlowIntegrationRun = {
  id: string;
  integration_id: string;
  run_type: IntegrationRunType;
  status: IntegrationRunStatus;
  listing_id: string | null;
  profile_count: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export type LeadFlowIntegrationLog = {
  id: string;
  integration_id: string;
  run_id: string | null;
  log_level: "info" | "warning" | "error" | "security";
  event_type: string;
  message: string;
  payload_summary: JsonRecord;
  created_at: string;
};

export type SafeIntegration = Omit<LeadFlowIntegrationRecord, "config_encrypted"> & {
  config_preview: JsonRecord;
  provider_label: string;
  can_run: boolean;
};

export type BuyerIntegrationListingOption = {
  id: string | null;
  slug: string | null;
  title: string;
  category: string;
  vertical: string;
  accessLevel: string;
  contactAllowed: boolean;
};

export type BuyerIntegrationsPageData =
  | {
      authenticated: false;
      reason: "missing_config" | "missing_session" | "invalid_session";
    }
  | {
      authenticated: true;
      account: BuyerAccount | null;
      restricted: boolean;
      integrations: SafeIntegration[];
      runs: LeadFlowIntegrationRun[];
      logs: LeadFlowIntegrationLog[];
      allowedListings: BuyerIntegrationListingOption[];
      providerCatalog: ProviderCatalogItem[];
      loadErrors: string[];
    };

export type AdminIntegrationsPageData = {
  mode: "live" | "offline";
  integrations: Array<SafeIntegration & { buyerName: string; buyerCompany: string; buyerStatus: string }>;
  runs: LeadFlowIntegrationRun[];
  logs: LeadFlowIntegrationLog[];
  stats: {
    total: number;
    active: number;
    failed: number;
    paused: number;
    revoked: number;
  };
  loadErrors: string[];
};

export type ProviderCatalogItem = {
  provider: IntegrationProvider;
  label: string;
  status: "ready" | "native" | "placeholder";
  description: string;
  requiresWebhookUrl: boolean;
};

export type SaveIntegrationInput = {
  integrationId?: string | null;
  provider: IntegrationProvider;
  name: string;
  status?: IntegrationStatus;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  webhookSecretHeaderName?: string | null;
  eventType?: string | null;
  fieldMapping?: JsonRecord;
  allowedListingIds?: string[];
  allowedVerticals?: string[];
  deliverySettings?: JsonRecord;
};

export type IntegrationActionResult =
  | { ok: true; status: number; integration?: SafeIntegration; run?: LeadFlowIntegrationRun; message: string }
  | { ok: false; status: number; error: string; reason: string };

type ProtectedProviderConfig =
  | {
      encrypted: true;
      algorithm: "aes-256-gcm";
      payload: string;
      preview: JsonRecord;
    }
  | {
      encrypted: false;
      webhook_url?: string;
      event_type?: string;
      secret_header_name?: string;
      secret_header_preview?: string;
      secret_storage?: "not_provided" | "encryption_key_missing";
      preview: JsonRecord;
    };

const providerLabels: Record<IntegrationProvider, string> = {
  webhook: "Webhook",
  csv: "CSV export",
  google_sheets: "Google Sheets",
  hubspot: "HubSpot",
  gohighlevel: "GoHighLevel",
  salesforce: "Salesforce",
  zapier: "Zapier webhook",
  make: "Make.com webhook",
  airtable: "Airtable",
  email: "Email notification",
};

export const PROVIDER_CATALOG: ProviderCatalogItem[] = [
  {
    provider: "webhook",
    label: providerLabels.webhook,
    status: "ready",
    description: "Post entitlement-approved lead signal payloads to a secure HTTPS endpoint.",
    requiresWebhookUrl: true,
  },
  {
    provider: "csv",
    label: providerLabels.csv,
    status: "native",
    description: "Use LeadFlow controlled exports as the native CSV delivery path.",
    requiresWebhookUrl: false,
  },
  {
    provider: "google_sheets",
    label: providerLabels.google_sheets,
    status: "placeholder",
    description: "OAuth and sheet mapping are staged for a later connector pass.",
    requiresWebhookUrl: false,
  },
  {
    provider: "hubspot",
    label: providerLabels.hubspot,
    status: "placeholder",
    description: "CRM object mapping is staged. No OAuth tokens are collected yet.",
    requiresWebhookUrl: false,
  },
  {
    provider: "gohighlevel",
    label: providerLabels.gohighlevel,
    status: "placeholder",
    description: "LeadFlow can model the field map before GoHighLevel OAuth is connected.",
    requiresWebhookUrl: false,
  },
  {
    provider: "salesforce",
    label: providerLabels.salesforce,
    status: "placeholder",
    description: "Salesforce delivery is review-gated until OAuth and field permissions are configured.",
    requiresWebhookUrl: false,
  },
  {
    provider: "zapier",
    label: providerLabels.zapier,
    status: "ready",
    description: "Send approved payloads to a Zapier Catch Hook URL.",
    requiresWebhookUrl: true,
  },
  {
    provider: "make",
    label: providerLabels.make,
    status: "ready",
    description: "Send approved payloads to a Make.com custom webhook URL.",
    requiresWebhookUrl: true,
  },
  {
    provider: "airtable",
    label: providerLabels.airtable,
    status: "placeholder",
    description: "Airtable base mapping is staged. No API token is collected yet.",
    requiresWebhookUrl: false,
  },
  {
    provider: "email",
    label: providerLabels.email,
    status: "placeholder",
    description: "Email delivery is modeled as an audited notification channel until a mail provider is connected.",
    requiresWebhookUrl: false,
  },
];

const integrationSelect = [
  "id",
  "buyer_account_id",
  "provider",
  "name",
  "status",
  "config_encrypted",
  "field_mapping",
  "allowed_listing_ids",
  "allowed_verticals",
  "delivery_settings",
  "created_by",
  "created_at",
  "updated_at",
  "deleted_at",
].join(",");

const runSelect = [
  "id",
  "integration_id",
  "run_type",
  "status",
  "listing_id",
  "profile_count",
  "started_at",
  "completed_at",
  "error_message",
].join(",");

const logSelect = [
  "id",
  "integration_id",
  "run_id",
  "log_level",
  "event_type",
  "message",
  "payload_summary",
  "created_at",
].join(",");

const buyerAccountSelect = [
  "id",
  "name",
  "company_name",
  "account_status",
].join(",");

const SAFE_PAYLOAD_FIELDS = [
  "profile_id",
  "listing_id",
  "title",
  "category",
  "vertical",
  "score",
  "confidence",
  "summary",
  "buyer_use_case",
  "recommended_next_action",
  "source_proof_summary",
  "allowed_use",
  "suppression_status",
  "business_name",
  "website",
] as const;

function nowIso() {
  return new Date().toISOString();
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value) ? value : null;
}

function isUuid(value: string | null | undefined) {
  return Boolean(uuidOrNull(value));
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeProvider(value: unknown): IntegrationProvider | null {
  return INTEGRATION_PROVIDERS.includes(value as IntegrationProvider) ? (value as IntegrationProvider) : null;
}

function normalizeStatus(value: unknown): IntegrationStatus {
  return INTEGRATION_STATUSES.includes(value as IntegrationStatus) ? (value as IntegrationStatus) : "draft";
}

function providerCatalog(provider: IntegrationProvider) {
  return PROVIDER_CATALOG.find((item) => item.provider === provider) || PROVIDER_CATALOG[0];
}

function contactAllowed(accessLevel: string | null | undefined) {
  return ["full_profile", "raw_export", "exclusive", "premium"].includes(accessLevel || "");
}

function entitlementActive(entitlement: BuyerEntitlement) {
  return entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now());
}

function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  const compact = value.trim();
  if (compact.length <= 6) return "saved";
  return `${compact.slice(0, 3)}...${compact.slice(-2)}`;
}

function previewUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const path = url.pathname && url.pathname !== "/" ? `${url.pathname.split("/").filter(Boolean).slice(0, 2).join("/")}` : "";
    return `${url.protocol}//${url.host}${path ? `/${path}` : ""}`;
  } catch {
    return "Invalid URL";
  }
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = ipv4.slice(1).map(Number);
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function validateWebhookUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false as const, error: "Enter a valid HTTPS webhook URL.", reason: "invalid_webhook_url" };
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false as const, error: "Webhook URL must use HTTP or HTTPS.", reason: "invalid_webhook_protocol" };
  }
  if (isPrivateHostname(parsed.hostname)) {
    return { ok: false as const, error: "Webhook URL cannot point to localhost or private network addresses.", reason: "private_webhook_url" };
  }
  return { ok: true as const, url: parsed.toString() };
}

function encryptionKey() {
  const secret = process.env.LEADFLOW_INTEGRATION_SECRET_KEY || "";
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptConfig(config: JsonRecord) {
  const key = encryptionKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function decryptConfig<T extends JsonRecord>(payload: string) {
  const key = encryptionKey();
  if (!key) return null;
  const [ivText, tagText, cipherText] = payload.split(".");
  if (!ivText || !tagText || !cipherText) return null;
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(cipherText, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

function protectProviderConfig(input: SaveIntegrationInput): ProtectedProviderConfig {
  const provider = input.provider;
  const eventType = textValue(input.eventType, "lead_signal.approved");
  const webhookUrl = textValue(input.webhookUrl, "");
  const secretHeader = textValue(input.webhookSecret, "");
  const secretHeaderName = textValue(input.webhookSecretHeaderName, "x-leadflow-secret").toLowerCase().slice(0, 48);
  const rawConfig: JsonRecord = {
    provider,
    webhook_url: webhookUrl || null,
    event_type: eventType,
    secret_header: secretHeader || null,
    secret_header_name: secretHeaderName,
  };
  const preview = {
    webhook_url_preview: previewUrl(webhookUrl),
    event_type: eventType,
    secret_header_name: secretHeader ? secretHeaderName : null,
    secret_header_preview: secretHeader ? maskSecret(secretHeader) : "",
    encrypted: Boolean(encryptionKey()),
  };
  const encrypted = encryptConfig(rawConfig);
  if (encrypted) {
    return {
      encrypted: true,
      algorithm: "aes-256-gcm",
      payload: encrypted,
      preview,
    };
  }

  return {
    encrypted: false,
    webhook_url: webhookUrl || undefined,
    event_type: eventType,
    secret_header_name: secretHeader ? secretHeaderName : undefined,
    secret_header_preview: secretHeader ? maskSecret(secretHeader) : "",
    secret_storage: secretHeader ? "encryption_key_missing" : "not_provided",
    preview,
  };
}

function readProviderConfig(config: JsonRecord) {
  const protectedConfig = config as JsonRecord;
  if (protectedConfig.encrypted === true && typeof protectedConfig.payload === "string") {
    const decrypted = decryptConfig<JsonRecord>(protectedConfig.payload);
    return decrypted || null;
  }
  return {
    provider: textValue(protectedConfig.provider, ""),
    webhook_url: textValue(protectedConfig.webhook_url, ""),
    event_type: textValue(protectedConfig.event_type, "lead_signal.approved"),
    secret_header_name: textValue(protectedConfig.secret_header_name, "x-leadflow-secret"),
    secret_header: "",
  };
}

function configPreview(config: JsonRecord) {
  const protectedConfig = config as JsonRecord;
  if (protectedConfig.preview && typeof protectedConfig.preview === "object") return protectedConfig.preview as JsonRecord;
  return {
    webhook_url_preview: previewUrl(textValue(protectedConfig.webhook_url, "")),
    event_type: textValue(protectedConfig.event_type, "lead_signal.approved"),
    encrypted: false,
    secret_storage: protectedConfig.secret_storage || "not_provided",
  };
}

function safeFieldMapping(input: unknown) {
  const mapping = input && typeof input === "object" && !Array.isArray(input) ? input as JsonRecord : {};
  const safe: JsonRecord = {};
  for (const field of SAFE_PAYLOAD_FIELDS) {
    const mapped = textValue(mapping[field], "");
    if (mapped && mapped.length <= 80) safe[field] = mapped;
  }
  return safe;
}

function safeStringArray(values: unknown, limit = 24) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => textValue(value, "")).filter(Boolean))).slice(0, limit);
}

function normalizeAllowedListingIds(values: unknown, entitlements: BuyerEntitlement[]) {
  const allowed = new Set(entitlements.filter(entitlementActive).map((item) => item.listing_id).filter((item): item is string => Boolean(item)));
  return safeStringArray(values).filter((value) => isUuid(value) && allowed.has(value));
}

function safeDeliverySettings(input: unknown) {
  const settings = input && typeof input === "object" && !Array.isArray(input) ? input as JsonRecord : {};
  return {
    include_contact_fields: Boolean(settings.include_contact_fields),
    auto_run_enabled: Boolean(settings.auto_run_enabled),
    run_frequency: textValue(settings.run_frequency, "manual").slice(0, 40),
    allowed_use_confirmed: Boolean(settings.allowed_use_confirmed),
  };
}

function safeIntegration(record: LeadFlowIntegrationRecord): SafeIntegration {
  const catalog = providerCatalog(record.provider);
  return {
    ...record,
    config_preview: configPreview(record.config_encrypted || {}),
    provider_label: catalog.label,
    can_run: record.status === "active" && (catalog.status === "ready" || catalog.status === "native"),
  };
}

function listingOptionFromEntitlement(
  entitlement: BuyerEntitlement,
  listing?: BuyerListingSummary,
): BuyerIntegrationListingOption {
  return {
    id: entitlement.listing_id,
    slug: entitlement.listing_slug || listing?.slug || entitlement.lead_profile_id,
    title: listing?.title || entitlement.listing_slug?.replace(/-/g, " ") || "Approved signal product",
    category: listing?.category || "Marketplace",
    vertical: listing?.vertical || "Lead signal",
    accessLevel: entitlement.access_level,
    contactAllowed: contactAllowed(entitlement.access_level),
  };
}

function allowedListingsForBuyer(data: Extract<BuyerPortalData, { authenticated: true }>) {
  return data.entitlements
    .filter(entitlementActive)
    .map((entitlement) => {
      const listing = data.approvedListings.find((item) => {
        return item.slug === entitlement.listing_slug || item.slug === entitlement.lead_profile_id || item.slug === entitlement.listing_id;
      });
      return listingOptionFromEntitlement(entitlement, listing);
    });
}

function integrationIdsQuery(integrations: LeadFlowIntegrationRecord[]) {
  const ids = integrations.map((item) => item.id).filter(isUuid);
  return ids.length ? `in.(${ids.join(",")})` : "in.(00000000-0000-4000-8000-000000000000)";
}

async function safeSelect<T>(table: string, params: Record<string, string | number | boolean | null | undefined>, loadErrors: string[]) {
  try {
    return await selectLeadFlowRows<T>(table, params);
  } catch (error) {
    loadErrors.push(`${table}: ${error instanceof Error ? error.message : "query failed"}`);
    return [];
  }
}

async function trackIntegrationEvent(eventName: string, properties: JsonRecord) {
  if (!hasLeadFlowDataApiConfig()) return;
  const safeProperties = sanitizeLeadFlowEventProperties(properties);
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "integration",
    route: typeof safeProperties.route === "string" ? safeProperties.route : "/buyer/integrations",
    user_role: typeof safeProperties.user_role === "string" ? safeProperties.user_role : "buyer",
    source_path: typeof safeProperties.route === "string" ? safeProperties.route : "/buyer/integrations",
    properties: safeProperties,
  }).catch(() => null);
}

async function auditIntegration(input: {
  actorUserId?: string | null;
  actorType: "buyer" | "admin" | "system";
  action: string;
  integrationId?: string | null;
  buyerAccountId?: string | null;
  details?: JsonRecord;
}) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("audit_log", {
    actor_user_id: uuidOrNull(input.actorUserId),
    actor_type: input.actorType,
    action: input.action,
    object_schema: "leadflow",
    object_table: "integrations",
    object_id: uuidOrNull(input.integrationId),
    buyer_account_id: uuidOrNull(input.buyerAccountId),
    details: {
      raw_records_returned: false,
      secrets_returned_to_client: false,
      ...(input.details || {}),
    },
  }).catch(() => null);
}

async function insertIntegrationRun(input: {
  integrationId: string;
  runType: IntegrationRunType;
  status?: IntegrationRunStatus;
  listingId?: string | null;
  profileCount?: number;
  errorMessage?: string | null;
}) {
  const inserted = await insertLeadFlowRow<LeadFlowIntegrationRun>("integration_runs", {
    integration_id: input.integrationId,
    run_type: input.runType,
    status: input.status || "running",
    listing_id: uuidOrNull(input.listingId),
    profile_count: input.profileCount || 0,
    started_at: nowIso(),
    completed_at: input.status && input.status !== "running" ? nowIso() : null,
    error_message: input.errorMessage || null,
  });
  return inserted[0] || null;
}

async function patchIntegrationRun(runId: string, patch: Partial<LeadFlowIntegrationRun>) {
  const updated = await patchLeadFlowRows<LeadFlowIntegrationRun>("integration_runs", { id: `eq.${runId}` }, patch);
  return updated[0] || null;
}

async function insertIntegrationLog(input: {
  integrationId: string;
  runId?: string | null;
  logLevel?: LeadFlowIntegrationLog["log_level"];
  eventType: string;
  message: string;
  payloadSummary?: JsonRecord;
}) {
  await insertLeadFlowRow("integration_logs", {
    integration_id: input.integrationId,
    run_id: uuidOrNull(input.runId),
    log_level: input.logLevel || "info",
    event_type: input.eventType,
    message: input.message.slice(0, 600),
    payload_summary: input.payloadSummary || {},
  }).catch(() => null);
}

function buildSafePayload(input: {
  integration: LeadFlowIntegrationRecord;
  entitlement: BuyerEntitlement;
  listing: BuyerIntegrationListingOption;
  runType: IntegrationRunType;
}) {
  const includeContact = Boolean(input.integration.delivery_settings?.include_contact_fields) && input.listing.contactAllowed;
  const record: JsonRecord = {
    profile_id: input.entitlement.lead_profile_id || input.listing.slug || input.entitlement.listing_id || "approved-signal",
    listing_id: input.entitlement.listing_id || input.listing.slug || null,
    title: input.listing.title,
    category: input.listing.category,
    vertical: input.listing.vertical,
    score: 0,
    confidence: "entitled",
    summary: "Approved LeadFlow signal summary. Full delivery stays scoped to the buyer entitlement.",
    buyer_use_case: "Use for reviewed sales research, routing, and follow-up planning.",
    recommended_next_action: "Review allowed-use notes before outreach.",
    source_proof_summary: "Source proof is reviewed in LeadFlow before release.",
    allowed_use: "Use only for the approved buyer purpose tied to this entitlement.",
    suppression_status: "not_suppressed",
  };

  if (includeContact) {
    record.business_name = input.listing.title;
    record.website = "";
  }

  return {
    event: textValue(readProviderConfig(input.integration.config_encrypted)?.event_type, "lead_signal.approved"),
    generated_at: nowIso(),
    run_type: input.runType,
    provider: input.integration.provider,
    integration_id: input.integration.id,
    records: [record],
    field_mapping: safeFieldMapping(input.integration.field_mapping),
    delivery_scope: {
      entitlement_id: input.entitlement.id,
      access_level: input.entitlement.access_level,
      contact_fields_included: includeContact,
      admin_fields_included: false,
      raw_answers_included: false,
      suppressed_records_included: false,
    },
  };
}

function entitlementsForIntegration(
  integration: LeadFlowIntegrationRecord,
  data: Extract<BuyerPortalData, { authenticated: true }>,
) {
  const listingOptions = allowedListingsForBuyer(data);
  const allowedListingIds = new Set(integration.allowed_listing_ids || []);
  const allowedVerticals = new Set((integration.allowed_verticals || []).map((item) => item.toLowerCase()));

  return data.entitlements
    .filter(entitlementActive)
    .map((entitlement) => {
      const listing = listingOptions.find((option) => {
        return option.id === entitlement.listing_id || option.slug === entitlement.listing_slug || option.slug === entitlement.lead_profile_id;
      }) || listingOptionFromEntitlement(entitlement);
      return { entitlement, listing };
    })
    .filter(({ entitlement, listing }) => {
      const listingAllowed = !allowedListingIds.size || (entitlement.listing_id && allowedListingIds.has(entitlement.listing_id));
      const verticalAllowed = !allowedVerticals.size || allowedVerticals.has(listing.vertical.toLowerCase());
      return listingAllowed && verticalAllowed;
    });
}

async function sendWebhookDelivery(input: {
  integration: LeadFlowIntegrationRecord;
  payload: JsonRecord;
}) {
  const config = readProviderConfig(input.integration.config_encrypted);
  const rawUrl = textValue(config?.webhook_url, "");
  const validated = validateWebhookUrl(rawUrl);
  if (!validated.ok) return validated;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "LeadFlowPro-Integration/1.0",
  };
  const secret = textValue(config?.secret_header, "");
  const secretHeaderName = textValue(config?.secret_header_name, "x-leadflow-secret").toLowerCase();
  if (secret && /^[a-z0-9-]{3,48}$/.test(secretHeaderName)) headers[secretHeaderName] = secret;

  try {
    const response = await fetch(validated.url, {
      method: "POST",
      headers,
      body: JSON.stringify(input.payload),
      signal: controller.signal,
      cache: "no-store",
    });
    return {
      ok: response.ok,
      statusCode: response.status,
      error: response.ok ? "" : `Webhook returned ${response.status}.`,
      reason: response.ok ? "delivered" : "webhook_non_2xx",
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Webhook delivery failed.",
      reason: "webhook_fetch_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadOwnIntegration(integrationId: string, buyerAccountId: string) {
  if (!hasLeadFlowDataApiConfig() || !uuidOrNull(integrationId)) return null;
  const rows = await selectLeadFlowRows<LeadFlowIntegrationRecord>("integrations", {
    select: integrationSelect,
    id: `eq.${integrationId}`,
    buyer_account_id: `eq.${buyerAccountId}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  return rows[0] || null;
}

type BuyerIntegrationContextResult =
  | { ok: false; status: number; error: string; reason: string }
  | { ok: true; data: AuthenticatedBuyerContext };

async function requireBuyerIntegrationContext(): Promise<BuyerIntegrationContextResult> {
  const data = await getBuyerPortalData();
  if (!data.authenticated) {
    return { ok: false as const, status: data.reason === "missing_config" ? 503 : 401, error: "Buyer login required.", reason: data.reason };
  }
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false as const, status: 503, error: "LeadFlow Supabase Data API is not configured.", reason: "missing_data_api" };
  }
  if (!data.account) {
    return { ok: false as const, status: 403, error: "Complete buyer profile before configuring integrations.", reason: "missing_buyer_account" };
  }
  if (buyerAccountIsRestricted(data.account)) {
    return { ok: false as const, status: 403, error: "This buyer account cannot configure integrations.", reason: "buyer_restricted" };
  }
  return { ok: true as const, data: { ...data, account: data.account } };
}

export async function getBuyerIntegrationsPageData(existingPortalData?: BuyerPortalData): Promise<BuyerIntegrationsPageData> {
  const data = existingPortalData || await getBuyerPortalData();
  if (!data.authenticated) return data;

  const restricted = buyerAccountIsRestricted(data.account);
  if (!hasLeadFlowDataApiConfig() || !data.account) {
    return {
      authenticated: true,
      account: data.account,
      restricted,
      integrations: [],
      runs: [],
      logs: [],
      allowedListings: restricted ? [] : allowedListingsForBuyer(data),
      providerCatalog: PROVIDER_CATALOG,
      loadErrors: hasLeadFlowDataApiConfig() ? [] : ["LeadFlow Supabase Data API is not configured."],
    };
  }

  const loadErrors: string[] = [];
  const integrations = await safeSelect<LeadFlowIntegrationRecord>("integrations", {
    select: integrationSelect,
    buyer_account_id: `eq.${data.account.id}`,
    deleted_at: "is.null",
    order: "updated_at.desc",
    limit: 100,
  }, loadErrors);
  const ids = integrationIdsQuery(integrations);
  const [runs, logs] = await Promise.all([
    safeSelect<LeadFlowIntegrationRun>("integration_runs", {
      select: runSelect,
      integration_id: ids,
      order: "started_at.desc",
      limit: 100,
    }, loadErrors),
    safeSelect<LeadFlowIntegrationLog>("integration_logs", {
      select: logSelect,
      integration_id: ids,
      order: "created_at.desc",
      limit: 100,
    }, loadErrors),
  ]);

  return {
    authenticated: true,
    account: data.account,
    restricted,
    integrations: restricted ? [] : integrations.map(safeIntegration),
    runs: restricted ? [] : runs,
    logs: restricted ? [] : logs,
    allowedListings: restricted ? [] : allowedListingsForBuyer(data),
    providerCatalog: PROVIDER_CATALOG,
    loadErrors,
  };
}

export async function getAdminIntegrationsPageData(): Promise<AdminIntegrationsPageData> {
  if (!hasLeadFlowDataApiConfig()) {
    return {
      mode: "offline",
      integrations: [],
      runs: [],
      logs: [],
      stats: { total: 0, active: 0, failed: 0, paused: 0, revoked: 0 },
      loadErrors: ["LeadFlow Supabase Data API is not configured."],
    };
  }

  const loadErrors: string[] = [];
  const [integrations, runs, logs, buyers] = await Promise.all([
    safeSelect<LeadFlowIntegrationRecord>("integrations", {
      select: integrationSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 200,
    }, loadErrors),
    safeSelect<LeadFlowIntegrationRun>("integration_runs", {
      select: runSelect,
      order: "started_at.desc",
      limit: 200,
    }, loadErrors),
    safeSelect<LeadFlowIntegrationLog>("integration_logs", {
      select: logSelect,
      order: "created_at.desc",
      limit: 200,
    }, loadErrors),
    safeSelect<{ id: string; name: string | null; company_name: string | null; account_status: string }>("buyer_accounts", {
      select: buyerAccountSelect,
      deleted_at: "is.null",
      limit: 500,
    }, loadErrors),
  ]);

  const buyerById = new Map(buyers.map((buyer) => [buyer.id, buyer]));
  const safeIntegrations = integrations.map((integration) => {
    const buyer = buyerById.get(integration.buyer_account_id);
    return {
      ...safeIntegration(integration),
      buyerName: buyer?.name || "Unknown buyer",
      buyerCompany: buyer?.company_name || "No company",
      buyerStatus: buyer?.account_status || "unknown",
    };
  });

  return {
    mode: "live",
    integrations: safeIntegrations,
    runs,
    logs,
    stats: {
      total: integrations.length,
      active: integrations.filter((item) => item.status === "active").length,
      failed: integrations.filter((item) => item.status === "failed").length,
      paused: integrations.filter((item) => item.status === "paused").length,
      revoked: integrations.filter((item) => item.status === "revoked").length,
    },
    loadErrors,
  };
}

export async function saveBuyerIntegration(input: SaveIntegrationInput): Promise<IntegrationActionResult> {
  const context = await requireBuyerIntegrationContext();
  if (!context.ok) return context;
  const { data } = context;
  const provider = normalizeProvider(input.provider);
  if (!provider) return { ok: false, status: 400, error: "Unsupported integration provider.", reason: "invalid_provider" };
  const catalog = providerCatalog(provider);
  const name = textValue(input.name, catalog.label).slice(0, 100);
  const status = normalizeStatus(input.status || "draft");
  const webhookLike = catalog.requiresWebhookUrl;

  if (webhookLike) {
    const webhookUrl = textValue(input.webhookUrl, "");
    const validated = validateWebhookUrl(webhookUrl);
    if (!validated.ok) return { ok: false, status: 400, error: validated.error, reason: validated.reason };
  }

  const existing = input.integrationId ? await loadOwnIntegration(input.integrationId, data.account.id) : null;
  if (input.integrationId && !existing) {
    return { ok: false, status: 404, error: "Integration not found for this buyer account.", reason: "integration_not_found" };
  }

  const row = {
    buyer_account_id: data.account.id,
    provider,
    name,
    status,
    config_encrypted: protectProviderConfig({ ...input, provider, name, status }),
    field_mapping: safeFieldMapping(input.fieldMapping),
    allowed_listing_ids: normalizeAllowedListingIds(input.allowedListingIds, data.entitlements),
    allowed_verticals: safeStringArray(input.allowedVerticals).slice(0, 12),
    delivery_settings: safeDeliverySettings(input.deliverySettings),
    created_by: uuidOrNull(data.user.id),
  };

  const saved = existing
    ? (await patchLeadFlowRows<LeadFlowIntegrationRecord>("integrations", { id: `eq.${existing.id}` }, {
        ...row,
        updated_at: nowIso(),
      }))[0]
    : (await insertLeadFlowRow<LeadFlowIntegrationRecord>("integrations", row))[0];

  if (!saved) return { ok: false, status: 500, error: "Integration could not be saved.", reason: "save_failed" };

  await Promise.all([
    auditIntegration({
      actorUserId: data.user.id,
      actorType: "buyer",
      action: existing ? "integration.updated" : "integration.created",
      integrationId: saved.id,
      buyerAccountId: data.account.id,
      details: {
        provider,
        status,
        webhook_configured: webhookLike,
        secret_returned_to_client: false,
      },
    }),
    trackIntegrationEvent("integration_created", {
      route: "/buyer/integrations",
      provider,
      status,
      user_role: "buyer",
    }),
  ]);

  return { ok: true, status: existing ? 200 : 201, integration: safeIntegration(saved), message: "Integration saved." };
}

export async function updateBuyerIntegrationStatus(input: {
  integrationId: string;
  status: Extract<IntegrationStatus, "active" | "paused" | "revoked">;
}) {
  const context = await requireBuyerIntegrationContext();
  if (!context.ok) return context;
  const { data } = context;
  const integration = await loadOwnIntegration(input.integrationId, data.account.id);
  if (!integration) return { ok: false as const, status: 404, error: "Integration not found.", reason: "integration_not_found" };

  const updated = (await patchLeadFlowRows<LeadFlowIntegrationRecord>("integrations", { id: `eq.${integration.id}` }, {
    status: input.status,
    deleted_at: input.status === "revoked" ? nowIso() : null,
    updated_at: nowIso(),
  }))[0];
  const eventName = input.status === "paused" ? "integration_paused" : input.status === "revoked" ? "integration_revoked" : "integration_created";
  await Promise.all([
    auditIntegration({
      actorUserId: data.user.id,
      actorType: "buyer",
      action: `integration.${input.status}`,
      integrationId: integration.id,
      buyerAccountId: data.account.id,
      details: { provider: integration.provider, status: input.status },
    }),
    trackIntegrationEvent(eventName, {
      route: "/buyer/integrations",
      provider: integration.provider,
      status: input.status,
      user_role: "buyer",
    }),
  ]);

  return { ok: true as const, status: 200, integration: updated ? safeIntegration(updated) : safeIntegration({ ...integration, status: input.status }), message: `Integration ${input.status}.` };
}

export async function runBuyerIntegration(input: {
  integrationId: string;
  runType: Extract<IntegrationRunType, "test" | "manual">;
  listingId?: string | null;
}): Promise<IntegrationActionResult> {
  const context = await requireBuyerIntegrationContext();
  if (!context.ok) return context;
  const { data } = context;
  const integration = await loadOwnIntegration(input.integrationId, data.account.id);
  if (!integration) return { ok: false, status: 404, error: "Integration not found.", reason: "integration_not_found" };
  if (input.runType === "manual" && integration.status !== "active") {
    return { ok: false, status: 409, error: "Only active integrations can run manually.", reason: "integration_not_active" };
  }
  if (integration.status === "revoked" || integration.deleted_at) {
    return { ok: false, status: 409, error: "Revoked integrations cannot run.", reason: "integration_revoked" };
  }

  const eligible = entitlementsForIntegration(integration, data);
  const selected = input.listingId
    ? eligible.find(({ entitlement }) => entitlement.listing_id === input.listingId)
    : eligible[0];
  if (!selected) {
    await trackIntegrationEvent("integration_run_failed", {
      route: "/buyer/integrations",
      provider: integration.provider,
      status: "blocked",
      user_role: "buyer",
      reason: "no_active_entitlement",
    });
    return { ok: false, status: 403, error: "Active entitlement required before delivery.", reason: "no_active_entitlement" };
  }

  const run = await insertIntegrationRun({
    integrationId: integration.id,
    runType: input.runType,
    status: "running",
    listingId: selected.entitlement.listing_id,
    profileCount: 1,
  });
  if (!run) return { ok: false, status: 500, error: "Integration run could not be created.", reason: "run_insert_failed" };

  await trackIntegrationEvent("integration_run_started", {
    route: "/buyer/integrations",
    provider: integration.provider,
    status: "running",
    user_role: "buyer",
  });

  const payload = buildSafePayload({
    integration,
    entitlement: selected.entitlement,
    listing: selected.listing,
    runType: input.runType,
  });

  const catalog = providerCatalog(integration.provider);
  let finalStatus: IntegrationRunStatus = "completed";
  let message = "Integration run completed.";
  let payloadSummary: JsonRecord = {
    provider: integration.provider,
    record_count: 1,
    payload_fields: Object.keys((payload.records as JsonRecord[])[0] || {}),
    raw_answers_included: false,
    admin_fields_included: false,
    suppressed_records_included: false,
  };

  if (["webhook", "zapier", "make"].includes(integration.provider)) {
    const delivery = await sendWebhookDelivery({ integration, payload });
    finalStatus = delivery.ok ? "completed" : "failed";
    message = delivery.ok ? "Webhook accepted the delivery." : delivery.error;
    payloadSummary = {
      ...payloadSummary,
      destination: previewUrl(textValue(readProviderConfig(integration.config_encrypted)?.webhook_url, "")),
      response_status: "statusCode" in delivery ? delivery.statusCode : null,
      reason: delivery.reason,
    };
  } else if (integration.provider === "csv") {
    finalStatus = "completed";
    message = "CSV delivery uses the controlled buyer export workflow.";
    payloadSummary = {
      ...payloadSummary,
      export_route: "/buyer/exports",
      format: "csv",
    };
  } else {
    finalStatus = "blocked";
    message = `${catalog.label} is mapped but not connected. OAuth or provider credentials are still TODO.`;
    payloadSummary = {
      ...payloadSummary,
      provider_status: catalog.status,
      missing_connector: true,
    };
  }

  const updatedRun = await patchIntegrationRun(run.id, {
    status: finalStatus,
    completed_at: nowIso(),
    error_message: finalStatus === "failed" || finalStatus === "blocked" ? message : null,
  });

  await Promise.all([
    insertIntegrationLog({
      integrationId: integration.id,
      runId: run.id,
      logLevel: finalStatus === "completed" ? "info" : finalStatus === "blocked" ? "warning" : "error",
      eventType: input.runType === "test" ? "integration_test" : "integration_run",
      message,
      payloadSummary,
    }),
    auditIntegration({
      actorUserId: data.user.id,
      actorType: "buyer",
      action: finalStatus === "completed" ? "integration.delivery_completed" : "integration.delivery_blocked",
      integrationId: integration.id,
      buyerAccountId: data.account.id,
      details: payloadSummary,
    }),
    trackIntegrationEvent(finalStatus === "completed" ? "integration_run_completed" : "integration_run_failed", {
      route: "/buyer/integrations",
      provider: integration.provider,
      status: finalStatus,
      user_role: "buyer",
    }),
    input.runType === "test"
      ? trackIntegrationEvent("integration_tested", {
          route: "/buyer/integrations",
          provider: integration.provider,
          status: finalStatus,
          user_role: "buyer",
        })
      : Promise.resolve(),
  ]);

  return {
    ok: finalStatus === "completed",
    status: finalStatus === "completed" ? 200 : finalStatus === "blocked" ? 409 : 502,
    run: updatedRun || { ...run, status: finalStatus, completed_at: nowIso(), error_message: finalStatus === "completed" ? null : message },
    message,
  } as IntegrationActionResult;
}

export async function adminUpdateIntegration(input: {
  actorUserId?: string | null;
  integrationId: string;
  action: "pause" | "resume" | "revoke";
  confirmedImpact: boolean;
}) {
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false as const, status: 503, error: "LeadFlow Supabase Data API is not configured.", reason: "missing_data_api" };
  }
  if (!input.confirmedImpact) {
    return { ok: false as const, status: 400, error: "Confirm the integration access change.", reason: "confirmation_required" };
  }
  const rows = await selectLeadFlowRows<LeadFlowIntegrationRecord>("integrations", {
    select: integrationSelect,
    id: `eq.${input.integrationId}`,
    limit: 1,
  }).catch(() => []);
  const integration = rows[0];
  if (!integration) return { ok: false as const, status: 404, error: "Integration not found.", reason: "integration_not_found" };

  const status: IntegrationStatus = input.action === "resume" ? "active" : input.action === "pause" ? "paused" : "revoked";
  const updated = (await patchLeadFlowRows<LeadFlowIntegrationRecord>("integrations", { id: `eq.${integration.id}` }, {
    status,
    deleted_at: status === "revoked" ? nowIso() : null,
    updated_at: nowIso(),
  }))[0];

  const eventName = input.action === "pause" ? "integration_paused" : input.action === "revoke" ? "integration_revoked" : "integration_created";
  await Promise.all([
    insertIntegrationLog({
      integrationId: integration.id,
      logLevel: input.action === "revoke" ? "security" : "warning",
      eventType: `admin_${input.action}`,
      message: `Admin ${input.action} action applied.`,
      payloadSummary: {
        provider: integration.provider,
        previous_status: integration.status,
        new_status: status,
        secrets_returned_to_client: false,
      },
    }),
    auditIntegration({
      actorUserId: input.actorUserId,
      actorType: "admin",
      action: `admin.integration.${input.action}`,
      integrationId: integration.id,
      buyerAccountId: integration.buyer_account_id,
      details: {
        provider: integration.provider,
        previous_status: integration.status,
        new_status: status,
      },
    }),
    trackIntegrationEvent(eventName, {
      route: "/dashboard/integrations",
      provider: integration.provider,
      status,
      user_role: "admin",
    }),
  ]);

  return {
    ok: true as const,
    status: 200,
    integration: updated ? safeIntegration(updated) : safeIntegration({ ...integration, status }),
    message: `Integration ${status}.`,
  };
}
