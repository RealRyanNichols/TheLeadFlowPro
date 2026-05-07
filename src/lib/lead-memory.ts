import { prisma } from "@/lib/prisma";

export type PublicVisitorProfile = {
  id: string;
  visitorId: string;
  email: string | null;
  fullName: string | null;
  businessName: string | null;
  businessUrl: string | null;
  phone: string | null;
  industry: string | null;
  lastTopic: string | null;
  stage: string;
  profile: Record<string, unknown>;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export type PublicChatMemory = {
  profile: PublicVisitorProfile | null;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    topic: string | null;
    path: string | null;
    createdAt: Date;
  }>;
};

let leadMemoryReady = false;

function assertDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
}

export function cleanLeadVisitorId(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return cleaned || crypto.randomUUID();
}

function cleanText(value: unknown, max = 500) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanPath(value: unknown) {
  const path = cleanText(value, 180) ?? "/";
  if (!path.startsWith("/")) return "/";
  return path.split("?")[0].slice(0, 180) || "/";
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 200)?.toLowerCase() ?? null;
  if (!email || !/.+@.+\..+/.test(email)) return null;
  return email;
}

function cleanPhone(value: unknown) {
  return cleanText(value, 40)?.replace(/[^\d+().\-\s]/g, "").slice(0, 40) ?? null;
}

function profileJson(input: Record<string, unknown>) {
  return JSON.stringify(input);
}

export function classifyLeadTopic(text: string) {
  const normalized = text.toLowerCase();
  if (/(tool|software|app|dashboard|portal|calculator|automation|crm|system|build|workflow)/.test(normalized)) {
    return "custom tool";
  }
  if (/(social|facebook|tiktok|youtube|instagram|x |twitter|post|reel|short|content)/.test(normalized)) {
    return "social growth";
  }
  if (/(ad|ads|meta|lead|leads|funnel|sales|follow up|follow-up)/.test(normalized)) {
    return "lead generation";
  }
  if (/(price|cost|package|tier|fit|budget|afford|how much)/.test(normalized)) {
    return "pricing and fit";
  }
  if (/(book|call|calendar|meeting|consult|talk)/.test(normalized)) {
    return "booking";
  }
  if (/(travel|come out|onsite|on-site|film|video|shoot|camera|content day|director)/.test(normalized)) {
    return "onsite content";
  }
  return "general question";
}

