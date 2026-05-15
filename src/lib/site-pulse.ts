import { touchPublicVisitorProfile } from "@/lib/lead-memory";
import { prisma } from "@/lib/prisma";

export type SitePulseEventType =
  | "view"
  | "heartbeat"
  | "engagement"
  | "cta_start"
  | "cta_book"
  | "cta_capacity"
  | "cta_pulse"
  | "cta_service"
  | "cta_contact"
  | "cta_checkout"
  | "purchase_complete"
  | "chat_open"
  | "chat_question"
  | "chat_cta"
  | "click"
  | "form_interaction"
  | "scroll_depth"
  | "tool_interaction"
  | "traffic_source"
  | "return_visit"
  | "page_exit"
  | "section_view"
  | "copy_signal"
  | "external_click"
  | "dead_click"
  | "cta_impression"
  | "form_submit"
  | "video_interaction"
  | "rage_click"
  | "performance_signal"
  | "share_create"
  | "share_click"
  | "share_view_import"
  | "api_sync"
  | "tab_live"
  | "tab_views"
  | "tab_clicks"
  | "tab_share"
  | "tab_learn";

export type SitePulseOfflineReason =
  | "missing_database_url"
  | "schema_permission_denied"
  | "schema_unavailable"
  | "database_unreachable"
  | "insert_failed"
  | "snapshot_failed";

export type SitePulseSnapshot = {
  source: "live" | "offline";
  offlineReason?: SitePulseOfflineReason;
  offlineDetail?: string;
  trackingStartedAt: string | null;
  historyDays: number;
  activeNow: number;
  viewsToday: number;
  visitorsToday: number;
  totalViews: number;
  importedViews: number;
  returningVisitors: number;
  serviceClicksToday: number;
  bookClicksToday: number;
  capacityClicksToday: number;
  checkoutClicksToday: number;
  purchaseSignalsToday: number;
  chatQuestionsToday: number;
  trackedActionsToday: number;
  allClicksToday: number;
  formInteractionsToday: number;
  scrollDepthSignalsToday: number;
  toolInteractionsToday: number;
  trafficSourceSignalsToday: number;
  returnVisitsToday: number;
  pageExitsToday: number;
  sectionViewsToday: number;
  copySignalsToday: number;
  externalClicksToday: number;
  deadClicksToday: number;
  ctaImpressionsToday: number;
  formSubmitsToday: number;
  videoInteractionsToday: number;
  rageClicksToday: number;
  performanceSignalsToday: number;
  shareCreatesToday: number;
  shareClicksToday: number;
  socialShareViewsToday: number;
  totalShareClicks: number;
  engagementSecondsToday: number;
  totalEngagementSeconds: number;
  updatedAt: string;
  hourly: Array<{ label: string; views: number; visitors: number }>;
  daily: Array<{
    date: string;
    label: string;
    views: number;
    visitors: number;
    serviceClicks: number;
    bookClicks: number;
    capacityClicks: number;
    checkoutClicks: number;
    purchaseSignals: number;
    chatQuestions: number;
    trackedActions: number;
    allClicks: number;
    formInteractions: number;
    formSubmits: number;
    toolInteractions: number;
    deadClicks: number;
    rageClicks: number;
    videoInteractions: number;
    performanceSignals: number;
    returnVisits: number;
    engagementSeconds: number;
    liveViews: number;
    importedViews: number;
  }>;
  topPaths: Array<{ path: string; views: number }>;
  topIntentPaths: Array<{
    path: string;
    views: number;
    clicks: number;
    engagementSeconds: number;
  }>;
  topQuestionTopics: Array<{ topic: string; count: number }>;
  topTrafficSources: Array<{
    source: string;
    events: number;
    views: number;
    visitors: number;
  }>;
  topShares: Array<{
    token: string;
    platform: string;
    path: string;
    shares: number;
    clicks: number;
    reportedViews: number;
  }>;
  learning: SitePulseLearning;
  prediction: SitePulsePrediction;
  recent: Array<{ eventType: string; path: string; createdAt: string }>;
};

export type SitePulseLearning = {
  trackingStartedAt: string | null;
  historyDays: number;
  strongestPath: {
    path: string;
    views: number;
    clicks: number;
    engagementSeconds: number;
  } | null;
  longestWatchedPath: { path: string; engagementSeconds: number } | null;
  topQuestionTopic: { topic: string; count: number } | null;
  recommendedActions: Array<{
    priority: "high" | "medium" | "watch";
    title: string;
    body: string;
    evidence: string;
  }>;
};

export type SitePulsePrediction = {
  confidence: "low" | "medium" | "high";
  sampleSize: number;
  trafficQualityScore: number;
  conversionReadinessScore: number;
  projectedNext24h: {
    views: number;
    visitors: number;
    trackedActions: number;
    serviceClicks: number;
    bookClicks: number;
    checkoutStarts: number;
  };
  projectedNext7d: {
    views: number;
    visitors: number;
    trackedActions: number;
    bookClicks: number;
    checkoutStarts: number;
  };
  probabilities: {
    serviceClickNext24h: number;
    bookClickNext24h: number;
    checkoutStartNext24h: number;
    purchaseSignalNext24h: number;
    shareClickNext24h: number;
    returnVisitNext7d: number;
  };
  audienceIntent: Array<{
    segment: string;
    probability: number;
    evidence: string;
  }>;
  topOpportunity: {
    path: string;
    score: number;
    reason: string;
    suggestedMove: string;
  } | null;
  trafficSourceMix: Array<{
    source: string;
    probability: number;
    evidence: string;
  }>;
  nextBestExperiments: Array<{
    title: string;
    why: string;
    metricToWatch: string;
    expectedLift: string;
  }>;
  modelNotes: string[];
};

export type SitePulseBackfillDay = {
  date: string;
  views?: number;
  visitors?: number;
  serviceClicks?: number;
  bookClicks?: number;
  capacityClicks?: number;
  source?: string;
};

type PulseSummaryRow = {
  activeNow: number | bigint | null;
  viewsToday: number | bigint | null;
  visitorsToday: number | bigint | null;
  totalViews: number | bigint | null;
  serviceClicksToday: number | bigint | null;
  bookClicksToday: number | bigint | null;
  capacityClicksToday: number | bigint | null;
  checkoutClicksToday: number | bigint | null;
  purchaseSignalsToday: number | bigint | null;
  chatQuestionsToday: number | bigint | null;
  trackedActionsToday: number | bigint | null;
  allClicksToday: number | bigint | null;
  formInteractionsToday: number | bigint | null;
  scrollDepthSignalsToday: number | bigint | null;
  toolInteractionsToday: number | bigint | null;
  trafficSourceSignalsToday: number | bigint | null;
  returnVisitsToday: number | bigint | null;
  pageExitsToday: number | bigint | null;
  sectionViewsToday: number | bigint | null;
  copySignalsToday: number | bigint | null;
  externalClicksToday: number | bigint | null;
  deadClicksToday: number | bigint | null;
  ctaImpressionsToday: number | bigint | null;
  formSubmitsToday: number | bigint | null;
  videoInteractionsToday: number | bigint | null;
  rageClicksToday: number | bigint | null;
  performanceSignalsToday: number | bigint | null;
  shareCreatesToday: number | bigint | null;
  shareClicksToday: number | bigint | null;
  socialShareViewsToday: number | bigint | null;
  totalShareClicks: number | bigint | null;
  engagementSecondsToday: number | bigint | null;
  totalEngagementSeconds: number | bigint | null;
};

type ReturningRow = {
  returningVisitors: number | bigint | null;
};

type HourlyRow = {
  bucket: Date;
  views: number | bigint | null;
  visitors: number | bigint | null;
};

