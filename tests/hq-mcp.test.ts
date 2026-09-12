// The MCP server against an in-memory business. What ChatGPT or Claude
// would see, without a database or a network.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { handleJsonRpc, TOOL_SPECS, coerceToolValues, type HqActions, type McpContext } from "../lib/hq/mcp.ts";
import { SCOPES } from "../lib/hq/oauth.ts";
import type { Brief, Content, HqEvent, Lead, Message, Workspace } from "../lib/hq/types.ts";
import { workspace, lead } from "./hq-engine.test.ts";
import { getTool } from "../lib/tools/index.ts";
import { copyProblems } from "../lib/hq/copy.ts";

const NOW = new Date("2026-09-14T14:00:00Z");

class MemoryActions implements HqActions {
  leads: Lead[] = [];
  events: HqEvent[] = [];
  content: Content[] = [];
  messages: Message[] = [];
  ws: Workspace;
  smsConnected = true;
  facebook = false;
  delivered: Message[] = [];
  published: Content[] = [];
  private n = 0;
  constructor(ws: Workspace) {
    this.ws = ws;
  }
  private id(p: string) {
    return `${p}-${++this.n}`;
  }
  async listLeads(opts: { statuses?: Lead["status"][]; limit?: number; search?: string }) {
    let out = this.leads.filter((l) => !opts.statuses || opts.statuses.includes(l.status));
    if (opts.search) {
      const q = opts.search.toLowerCase();
      out = out.filter((l) => `${l.name} ${l.phone} ${l.email} ${l.service}`.toLowerCase().includes(q));
    }
    return out.slice(0, opts.limit ?? 50);
  }
  async getLead(id: string) {
    return this.leads.find((l) => l.id === id) ?? null;
  }
  async addLead(input: Parameters<HqActions["addLead"]>[0]) {
    const l = lead({ id: this.id("lead"), ...input, created_at: NOW.toISOString(), status: "new" });
    this.leads.push(l);
    return l;
  }
  async updateLead(id: string, patch: Partial<Lead>) {
    const i = this.leads.findIndex((l) => l.id === id);
    this.leads[i] = { ...this.leads[i], ...patch };
    return this.leads[i];
  }
  async recordEvent(input: Parameters<HqActions["recordEvent"]>[0]) {
    this.events.push({ id: this.id("ev"), workspace_id: this.ws.id, lead_id: input.leadId ?? null, kind: input.kind, detail: input.detail, actor: input.actor, dedupe_key: input.dedupeKey ?? null, meta: input.meta ?? {}, created_at: NOW.toISOString() });
  }
  async recentEvents(opts: { limit?: number; leadId?: string }) {
    return this.events.filter((e) => !opts.leadId || e.lead_id === opts.leadId).slice(-(opts.limit ?? 50));
  }
  async listContent(opts: { statuses?: Content["status"][]; limit?: number; weekOf?: string }) {
    return this.content.filter((c) => (!opts.statuses || opts.statuses.includes(c.status)) && (!opts.weekOf || c.week_of === opts.weekOf)).slice(0, opts.limit ?? 50);
  }
  async saveContent(draft: Parameters<HqActions["saveContent"]>[0], actor: string) {
    const c: Content = { id: this.id("content"), workspace_id: this.ws.id, kind: draft.kind, title: draft.title, body: draft.body, hook: draft.hook, cta: draft.cta, extras: draft.extras, status: "draft", week_of: draft.weekOf ?? null, scheduled_for: null, published_at: null, published_ref: null, created_by: actor, created_at: NOW.toISOString(), updated_at: NOW.toISOString() };
    this.content.push(c);
    return c;
  }
  async updateContent(id: string, patch: Partial<Content>) {
    const i = this.content.findIndex((c) => c.id === id);
    if (i < 0) return null;
    this.content[i] = { ...this.content[i], ...patch };
    return this.content[i];
  }
  async getContent(id: string) {
    return this.content.find((c) => c.id === id) ?? null;
  }
  async saveMessage(input: Parameters<HqActions["saveMessage"]>[0]) {
    const m: Message = { id: this.id("msg"), workspace_id: this.ws.id, lead_id: input.leadId, direction: "out", channel: input.draft.channel, purpose: input.draft.purpose, body: input.draft.body, subject: input.draft.subject ?? null, status: input.status, provider: null, provider_id: null, error: null, created_by: input.actor, sent_at: null, created_at: NOW.toISOString() };
    this.messages.push(m);
    return m;
  }
  async getMessage(id: string) {
    return this.messages.find((m) => m.id === id) ?? null;
  }
  async deliverMessage(message: Message) {
    const sent = { ...message, status: "sent" as const, sent_at: NOW.toISOString() };
    this.delivered.push(sent);
    const i = this.messages.findIndex((m) => m.id === message.id);
    if (i >= 0) this.messages[i] = sent;
    return sent;
  }
  async channels() {
    return { sms: this.smsConnected, email: true, facebook: this.facebook };
  }
  async publishContent(content: Content) {
    this.published.push(content);
    return { ok: true, ref: "fb-post-1" };
  }
  async latestBrief(): Promise<Brief | null> {
    return null;
  }
  async updateWorkspace(patch: Partial<Workspace>) {
    this.ws = { ...this.ws, ...patch };
    return this.ws;
  }
}

