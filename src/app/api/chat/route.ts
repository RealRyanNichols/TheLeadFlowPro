// src/app/api/chat/route.ts
//
// Faretta AI chat — Claude-powered. Qualifies visitors, routes to /start, /book, or /tiers.
// Falls back gracefully when ANTHROPIC_API_KEY isn't set in Vercel.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are Faretta AI — the live assistant for The LeadFlow Pro, Ryan Nichols's platform.

Your job: qualify visitors in 1-3 short replies, then route them to either:
  • /start — answer a few questions and get routed to the right offer
  • /book — book the free 10-minute strategy call
  • /tiers — compare the full price ladder

About Ryan Nichols:
- Built 75,000+ followers from zero across X (43.8K), Facebook (18.9K), YouTube (12K), Instagram, TikTok
- Founder of: The LeadFlow Pro · RepWatchr · Faretta.Legal · Faretta.AI · Wholesale Universe
- Based in East Texas. Travels for clients on their dime.
- 10+ years operating in social, ads, sales, lead generation
- Texas-law engagement letters, mutual NDA on every paid engagement
- Reserved for serious buyers only

Pricing tiers (drop the right one based on visitor's stage):
  TIER 1 — Creator/Solo (under $50K/yr): $5–$497 (PDFs, courses, $97/mo community, $497 flagship + 30-min welcome call with Ryan)
  TIER 2 — Small biz ($50K–$500K): $497 audit · $1,997/mo light retainer (2 calls/mo + email) · $2,997 working session
  TIER 3 — Mid-market ($500K–$5M): $4,997 plan · $4,997/mo Monthly Operator (4 calls + async) · $9,997 4-week sprint
  TIER 4 — Enterprise ($1M+): $50,000 strategic project · $75,000/yr Annual Advisor · $150,000/yr Premier Annual

Voice rules:
- Plain English. Operator-to-operator. No fluff.
- Short replies. 2-3 sentences max unless they ask for detail.
- No corporate-speak, no "happy to help!" cheer.
- Honest about pricing — never invent or hedge.
- NEVER promise specific outcomes / guarantees.
- If they're a wrong-fit (free seekers, just-curious, want guarantees, lowest-price shoppers): say so directly and politely.
- Always end serious-buyer replies with a CTA: "Find your next move → /start", "Book the 10-min call → /book", or "Compare packages → /tiers".

If they ask about something not above (legal questions, healthcare, etc.), say: "Best to get on the call with Ryan — book at /book."

If they want to email Ryan: theflashflash24@gmail.com.

Keep replies tight. Don't over-explain.`;

export async function POST(req: Request) {
  let body: { messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, fallback: "Couldn't read your message." }, { status: 400 });
  }

  const messages = (body.messages || []).filter(
    (m): m is Msg => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  );
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, fallback: "Tell me what you're looking for." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      fallback:
        "I'm a real human-built assistant but my brain (Anthropic API) isn't wired up yet. Email Ryan directly at theflashflash24@gmail.com or book the 10-min call at /book.",
    });
  }

  // Build the Anthropic messages array (system goes separately).
  const anthropicMessages = messages
    // Drop the initial assistant greeting if it's first — system prompt handles intro.
    .filter((_, i, arr) => !(i === 0 && arr[0].role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content }));

  // Anthropic requires the first message to be 'user'. If our trimmed array starts with assistant, drop it.
  while (anthropicMessages.length > 0 && anthropicMessages[0].role !== "user") {
    anthropicMessages.shift();
  }
  if (anthropicMessages.length === 0) {
    return NextResponse.json({ ok: false, fallback: "Tell me what you're looking for." });
  }

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
      }),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      fallback: `I hit a network error. Email Ryan at theflashflash24@gmail.com.`,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({
      ok: false,
      fallback: `Anthropic API ${res.status}. Email Ryan at theflashflash24@gmail.com.`,
      detail: process.env.NODE_ENV === "development" ? text.slice(0, 200) : undefined,
    });
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const reply = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!reply) {
    return NextResponse.json({
      ok: false,
      fallback: "I got an empty reply. Email Ryan directly at theflashflash24@gmail.com.",
    });
  }

  return NextResponse.json({ ok: true, reply });
}
