import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SitePulseEventType =
  | "view"
  | "heartbeat"
  | "cta_start"
  | "cta_book"
  | "cta_capacity"
  | "tab_live"
  | "tab_views"
  | "tab_clicks";

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
  "tab_live",
  "tab_views",
  "tab_clicks",
];

let tableReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function logPulseError(label: string, error: unknown) {
  console.error(label, error instanceof Error ? error.message : "unknown error");
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

function cleanPath(value: unknown) {
  const path = cleanText(value, "/", 180);
  if (!path.startsWith("/")) return "/";
  return path.split("?")[0].slice(0, 180) || "/";
}

function cleanVisitorId(value: unknown) {
  const raw = cleanText(value, "", 80);
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return cleaned || crypto.randomUUID();
}

function cleanEventType(value: unknown): SitePulseEventType {
  return ALLOWED_EVENTS.includes(value as SitePulseEventType)
    ? (value as SitePulseEventType)
    : "view";
}

async function ensureTable() {
  if (tableReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SitePulseEvent" (
      "id" TEXT PRIMARY KEY,
      "visitorId" TEXT NOT NULL,
      "path" TEXT NOT NULL DEFAULT '/',
      "eventType" TEXT NOT NULL,
      "source" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_createdAt_idx"
      ON "SitePulseEvent" ("createdAt" DESC);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_visitorId_createdAt_idx"
      ON "SitePulseEvent" ("visitorId", "createdAt");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_eventType_createdAt_idx"
      ON "SitePulseEvent" ("eventType", "createdAt");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SitePulseEvent_path_createdAt_idx"
      ON "SitePulseEvent" ("path", "createdAt");
  `);

  tableReady = true;
}

function emptySnapshot(source: "offline" | "live" = "offline") {
  return {
    source,
    activeNow: 0,
    viewsToday: 0,
    visitorsToday: 0,
    totalViews: 0,
    returningVisitors: 0,
    serviceClicksToday: 0,
    bookClicksToday: 0,
    capacityClicksToday: 0,
    updatedAt: new Date().toISOString(),
    hourly: buildEmptyHours(),
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

async function snapshot() {
  await ensureTable();

  const [summaryRows, returningRows, hourlyRows, pathRows, recentRows] =
    await Promise.all([
      prisma.$queryRaw<PulseSummaryRow[]>`
        SELECT
          COUNT(DISTINCT "visitorId") FILTER (
            WHERE "createdAt" >= NOW() - INTERVAL '2 minutes'
          )::int AS "activeNow",
          COUNT(*) FILTER (
            WHERE "eventType" = 'view'
            AND "createdAt" >= date_trunc('day', NOW())
          )::int AS "viewsToday",
          COUNT(DISTINCT "visitorId") FILTER (
            WHERE "createdAt" >= date_trunc('day', NOW())
          )::int AS "visitorsToday",
          COUNT(*) FILTER (WHERE "eventType" = 'view')::int AS "totalViews",
          COUNT(*) FILTER (
            WHERE "eventType" = 'cta_start'
            AND "createdAt" >= date_trunc('day', NOW())
          )::int AS "serviceClicksToday",
          COUNT(*) FILTER (
            WHERE "eventType" = 'cta_book'
            AND "createdAt" >= date_trunc('day', NOW())
          )::int AS "bookClicksToday",
          COUNT(*) FILTER (
            WHERE "eventType" = 'cta_capacity'
            AND "createdAt" >= date_trunc('day', NOW())
          )::int AS "capacityClicksToday"
        FROM "SitePulseEvent"
      `,
      prisma.$queryRaw<ReturningRow[]>`
        SELECT COUNT(*)::int AS "returningVisitors"
        FROM (
          SELECT "visitorId"
          FROM "SitePulseEvent"
          WHERE "eventType" = 'view'
          GROUP BY "visitorId"
          HAVING COUNT(*) > 1
        ) returning
      `,
      prisma.$queryRaw<HourlyRow[]>`
        SELECT
          date_trunc('hour', "createdAt") AS bucket,
          COUNT(*) FILTER (WHERE "eventType" = 'view')::int AS views,
          COUNT(DISTINCT "visitorId")::int AS visitors
        FROM "SitePulseEvent"
        WHERE "createdAt" >= NOW() - INTERVAL '11 hours'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      prisma.$queryRaw<PathRow[]>`
        SELECT "path", COUNT(*)::int AS views
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

  const summary = summaryRows[0] ?? emptySnapshot("live");
  const returning = returningRows[0];

  return {
    source: "live" as const,
    activeNow: toInt(summary.activeNow),
    viewsToday: toInt(summary.viewsToday),
    visitorsToday: toInt(summary.visitorsToday),
    totalViews: toInt(summary.totalViews),
    returningVisitors: toInt(returning?.returningVisitors),
    serviceClicksToday: toInt(summary.serviceClicksToday),
    bookClicksToday: toInt(summary.bookClicksToday),
    capacityClicksToday: toInt(summary.capacityClicksToday),
    updatedAt: new Date().toISOString(),
    hourly: fillHours(hourlyRows),
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

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET() {
  if (!hasDatabaseUrl()) return json(emptySnapshot("offline"));

  try {
    return json(await snapshot());
  } catch (error) {
    logPulseError("site pulse snapshot unavailable", error);
    return json(emptySnapshot("offline"));
  }
}

export async function POST(request: NextRequest) {
  if (!hasDatabaseUrl()) return json(emptySnapshot("offline"));

  try {
    await ensureTable();

    const raw = await request.text();
    const body = raw ? JSON.parse(raw) : {};
    const visitorId = cleanVisitorId(body.visitorId);
    const path = cleanPath(body.path);
    const eventType = cleanEventType(body.eventType);
    const source = cleanText(body.source, "homepage", 48);

    await prisma.$executeRaw`
      INSERT INTO "SitePulseEvent" ("id", "visitorId", "path", "eventType", "source", "createdAt")
      VALUES (${crypto.randomUUID()}, ${visitorId}, ${path}, ${eventType}, ${source}, NOW())
    `;

    return json(await snapshot());
  } catch (error) {
    logPulseError("site pulse event unavailable", error);
    return json(emptySnapshot("offline"));
  }
}
