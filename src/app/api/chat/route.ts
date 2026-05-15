// src/app/api/chat/route.ts
//
// Faretta AI chat — Claude-powered. Qualifies visitors, routes to /start, /book, or /tiers.
// Falls back gracefully when ANTHROPIC_API_KEY isn't set in Vercel.

import { NextResponse } from "next/server";
import { LEADFLOW_PUBLIC_EMAIL } from "@/lib/contact";
import {
  buildLeadMemoryContext,
  cleanLeadVisitorId,
  getPublicChatMemory,
  rememberPublicChatMessage,
  type PublicChatMemory,
} from "@/lib/lead-memory";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

type RouteReply = {
  reply: string;
  mode: "anthropic" | "router";
};

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

If they want to email Ryan: ${LEADFLOW_PUBLIC_EMAIL}.

Keep replies tight. Don't over-explain.`;

function latestUserMessage(messages: Msg[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function memoryLeadIn(memory: PublicChatMemory | null) {
  const profile = memory?.profile;
  if (profile?.fullName && profile?.businessName) {
    return `I remember you: ${profile.fullName} with ${profile.businessName}. `;
  }
  if (profile?.fullName) return `I remember you, ${profile.fullName}. `;
  if (profile?.businessName) return `I remember ${profile.businessName}. `;
  return "";
}

function memoryAsk(memory: PublicChatMemory | null) {
  if (memory?.profile?.email) return "";
  return " Give me your name, business, and email when you want Ryan to connect the dots next time you come back.";
}

function routeWithoutAnthropic(messages: Msg[], memory: PublicChatMemory | null): RouteReply {
  const latest = latestUserMessage(messages).toLowerCase();
  const remembered = memoryLeadIn(memory);
  const ask = memoryAsk(memory);

  if (/(tool|software|app|dashboard|portal|calculator|automation|crm|system|build)/.test(latest)) {
    return {
      mode: "router",
      reply:
        `${remembered}If the thing you need is a business tool, go straight to Stump Ryan. Tell Ryan what would change how your business runs and get the free leak + build blueprint first. If you like it, you can continue into paid buildout and own the asset. Start here -> /stump-ryan${ask}`,
    };
  }

  if (/(price|cost|package|tier|budget|afford|how much)/.test(latest)) {
    return {
      mode: "router",
      reply:
        `${remembered}If you already know the problem, compare packages here -> /tiers. If you want the site to route you, answer the buyer form -> /start. Serious owners with a specific question can book the 10-minute call -> /book${ask}`,
    };
  }

  if (/(social|facebook|tiktok|youtube|instagram|\bx\b|twitter|post|reel|short|content)/.test(latest)) {
    return {
      mode: "router",
      reply:
        `${remembered}For social, the next click depends on whether you need direction, a review, or done-for-you work. Use the service picker -> /start. If you want Ryan to run the content engine, look at the Power Bundle -> /offers/power-bundle${ask}`,
    };
  }

  if (/(ad|ads|meta|lead|leads|funnel|sales|follow up|follow-up)/.test(latest)) {
    return {
      mode: "router",
      reply:
        `${remembered}If the issue is leads, follow-up, ads, or sales process, Ryan needs the business context first. Start with the router -> /start. If you already know you need Meta ads handled, go here -> /offers/fb-ads${ask}`,
    };
  }

  if (/(book|call|talk|calendar|meeting|consult)/.test(latest)) {
    return {
      mode: "router",
      reply:
        `${remembered}Book the 10-minute fit call here -> /book. Keep it specific: what you sell, what is stuck, and what needs to move next.${ask}`,
    };
  }

  return {
    mode: "router",
    reply:
      `${remembered}I can route you without wasting time. If you need a tool built, use /stump-ryan. If you need a service picked, use /start. If you are ready to talk to Ryan, use /book.${ask}`,
  };
}

export async function POST(req: Request) {
  let body: { messages?: Msg[]; visitorId?: unknown; path?: unknown };
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

  let visitorId = cleanLeadVisitorId(body.visitorId);
  const path = typeof body.path === "string" ? body.path : "/";
  let memory: PublicChatMemory | null = null;
  try {
    memory = await getPublicChatMemory(visitorId);
    const latest = latestUserMessage(messages);
    if (latest) {
      visitorId = await rememberPublicChatMessage({
        visitorId,
        role: "user",
        content: latest,
        path,
      });
      memory = await getPublicChatMemory(visitorId);
    }
  } catch {
    memory = null;
  }

  const remembered = {
    visitorId,
    known: Boolean(memory?.profile?.email || memory?.profile?.fullName || memory?.profile?.businessName),
    name: memory?.profile?.fullName ?? undefined,
    businessName: memory?.profile?.businessName ?? undefined,
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const routed = routeWithoutAnthropic(messages, memory);
    try {
      await rememberPublicChatMessage({ visitorId, role: "assistant", content: routed.reply, path });
    } catch {
      // Do not block the public chatbot if memory write fails.
    }
    return NextResponse.json({ ok: true, reply: routed.reply, mode: routed.mode, remembered });
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
        system: `${SYSTEM_PROMPT}

Saved visitor memory:
${buildLeadMemoryContext(memory ?? { profile: null, messages: [] })}

Use the saved memory naturally. Do not act creepy. If name/business/email are unknown, ask for them only when it helps Ryan remember and route them later. Never claim a purchase, result, or private fact unless it appears in this memory.`,
        messages: anthropicMessages,
      }),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      fallback: `I hit a network error. Email Ryan at ${LEADFLOW_PUBLIC_EMAIL}.`,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({
      ok: false,
      fallback: `Anthropic API ${res.status}. Email Ryan at ${LEADFLOW_PUBLIC_EMAIL}.`,
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
      fallback: `I got an empty reply. Email Ryan directly at ${LEADFLOW_PUBLIC_EMAIL}.`,
    });
  }

  try {
    await rememberPublicChatMessage({ visitorId, role: "assistant", content: reply, path });
  } catch {
    // Do not block a valid AI reply because memory write failed.
  }

  return NextResponse.json({ ok: true, reply, mode: "anthropic", remembered });
}
