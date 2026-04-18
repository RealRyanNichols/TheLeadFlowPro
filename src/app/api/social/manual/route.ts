/**
 * Manual social-account save.
 *
 * Used when OAuth isn't yet live for the platform (Meta review queue,
 * X paid API, Snapchat no API) — user drops in a public handle and we
 * create the SocialAccount row with zeros on followers/engagement so the
 * no-fake-stats rule holds.
 *
 * Plan-cap enforcement comes from canConnectSocial().
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canConnectSocial } from "@/lib/social-server";
import { PLATFORM_IDS, platformById, type PlatformKind, type PlatformId } from "@/lib/social-platforms";

const Body = z.object({
  platform: z.string().refine((v) => (PLATFORM_IDS as readonly string[]).includes(v), {
    message: "Unknown platform",
  }),
  kind: z.enum(["personal", "business_page", "channel"]),
  handle: z.string().trim().min(1).max(200),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof z.ZodError ? err.errors[0]?.message : "Invalid input" },
      { status: 400 },
    );
  }

  const platform = parsed.platform as PlatformId;
  const spec = platformById(platform);
  if (!spec) {
    return NextResponse.json({ ok: false, reason: "Unsupported platform" }, { status: 400 });
  }

  // Does the selected kind even apply to this platform?
  if (!spec.kinds.includes(parsed.kind as PlatformKind)) {
    return NextResponse.json(
      { ok: false, reason: `${spec.label} doesn't support ${parsed.kind}` },
      { status: 400 },
    );
  }

  // Strip URL noise → store just the handle
  const normalizedHandle = parsed.handle
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/^[^/]+\//, "") // drop domain
    .replace(/\/+$/, "")
    .replace(/^@/, "")
    .trim()
    .slice(0, 120);

  if (!normalizedHandle) {
    return NextResponse.json({ ok: false, reason: "Couldn't parse that handle." }, { status: 400 });
  }

  // Plan-cap check
  const guard = await canConnectSocial({
    userId,
    platform,
    kind: parsed.kind as PlatformKind,
  });
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, reason: guard.reason, upgradeTo: guard.upgradeTo },
      { status: 402 },
    );
  }

  // Upsert-style: block duplicates but return a helpful message
  try {
    const existing = await prisma.socialAccount.findFirst({
      where: { userId, platform: platform as any, handle: normalizedHandle },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, reason: "You've already connected that handle." },
        { status: 409 },
      );
    }

    const row = await prisma.socialAccount.create({
      data: {
        userId,
        platform: platform as any,
        kind: parsed.kind as any,
        handle: normalizedHandle,
        // No-fake-stats: start everything at zero; a sync job backfills later.
        followers: 0,
        following: 0,
        posts: 0,
        engagement: 0,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Database save failed — our team has been notified.",
        detail: process.env.NODE_ENV === "development" ? String(err) : undefined,
      },
      { status: 500 },
    );
  }
}
