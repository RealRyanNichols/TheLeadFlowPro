// src/app/api/voice/topics/route.ts
//
// GET  → list of active topics (with yes/no dollar tallies)
// POST → submit a new topic (auto-opens for VOICE_DEFAULT_DAYS).
//        Submission is free; no Stripe step. Open-by-default; admin can
//        moderate later via DB.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveTopics, voiceSlug, VOICE_DEFAULT_DAYS } from "@/lib/voice";
import {
  EAST_TX_CITIES,
  isValidCategory,
  isValidEastTexasCity,
  sanitizeName,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const topics = await getActiveTopics();
    return NextResponse.json({ topics }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (err) {
    return NextResponse.json({ topics: [], _err: err instanceof Error ? err.message : String(err) }, { status: 200 });
  }
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const question = String(body.question || "").trim().slice(0, 240);
  if (question.length < 8) {
    return NextResponse.json({ error: "Question must be at least 8 characters" }, { status: 400 });
  }
  const description = body.description ? String(body.description).slice(0, 1000) : null;
  const category    = body.category    ? String(body.category)                   : null;
  const city        = body.city        ? String(body.city)                       : null;
  const submitterName = body.submitterName ? sanitizeName(String(body.submitterName)) : null;

  if (city && !isValidEastTexasCity(city)) {
    return NextResponse.json({ error: "Pick an East Texas city" }, { status: 400 });
  }
  if (category && !isValidCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Generate unique slug
  let slug = voiceSlug(question);
  let suffix = 0;
  while (await prisma.voiceTopic.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${voiceSlug(question)}-${suffix}`.slice(0, 60);
  }

  const closesAt = new Date(Date.now() + VOICE_DEFAULT_DAYS * 24 * 60 * 60 * 1000);

  try {
    const created = await prisma.voiceTopic.create({
      data: {
        slug,
        question,
        description,
        category,
        city,
        status: "open",
        submitterName,
        closesAt,
      },
    });
    return NextResponse.json({ ok: true, topic: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't create topic" },
      { status: 500 }
    );
  }
}
