import { NextResponse } from "next/server";
import { todayIn } from "@/lib/chaseSheet/cadence";
import { buildDemo } from "@/lib/chaseSheet/demo";
import { BUSINESS } from "@/lib/site/business";

// The free demo on the sales page. A visitor picks a trade, a tone, and a
// quote; the engine writes the first touches in full and dates the rest.
// lib/chaseSheet/demo.ts says exactly what is shown and what is held back.
// The engine runs here, on the server, so what makes the product worth paying
// for never ships in a JavaScript bundle. Nothing is stored.

export const runtime = "nodejs";

// A visitor fires one request on load and a handful more pressing the button.
// Thirty an hour covers that with room. It is friction against pulling the
// library one trade at a time, not a wall: the map is per instance.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const log = new Map<string, number[]>();

function allowed(key: string, now = Date.now()): boolean {
  const past = (log.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (past.length >= MAX_PER_WINDOW) {
    log.set(key, past);
    return false;
  }
  past.push(now);
  log.set(key, past);
  if (log.size > 5000) for (const k of [...log.keys()].slice(0, 1000)) log.delete(k);
  return true;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || "unknown";
  if (!allowed(ip)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  let body: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw.length > 4000) throw new Error("too long");
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  return NextResponse.json(buildDemo(body, todayIn(BUSINESS.timezone)), { headers: { "Cache-Control": "no-store" } });
}