type DailyRow = {
  date: Date;
  views: number | bigint | null;
  visitors: number | bigint | null;
  serviceClicks: number | bigint | null;
  bookClicks: number | bigint | null;
  capacityClicks: number | bigint | null;
  checkoutClicks: number | bigint | null;
  purchaseSignals: number | bigint | null;
  chatQuestions: number | bigint | null;
  trackedActions: number | bigint | null;
  allClicks: number | bigint | null;
  formInteractions: number | bigint | null;
  formSubmits: number | bigint | null;
  toolInteractions: number | bigint | null;
  deadClicks: number | bigint | null;
  rageClicks: number | bigint | null;
  videoInteractions: number | bigint | null;
  performanceSignals: number | bigint | null;
  returnVisits: number | bigint | null;
  engagementSeconds: number | bigint | null;
};

type BackfillRow = {
  date: Date;
  views: number | bigint | null;
  visitors: number | bigint | null;
  serviceClicks: number | bigint | null;
  bookClicks: number | bigint | null;
  capacityClicks: number | bigint | null;
};

type FirstDateRow = {
  firstDate: Date | null;
};

type PathRow = {
  path: string;
  views: number | bigint | null;
};

type IntentPathRow = {
  path: string;
  views: number | bigint | null;
  clicks: number | bigint | null;
  engagementSeconds: number | bigint | null;
};

type QuestionTopicRow = {
  topic: string;
  count: number | bigint | null;
};

type ShareRow = {
  token: string;
  platform: string;
  path: string;
  shares: number | bigint | null;
  clicks: number | bigint | null;
  reportedViews: number | bigint | null;
};

type TrafficSourceRow = {
  source: string;
  events: number | bigint | null;
  views: number | bigint | null;
  visitors: number | bigint | null;
};

type RecentRow = {
  eventType: string;
  path: string;
  createdAt: Date;
};

const ALLOWED_EVENTS: SitePulseEventType[] = [
  "view",
  "heartbeat",
  "engagement",
  "cta_start",
  "cta_book",
  "cta_capacity",
  "cta_pulse",
  "cta_service",
  "cta_contact",
  "cta_checkout",
  "purchase_complete",
  "chat_open",
  "chat_question",
  "chat_cta",
  "click",
  "form_interaction",
  "scroll_depth",
  "tool_interaction",
  "traffic_source",
  "return_visit",
  "page_exit",
  "section_view",
  "copy_signal",
  "external_click",
  "dead_click",
  "cta_impression",
  "form_submit",
  "video_interaction",
  "rage_click",
  "performance_signal",
  "share_create",
  "share_click",
  "share_view_import",
  "api_sync",
  "tab_live",
  "tab_views",
  "tab_clicks",
  "tab_share",
  "tab_learn",
];

const MAX_HISTORY_DAYS = 730;
const SITE_TIME_ZONE = "America/Chicago";
let tablesReady = false;

export class SitePulseUnavailableError extends Error {
  reason: SitePulseOfflineReason;

  constructor(reason: SitePulseOfflineReason, message = reason) {
    super(message);
    this.name = "SitePulseUnavailableError";
    this.reason = reason;
  }
}

function assertDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new SitePulseUnavailableError("missing_database_url");
  }
}

export function classifySitePulseError(
  error: unknown,
  fallback: SitePulseOfflineReason,
): SitePulseOfflineReason {
  if (error instanceof SitePulseUnavailableError) return error.reason;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("database_url")) return "missing_database_url";
  if (message.includes("permission denied")) return "schema_permission_denied";
  if (message.includes("does not exist") || message.includes("relation")) return "schema_unavailable";
  if (
    message.includes("can't reach database") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("econn")
  ) {
    return "database_unreachable";
  }

  return fallback;
}

