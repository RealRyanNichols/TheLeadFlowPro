// src/app/api/chat/route.ts
//
// Faretta AI chat — Claude-powered. Routes visitors without making them read.
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

type ChatAction = {
  label: string;
  href: string;
};

type RouteReply = {
  reply: string;
  mode: "anthropic" | "router";
  actions: ChatAction[];
};

const SYSTEM_PROMPT = `You are Faretta AI — the live assistant for The LeadFlow Pro, Ryan Nichols's platform.

Your job: route visitors in one short reply, then stop. Use one clear CTA in plain English:
  • Find my best option — answer a few questions and get routed to the right offer
  • Book the call — book the free 10-minute strategy call
  • See pricing — compare the full price ladder
  • Get free blueprint — submit a free build blueprint request

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
- Default reply is 1 sentence. 2 sentences max. Under 45 words.
- Do not explain every option. Pick the best next click.
- Do not show raw URLs, slash routes, or paths like /start, /book, /tiers, or /stump-ryan.
- No corporate-speak, no "happy to help!" cheer.
- Honest about pricing — never invent or hedge.
- NEVER promise specific outcomes / guarantees.
- If they're a wrong-fit (free seekers, just-curious, want guarantees, lowest-price shoppers): say so directly and politely.
- Always end serious-buyer replies with one plain CTA label, not a website path.
- Do not mention memory, returning visitors, or saved context unless they ask.

If they ask about something not above (legal questions, healthcare, etc.), say: "Best to get on the call with Ryan."

If they want to email Ryan: ${LEADFLOW_PUBLIC_EMAIL}.

Keep replies tight. Do not make them read a book.`;

const CHAT_ACTIONS = {
  blueprint: { label: "Get free blueprint", href: "/stump-ryan" },
  start: { label: "Find my best option", href: "/start" },
  book: { label: "Book the call", href: "/book" },
  tiers: { label: "See pricing", href: "/tiers" },
  powerBundle: { label: "See Power Bundle", href: "/offers/power-bundle" },
  fbAds: { label: "See Meta ads offer", href: "/offers/fb-ads" },
} satisfies Record<string, ChatAction>;

const KNOWN_ROUTE_ACTIONS = [
  CHAT_ACTIONS.powerBundle,
  CHAT_ACTIONS.fbAds,
  CHAT_ACTIONS.blueprint,
  CHAT_ACTIONS.start,
  CHAT_ACTIONS.book,
  CHAT_ACTIONS.tiers,
];

function latestUserMessage(messages: Msg[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function memoryLeadIn(memory: PublicChatMemory | null) {
  const profile = memory?.profile;
  if (profile?.fullName && profile?.businessName) {
    return "Welcome back. ";
  }
  if (profile?.fullName || profile?.businessName) return "Welcome back. ";
  return "";
}

function compactReply(reply: string) {
  const clean = reply.replace(/\s+/g, " ").trim();
  if (clean.length <= 280) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+/g);
  if (sentences?.length) {
    const firstTwo = sentences.slice(0, 2).join(" ").replace(/\s+/g, " ").trim();
    if (firstTwo.length <= 280) return firstTwo;
  }
  return `${clean.slice(0, 277).trim()}...`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueActions(actions: ChatAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.href)) return false;
    seen.add(action.href);
    return true;
  });
}

function actionsFromRawReply(reply: string) {
  return KNOWN_ROUTE_ACTIONS.filter((action) =>
    new RegExp(`${escapeRegExp(action.href)}\\b`, "i").test(reply),
  );
}

function actionForIntent(latest: string): ChatAction {
  const normalized = latest.toLowerCase();

  if (/(tool|software|app|dashboard|portal|calculator|automation|crm|system|build)/.test(normalized)) {
    return CHAT_ACTIONS.blueprint;
  }
  if (/(price|cost|package|tier|budget|afford|how much)/.test(normalized)) {
    return CHAT_ACTIONS.tiers;
  }
  if (/(social|facebook|tiktok|youtube|instagram|\bx\b|twitter|post|reel|short|content)/.test(normalized)) {
    return CHAT_ACTIONS.powerBundle;
  }
  if (/(meta|ad|ads)/.test(normalized)) {
    return CHAT_ACTIONS.fbAds;
  }
  if (/(lead|leads|funnel|sales|follow up|follow-up)/.test(normalized)) {
    return CHAT_ACTIONS.start;
  }
  if (/(book|call|talk|calendar|meeting|consult)/.test(normalized)) {
    return CHAT_ACTIONS.book;
  }

  return CHAT_ACTIONS.start;
}