function ctxFor(actions: MemoryActions, over: Partial<McpContext> = {}): McpContext {
  return { workspace: actions.ws, scopes: new Set(SCOPES), actions, now: NOW, via: "api_key", ...over };
}

async function call(ctx: McpContext, name: string, args: Record<string, unknown> = {}, id = 1) {
  const out = await handleJsonRpc({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }, ctx);
  const r = out.responses[0];
  assert.ok(r, "a request gets a response");
  return r;
}

type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, unknown>; isError: boolean };

const result = (r: { result?: unknown }) => r.result as ToolResult;

describe("protocol basics", () => {
  test("initialize negotiates a known version and names the business", async () => {
    const a = new MemoryActions(workspace());
    const out = await handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test" } } }, ctxFor(a));
    const r = out.responses[0].result as { protocolVersion: string; instructions: string; serverInfo: { name: string } };
    assert.equal(r.protocolVersion, "2025-03-26");
    assert.match(r.instructions, /Business: Kirby Plumbing/);
    assert.equal(r.serverInfo.name, "the-leadflow-pro");
    const unknown = await handleJsonRpc({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } }, ctxFor(a));
    assert.equal((unknown.responses[0].result as { protocolVersion: string }).protocolVersion, "2025-06-18");
  });

  test("notifications get no response, unknown methods get -32601, garbage gets -32600", async () => {
    const a = new MemoryActions(workspace());
    const note = await handleJsonRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, ctxFor(a));
    assert.equal(note.responses.length, 0);
    assert.equal(note.hadRequests, false);
    const unknown = await handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/explode" }, ctxFor(a));
    assert.equal(unknown.responses[0].error?.code, -32601);
    const garbage = await handleJsonRpc({ hello: "world" }, ctxFor(a));
    assert.equal(garbage.responses[0].error?.code, -32600);
    const batch = await handleJsonRpc([{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }], ctxFor(a));
    assert.equal(batch.responses.length, 1);
  });

  test("tools/list describes every tool with a schema and annotations", async () => {
    const a = new MemoryActions(workspace());
    const out = await handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, ctxFor(a));
    const tools = (out.responses[0].result as { tools: { name: string; inputSchema: { type: string }; annotations: { readOnlyHint: boolean } }[] }).tools;
    assert.equal(tools.length, TOOL_SPECS.length);
    assert.ok(tools.length >= 17);
    for (const t of tools) {
      assert.equal(t.inputSchema.type, "object", t.name);
      assert.equal(typeof t.annotations.readOnlyHint, "boolean");
    }
    assert.equal(tools.find((t) => t.name === "daily_brief")?.annotations.readOnlyHint, true);
    assert.equal(tools.find((t) => t.name === "send_message")?.annotations.readOnlyHint, false);
  });

  test("tool descriptions pass the copy rules", () => {
    for (const t of TOOL_SPECS) assert.deepEqual(copyProblems(`${t.title} ${t.description}`), [], t.name);
  });

  test("resources and prompts list and read", async () => {
    const a = new MemoryActions(workspace());
    a.leads.push(lead());
    const ctx = ctxFor(a);
    const list = await handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "resources/list" }, ctx);
    assert.equal((list.responses[0].result as { resources: unknown[] }).resources.length, 4);
    const read = await handleJsonRpc({ jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: "leadflow://leads/open" } }, ctx);
    const contents = (read.responses[0].result as { contents: { text: string }[] }).contents;
    assert.match(contents[0].text, /Jamie Rivera/);
    const missing = await handleJsonRpc({ jsonrpc: "2.0", id: 3, method: "resources/read", params: { uri: "leadflow://nope" } }, ctx);
    assert.equal(missing.responses[0].error?.code, -32602);
    const prompts = await handleJsonRpc({ jsonrpc: "2.0", id: 4, method: "prompts/list" }, ctx);
    assert.equal((prompts.responses[0].result as { prompts: unknown[] }).prompts.length, 3);
    const prompt = await handleJsonRpc({ jsonrpc: "2.0", id: 5, method: "prompts/get", params: { name: "morning" } }, ctx);
    assert.match((prompt.responses[0].result as { messages: { content: { text: string } }[] }).messages[0].content.text, /daily_brief/);
  });
});

