// src/app/api/mcp/route.ts
//
// The LeadFlow Pro remote MCP server — the single build that makes LeadFlow a
// connector inside Claude (custom connectors), ChatGPT (Apps SDK), and Grok
// (Bring-Your-Own-MCP). All three speak the Model Context Protocol.
//
// Transport: Streamable HTTP. Clients POST JSON-RPC 2.0; we answer with a single
// application/json response (no server-initiated SSE needed for these tools).
//
// Design choices that keep this directory-submittable and low-risk:
//   - Every tool is READ-ONLY over the in-repo catalog (no DB, no keys required
//     to answer), so the server responds even before env is configured.
//   - "Actions" (buy, submit a source) hand off a hosted URL rather than mutating
//     state from an assistant, so there is no destructive side effect to review.

import { NextResponse } from "next/server";
import { OFFER_LIST, OFFERS, type OfferSlug } from "@/lib/offers";
import { signalProducts } from "@/lib/leadflow-sections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVER_INFO = { name: "leadflow-pro", version: "1.0.0" };
const PROTOCOL_VERSION = "2025-06-18";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

/* ─── tool definitions ────────────────────────────────────────── */

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { title: string; readOnlyHint: boolean; openWorldHint?: boolean };
  handler: (args: Record<string, any>) => string;
};

function text(value: string) {
  return { content: [{ type: "text", text: value }] };
}

function offerLine(slug: OfferSlug): string {
  const o = OFFERS[slug];
  return `- ${o.price.big} ${o.price.sub} — ${o.metaTitle.split(" · ")[0]} — buy: ${SITE_URL}/offers/${slug}`;
}