export function sanitizeSitePulseError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "[redacted-db-url]")
    .replace(/(password|secret|token|apikey|api_key|key)=([^&\s'"]+)/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 260);
}

function toInt(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

function cleanText(value: unknown, fallback: string, max = 128) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

export function cleanPulsePath(value: unknown) {
  const path = cleanText(value, "/", 180);
  if (!path.startsWith("/")) return "/";
  return path.split("?")[0].slice(0, 180) || "/";
}

export function cleanPulseVisitorId(value: unknown) {
  const raw = cleanText(value, "", 80);
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return cleaned || crypto.randomUUID();
}

export function cleanPulseEventType(value: unknown): SitePulseEventType {
  return ALLOWED_EVENTS.includes(value as SitePulseEventType)
    ? (value as SitePulseEventType)
    : "view";
}

function cleanSource(value: unknown, fallback = "homepage") {
  return cleanText(value, fallback, 48).replace(/[^a-zA-Z0-9 _.:/-]/g, "").slice(0, 48);
}

function cleanPulseTarget(value: unknown) {
  return cleanText(value, "", 160)
    .replace(/[^\w\s:/.@#-]/g, "")
    .slice(0, 160);
}

function cleanSharePlatform(value: unknown) {
  return cleanText(value, "copy", 32)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32) || "copy";
}

function safeSignalValue(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return 0;
  return Math.min(86_400, Math.max(0, Math.round(number)));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function centralDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  return dateFromKey(centralDateKey());
}

function diffDays(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
}

function historyStartFrom(firstDate: Date | null | undefined) {
  const today = startOfToday();
  const maxStart = new Date(today);
  maxStart.setDate(today.getDate() - (MAX_HISTORY_DAYS - 1));

  if (!firstDate || Number.isNaN(firstDate.getTime())) {
    const fallback = new Date(today);
    fallback.setDate(today.getDate() - 6);
    return fallback;
  }

  const first = dateFromKey(dateKey(new Date(firstDate)));
  return first < maxStart ? maxStart : first;
}

function validDay(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function safeCount(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

export async function ensureSitePulseTables() {
  if (tablesReady) return;
  assertDatabaseUrl();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SitePulseEvent" (
      "id" TEXT PRIMARY KEY,
      "visitorId" TEXT NOT NULL,
      "path" TEXT NOT NULL DEFAULT '/',
      "eventType" TEXT NOT NULL,
      "source" TEXT,
      "target" TEXT,
      "value" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SitePulseEvent"
      ADD COLUMN IF NOT EXISTS "target" TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SitePulseEvent"
      ADD COLUMN IF NOT EXISTS "value" INTEGER NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SitePulseDailyBackfill" (
      "id" TEXT PRIMARY KEY,
      "date" DATE NOT NULL UNIQUE,
      "views" INTEGER NOT NULL DEFAULT 0,
      "visitors" INTEGER NOT NULL DEFAULT 0,
      "serviceClicks" INTEGER NOT NULL DEFAULT 0,
      "bookClicks" INTEGER NOT NULL DEFAULT 0,
      "capacityClicks" INTEGER NOT NULL DEFAULT 0,
      "source" TEXT NOT NULL DEFAULT 'manual-import',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SiteShareLink" (
      "id" TEXT PRIMARY KEY,
      "token" TEXT NOT NULL UNIQUE,
      "visitorId" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "path" TEXT NOT NULL DEFAULT '/pulse',
      "title" TEXT,
      "source" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_createdAt_idx"
      ON "SitePulseEvent" ("createdAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_visitorId_createdAt_idx"
      ON "SitePulseEvent" ("visitorId", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_eventType_createdAt_idx"
      ON "SitePulseEvent" ("eventType", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_path_createdAt_idx"
      ON "SitePulseEvent" ("path", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_target_createdAt_idx"
      ON "SitePulseEvent" ("target", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseDailyBackfill_date_idx"
      ON "SitePulseDailyBackfill" ("date" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SiteShareLink_createdAt_idx"
      ON "SiteShareLink" ("createdAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SiteShareLink_platform_createdAt_idx"
      ON "SiteShareLink" ("platform", "createdAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SiteShareLink_path_createdAt_idx"
      ON "SiteShareLink" ("path", "createdAt" DESC)
  `);

  tablesReady = true;
}

export function emptySitePulseSnapshot(
  source: "offline" | "live" = "offline",
  offlineReason?: SitePulseOfflineReason,
  offlineDetail?: string,
): SitePulseSnapshot {
  return {
    source,
    offlineReason,
    offlineDetail,
    trackingStartedAt: null,
    historyDays: 0,
    activeNow: 0,
    viewsToday: 0,
    visitorsToday: 0,
    totalViews: 0,
    importedViews: 0,
    returningVisitors: 0,
    serviceClicksToday: 0,
    bookClicksToday: 0,
    capacityClicksToday: 0,
    checkoutClicksToday: 0,
    purchaseSignalsToday: 0,
    chatQuestionsToday: 0,
    trackedActionsToday: 0,
    allClicksToday: 0,
    formInteractionsToday: 0,
    scrollDepthSignalsToday: 0,
    toolInteractionsToday: 0,
    trafficSourceSignalsToday: 0,
    returnVisitsToday: 0,
    pageExitsToday: 0,
    sectionViewsToday: 0,
    copySignalsToday: 0,
    externalClicksToday: 0,
    deadClicksToday: 0,
    ctaImpressionsToday: 0,
    formSubmitsToday: 0,
    videoInteractionsToday: 0,
    rageClicksToday: 0,
    performanceSignalsToday: 0,
    shareCreatesToday: 0,
    shareClicksToday: 0,
    socialShareViewsToday: 0,
    totalShareClicks: 0,
    engagementSecondsToday: 0,
    totalEngagementSeconds: 0,
    updatedAt: new Date().toISOString(),
    hourly: buildEmptyHours(),
    daily: buildEmptyDays(),
    topPaths: [],
    topIntentPaths: [],
    topQuestionTopics: [],
    topTrafficSources: [],
    topShares: [],
    learning: {
      trackingStartedAt: null,
      historyDays: 0,
      strongestPath: null,
      longestWatchedPath: null,
      topQuestionTopic: null,
      recommendedActions: [
        {
          priority: "watch",
          title: "Start collecting real behavior",
          body: "The board needs live views, clicks, engagement time, questions, and purchase signals before it can recommend the next build.",
          evidence: "No live pulse rows are available yet.",
        },
      ],
    },
    prediction: buildEmptyPrediction(),
    recent: [],
  };
}

function buildEmptyHours() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() - 11);

  return Array.from({ length: 12 }, (_, index) => {
    const bucket = new Date(start);
    bucket.setHours(start.getHours() + index);
    return {
      label: bucket.toLocaleTimeString("en-US", { hour: "numeric", timeZone: SITE_TIME_ZONE }),
      views: 0,
      visitors: 0,
    };
  });
}

function fillHours(rows: HourlyRow[]) {
  const hours = buildEmptyHours();
  const byHour = new Map(
    rows.map((row) => {
      const bucket = new Date(row.bucket);
      bucket.setMinutes(0, 0, 0);
      return [
        bucket.getTime(),
        {
          views: toInt(row.views),
          visitors: toInt(row.visitors),
        },
      ];
    }),
  );

  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() - 11);

  return hours.map((hour, index) => {
    const bucket = new Date(start);
    bucket.setHours(start.getHours() + index);
    const found = byHour.get(bucket.getTime());
    return found ? { ...hour, ...found } : hour;
  });
}

function buildEmptyDays(startDate?: Date) {
  const today = startOfToday();
  const start = startDate ? dateFromKey(dateKey(startDate)) : new Date(today);
  if (!startDate) start.setDate(today.getDate() - 6);
  const count = Math.min(MAX_HISTORY_DAYS, diffDays(start, today) + 1);

  return Array.from({ length: count }, (_, index) => {
    const bucket = new Date(start);
    bucket.setDate(start.getDate() + index);
    return {
      date: dateKey(bucket),
      label: bucket.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }),
      views: 0,
      visitors: 0,
      serviceClicks: 0,
      bookClicks: 0,
      capacityClicks: 0,
      checkoutClicks: 0,
      purchaseSignals: 0,
      chatQuestions: 0,
      trackedActions: 0,
      allClicks: 0,
      formInteractions: 0,
      formSubmits: 0,
      toolInteractions: 0,
      deadClicks: 0,
      rageClicks: 0,
      videoInteractions: 0,
      performanceSignals: 0,
      returnVisits: 0,
      engagementSeconds: 0,
      liveViews: 0,
      importedViews: 0,
    };
  });
}

function fillDays(liveRows: DailyRow[], backfillRows: BackfillRow[], startDate: Date) {
  const liveByDate = new Map(
    liveRows.map((row) => [
      dateKey(new Date(row.date)),
      {
        views: toInt(row.views),
        visitors: toInt(row.visitors),
        serviceClicks: toInt(row.serviceClicks),
        bookClicks: toInt(row.bookClicks),
        capacityClicks: toInt(row.capacityClicks),
        checkoutClicks: toInt(row.checkoutClicks),
        purchaseSignals: toInt(row.purchaseSignals),
        chatQuestions: toInt(row.chatQuestions),
        trackedActions: toInt(row.trackedActions),
        allClicks: toInt(row.allClicks),
        formInteractions: toInt(row.formInteractions),
        formSubmits: toInt(row.formSubmits),
        toolInteractions: toInt(row.toolInteractions),
        deadClicks: toInt(row.deadClicks),
        rageClicks: toInt(row.rageClicks),
        videoInteractions: toInt(row.videoInteractions),
        performanceSignals: toInt(row.performanceSignals),
        returnVisits: toInt(row.returnVisits),
        engagementSeconds: toInt(row.engagementSeconds),
      },
    ]),
  );
  const importedByDate = new Map(
    backfillRows.map((row) => [
      dateKey(new Date(row.date)),
      {
        views: toInt(row.views),
        visitors: toInt(row.visitors),
        serviceClicks: toInt(row.serviceClicks),
        bookClicks: toInt(row.bookClicks),
        capacityClicks: toInt(row.capacityClicks),
      },
    ]),
  );

  return buildEmptyDays(startDate).map((day) => {
    const live = liveByDate.get(day.date);
    const imported = importedByDate.get(day.date);
    const liveViews = live?.views ?? 0;
    const importedViews = imported?.views ?? 0;

    return {
      ...day,
      views: liveViews + importedViews,
      visitors: (live?.visitors ?? 0) + (imported?.visitors ?? 0),
      serviceClicks: (live?.serviceClicks ?? 0) + (imported?.serviceClicks ?? 0),
      bookClicks: (live?.bookClicks ?? 0) + (imported?.bookClicks ?? 0),
      capacityClicks: (live?.capacityClicks ?? 0) + (imported?.capacityClicks ?? 0),
      checkoutClicks: live?.checkoutClicks ?? 0,
      purchaseSignals: live?.purchaseSignals ?? 0,
      chatQuestions: live?.chatQuestions ?? 0,
      trackedActions: live?.trackedActions ?? 0,
      allClicks: live?.allClicks ?? 0,
      formInteractions: live?.formInteractions ?? 0,
      formSubmits: live?.formSubmits ?? 0,
      toolInteractions: live?.toolInteractions ?? 0,
      deadClicks: live?.deadClicks ?? 0,
      rageClicks: live?.rageClicks ?? 0,
      videoInteractions: live?.videoInteractions ?? 0,
      performanceSignals: live?.performanceSignals ?? 0,
      returnVisits: live?.returnVisits ?? 0,
      engagementSeconds: live?.engagementSeconds ?? 0,
      liveViews,
      importedViews,
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundInt(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function percentProbability(expectedCount: number) {
  if (!Number.isFinite(expectedCount) || expectedCount <= 0) return 0;
  return clamp(Math.round((1 - Math.exp(-expectedCount)) * 100), 1, 99);
}

function safeRate(part: number, whole: number, fallback = 0) {
  if (!whole) return fallback;
  return clamp(part / whole, 0, 1);
}

function buildEmptyPrediction(): SitePulsePrediction {
  return {
    confidence: "low",
    sampleSize: 0,
    trafficQualityScore: 0,
    conversionReadinessScore: 0,
    projectedNext24h: {
      views: 0,
      visitors: 0,
      trackedActions: 0,
      serviceClicks: 0,
      bookClicks: 0,
      checkoutStarts: 0,
    },
    projectedNext7d: {
      views: 0,
      visitors: 0,
      trackedActions: 0,
      bookClicks: 0,
      checkoutStarts: 0,
    },
    probabilities: {
      serviceClickNext24h: 0,
      bookClickNext24h: 0,
      checkoutStartNext24h: 0,
      purchaseSignalNext24h: 0,
      shareClickNext24h: 0,
      returnVisitNext7d: 0,
    },
    audienceIntent: [],
    topOpportunity: null,
    trafficSourceMix: [],
    nextBestExperiments: [
      {
        title: "Feed the model live visitors",
        why: "Prediction confidence starts low until the site has enough views, clicks, engaged time, shares, and return visits.",
        metricToWatch: "Views, tracked actions, engaged seconds",
        expectedLift: "Model confidence",
      },
    ],
    modelNotes: [
      "Estimates use anonymous first-party site behavior only.",
      "Probabilities are directional, not guarantees.",
    ],
  };
}

function intentSegmentForPath(path: string) {
  if (path.includes("leaderboard") || path.includes("voice") || path.includes("support")) {
    return "Community voter or local supporter";
  }
  if (path.includes("stump-ryan") || path.includes("challenge") || path.includes("tool") || path.includes("start")) {
    return "Owner who needs a custom tool";
  }
  if (path.includes("consulting") || path.includes("decision") || path.includes("working-session")) {
    return "Consulting buyer";
  }
  if (path.includes("services") || path.includes("platforms") || path.includes("social")) {
    return "Social media buyer";
  }
  if (path.includes("book") || path.includes("contact")) {
    return "Calendar-ready lead";
  }
  if (path.includes("pulse")) {
    return "Data-driven operator";
  }
  return "General business owner";
}

function suggestedMoveForPath(path: string, clickRate: number) {
  if (path.includes("leaderboard") || path.includes("voice")) {
    return "Add more share buttons, board-specific badges, and a faster paid vote path above the fold.";
  }
  if (path.includes("pulse")) {
    return "Route data-minded visitors into a paid audit or Stump Ryan blueprint while the proof is fresh.";
  }
  if (path.includes("stump-ryan") || path.includes("challenge")) {
    return "Keep the free blueprint above the fold and put the $250 continuation after the first useful answer.";
  }
  if (path.includes("book")) {
    return "Reduce choices and show the best next calendar action immediately.";
  }
  if (clickRate < 0.08) {
    return "Move the primary CTA higher, sharpen the offer promise, and add a proof block before the next section.";
  }
  return "Clone this page's hook into a short, email, ad angle, and homepage route.";
}

function buildSitePulsePrediction(input: {
  historyDays: number;
  totalViews: number;
  visitorsToday: number;
  returningVisitors: number;
  daily: SitePulseSnapshot["daily"];
  topIntentPaths: SitePulseSnapshot["topIntentPaths"];
  topTrafficSources: SitePulseSnapshot["topTrafficSources"];
  serviceClicksToday: number;
  bookClicksToday: number;
  checkoutClicksToday: number;
  purchaseSignalsToday: number;
  shareClicksToday: number;
  socialShareViewsToday: number;
  totalShareClicks: number;
  trackedActionsToday: number;
  allClicksToday: number;
  formInteractionsToday: number;
  toolInteractionsToday: number;
  trafficSourceSignalsToday: number;
  returnVisitsToday: number;
  pageExitsToday: number;
  sectionViewsToday: number;
  copySignalsToday: number;
  externalClicksToday: number;
  deadClicksToday: number;
  ctaImpressionsToday: number;
  formSubmitsToday: number;
  videoInteractionsToday: number;
  rageClicksToday: number;
  performanceSignalsToday: number;
  totalEngagementSeconds: number;
}): SitePulsePrediction {
  if (!input.totalViews && !input.daily.some((day) => day.views > 0)) return buildEmptyPrediction();

  const totals = input.daily.reduce(
    (acc, day) => ({
      views: acc.views + day.views,
      visitors: acc.visitors + day.visitors,
      trackedActions: acc.trackedActions + day.trackedActions,
      serviceClicks: acc.serviceClicks + day.serviceClicks,
      bookClicks: acc.bookClicks + day.bookClicks,
      checkoutClicks: acc.checkoutClicks + day.checkoutClicks,
      purchaseSignals: acc.purchaseSignals + day.purchaseSignals,
      formSubmits: acc.formSubmits + (day.formSubmits ?? 0),
      deadClicks: acc.deadClicks + (day.deadClicks ?? 0),
      rageClicks: acc.rageClicks + (day.rageClicks ?? 0),
      videoInteractions: acc.videoInteractions + (day.videoInteractions ?? 0),
      performanceSignals: acc.performanceSignals + (day.performanceSignals ?? 0),
      returnVisits: acc.returnVisits + (day.returnVisits ?? 0),
      engagementSeconds: acc.engagementSeconds + day.engagementSeconds,
    }),
    {
      views: 0,
      visitors: 0,
      trackedActions: 0,
      serviceClicks: 0,
      bookClicks: 0,
      checkoutClicks: 0,
      purchaseSignals: 0,
      formSubmits: 0,
      deadClicks: 0,
      rageClicks: 0,
      videoInteractions: 0,
      performanceSignals: 0,
      returnVisits: 0,
      engagementSeconds: 0,
    },
  );

  const recent = input.daily.slice(-3);
  const previous = input.daily.slice(-6, -3);
  const recentViewsAvg =
    recent.reduce((sum, day) => sum + day.views, 0) / Math.max(recent.length, 1);
  const previousViewsAvg =
    previous.reduce((sum, day) => sum + day.views, 0) / Math.max(previous.length, 1);
  const trendMultiplier = clamp(
    previousViewsAvg > 0 ? recentViewsAvg / previousViewsAvg : recentViewsAvg > 0 ? 1.2 : 1,
    0.55,
    2.4,
  );

  const baseViews24 = Math.max(input.visitorsToday, recentViewsAvg, input.totalViews / Math.max(input.historyDays, 1));
  const projectedViews24 = roundInt(baseViews24 * trendMultiplier);
  const visitorRate = safeRate(totals.visitors, totals.views, 0.62);
  const actionRate = safeRate(totals.trackedActions || input.trackedActionsToday, totals.views || input.totalViews, 0.1);
  const serviceRate = safeRate(totals.serviceClicks + input.serviceClicksToday, totals.views + input.totalViews, 0.025);
  const bookRate = safeRate(totals.bookClicks + input.bookClicksToday, totals.views + input.totalViews, 0.012);
  const checkoutRate = safeRate(
    totals.checkoutClicks + input.checkoutClicksToday,
    totals.views + input.totalViews,
    0.006,
  );
  const purchaseRate = safeRate(
    totals.purchaseSignals + input.purchaseSignalsToday,
    Math.max(totals.checkoutClicks + input.checkoutClicksToday, 1),
    0.08,
  );
  const shareRate = safeRate(input.totalShareClicks + input.shareClicksToday, totals.views + input.totalViews, 0.006);
  const returnRate = safeRate(input.returningVisitors + input.returnVisitsToday, input.totalViews, 0.08);
  const avgEngagedSecondsPerView = input.totalEngagementSeconds / Math.max(input.totalViews, 1);
  const deadClickRate = safeRate(input.deadClicksToday + totals.deadClicks, input.allClicksToday + totals.trackedActions, 0);

  const projectedNext24h = {
    views: projectedViews24,
    visitors: roundInt(projectedViews24 * visitorRate),
    trackedActions: roundInt(projectedViews24 * actionRate),
    serviceClicks: roundInt(projectedViews24 * serviceRate),
    bookClicks: roundInt(projectedViews24 * bookRate),
    checkoutStarts: roundInt(projectedViews24 * checkoutRate),
  };

  const projectedNext7d = {
    views: roundInt(projectedViews24 * 7 * clamp(trendMultiplier, 0.75, 1.55)),
    visitors: roundInt(projectedViews24 * 7 * visitorRate),
    trackedActions: roundInt(projectedViews24 * 7 * actionRate),
    bookClicks: roundInt(projectedViews24 * 7 * bookRate),
    checkoutStarts: roundInt(projectedViews24 * 7 * checkoutRate),
  };

  const sampleSize = roundInt(
    input.totalViews +
      input.trackedActionsToday +
      totals.trackedActions +
      input.totalEngagementSeconds / 30 +
      input.totalShareClicks * 3 +
      input.formSubmitsToday * 8 +
      input.videoInteractionsToday * 3,
  );
  const confidence =
    sampleSize >= 750 && input.historyDays >= 7
      ? "high"
      : sampleSize >= 120 && input.historyDays >= 3
        ? "medium"
        : "low";

  const trafficQualityScore = clamp(
    Math.round(
      safeRate(totals.trackedActions + input.trackedActionsToday, Math.max(input.totalViews, 1)) * 260 +
        clamp(avgEngagedSecondsPerView / 16, 0, 24) +
        returnRate * 120 +
        shareRate * 220 -
        deadClickRate * 45 -
        safeRate(input.rageClicksToday + totals.rageClicks, input.allClicksToday + totals.trackedActions, 0) * 60,
    ),
    0,
    100,
  );
  const conversionReadinessScore = clamp(
    Math.round(serviceRate * 480 + bookRate * 900 + checkoutRate * 1200 + purchaseRate * 20 + shareRate * 250),
    0,
    100,
  );

  const intentScores = new Map<string, { score: number; evidence: string[] }>();
  for (const row of input.topIntentPaths) {
    const segment = intentSegmentForPath(row.path);
    const score = row.views + row.clicks * 8 + Math.round(row.engagementSeconds / 20);
    const existing = intentScores.get(segment) ?? { score: 0, evidence: [] };
    existing.score += score;
    existing.evidence.push(`${row.path}: ${row.views} views, ${row.clicks} actions`);
    intentScores.set(segment, existing);
  }
  const totalIntentScore = Array.from(intentScores.values()).reduce((sum, item) => sum + item.score, 0);
  const audienceIntent = Array.from(intentScores.entries())
    .map(([segment, data]) => ({
      segment,
      probability: totalIntentScore ? clamp(Math.round((data.score / totalIntentScore) * 100), 1, 99) : 0,
      evidence: data.evidence.slice(0, 2).join(" | "),
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  const topPath =
    input.topIntentPaths
      .map((row) => {
        const clickRate = safeRate(row.clicks, row.views, 0);
        return {
          ...row,
          score: clamp(Math.round(row.views * 1.5 + row.clicks * 10 + row.engagementSeconds / 18), 0, 1000),
          clickRate,
        };
      })
      .sort((a, b) => b.score - a.score)[0] ?? null;

  const topOpportunity = topPath
    ? {
        path: topPath.path,
        score: topPath.score,
        reason:
          topPath.clickRate < 0.06
            ? "Attention is showing up, but intent is weak for the amount of traffic."
            : "This path is pulling enough attention and intent to deserve more distribution.",
        suggestedMove: suggestedMoveForPath(topPath.path, topPath.clickRate),
      }
    : null;

  const sourceTotal = input.topTrafficSources.reduce((sum, item) => sum + item.events, 0);
  const trafficSourceMix = input.topTrafficSources.slice(0, 5).map((item) => ({
    source: item.source,
    probability: sourceTotal ? clamp(Math.round((item.events / sourceTotal) * 100), 1, 99) : 0,
    evidence: `${item.events.toLocaleString()} events, ${item.visitors.toLocaleString()} visitors`,
  }));

  const experiments: SitePulsePrediction["nextBestExperiments"] = [];
  if (input.deadClicksToday >= 3 || deadClickRate > 0.18) {
    experiments.push({
      title: "Fix dead zones",
      why: "Visitors are clicking parts of the page that are not real actions.",
      metricToWatch: "Dead-click rate and CTA clicks",
      expectedLift: "Cleaner path to action",
    });
  }
  if (input.rageClicksToday > 0) {
    experiments.push({
      title: "Remove click confusion",
      why: "Rage-clicks mean a visitor repeatedly clicked something that did not respond the way they expected.",
      metricToWatch: "Rage clicks, dead clicks, and CTA impressions",
      expectedLift: "Less frustration",
    });
  }
  if (input.formSubmitsToday > 0) {
    experiments.push({
      title: "Follow the submitted intent",
      why: "A form submit is stronger than a click. Turn the submitted topic into the next page, offer, or follow-up sequence.",
      metricToWatch: "Form submits and downstream booking or checkout clicks",
      expectedLift: "More qualified leads",
    });
  }
  if (input.ctaImpressionsToday >= 10 && input.serviceClicksToday + input.bookClicksToday + input.checkoutClicksToday === 0) {
    experiments.push({
      title: "Fix CTA mismatch",
      why: "Buttons are being seen, but the system is not seeing enough buyer clicks after the impressions.",
      metricToWatch: "CTA impression-to-click rate",
      expectedLift: "Stronger offer routing",
    });
  }
  if (topOpportunity) {
    experiments.push({
      title: `Exploit ${topOpportunity.path}`,
      why: topOpportunity.reason,
      metricToWatch: "View-to-intent rate on that path",
      expectedLift: "More qualified clicks",
    });
  }
  if (trafficSourceMix[0]?.probability >= 35) {
    experiments.push({
      title: `Build for ${trafficSourceMix[0].source}`,
      why: "One traffic source is showing up stronger than the rest.",
      metricToWatch: "Source-specific click and booking rate",
      expectedLift: "Better message match",
    });
  }
  if (input.shareClicksToday + input.socialShareViewsToday >= 2) {
    experiments.push({
      title: "Turn the share loop into a product",
      why: "Shared links are creating measurable return traffic.",
      metricToWatch: "Share creates, click-backs, imported social views",
      expectedLift: "More repeat visits",
    });
  }
  if (conversionReadinessScore < 35 && input.totalViews >= 25) {
    experiments.push({
      title: "Tighten the buying path",
      why: "Traffic exists, but the model does not see enough booking or checkout pressure yet.",
      metricToWatch: "Book clicks, checkout starts, purchase returns",
      expectedLift: "Higher conversion readiness",
    });
  }
  if (!experiments.length) {
    experiments.push({
      title: "Keep pushing traffic",
      why: "The model needs more signal before it can separate real patterns from noise.",
      metricToWatch: "Views, engaged time, return visits",
      expectedLift: "Higher prediction confidence",
    });
  }

  return {
    confidence,
    sampleSize,
    trafficQualityScore,
    conversionReadinessScore,
    projectedNext24h,
    projectedNext7d,
    probabilities: {
      serviceClickNext24h: percentProbability(projectedNext24h.views * serviceRate),
      bookClickNext24h: percentProbability(projectedNext24h.views * bookRate),
      checkoutStartNext24h: percentProbability(projectedNext24h.views * checkoutRate),
      purchaseSignalNext24h: percentProbability(projectedNext24h.checkoutStarts * purchaseRate),
      shareClickNext24h: percentProbability(projectedNext24h.views * shareRate),
      returnVisitNext7d: percentProbability(projectedNext7d.visitors * returnRate),
    },
    audienceIntent,
    topOpportunity,
    trafficSourceMix,
    nextBestExperiments: experiments.slice(0, 5),
    modelNotes: [
      "Probability uses first-party anonymous events, imported daily views, share links, and engagement time.",
      "The model is directional. It should guide what to test next, not promise revenue or bookings.",
      confidence === "low"
        ? "Confidence is low because the sample is still small."
        : confidence === "medium"
          ? "Confidence is medium because enough live behavior exists to form a useful pattern."
          : "Confidence is high because the model has multiple days and enough signal volume.",
    ],
  };
}

function buildLearningSignal(input: {
  trackingStartedAt: string | null;
  historyDays: number;
  topIntentPaths: SitePulseSnapshot["topIntentPaths"];
  topQuestionTopics: SitePulseSnapshot["topQuestionTopics"];
  totalViews: number;
  serviceClicksToday: number;
  bookClicksToday: number;
  checkoutClicksToday: number;
  purchaseSignalsToday: number;
  chatQuestionsToday: number;
  totalEngagementSeconds: number;
}): SitePulseLearning {
  const strongestPath = input.topIntentPaths[0] ?? null;
  const longestWatchedPath =
    input.topIntentPaths
      .filter((path) => path.engagementSeconds > 0)
      .sort((a, b) => b.engagementSeconds - a.engagementSeconds)[0] ?? null;
  const topQuestionTopic = input.topQuestionTopics[0] ?? null;
  const actions: SitePulseLearning["recommendedActions"] = [];

  if (topQuestionTopic && topQuestionTopic.count >= 2) {
    actions.push({
      priority: "high",
      title: `Build around "${topQuestionTopic.topic}"`,
      body: "Visitors are asking about the same thing. That topic should become a clearer button, answer block, offer angle, or short-form post.",
      evidence: `${topQuestionTopic.count.toLocaleString()} chat question signals in the tracked window.`,
    });
  }

  if (strongestPath && strongestPath.views >= 8 && strongestPath.clicks === 0) {
    actions.push({
      priority: "high",
      title: `Add a stronger top-screen CTA on ${strongestPath.path}`,
      body: "The page is getting attention but not enough intent. Move the next step higher and make the button more specific.",
      evidence: `${strongestPath.views.toLocaleString()} views, 0 tracked CTA clicks.`,
    });
  }

  if (strongestPath && strongestPath.clicks >= 3) {
    actions.push({
      priority: "medium",
      title: `Double down on ${strongestPath.path}`,
      body: "This path is already producing intent. Clone the winning hook into ads, emails, shorts, and the homepage.",
      evidence: `${strongestPath.clicks.toLocaleString()} tracked intent clicks in the current history window.`,
    });
  }

  if (longestWatchedPath && longestWatchedPath.engagementSeconds >= 120) {
    actions.push({
      priority: "medium",
      title: "Turn watch time into the next offer angle",
      body: "People are staying on one page long enough to study it. Pull that proof, pain point, or tool into the first screen.",
      evidence: `${Math.round(longestWatchedPath.engagementSeconds / 60).toLocaleString()} engaged minutes on ${longestWatchedPath.path}.`,
    });
  }

  if (input.checkoutClicksToday > 0 && input.purchaseSignalsToday === 0) {
    actions.push({
      priority: "medium",
      title: "Inspect the checkout handoff",
      body: "People are leaving for payment. If purchases are not coming back, the Stripe return path, offer promise, or checkout trust needs review.",
      evidence: `${input.checkoutClicksToday.toLocaleString()} checkout starts today, ${input.purchaseSignalsToday.toLocaleString()} purchase thank-you signals.`,
    });
  }

  if (input.serviceClicksToday + input.bookClicksToday >= 4) {
    actions.push({
      priority: "watch",
      title: "Traffic is showing buying intent today",
      body: "Watch the next few sessions. If the same path keeps winning, make it the primary homepage route.",
      evidence: `${(input.serviceClicksToday + input.bookClicksToday).toLocaleString()} service or calendar clicks today.`,
    });
  }

  if (!actions.length) {
    actions.push({
      priority: "watch",
      title: "Keep feeding the machine",
      body: "The system is collecting views, engaged time, questions, clicks, and purchase signals. Push traffic to the site and let the board identify the next winner.",
      evidence: `${input.totalViews.toLocaleString()} tracked views across ${input.historyDays.toLocaleString()} day${input.historyDays === 1 ? "" : "s"}.`,
    });
  }

  return {
    trackingStartedAt: input.trackingStartedAt,
    historyDays: input.historyDays,
    strongestPath,
    longestWatchedPath: longestWatchedPath
      ? {
          path: longestWatchedPath.path,
          engagementSeconds: longestWatchedPath.engagementSeconds,
        }
      : null,
    topQuestionTopic,
    recommendedActions: actions.slice(0, 4),
  };
}

export async function getSitePulseSnapshot(): Promise<SitePulseSnapshot> {
  await ensureSitePulseTables();

  const firstDateRows = await prisma.$queryRaw<FirstDateRow[]>`
    SELECT MIN(day) AS "firstDate"
    FROM (
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date AS day
      FROM "SitePulseEvent"
      UNION ALL
      SELECT "date" AS day
      FROM "SitePulseDailyBackfill"
    ) all_pulse_days
  `;
  const historyStart = historyStartFrom(firstDateRows[0]?.firstDate);

  const [
    summaryRows,
    returningRows,
    hourlyRows,
    dailyRows,
    backfillRows,
    pathRows,
    intentPathRows,
    questionTopicRows,
    trafficSourceRows,
    shareRows,
    recentRows,
  ] = await Promise.all([
    prisma.$queryRaw<PulseSummaryRow[]>`
      SELECT
        COUNT(DISTINCT "visitorId") FILTER (
          WHERE "createdAt" >= NOW() - INTERVAL '2 minutes'
        ) AS "activeNow",
        COUNT(*) FILTER (
          WHERE "eventType" = 'view'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "viewsToday",
        COUNT(DISTINCT "visitorId") FILTER (
          WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "visitorsToday",
        COUNT(*) FILTER (WHERE "eventType" = 'view') AS "totalViews",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_start'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "serviceClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_book'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "bookClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_capacity'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "capacityClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_checkout'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "checkoutClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'purchase_complete'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "purchaseSignalsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'chat_question'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "chatQuestionsToday",
        COUNT(*) FILTER (
          WHERE "eventType" <> 'heartbeat'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "trackedActionsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'click'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "allClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'form_interaction'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "formInteractionsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'scroll_depth'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "scrollDepthSignalsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'tool_interaction'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "toolInteractionsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'traffic_source'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "trafficSourceSignalsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'return_visit'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "returnVisitsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'page_exit'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "pageExitsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'section_view'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "sectionViewsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'copy_signal'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "copySignalsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'external_click'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "externalClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'dead_click'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "deadClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_impression'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "ctaImpressionsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'form_submit'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "formSubmitsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'video_interaction'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "videoInteractionsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'rage_click'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "rageClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'performance_signal'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "performanceSignalsToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'share_create'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "shareCreatesToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'share_click'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ) AS "shareClicksToday",
        COALESCE(SUM("value") FILTER (
          WHERE "eventType" = 'share_view_import'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ), 0) AS "socialShareViewsToday",
        COUNT(*) FILTER (WHERE "eventType" = 'share_click') AS "totalShareClicks",
        COALESCE(SUM("value") FILTER (
          WHERE "eventType" = 'engagement'
          AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
            (NOW() AT TIME ZONE 'America/Chicago')::date
        ), 0) AS "engagementSecondsToday",
        COALESCE(SUM("value") FILTER (
          WHERE "eventType" = 'engagement'
        ), 0) AS "totalEngagementSeconds"
      FROM "SitePulseEvent"
    `,
    prisma.$queryRaw<ReturningRow[]>`
      SELECT COUNT(*) AS "returningVisitors"
      FROM (
        SELECT "visitorId"
        FROM "SitePulseEvent"
        WHERE "eventType" = 'view'
        GROUP BY "visitorId"
        HAVING COUNT(*) > 1
      ) repeat_visitors
    `,
    prisma.$queryRaw<HourlyRow[]>`
      SELECT
        date_trunc('hour', "createdAt") AS bucket,
        COUNT(*) FILTER (WHERE "eventType" = 'view') AS views,
        COUNT(DISTINCT "visitorId") AS visitors
      FROM "SitePulseEvent"
      WHERE "createdAt" >= NOW() - INTERVAL '11 hours'
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT
        (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date AS date,
        COUNT(*) FILTER (WHERE "eventType" = 'view') AS views,
        COUNT(DISTINCT "visitorId") AS visitors,
        COUNT(*) FILTER (WHERE "eventType" = 'cta_start') AS "serviceClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'cta_book') AS "bookClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'cta_capacity') AS "capacityClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'cta_checkout') AS "checkoutClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'purchase_complete') AS "purchaseSignals",
        COUNT(*) FILTER (WHERE "eventType" = 'chat_question') AS "chatQuestions",
        COUNT(*) FILTER (WHERE "eventType" <> 'heartbeat') AS "trackedActions",
        COUNT(*) FILTER (WHERE "eventType" = 'click') AS "allClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'form_interaction') AS "formInteractions",
        COUNT(*) FILTER (WHERE "eventType" = 'form_submit') AS "formSubmits",
        COUNT(*) FILTER (WHERE "eventType" = 'tool_interaction') AS "toolInteractions",
        COUNT(*) FILTER (WHERE "eventType" = 'dead_click') AS "deadClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'rage_click') AS "rageClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'video_interaction') AS "videoInteractions",
        COUNT(*) FILTER (WHERE "eventType" = 'performance_signal') AS "performanceSignals",
        COUNT(*) FILTER (WHERE "eventType" = 'return_visit') AS "returnVisits",
        COALESCE(SUM("value") FILTER (WHERE "eventType" = 'engagement'), 0) AS "engagementSeconds"
      FROM "SitePulseEvent"
      WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date >= ${dateKey(historyStart)}::date
      GROUP BY date
      ORDER BY date ASC
    `,
    prisma.$queryRaw<BackfillRow[]>`
      SELECT "date", "views", "visitors", "serviceClicks", "bookClicks", "capacityClicks"
      FROM "SitePulseDailyBackfill"
      WHERE "date" >= ${dateKey(historyStart)}::date
      ORDER BY "date" ASC
    `,
    prisma.$queryRaw<PathRow[]>`
      SELECT "path", COUNT(*) AS views
      FROM "SitePulseEvent"
      WHERE "eventType" = 'view'
      AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date =
        (NOW() AT TIME ZONE 'America/Chicago')::date
      GROUP BY "path"
      ORDER BY views DESC
      LIMIT 4
    `,
    prisma.$queryRaw<IntentPathRow[]>`
      SELECT
        "path",
        COUNT(*) FILTER (WHERE "eventType" = 'view') AS views,
        COUNT(*) FILTER (
          WHERE "eventType" IN (
            'cta_start',
            'cta_book',
            'cta_capacity',
            'cta_pulse',
            'cta_service',
            'cta_contact',
            'cta_checkout',
            'purchase_complete',
            'chat_open',
            'chat_question',
            'chat_cta',
            'click',
            'form_interaction',
            'scroll_depth',
            'tool_interaction',
            'traffic_source',
            'return_visit',
            'page_exit',
            'section_view',
            'copy_signal',
            'external_click',
            'dead_click',
            'cta_impression',
            'form_submit',
            'video_interaction',
            'rage_click',
            'performance_signal',
            'share_create',
            'share_click'
          )
        ) AS clicks,
        COALESCE(SUM("value") FILTER (WHERE "eventType" = 'engagement'), 0) AS "engagementSeconds"
      FROM "SitePulseEvent"
      WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date >= ${dateKey(historyStart)}::date
      GROUP BY "path"
      ORDER BY
        (
          COUNT(*) FILTER (WHERE "eventType" = 'view')
          + (COUNT(*) FILTER (
              WHERE "eventType" IN (
                'cta_start',
                'cta_book',
                'cta_capacity',
                'cta_pulse',
                'cta_service',
                'cta_contact',
                'cta_checkout',
                'purchase_complete',
                'chat_open',
                'chat_question',
                'chat_cta',
                'click',
                'form_interaction',
                'scroll_depth',
                'tool_interaction',
                'traffic_source',
                'return_visit',
                'page_exit',
                'section_view',
                'copy_signal',
                'external_click',
                'dead_click',
                'cta_impression',
                'form_submit',
                'video_interaction',
                'rage_click',
                'performance_signal',
                'share_create',
                'share_click'
              )
            ) * 8)
          + (COALESCE(SUM("value") FILTER (WHERE "eventType" = 'engagement'), 0) / 20)
        ) DESC
      LIMIT 6
    `,
    prisma.$queryRaw<QuestionTopicRow[]>`
      SELECT COALESCE(NULLIF("target", ''), 'unclassified') AS topic, COUNT(*) AS "count"
      FROM "SitePulseEvent"
      WHERE "eventType" = 'chat_question'
      AND (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date >= ${dateKey(historyStart)}::date
      GROUP BY topic
      ORDER BY "count" DESC
      LIMIT 6
    `,
    prisma.$queryRaw<TrafficSourceRow[]>`
      SELECT
        COALESCE(NULLIF("source", ''), 'unknown') AS "source",
        COUNT(*) AS events,
        COUNT(*) FILTER (WHERE "eventType" = 'view') AS views,
        COUNT(DISTINCT "visitorId") AS visitors
      FROM "SitePulseEvent"
      WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date >= ${dateKey(historyStart)}::date
      GROUP BY "source"
      ORDER BY events DESC
      LIMIT 8
    `,
    prisma.$queryRaw<ShareRow[]>`
      SELECT
        s."token",
        s."platform",
        s."path",
        COUNT(e."id") FILTER (WHERE e."eventType" = 'share_create') AS shares,
        COUNT(e."id") FILTER (WHERE e."eventType" = 'share_click') AS clicks,
        COALESCE(SUM(e."value") FILTER (WHERE e."eventType" = 'share_view_import'), 0) AS "reportedViews"
      FROM "SiteShareLink" s
      LEFT JOIN "SitePulseEvent" e ON e."target" = s."token"
      WHERE s."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY s."token", s."platform", s."path", s."createdAt"
      ORDER BY
        COUNT(e."id") FILTER (WHERE e."eventType" = 'share_click') DESC,
        COUNT(e."id") FILTER (WHERE e."eventType" = 'share_create') DESC,
        s."createdAt" DESC
      LIMIT 6
    `,
    prisma.$queryRaw<RecentRow[]>`
      SELECT "eventType", "path", "createdAt"
      FROM "SitePulseEvent"
      ORDER BY "createdAt" DESC
      LIMIT 6
    `,
  ]);

  const summary = summaryRows[0] ?? emptySitePulseSnapshot("live");
  const returning = returningRows[0];
  const daily = fillDays(dailyRows, backfillRows, historyStart);
  const today = daily[daily.length - 1];
  const todayBackfill = backfillRows.find((row) => dateKey(new Date(row.date)) === today?.date);
  const importedViews = daily.reduce((sum, day) => sum + day.importedViews, 0);
  const trackingStartedAt = daily[0]?.date ?? null;
  const historyDays = daily.length;
  const totalViews = toInt(summary.totalViews) + importedViews;
  const serviceClicksToday = toInt(summary.serviceClicksToday) + toInt(todayBackfill?.serviceClicks);
  const bookClicksToday = toInt(summary.bookClicksToday) + toInt(todayBackfill?.bookClicks);
  const capacityClicksToday = toInt(summary.capacityClicksToday) + toInt(todayBackfill?.capacityClicks);
  const checkoutClicksToday = toInt(summary.checkoutClicksToday);
  const purchaseSignalsToday = toInt(summary.purchaseSignalsToday);
  const chatQuestionsToday = toInt(summary.chatQuestionsToday);
  const trackedActionsToday = toInt(summary.trackedActionsToday);
  const allClicksToday = toInt(summary.allClicksToday);
  const formInteractionsToday = toInt(summary.formInteractionsToday);
  const scrollDepthSignalsToday = toInt(summary.scrollDepthSignalsToday);
  const toolInteractionsToday = toInt(summary.toolInteractionsToday);
  const trafficSourceSignalsToday = toInt(summary.trafficSourceSignalsToday);
  const returnVisitsToday = toInt(summary.returnVisitsToday);
  const pageExitsToday = toInt(summary.pageExitsToday);
  const sectionViewsToday = toInt(summary.sectionViewsToday);
  const copySignalsToday = toInt(summary.copySignalsToday);
  const externalClicksToday = toInt(summary.externalClicksToday);
  const deadClicksToday = toInt(summary.deadClicksToday);
  const ctaImpressionsToday = toInt(summary.ctaImpressionsToday);
  const formSubmitsToday = toInt(summary.formSubmitsToday);
  const videoInteractionsToday = toInt(summary.videoInteractionsToday);
  const rageClicksToday = toInt(summary.rageClicksToday);
  const performanceSignalsToday = toInt(summary.performanceSignalsToday);
  const shareCreatesToday = toInt(summary.shareCreatesToday);
  const shareClicksToday = toInt(summary.shareClicksToday);
  const socialShareViewsToday = toInt(summary.socialShareViewsToday);
  const totalShareClicks = toInt(summary.totalShareClicks);
  const totalEngagementSeconds = toInt(summary.totalEngagementSeconds);
  const topIntentPaths = intentPathRows.map((row) => ({
    path: row.path,
    views: toInt(row.views),
    clicks: toInt(row.clicks),
    engagementSeconds: toInt(row.engagementSeconds),
  }));
  const topQuestionTopics = questionTopicRows.map((row) => ({
    topic: row.topic,
    count: toInt(row.count),
  }));
  const topTrafficSources = trafficSourceRows.map((row) => ({
    source: row.source,
    events: toInt(row.events),
    views: toInt(row.views),
    visitors: toInt(row.visitors),
  }));
  const topShares = shareRows.map((row) => ({
    token: row.token,
    platform: row.platform,
    path: row.path,
    shares: toInt(row.shares),
    clicks: toInt(row.clicks),
    reportedViews: toInt(row.reportedViews),
  }));

  return {
    source: "live",
    trackingStartedAt,
    historyDays,
    activeNow: toInt(summary.activeNow),
    viewsToday: toInt(summary.viewsToday) + (today?.importedViews ?? 0),
    visitorsToday: toInt(summary.visitorsToday) + toInt(todayBackfill?.visitors),
    totalViews,
    importedViews,
    returningVisitors: toInt(returning?.returningVisitors),
    serviceClicksToday,
    bookClicksToday,
    capacityClicksToday,
    checkoutClicksToday,
    purchaseSignalsToday,
    chatQuestionsToday,
    trackedActionsToday,
    allClicksToday,
    formInteractionsToday,
    scrollDepthSignalsToday,
    toolInteractionsToday,
    trafficSourceSignalsToday,
    returnVisitsToday,
    pageExitsToday,
    sectionViewsToday,
    copySignalsToday,
    externalClicksToday,
    deadClicksToday,
    ctaImpressionsToday,
    formSubmitsToday,
    videoInteractionsToday,
    rageClicksToday,
    performanceSignalsToday,
    shareCreatesToday,
    shareClicksToday,
    socialShareViewsToday,
    totalShareClicks,
    engagementSecondsToday: toInt(summary.engagementSecondsToday),
    totalEngagementSeconds,
    updatedAt: new Date().toISOString(),
    hourly: fillHours(hourlyRows),
    daily,
    topPaths: pathRows.map((row) => ({
      path: row.path,
      views: toInt(row.views),
    })),
    topIntentPaths,
    topQuestionTopics,
    topTrafficSources,
    topShares,
    learning: buildLearningSignal({
      trackingStartedAt,
      historyDays,
      topIntentPaths,
      topQuestionTopics,
      totalViews,
      serviceClicksToday,
      bookClicksToday,
      checkoutClicksToday,
      purchaseSignalsToday,
      chatQuestionsToday,
      totalEngagementSeconds,
    }),
    prediction: buildSitePulsePrediction({
      historyDays,
      totalViews,
      visitorsToday: toInt(summary.visitorsToday) + toInt(todayBackfill?.visitors),
      returningVisitors: toInt(returning?.returningVisitors),
      daily,
      topIntentPaths,
      topTrafficSources,
      serviceClicksToday,
      bookClicksToday,
      checkoutClicksToday,
      purchaseSignalsToday,
      shareClicksToday,
      socialShareViewsToday,
      totalShareClicks,
      trackedActionsToday,
      allClicksToday,
      formInteractionsToday,
      toolInteractionsToday,
      trafficSourceSignalsToday,
      returnVisitsToday,
      pageExitsToday,
      sectionViewsToday,
      copySignalsToday,
      externalClicksToday,
      deadClicksToday,
      ctaImpressionsToday,
      formSubmitsToday,
      videoInteractionsToday,
      rageClicksToday,
      performanceSignalsToday,
      totalEngagementSeconds,
    }),
    recent: recentRows.map((row) => ({
      eventType: row.eventType,
      path: row.path,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function recordSitePulseEvent(input: {
  visitorId: unknown;
  path: unknown;
  eventType: unknown;
  source?: unknown;
  target?: unknown;
  value?: unknown;
}) {
  await ensureSitePulseTables();

  const visitorId = cleanPulseVisitorId(input.visitorId);
  const path = cleanPulsePath(input.path);
  const eventType = cleanPulseEventType(input.eventType);
  const source = cleanSource(input.source, "homepage");
  const target = cleanPulseTarget(input.target);
  const value = safeSignalValue(input.value);

  await prisma.$executeRaw`
    INSERT INTO "SitePulseEvent" (
      "id",
      "visitorId",
      "path",
      "eventType",
      "source",
      "target",
      "value",
      "createdAt"
    )
    VALUES (${crypto.randomUUID()}, ${visitorId}, ${path}, ${eventType}, ${source}, ${target}, ${value}, NOW())
  `;

  if (eventType === "view" || eventType === "chat_open" || eventType === "chat_question") {
    try {
      await touchPublicVisitorProfile({
        visitorId,
        path,
        source,
        topic: eventType === "chat_question" ? target : undefined,
      });
    } catch {
      // Buyer memory is valuable, but analytics should never break the page.
    }
  }
}

export async function createSiteShareLink(input: {
  visitorId: unknown;
  platform: unknown;
  path?: unknown;
  title?: unknown;
  source?: unknown;
}) {
  await ensureSitePulseTables();

  const visitorId = cleanPulseVisitorId(input.visitorId);
  const platform = cleanSharePlatform(input.platform);
  const path = cleanPulsePath(input.path ?? "/pulse");
  const title = cleanText(input.title, "The LeadFlow Pro live counter", 140);
  const source = cleanSource(input.source, "pulse-share");
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  await prisma.$executeRaw`
    INSERT INTO "SiteShareLink" (
      "id",
      "token",
      "visitorId",
      "platform",
      "path",
      "title",
      "source",
      "createdAt"
    )
    VALUES (${crypto.randomUUID()}, ${token}, ${visitorId}, ${platform}, ${path}, ${title}, ${source}, NOW())
  `;

  await recordSitePulseEvent({
    visitorId,
    path,
    eventType: "share_create",
    source,
    target: token,
    value: 1,
  });

  return { token, visitorId, platform, path, title };
}

export async function upsertSitePulseBackfillDays(days: SitePulseBackfillDay[]) {
  await ensureSitePulseTables();

  const cleanDays = days
    .map((day) => ({
      date: validDay(day.date),
      views: safeCount(day.views),
      visitors: safeCount(day.visitors),
      serviceClicks: safeCount(day.serviceClicks),
      bookClicks: safeCount(day.bookClicks),
      capacityClicks: safeCount(day.capacityClicks),
      source: cleanSource(day.source, "manual-import"),
    }))
    .filter((day): day is {
      date: string;
      views: number;
      visitors: number;
      serviceClicks: number;
      bookClicks: number;
      capacityClicks: number;
      source: string;
    } => Boolean(day.date));

  for (const day of cleanDays) {
    await prisma.$executeRaw`
      INSERT INTO "SitePulseDailyBackfill" (
        "id",
        "date",
        "views",
        "visitors",
        "serviceClicks",
        "bookClicks",
        "capacityClicks",
        "source",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${day.date}::date,
        ${day.views},
        ${day.visitors},
        ${day.serviceClicks},
        ${day.bookClicks},
        ${day.capacityClicks},
        ${day.source},
        NOW(),
        NOW()
      )
      ON CONFLICT ("date") DO UPDATE SET
        "views" = EXCLUDED."views",
        "visitors" = EXCLUDED."visitors",
        "serviceClicks" = EXCLUDED."serviceClicks",
        "bookClicks" = EXCLUDED."bookClicks",
        "capacityClicks" = EXCLUDED."capacityClicks",
        "source" = EXCLUDED."source",
        "updatedAt" = NOW()
    `;
  }

  return cleanDays.length;
}
