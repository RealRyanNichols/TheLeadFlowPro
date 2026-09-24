import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { CallSheetLead } from "../lib/callSheet.ts";
import { leadConsultationTextBody, leadFirstText, leadTextBackBody } from "../lib/leadNotify.ts";
import { INBOUND_AUTO_REPLY } from "../lib/quo.ts";
import { buildUncalledList, isPlaceholderEmail, touchesFromRows, type UncalledTouchRows } from "../lib/uncalled.ts";

// Synthetic leads only.
const NOW = new Date("2026-09-22T19:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function lead(id: string, overrides: Partial<CallSheetLead> = {}): CallSheetLead {
  return {
    id,
    created_at: hoursAgo(5),
    full_name: `Lead ${id}`,
    business_name: null,
    email: `${id}@example.com`,
    phone: "(903) 555-0100",
    interest: "website_launch",
    status: "new",
    source: "meta_lead_ad",
    utm_source: "facebook",
    best_contact_method: "text",
    sms_consent: false,
    sms_unsubscribed_at: null,
    is_test: false,
    ...overrides,
  };
}

const none: UncalledTouchRows = { notes: [], calls: [], messages: [] };
const out = (lead_id: string, body: string, h = 1) => ({ lead_id, direction: "out", body, created_at: hoursAgo(h) });

test("software texts never count as a call: the first text, the old text-backs and the auto-reply leave a lead on the list", () => {
  const leads = ["first", "legacy", "consult", "auto", "human"].map((id) => lead(id, { status: "contacted" }));
  const touches = touchesFromRows({
    ...none,
    messages: [
      out("first", leadFirstText({ full_name: "Lead first", funnel: null })),
      out("legacy", leadTextBackBody("Lead", null)),
      out("consult", leadConsultationTextBody("Lead", null)),
      out("auto", INBOUND_AUTO_REPLY),
      out("human", "Hi, Ryan here. Does Thursday at 2 work for a call?"),
    ],
  });
  const list = buildUncalledList(leads, touches, NOW);
  // status "contacted" came from the phone system stamping the software text; it does not matter here.
  assert.deepEqual(list.rows.map((r) => r.id).sort(), ["auto", "consult", "first", "legacy"]);
  assert.deepEqual(list.excluded, [{ id: "human", reason: "a person has touched it" }]);
});

test("a note or a call somebody had takes a lead off; a missed call or a text from them keeps it on, flagged", () => {
  const leads = [lead("noted"), lead("called"), lead("outcall"), lead("missed"), lead("wrote"), lead("quiet")];
  const touches = touchesFromRows({
    notes: [{ lead_id: "noted", created_at: hoursAgo(1) }],
    calls: [
      { lead_id: "called", started_at: hoursAgo(1), direction: "incoming", outcome: "answered" },
      { lead_id: "outcall", started_at: hoursAgo(1), direction: "outgoing", outcome: "no_answer" },
      { lead_id: "missed", started_at: hoursAgo(1), direction: "incoming", outcome: "missed" },
      { lead_id: null, started_at: hoursAgo(1), direction: "incoming", outcome: "answered" },
    ],
    messages: [{ lead_id: "wrote", direction: "in", body: "Are you still taking new clients?", created_at: hoursAgo(2) }],
  });
  const list = buildUncalledList(leads, touches, NOW);
  assert.deepEqual(list.rows.map((r) => [r.id, r.reachedOut]).sort(), [
    ["missed", true],
    ["quiet", false],
    ["wrote", true],
  ]);
  assert.deepEqual(list.excluded.map((e) => e.id).sort(), ["called", "noted", "outcall"]);
});