const TOOLS: Tool[] = [
  {
    name: "search_lead_signals",
    description:
      "Search LeadFlow Pro for source-backed buyer-signal lead products. Filter by industry, buyer use case, or location. Returns scored packs with proof, confidence, freshness, and price band.",
    inputSchema: {
      type: "object",
      properties: {
        industry: { type: "string", description: "e.g. ecommerce, real estate, mortgage, local services, AI/SaaS" },
        use_case: { type: "string", description: "how the buyer will use the leads, e.g. agency, contractor, sourcing" },
        location: { type: "string", description: "target geography, e.g. United States, Texas, city routes" },
      },
    },
    annotations: { title: "Search lead signals", readOnlyHint: true, openWorldHint: true },
    handler: (args) => {
      const q = [args.industry, args.use_case, args.location].filter(Boolean).join(" ").toLowerCase();
      const hits = signalProducts.filter((p) => {
        if (!q) return true;
        const hay = `${p.title} ${p.category} ${p.location} ${p.buyerUseCase}`.toLowerCase();
        return q.split(/\s+/).some((term) => hay.includes(term));
      });
      const list = (hits.length ? hits : signalProducts).slice(0, 6);
      const body = list
        .map(
          (p) =>
            `• ${p.title} (${p.category}, ${p.location})\n  score ${p.score}/100 · confidence ${p.confidence} · freshness ${p.freshness} · ${p.releaseMode}\n  records: ${p.records} · best buyer: ${p.buyerUseCase} · price band ${p.priceBand}\n  proof: ${p.sourceProof}`,
        )
        .join("\n\n");
      return `LeadFlow Pro — ${list.length} matching signal pack(s):\n\n${body}\n\nRequest a $47 sample of any pack: ${SITE_URL}/offers/quick-look\nBrowse all: ${SITE_URL}/buy-leads`;
    },
  },
  {
    name: "get_lead_profile",
    description:
      "Get a redacted preview of a source-backed lead profile from a signal pack. Full records require review-gated buyer access.",
    inputSchema: {
      type: "object",
      properties: { pack: { type: "string", description: "the signal pack title or category to preview" } },
    },
    annotations: { title: "Preview a lead profile", readOnlyHint: true },
    handler: (args) => {
      const q = String(args.pack || "").toLowerCase();
      const p = signalProducts.find((x) => `${x.title} ${x.category}`.toLowerCase().includes(q)) || signalProducts[0];
      return [
        `Redacted profile preview — ${p.title}`,
        `Category: ${p.category} · Location: ${p.location}`,
        `Confidence score: ${p.score}/100 (${p.confidence})`,
        `Freshness: ${p.freshness} · Release: ${p.releaseMode}`,
        `Source proof: ${p.sourceProof}`,
        `Suppression: ${p.suppression}`,
        `Open questions before release: ${p.openQuestions.join("; ")}`,
        ``,
        `Full contact-level records are review-gated. Request buyer access or a $47 sample: ${SITE_URL}/offers/quick-look`,
      ].join("\n");
    },
  },
  {
    name: "list_offers",
    description:
      "List everything a business can buy from LeadFlow Pro: lead-signal samples, the audit, connector status, funnel pages, done-for-you, and consulting. Returns prices and buy links.",
    inputSchema: { type: "object", properties: {} },
    annotations: { title: "List offers", readOnlyHint: true },
    handler: () => {
      const featured: OfferSlug[] = ["quick-look", "business-audit", "connector-status", "funnel-page", "done-for-you"];
      const rest = OFFER_LIST.map((o) => o.slug).filter((s) => !featured.includes(s));
      return [
        "LeadFlow Pro — what you can buy:",
        "",
        "Start here:",
        ...featured.map(offerLine),
        "",
        "More consulting & build offers:",
        ...rest.map(offerLine),
        "",
        `Pricing hub: ${SITE_URL}/pricing`,
      ].join("\n");
    },
  },
  {
    name: "get_pricing",
    description: "Get the full price, what's included, and the buy link for one LeadFlow Pro offer by slug.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "offer slug, e.g. business-audit, connector-status, quick-look" } },
      required: ["slug"],
    },
    annotations: { title: "Get pricing", readOnlyHint: true },
    handler: (args) => {
      const slug = String(args.slug || "").trim() as OfferSlug;
      const o = OFFERS[slug];
      if (!o) {
        return `No offer with slug "${args.slug}". Use list_offers to see valid slugs.`;
      }
      return [
        `${o.metaTitle.split(" · ")[0]} — ${o.price.big} ${o.price.sub}`,
        o.price.badge ? `(${o.price.badge})` : "",
        "",
        o.hero.paragraph,
        "",
        "Includes:",
        ...o.price.deliverables.map((d) => `• ${d}`),
        "",
        `Buy / details: ${SITE_URL}/offers/${slug}`,
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    name: "run_lead_leak_audit",
    description:
      "Run a quick lead-leak self-check for a business. Give what you know about their follow-up speed, website, ad spend, and CRM. Returns a leak read and the next step.",
    inputSchema: {
      type: "object",
      properties: {
        has_website: { type: "boolean" },
        follow_up_minutes: { type: "number", description: "minutes to first response on a new lead" },
        runs_ads: { type: "boolean" },
        has_crm: { type: "boolean" },
      },
    },
    annotations: { title: "Run lead-leak audit", readOnlyHint: true },
    handler: (args) => {
      const leaks: string[] = [];
      if (args.has_website === false) leaks.push("No website — no owned capture surface.");
      if (typeof args.follow_up_minutes === "number" && args.follow_up_minutes > 5)
        leaks.push(`Follow-up in ~${args.follow_up_minutes} min — speed-to-lead leak (aim for under 5).`);
      if (args.runs_ads && args.has_crm === false) leaks.push("Running ads with no CRM — paid clicks with no capture or follow-up.");
      if (args.has_crm === false) leaks.push("No CRM — leads have nowhere to land or be worked.");
      const score = Math.max(0, 100 - leaks.length * 22);
      return [
        `Lead-leak read: ${score}/100 (${score >= 75 ? "tight" : score >= 45 ? "leaking" : "bleeding"})`,
        leaks.length ? "Leaks found:\n" + leaks.map((l) => `• ${l}`).join("\n") : "No obvious leaks from what you gave — a full audit would confirm.",
        "",
        `Get the full $497 written Lead Leak Audit: ${SITE_URL}/offers/business-audit`,
        `Or a $47 quick look: ${SITE_URL}/offers/quick-look`,
      ].join("\n");
    },
  },
  {
    name: "get_connector_status_info",
    description:
      "Explain how a business becomes a LeadFlow connector: the one-tag website embed that captures leads and delivers them to a CRM, and how their inventory becomes reachable from AI assistants. Returns the plan and how to start.",
    inputSchema: { type: "object", properties: {} },
    annotations: { title: "Connector status info", readOnlyHint: true },
    handler: () => {
      const o = OFFERS["connector-status"];
      return [
        "Become a LeadFlow connector:",
        "1) Drop one script tag on your site — it renders a funnel + questionnaire and fires a pixel.",
        "2) Source-backed profiles get built, scored, and delivered into your CRM (HubSpot, GoHighLevel, Salesforce, Zapier, Make, Airtable, Sheets, or webhook).",
        "3) Your connected inventory becomes reachable from the LeadFlow connector inside Claude, ChatGPT, and Grok.",
        "",
        `Connector Status: ${o.price.big} ${o.price.sub}. Start: ${SITE_URL}/offers/connector-status`,
        `How it works: ${SITE_URL}/connectors`,
      ].join("\n");
    },
  },
  {
    name: "submit_source",
    description:
      "Point a lead source, list, audience, dataset, or website to LeadFlow Pro for review. Returns the submission link to complete it.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "what the source is (URL, list, audience, dataset)" },
        note: { type: "string", description: "context for the reviewer" },
      },
    },
    annotations: { title: "Submit a source", readOnlyHint: true, openWorldHint: true },
    handler: (args) => {
      const s = args.source ? `Source noted: ${args.source}\n` : "";
      return `${s}Submit it for review here (takes ~2 minutes, review-gated): ${SITE_URL}/submit-source`;
    },
  },
];