describe("working the inbox through the plugin", () => {
  test("brief, next calls, add, log, draft, send: the whole loop", async () => {
    const a = new MemoryActions(workspace());
    a.leads.push(lead({ id: "waiting", created_at: new Date(NOW.getTime() - 30 * 60_000).toISOString() }));
    const ctx = ctxFor(a);

    const brief = result(await call(ctx, "daily_brief"));
    assert.equal(brief.isError, false);
    assert.match(brief.content[0].text, /1 person is waiting/);

    const calls = result(await call(ctx, "next_calls", { limit: 3 }));
    assert.match(calls.content[0].text, /1\. Jamie Rivera \(903\) 555-0199/);

    const added = result(await call(ctx, "add_lead", { name: "Sam Tate", phone: "903 555 0111", service: "Drain cleaning", message: "kitchen sink backed up", consent_sms: true }));
    assert.equal(added.isError, false);
    const sam = (added.structuredContent as { lead: { id: string; phone: string; consent_sms: boolean } }).lead;
    assert.equal(sam.phone, "+19035550111");
    assert.equal(sam.consent_sms, true);

    const logged = result(await call(ctx, "log_touch", { lead_id: sam.id, outcome: "contacted", note: "Coming Tuesday" }));
    assert.match(logged.content[0].text, /Status contacted\. Next follow-up 2026-09-15/);
    assert.ok(a.events.some((e) => e.kind === "call" && e.lead_id === sam.id));

    const draft = result(await call(ctx, "draft_reply", { lead_id: "waiting", purpose: "text_back" }));
    assert.equal(draft.isError, false);
    const mid = (draft.structuredContent as { message_id: string }).message_id;
    assert.match(draft.content[0].text, /Jamie, this is Dan Kirby with Kirby Plumbing/);

    const sent = result(await call(ctx, "send_message", { message_id: mid }));
    assert.equal(sent.isError, false, sent.content[0].text);
    assert.equal(a.delivered.length, 1);
    assert.equal(a.delivered[0].channel, "sms");

    const again = result(await call(ctx, "send_message", { message_id: mid }));
    assert.match(again.content[0].text, /already sent/);
  });

  test("a text cannot go to a lead who never agreed to texts", async () => {
    const a = new MemoryActions(workspace());
    a.leads.push(lead({ id: "nocon", consent_sms: false }));
    const ctx = ctxFor(a);
    const draft = result(await call(ctx, "draft_reply", { lead_id: "nocon", purpose: "follow_up" }));
    const mid = (draft.structuredContent as { message_id: string }).message_id;
    const sent = result(await call(ctx, "send_message", { message_id: mid }));
    assert.equal(sent.isError, true);
    assert.match(sent.content[0].text, /not agreed to texts/);
    assert.equal(a.delivered.length, 0);
  });

  test("a text cannot go out without a connected text line", async () => {
    const a = new MemoryActions(workspace());
    a.smsConnected = false;
    a.leads.push(lead({ id: "l1" }));
    const ctx = ctxFor(a);
    const draft = result(await call(ctx, "draft_reply", { lead_id: "l1", purpose: "text_back" }));
    const mid = (draft.structuredContent as { message_id: string }).message_id;
    const sent = result(await call(ctx, "send_message", { message_id: mid }));
    assert.equal(sent.isError, true);
    assert.match(sent.content[0].text, /No text line is connected/);
  });

  test("a custom draft gets the opt-out line added", async () => {
    const a = new MemoryActions(workspace());
    a.leads.push(lead({ id: "l1" }));
    const draft = result(await call(ctxFor(a), "draft_reply", { lead_id: "l1", purpose: "custom", instruction: "Running 20 minutes late, sorry!" }));
    assert.match(draft.content[0].text, /Running 20 minutes late, sorry! Reply STOP to opt out\./);
  });

  test("an unknown lead is a tool error, not a crash", async () => {
    const a = new MemoryActions(workspace());
    const r = result(await call(ctxFor(a), "get_lead", { lead_id: "ghost" }));
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /No lead with id ghost/);
  });
});

