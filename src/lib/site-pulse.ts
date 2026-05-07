import { prisma } from "@/lib/prisma";

export type SitePulseEventType =
  | "view"
  | "heartbeat"
  | "cta_start"
  | "cta_book"
  | "cta_capacity"
  | "cta_pulse"
  | "tab_live"
  | "tab_views"
  | "tab_clicks";

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
  activeNow: number;
  viewsToday: number;
  visitorsToday: number;
  totalViews: number;
  importedViews: number;
  returningVisitors: number;
  serviceClicksToday: number;
  bookClicksToday: number;
  capacityClicksToday: number;
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
    liveViews: number;
    importedViews: number;
  }>;
  topPaths: Array<{ path: string; views: number }>;
  recent: Array<{ eventType: string; path: string; createdAt: string }>;
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
};

type BackfillRow = {
  date: Date;
  views: number | bigint | null;
  visitors: number | bigint | null;
  serviceClicks: number | bigint | null;
  bookClicks: number | bigint | null;
  capacityClicks: number | bigint | null;
};

type PathRow = {
  path: string;
  views: number | bigint | null;
};

type RecentRow = {
  eventType: string;
  path: string;
  createdAt: Date;
};

const ALLOWED_EVENTS: SitePulseEventType[] = [
  "view",
  "heartbeat",
  "cta_start",
  "cta_book",
  "cta_capacity",
  "cta_pulse",
  "tab_live",
  "tab_views",
  "tab_clicks",
];

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
  return cleanText(value, fallback, 48).replace(/[^a-zA-Z0-9 _.-]/g, "").slice(0, 48);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
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
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
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
    CREATE INDEX IF NOT EXISTS "SitePulseDailyBackfill_date_idx"
      ON "SitePulseDailyBackfill" ("date" DESC)
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
    activeNow: 0,
    viewsToday: 0,
    visitorsToday: 0,
    totalViews: 0,
    importedViews: 0,
    returningVisitors: 0,
    serviceClicksToday: 0,
    bookClicksToday: 0,
    capacityClicksToday: 0,
    updatedAt: new Date().toISOString(),
    hourly: buildEmptyHours(),
    daily: buildEmptyDays(),
    topPaths: [],
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
      label: bucket.toLocaleTimeString("en-US", { hour: "numeric" }),
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

function buildEmptyDays() {
  const start = startOfToday();
  start.setDate(start.getDate() - 6);

  return Array.from({ length: 7 }, (_, index) => {
    const bucket = new Date(start);
    bucket.setDate(start.getDate() + index);
    return {
      date: dateKey(bucket),
      label: bucket.toLocaleDateString("en-US", { weekday: "short" }),
      views: 0,
      visitors: 0,
      serviceClicks: 0,
      bookClicks: 0,
      capacityClicks: 0,
      liveViews: 0,
      importedViews: 0,
    };
  });
}

function fillDays(liveRows: DailyRow[], backfillRows: BackfillRow[]) {
  const liveByDate = new Map(
    liveRows.map((row) => [
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

  return buildEmptyDays().map((day) => {
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
      liveViews,
      importedViews,
    };
  });
}

export async function getSitePulseSnapshot(): Promise<SitePulseSnapshot> {
  await ensureSitePulseTables();

  const [
    summaryRows,
    returningRows,
    hourlyRows,
    dailyRows,
    backfillRows,
    pathRows,
    recentRows,
  ] = await Promise.all([
    prisma.$queryRaw<PulseSummaryRow[]>`
      SELECT
        COUNT(DISTINCT "visitorId") FILTER (
          WHERE "createdAt" >= NOW() - INTERVAL '2 minutes'
        ) AS "activeNow",
        COUNT(*) FILTER (
          WHERE "eventType" = 'view'
          AND "createdAt" >= date_trunc('day', NOW())
        ) AS "viewsToday",
        COUNT(DISTINCT "visitorId") FILTER (
          WHERE "createdAt" >= date_trunc('day', NOW())
        ) AS "visitorsToday",
        COUNT(*) FILTER (WHERE "eventType" = 'view') AS "totalViews",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_start'
          AND "createdAt" >= date_trunc('day', NOW())
        ) AS "serviceClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_book'
          AND "createdAt" >= date_trunc('day', NOW())
        ) AS "bookClicksToday",
        COUNT(*) FILTER (
          WHERE "eventType" = 'cta_capacity'
          AND "createdAt" >= date_trunc('day', NOW())
        ) AS "capacityClicksToday"
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
        date_trunc('day', "createdAt") AS date,
        COUNT(*) FILTER (WHERE "eventType" = 'view') AS views,
        COUNT(DISTINCT "visitorId") AS visitors,
        COUNT(*) FILTER (WHERE "eventType" = 'cta_start') AS "serviceClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'cta_book') AS "bookClicks",
        COUNT(*) FILTER (WHERE "eventType" = 'cta_capacity') AS "capacityClicks"
      FROM "SitePulseEvent"
      WHERE "createdAt" >= date_trunc('day', NOW()) - INTERVAL '6 days'
      GROUP BY date
      ORDER BY date ASC
    `,
    prisma.$queryRaw<BackfillRow[]>`
      SELECT "date", "views", "visitors", "serviceClicks", "bookClicks", "capacityClicks"
      FROM "SitePulseDailyBackfill"
      WHERE "date" >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY "date" ASC
    `,
    prisma.$queryRaw<PathRow[]>`
      SELECT "path", COUNT(*) AS views
      FROM "SitePulseEvent"
      WHERE "eventType" = 'view'
      AND "createdAt" >= date_trunc('day', NOW())
      GROUP BY "path"
      ORDER BY views DESC
      LIMIT 4
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
  const daily = fillDays(dailyRows, backfillRows);
  const today = daily[daily.length - 1];
  const todayBackfill = backfillRows.find((row) => dateKey(new Date(row.date)) === today?.date);
  const importedViews = daily.reduce((sum, day) => sum + day.importedViews, 0);

  return {
    source: "live",
    activeNow: toInt(summary.activeNow),
    viewsToday: toInt(summary.viewsToday) + (today?.importedViews ?? 0),
    visitorsToday: toInt(summary.visitorsToday) + toInt(todayBackfill?.visitors),
    totalViews: toInt(summary.totalViews) + importedViews,
    importedViews,
    returningVisitors: toInt(returning?.returningVisitors),
    serviceClicksToday: toInt(summary.serviceClicksToday) + toInt(todayBackfill?.serviceClicks),
    bookClicksToday: toInt(summary.bookClicksToday) + toInt(todayBackfill?.bookClicks),
    capacityClicksToday: toInt(summary.capacityClicksToday) + toInt(todayBackfill?.capacityClicks),
    updatedAt: new Date().toISOString(),
    hourly: fillHours(hourlyRows),
    daily,
    topPaths: pathRows.map((row) => ({
      path: row.path,
      views: toInt(row.views),
    })),
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
}) {
  await ensureSitePulseTables();

  const visitorId = cleanPulseVisitorId(input.visitorId);
  const path = cleanPulsePath(input.path);
  const eventType = cleanPulseEventType(input.eventType);
  const source = cleanSource(input.source, "homepage");

  await prisma.$executeRaw`
    INSERT INTO "SitePulseEvent" ("id", "visitorId", "path", "eventType", "source", "createdAt")
    VALUES (${crypto.randomUUID()}, ${visitorId}, ${path}, ${eventType}, ${source}, NOW())
  `;
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