const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

/* ─── JSON-RPC handling ───────────────────────────────────────── */

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function handleRpc(msg: any): object | null {
  const { id, method, params } = msg || {};

  if (method === "initialize") {
    const requested = params?.protocolVersion;
    return rpcResult(id, {
      protocolVersion: typeof requested === "string" ? requested : PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions:
        "LeadFlow Pro turns verified sources into scored, source-backed buyer signals and sells them. Use search_lead_signals to find lead packs, list_offers/get_pricing to see what a business can buy, get_connector_status_info to explain becoming a connector, and run_lead_leak_audit for a quick diagnostic. Actions hand back a hosted link to complete on theleadflowpro.com.",
    });
  }

  // Notifications carry no id and expect no response.
  if (method === "notifications/initialized" || (typeof method === "string" && method.startsWith("notifications/"))) {
    return null;
  }

  if (method === "ping") return rpcResult(id, {});

  if (method === "tools/list") {
    return rpcResult(id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations,
      })),
    });
  }

  if (method === "tools/call") {
    const name = params?.name;
    const tool = TOOL_BY_NAME.get(name);
    if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
    try {
      const out = tool.handler(params?.arguments || {});
      return rpcResult(id, text(out));
    } catch (err) {
      return rpcResult(id, { ...text(`Tool error: ${err instanceof Error ? err.message : "failed"}`), isError: true });
    }
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS });
  }

  // Batch or single.
  if (Array.isArray(body)) {
    const responses = body.map(handleRpc).filter(Boolean);
    return NextResponse.json(responses, { headers: CORS });
  }

  const response = handleRpc(body);
  if (response === null) {
    // Notification: acknowledge with 202 and no body.
    return new NextResponse(null, { status: 202, headers: CORS });
  }
  return NextResponse.json(response, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// A plain GET returns a human-readable description (server-initiated SSE is not
// used by these tools, so MCP clients fall back to POST request/response).
export async function GET() {
  return NextResponse.json(
    {
      server: SERVER_INFO,
      protocol: "Model Context Protocol (Streamable HTTP)",
      transport: "POST JSON-RPC 2.0 to this URL",
      tools: TOOLS.map((t) => t.name),
      docs: `${SITE_URL}/connectors`,
      note: "Add this URL as a custom connector in Claude, a ChatGPT app, or a Grok BYO-MCP connector.",
    },
    { headers: CORS },
  );
}