describe("content through the plugin", () => {
  test("weekly drafts are created once and listed, then approved and published", async () => {
    const a = new MemoryActions(workspace());
    const ctx = ctxFor(a);
    const first = result(await call(ctx, "draft_weekly_content"));
    assert.match(first.content[0].text, /Week of 2026-09-14: 5 drafts/);
    const second = result(await call(ctx, "draft_weekly_content"));
    assert.equal(a.content.length, 5, "running it twice does not double the drafts");
    assert.match(second.content[0].text, /5 drafts/);

    const post = a.content.find((c) => c.kind === "post")!;
    const approved = result(await call(ctx, "approve_content", { content_id: post.id, decision: "approve", body: "Edited body from the owner." }));
    assert.match(approved.content[0].text, /now approved/);
    assert.equal(a.content.find((c) => c.id === post.id)?.body, "Edited body from the owner.");

    const pasted = result(await call(ctx, "publish_post", { content_id: post.id }));
    assert.match(pasted.content[0].text, /No Facebook Page is connected/);
    assert.equal(a.published.length, 0);

    a.facebook = true;
    const live = result(await call(ctx, "publish_post", { content_id: post.id }));
    assert.match(live.content[0].text, /Published to Facebook: fb-post-1/);
    assert.equal(a.content.find((c) => c.id === post.id)?.status, "published");

    const ad = a.content.find((c) => c.kind === "ad")!;
    const notAPost = result(await call(ctx, "publish_post", { content_id: ad.id }));
    assert.equal(notAPost.isError, true);
  });

  test("a single draft about a topic, and a review reply", async () => {
    const a = new MemoryActions(workspace());
    const ctx = ctxFor(a);
    const post = result(await call(ctx, "draft_content", { kind: "post", topic: "Sewer camera inspection" }));
    assert.match(post.content[0].text, /sewer camera inspection/i);
    const reply = result(await call(ctx, "draft_content", { kind: "review_reply", review_stars: 2, review_text: "Showed up late", reviewer_name: "Cody" }));
    assert.match(reply.content[0].text, /Cody, I am sorry/);
  });
});

describe("profile and permissions", () => {
  test("the profile reads and updates", async () => {
    const a = new MemoryActions(workspace());
    const ctx = ctxFor(a);
    const before = result(await call(ctx, "business_profile"));
    assert.match(before.content[0].text, /Kirby Plumbing, Longview, TX/);
    const updated = result(await call(ctx, "update_business_profile", { offer: "Free camera inspection with any drain job", auto_text_back: true, brief_hour: 6, phone: "903-555-0100" }));
    assert.equal(updated.isError, false);
    assert.equal(a.ws.offer, "Free camera inspection with any drain job");
    assert.equal(a.ws.settings.autoTextBack, true);
    assert.equal(a.ws.settings.briefHour, 6);
    assert.equal(a.ws.phone, "+19035550100");
  });

  test("a connection without a scope cannot use tools that need it", async () => {
    const a = new MemoryActions(workspace());
    const ctx = ctxFor(a, { scopes: new Set(["leads:read"]) });
    const r = result(await call(ctx, "add_lead", { name: "X" }));
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /leads:write/);
    const ok = result(await call(ctx, "list_leads"));
    assert.equal(ok.isError, false);
  });

  test("an inactive subscription keeps read-only tools and blocks the rest", async () => {
    const a = new MemoryActions(workspace({ plan: "canceled" }));
    const ctx = ctxFor(a);
    const brief = result(await call(ctx, "daily_brief"));
    assert.equal(brief.isError, false);
    const add = result(await call(ctx, "add_lead", { name: "X" }));
    assert.equal(add.isError, true);
    assert.match(add.content[0].text, /not active/);
  });
});

describe("calculators through the plugin", () => {
  test("list and run a real calculator with clamped values", async () => {
    const a = new MemoryActions(workspace());
    const ctx = ctxFor(a);
    const list = result(await call(ctx, "list_calculators", { search: "missed call", limit: 3 }));
    const calcs = (list.structuredContent as { calculators: { slug: string; inputs: { id: string }[] }[] }).calculators;
    assert.ok(calcs.length >= 1);
    const slug = calcs[0].slug;
    const tool = getTool(slug)!;
    const numeric = tool.fields.find((f) => f.type === "slider" || f.type === "money" || f.type === "number");
    const values: Record<string, unknown> = numeric ? { [numeric.id]: "$1,000,000,000" } : {};
    const run = result(await call(ctx, "run_calculator", { slug, values }));
    assert.equal(run.isError, false, run.content[0].text);
    assert.match(run.content[0].text, new RegExp(tool.name.slice(0, 12)));
    const data = run.structuredContent as { values: Record<string, unknown>; result: Record<string, unknown> };
    assert.equal("documents" in data.result, false, "never hands pro documents through the free path");
    if (numeric && numeric.type === "slider") assert.equal(data.values[numeric.id], numeric.max, "a giant value is clamped to the slider max");
  });

  test("coercion keeps types honest", () => {
    const tool = getTool("missed-call-calculator") ?? getTool(TOOL_SPECS.length ? "lead-response-time" : "") ?? null;
    if (!tool) return;
    const values = coerceToolValues(tool, { nonsense: 1 });
    for (const f of tool.fields) assert.ok(f.id in values);
  });

  test("an unknown slug is a tool error", async () => {
    const a = new MemoryActions(workspace());
    const r = result(await call(ctxFor(a), "run_calculator", { slug: "not-real" }));
    assert.equal(r.isError, true);
  });
});