function removeRawRoutes(reply: string) {
  let cleaned = compactReply(reply);

  for (const action of KNOWN_ROUTE_ACTIONS) {
    const route = escapeRegExp(action.href);
    cleaned = cleaned
      .replace(
        new RegExp(
          `\\s*(?:at|use|open|visit|go to|see|start here:?|book here:?|book at|cta:?|click)\\s+${route}\\b\\.?`,
          "gi",
        ),
        "",
      )
      .replace(new RegExp(route, "gi"), "");
  }

  cleaned = cleaned
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([:;,-])\s*([.?!])/g, "$2")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–—]\s*$/g, "")
    .replace(/[:;,]\s*$/g, ".")
    .trim();

  return cleaned || "Use the best next step below.";
}

function buildDisplayReply(rawReply: string, latest: string) {
  const routeActions = actionsFromRawReply(rawReply);
  const actions = uniqueActions([...routeActions, actionForIntent(latest)]).slice(0, 1);

  return {
    reply: removeRawRoutes(rawReply),
    actions,
  };
}

function routeWithoutAnthropic(messages: Msg[], memory: PublicChatMemory | null): RouteReply {
  const latestRaw = latestUserMessage(messages);
  const latest = latestRaw.toLowerCase();
  const remembered = memoryLeadIn(memory);

  if (/(tool|software|app|dashboard|portal|calculator|automation|crm|system|build)/.test(latest)) {
    return {
      mode: "router",
      reply: `${remembered}Start with Stump Ryan. Send the leak or tool idea; Ryan maps the first useful version before paid buildout.`,
      actions: [CHAT_ACTIONS.blueprint],
    };
  }

  if (/(price|cost|package|tier|budget|afford|how much)/.test(latest)) {
    return {
      mode: "router",
      reply: `${remembered}Need prices? Start with the simple pricing ladder.`,
      actions: [CHAT_ACTIONS.tiers],
    };
  }

  if (/(social|facebook|tiktok|youtube|instagram|\bx\b|twitter|post|reel|short|content)/.test(latest)) {
    return {
      mode: "router",
      reply: `${remembered}For social growth, look at the Power Bundle first.`,
      actions: [CHAT_ACTIONS.powerBundle],
    };
  }

  if (/(ad|ads|meta|lead|leads|funnel|sales|follow up|follow-up)/.test(latest)) {
    const action = /(ad|ads|meta)/.test(latest) ? CHAT_ACTIONS.fbAds : CHAT_ACTIONS.start;
    return {
      mode: "router",
      reply: `${remembered}For leads, follow-up, or sales process, start with the offer picker.`,
      actions: [action],
    };
  }

  if (/(book|call|talk|calendar|meeting|consult)/.test(latest)) {
    return {
      mode: "router",
      reply: `${remembered}Book the 10-minute fit call. Bring the business, problem, and next decision.`,
      actions: [CHAT_ACTIONS.book],
    };
  }

  return {
    mode: "router",
    reply: `${remembered}Tell Ryan what you need, and the picker will route you.`,
    actions: [actionForIntent(latestRaw)],
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
    return NextResponse.json({
      ok: true,
      reply: routed.reply,
      actions: routed.actions,
      mode: routed.mode,
      remembered,
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
        max_tokens: 130,
        system: `${SYSTEM_PROMPT}

Saved visitor memory:
${buildLeadMemoryContext(memory ?? { profile: null, messages: [] })}

Use saved memory only if it shortens the answer. Do not ask for name, business, or email inside normal chat replies. Never claim a purchase, result, or private fact unless it appears in this memory.`,
        messages: anthropicMessages,
      }),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      fallback: `I’m having trouble answering here. Email Ryan at ${LEADFLOW_PUBLIC_EMAIL} or book a call.`,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({
      ok: false,
      fallback: `I’m having trouble answering here. Email Ryan at ${LEADFLOW_PUBLIC_EMAIL} or book a call.`,
      detail: process.env.NODE_ENV === "development" ? text.slice(0, 200) : undefined,
    });
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const rawReply = compactReply(data.content?.find((c) => c.type === "text")?.text ?? "");
  const { reply, actions } = buildDisplayReply(rawReply, latestUserMessage(messages));
  if (!reply) {
    return NextResponse.json({
      ok: false,
      fallback: `I’m having trouble answering here. Email Ryan at ${LEADFLOW_PUBLIC_EMAIL} or book a call.`,
    });
  }

  try {
    await rememberPublicChatMessage({ visitorId, role: "assistant", content: reply, path });
  } catch {
    // Do not block a valid AI reply because memory write failed.
  }

  return NextResponse.json({ ok: true, reply, actions, mode: "anthropic", remembered });
}