test("open, live, reachable leads only; oldest first; every row links to the page both roles can open", () => {
  const leads = [
    lead("newest", { created_at: hoursAgo(1) }),
    lead("oldest", { created_at: hoursAgo(24 * 200), status: "proposal" }),
    lead("middle", { created_at: hoursAgo(30), sms_consent: true }),
    lead("won", { status: "won" }),
    lead("lost", { status: "lost" }),
    lead("test", { is_test: true }),
    lead("ghost", { phone: null, email: "ghost@no-email.facebook.lead" }),
    lead("texter", { phone: "+19035550142", email: "quo+9035550142@unknown.invalid", source: "quo_inbound", utm_source: null }),
    lead("stopped", { sms_consent: true, sms_unsubscribed_at: hoursAgo(2), created_at: hoursAgo(3) }),
  ];
  const list = buildUncalledList(leads, [], NOW);
  assert.deepEqual(
    list.rows.map((r) => r.id),
    ["oldest", "middle", "texter", "stopped", "newest"],
  );
  assert.deepEqual(
    list.excluded.map((e) => [e.id, e.reason]),
    [
      ["won", "status won"],
      ["lost", "status lost"],
      ["test", "test record"],
      ["ghost", "no phone and no email"],
    ],
  );
  const byId = Object.fromEntries(list.rows.map((r) => [r.id, r]));
  assert.equal(byId.middle.canText, true);
  assert.equal(byId.stopped.canText, false, "consent does not survive a STOP");
  assert.equal(byId.newest.canText, false);
  assert.equal(byId.texter.email, null, "a placeholder address is not an email link");
  assert.equal(byId.texter.sourceLabel, "Texted or called in");
  assert.equal(byId.middle.interestLabel, "Website Launch");
  assert.equal(byId.middle.href, "/admin/sales/leads/middle");
  assert.equal(Math.round(byId.middle.ageHours), 30);
  assert.equal(isPlaceholderEmail("real@example.com"), false);
  assert.equal(isPlaceholderEmail("x@no-email.facebook.lead"), true);
  assert.equal(isPlaceholderEmail("quo+1@unknown.invalid"), true);
  assert.equal(isPlaceholderEmail(""), true);
});

test("the page: both roles, checked next to the read, no last_contacted_at, no lookback, a capped read says so", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
  const page = read("app/sales/uncalled/page.tsx");
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /profile\?\.role !== "admin" && profile\?\.role !== "sales"/);
  assert.match(page, /redirect\("\/login\?next=\/admin\/sales\/uncalled"\)/);
  assert.match(page, /ignores the &quot;last contacted&quot; date, because the phone system stamps it the moment the software texts a lead/);
  assert.match(page, /loaded\.capped/);
  assert.match(page, /row\.canText \? smsHref\(row\.phone\) : null/);
  const loader = read("lib/uncalledServer.ts");
  assert.match(loader, /^import "server-only";/);
  assert.ok(!loader.includes("last_contacted_at"), "the loader never reads the stamp the software sets");
  assert.ok(!/\.gte\("created_at"/.test(loader), "no lookback window");
  assert.match(loader, /\.limit\(UNCALLED_LEAD_LIMIT\)/);
  assert.match(loader, /\.range\(from, to\)/, "touch reads page past the 1000-row cap");
  assert.ok(!loader.includes(".insert(") && !loader.includes(".update(") && !loader.includes(".delete("), "the loader is read-only");
  for (const layout of ["app/admin/layout.tsx", "app/sales/layout.tsx"]) {
    assert.match(read(layout), /href="\/admin\/sales\/uncalled"[\s\S]{0,200}Uncalled/, layout);
  }
});

test("Mark contacted writes a note, stamps the lead, moves only new to contacted, logs a call, and restores the row on failure", () => {
  const client = readFileSync(join(process.cwd(), "app/sales/uncalled/UncalledList.tsx"), "utf8");
  assert.match(client, /^"use client";/);
  assert.match(client, /createClient\(\)/);
  assert.match(client, /const NOTE_BODY = "Marked contacted from the Uncalled list\.";/);
  assert.match(client, /from\("lead_notes"\)\.insert\(\{ lead_id: item\.id, body: NOTE_BODY, author: actorName \}\)/);
  assert.match(client, /from\("leads"\)\.update\(\{ last_contacted_at: now \}\)\.eq\("id", item\.id\)\.select\("id"\)/);
  assert.match(client, /update\(\{ status: "contacted" \}\)\.eq\("id", item\.id\)\.eq\("status", "new"\)/);
  assert.match(client, /from\("lead_activity"\)\s*\.insert\(\{ lead_id: item\.id, kind: "call", detail: `\$\{actorName\}: marked contacted from the Uncalled list` \}\)/);
  // Optimistic: hidden before the writes, shown again with the reason if any fails.
  const hide = client.indexOf("setIn(setHidden, item.id, true)");
  const firstWrite = client.indexOf('from("lead_notes")');
  assert.ok(hide > 0 && hide < firstWrite);
  assert.match(client, /const fail = \(message: string\) => \{\s+setIn\(setHidden, item\.id, false\);/);
  assert.match(client, /role="alert"/);
  // Only the columns the sales trigger lets Pat change.
  assert.ok(!/update\(\{[^}]*(owner|priority|notes|is_test)/.test(client));
  assert.match(client, /min-h-\[44px\]/);
});