function extractMessageSignals(text: string) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  const nameMatch = text.match(
    /\b(?:my name is|i am|i'm)\s+([a-z][a-z'\-]+(?:\s+[a-z][a-z'\-]+){0,2}?)(?=\s+(?:and\s+)?(?:my\s+business|my\s+company|company|business)\s+is\b|[,.!?]|$)/i,
  );
  const businessMatch = text.match(/\b(?:my business is|company is|business name is|we are)\s+([^,.!?]{2,80})/i);

  return {
    email: cleanEmail(email),
    fullName: cleanText(nameMatch?.[1], 120),
    businessName: cleanText(businessMatch?.[1], 160),
  };
}

export async function ensureLeadMemoryTables() {
  if (leadMemoryReady) return;
  assertDatabaseUrl();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PublicVisitorProfile" (
      "id" TEXT PRIMARY KEY,
      "visitorId" TEXT NOT NULL UNIQUE,
      "email" TEXT UNIQUE,
      "fullName" TEXT,
      "businessName" TEXT,
      "businessUrl" TEXT,
      "phone" TEXT,
      "industry" TEXT,
      "lastTopic" TEXT,
      "stage" TEXT NOT NULL DEFAULT 'anonymous',
      "profile" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PublicChatMessage" (
      "id" TEXT PRIMARY KEY,
      "visitorId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "topic" TEXT,
      "path" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PublicVisitorProfile_lastSeenAt_idx"
      ON "PublicVisitorProfile" ("lastSeenAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PublicVisitorProfile_email_idx"
      ON "PublicVisitorProfile" ("email")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PublicChatMessage_visitorId_createdAt_idx"
      ON "PublicChatMessage" ("visitorId", "createdAt" DESC)
  `);

  leadMemoryReady = true;
}

export async function touchPublicVisitorProfile(input: {
  visitorId: unknown;
  path?: unknown;
  source?: unknown;
  topic?: unknown;
}) {
  await ensureLeadMemoryTables();
  const visitorId = cleanLeadVisitorId(input.visitorId);
  const path = cleanPath(input.path);
  const source = cleanText(input.source, 80) ?? "site";
  const topic = cleanText(input.topic, 120);
  const patch = profileJson({ lastPath: path, lastSource: source });

  await prisma.$executeRaw`
    INSERT INTO "PublicVisitorProfile" (
      "id",
      "visitorId",
      "lastTopic",
      "profile",
      "firstSeenAt",
      "lastSeenAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${visitorId},
      ${topic},
      ${patch}::jsonb,
      NOW(),
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("visitorId") DO UPDATE SET
      "lastTopic" = COALESCE(${topic}, "PublicVisitorProfile"."lastTopic"),
      "profile" = "PublicVisitorProfile"."profile" || ${patch}::jsonb,
      "lastSeenAt" = NOW(),
      "updatedAt" = NOW()
  `;

  return visitorId;
}

export async function rememberPublicVisitor(input: {
  visitorId: unknown;
  email?: unknown;
  fullName?: unknown;
  businessName?: unknown;
  businessUrl?: unknown;
  phone?: unknown;
  industry?: unknown;
  topic?: unknown;
  stage?: unknown;
  path?: unknown;
  source?: unknown;
  profile?: Record<string, unknown>;
}) {
  await ensureLeadMemoryTables();
  const visitorId = cleanLeadVisitorId(input.visitorId);
  const email = cleanEmail(input.email);
  const fullName = cleanText(input.fullName, 120);
  const businessName = cleanText(input.businessName, 200);
  const businessUrl = cleanText(input.businessUrl, 300);
  const phone = cleanPhone(input.phone);
  const industry = cleanText(input.industry, 120);
  const topic = cleanText(input.topic, 120);
  const stage = cleanText(input.stage, 60) ?? (email ? "identified" : "anonymous");
  const path = cleanPath(input.path);
  const source = cleanText(input.source, 80) ?? "site";
  const patch = profileJson({
    ...(input.profile ?? {}),
    lastPath: path,
    lastSource: source,
  });

  const existingByEmail = email
    ? await prisma.$queryRaw<Array<{ visitorId: string }>>`
        SELECT "visitorId"
        FROM "PublicVisitorProfile"
        WHERE "email" = ${email}
        LIMIT 1
      `
    : [];
  const canonicalVisitorId = existingByEmail[0]?.visitorId ?? visitorId;

  await prisma.$executeRaw`
    INSERT INTO "PublicVisitorProfile" (
      "id",
      "visitorId",
      "email",
      "fullName",
      "businessName",
      "businessUrl",
      "phone",
      "industry",
      "lastTopic",
      "stage",
      "profile",
      "firstSeenAt",
      "lastSeenAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${canonicalVisitorId},
      ${email},
      ${fullName},
      ${businessName},
      ${businessUrl},
      ${phone},
      ${industry},
      ${topic},
      ${stage},
      ${patch}::jsonb,
      NOW(),
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("visitorId") DO UPDATE SET
      "email" = COALESCE(${email}, "PublicVisitorProfile"."email"),
      "fullName" = COALESCE(${fullName}, "PublicVisitorProfile"."fullName"),
      "businessName" = COALESCE(${businessName}, "PublicVisitorProfile"."businessName"),
      "businessUrl" = COALESCE(${businessUrl}, "PublicVisitorProfile"."businessUrl"),
      "phone" = COALESCE(${phone}, "PublicVisitorProfile"."phone"),
      "industry" = COALESCE(${industry}, "PublicVisitorProfile"."industry"),
      "lastTopic" = COALESCE(${topic}, "PublicVisitorProfile"."lastTopic"),
      "stage" = CASE
        WHEN ${stage} <> 'anonymous' THEN ${stage}
        ELSE "PublicVisitorProfile"."stage"
      END,
      "profile" = "PublicVisitorProfile"."profile" || ${patch}::jsonb,
      "lastSeenAt" = NOW(),
      "updatedAt" = NOW()
  `;

  return canonicalVisitorId;
}

export async function rememberPublicChatMessage(input: {
  visitorId: unknown;
  role: "user" | "assistant";
  content: unknown;
  path?: unknown;
}) {
  await ensureLeadMemoryTables();
  const visitorId = cleanLeadVisitorId(input.visitorId);
  const content = cleanText(input.content, 5000);
  if (!content) return visitorId;

  const topic = input.role === "user" ? classifyLeadTopic(content) : null;
  const path = cleanPath(input.path);
  let canonicalVisitorId = visitorId;

  await touchPublicVisitorProfile({ visitorId, path, source: "chatbot", topic });

  if (input.role === "user") {
    const signals = extractMessageSignals(content);
    if (signals.email || signals.fullName || signals.businessName) {
      canonicalVisitorId = await rememberPublicVisitor({
        visitorId,
        email: signals.email,
        fullName: signals.fullName,
        businessName: signals.businessName,
        topic,
        stage: signals.email ? "identified" : "chatting",
        path,
        source: "chatbot",
      });
    }
  }

  await prisma.$executeRaw`
    INSERT INTO "PublicChatMessage" (
      "id",
      "visitorId",
      "role",
      "content",
      "topic",
      "path",
      "createdAt"
    )
    VALUES (${crypto.randomUUID()}, ${canonicalVisitorId}, ${input.role}, ${content}, ${topic}, ${path}, NOW())
  `;

  return canonicalVisitorId;
}

export async function getPublicChatMemory(visitorIdInput: unknown): Promise<PublicChatMemory> {
  await ensureLeadMemoryTables();
  const visitorId = cleanLeadVisitorId(visitorIdInput);
  const profiles = await prisma.$queryRaw<PublicVisitorProfile[]>`
    SELECT
      "id",
      "visitorId",
      "email",
      "fullName",
      "businessName",
      "businessUrl",
      "phone",
      "industry",
      "lastTopic",
      "stage",
      "profile",
      "firstSeenAt",
      "lastSeenAt"
    FROM "PublicVisitorProfile"
    WHERE "visitorId" = ${visitorId}
    LIMIT 1
  `;
  const messages = await prisma.$queryRaw<PublicChatMemory["messages"]>`
    SELECT "role", "content", "topic", "path", "createdAt"
    FROM "PublicChatMessage"
    WHERE "visitorId" = ${visitorId}
    ORDER BY "createdAt" DESC
    LIMIT 8
  `;

  return {
    profile: profiles[0] ?? null,
    messages: messages.reverse(),
  };
}

export function buildLeadMemoryContext(memory: PublicChatMemory) {
  const profile = memory.profile;
  if (!profile && !memory.messages.length) {
    return "No saved visitor profile yet. Ask for their name, business, and what they want built or fixed.";
  }

  const lines = [
    profile?.fullName ? `Name: ${profile.fullName}` : null,
    profile?.businessName ? `Business: ${profile.businessName}` : null,
    profile?.industry ? `Industry: ${profile.industry}` : null,
    profile?.businessUrl ? `Business URL: ${profile.businessUrl}` : null,
    profile?.email ? `Email known: yes` : "Email known: no",
    profile?.lastTopic ? `Last known topic: ${profile.lastTopic}` : null,
    profile?.lastSeenAt ? `Last seen: ${profile.lastSeenAt.toISOString()}` : null,
    memory.messages.length
      ? `Recent chat memory:\n${memory.messages
          .map((message) => `- ${message.role}: ${message.content.slice(0, 240)}`)
          .join("\n")}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}
