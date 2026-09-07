import test from "node:test";
import assert from "node:assert/strict";
import {
  containsCardData,
  emptyPacket,
  evidenceChecklist,
  parsePacket,
  purchaseErrors,
  renderPacket,
  responseDraft,
  validDate,
  type Packet,
} from "../lib/sellerproof/packet";
import {
  ACCESS_SECONDS,
  accessFromSession,
  caseHash,
  signAccess,
  verifyAccess,
  type Access,
  type CheckoutSession,
} from "../lib/sellerproof/access";

const id = "12345678-1234-4234-8234-123456789012";
const otherId = "12345678-1234-4234-8234-123456789013";
function packet(): Packet {
  return {
    ...emptyPacket(id),
    business: "Example merchant",
    orderId: "ORDER-1",
    disputeId: "DISPUTE-1",
    amount: "149.00",
    deadline: "2026-10-20",
    description: "Digital template",
  };
}
function session(): CheckoutSession {
  return {
    id: "cs_test_abcdefghijklmnopqrstuv",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    currency: "usd",
    amount_total: 4900,
    livemode: false,
    metadata: {
      kind: "sellerproof_packet",
      packet_id: id,
      case_hash: caseHash(packet()),
    },
    payment_intent: {
      latest_charge: { refunded: false, amount_refunded: 0, disputed: false },
    },
  };
}

test("packet validation strips unknown client flags and keeps only bounded fields", () => {
  const p = parsePacket({
    ...packet(),
    unlocked: true,
    price: 1,
    evidence: [
      {
        type: "Receipt",
        title: "Receipt",
        fileName: "receipt.pdf",
        date: "",
        note: "Shows the order total",
        fileUrl: "https://private.invalid",
      },
    ],
  });
  assert.equal("unlocked" in p, false);
  assert.equal("price" in p, false);
  assert.equal("fileUrl" in p.evidence[0], false);
  assert.throws(() => parsePacket({ ...packet(), business: "x".repeat(161) }));
  assert.throws(() =>
    parsePacket({ ...packet(), evidence: Array(41).fill({}) }),
  );
  for (const v of [null, [], "", { id: "../another" }])
    assert.throws(() => parsePacket(v));
});
test("rejects impossible dates, invalid choices, negative amounts and malformed currency", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
  for (const overrides of [
    { deadline: "2026-02-30" },
    { platform: "Pay me" },
    { amount: "-49" },
    { amount: "49.999" },
    { amount: "1e4" },
    { currency: "usd" },
    { events: [{ date: "2026-13-01", description: "x", source: "x" }] },
  ])
    assert.throws(() => parsePacket({ ...packet(), ...overrides }));
  assert.equal(purchaseErrors(packet()).length, 0);
  assert.ok(purchaseErrors(emptyPacket(id)).length >= 5);
});
test("detects card numbers and security codes before server processing or backup", () => {
  assert.equal(containsCardData("Card 4242 4242 4242 4242"), true);
  assert.equal(containsCardData("security code: 123"), true);
  assert.throws(
    () => parsePacket({ ...packet(), statement: "CVC=456" }),
    /card data/,
  );
  assert.equal(
    containsCardData("Order 1001, receipt $149.00, card ending 4242"),
    false,
  );
});
test("a filename without described evidence cannot satisfy the checklist", () => {
  const p = packet();
  p.evidence = [
    {
      type: "Receipt",
      title: "Receipt",
      fileName: "exists-only-as-name.pdf",
      date: "",
      note: "",
    },
  ];
  assert.equal(
    evidenceChecklist(p).find((e) => e.type === "Receipt")?.present,
    false,
  );
  p.evidence[0].note = "The receipt records the payment amount.";
  assert.equal(
    evidenceChecklist(p).find((e) => e.type === "Receipt")?.present,
    true,
  );
  assert.ok(evidenceChecklist(p).some((e) => e.type === "Usage or access"));
  assert.ok(!evidenceChecklist(p).some((e) => e.type === "Delivery"));
  p.productType = "Physical goods";
  assert.ok(evidenceChecklist(p).some((e) => e.type === "Delivery"));
  p.reason = "Refund not received";
  assert.ok(
    evidenceChecklist(p).some((e) => e.type === "Cancellation or refund"),
  );
});
test("draft is source-labeled, dates sort correctly, unknown facts remain unknown", () => {
  const p = packet();
  p.events = [
    { date: "", description: "Unknown-date event", source: "" },
    { date: "2026-10-02", description: "Second event", source: "E2" },
    { date: "2026-10-01", description: "First event", source: "E1" },
  ];
  const draft = responseDraft(p);
  assert.ok(draft.indexOf("First event") < draft.indexOf("Second event"));
  assert.ok(
    draft.indexOf("Second event") < draft.indexOf("Unknown-date event"),
  );
  assert.match(draft, /Date unknown/);
  assert.match(draft, /Source not identified/);
  assert.match(draft, /Add your explanation/);
  assert.doesNotMatch(
    draft,
    /identity verified|customer received|guaranteed|evidence proves/i,
  );
});
test("export escapes merchant text, includes evidence contents, and does not fetch files", () => {
  const p = packet();
  p.statement = '<script>alert("test")</script>';
  p.evidence = [
    {
      type: "Receipt",
      title: "Receipt",
      fileName: "private-receipt.pdf",
      date: "2026-10-01",
      note: "The receipt shows the purchased template.",
    },
  ];
  const html = renderPacket(p);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.match(html, /The receipt shows the purchased template/);
  assert.match(html, /File to attach: private-receipt.pdf/);
  assert.match(html, /No outcome guarantees/);
  assert.match(html, /original evidence files separately/);
  assert.doesNotMatch(html, /src=|href=/);
});
test("case identity is stable across evidence edits and changes for another dispute", () => {
  const p = packet();
  const hash = caseHash(p);
  assert.equal(
    caseHash({ ...p, amount: "149", statement: "New supporting explanation" }),
    hash,
  );
  for (const override of [
    { orderId: "OTHER" },
    { disputeId: "OTHER" },
    { amount: "150" },
    { currency: "CAD" },
    { platform: "Square" as const },
  ])
    assert.notEqual(caseHash({ ...p, ...override }), hash);
  assert.equal(hash.length, 64);
  assert.ok(!hash.includes(p.orderId));
});
test("only completed exact-price exact-product paid sessions unlock", () => {
  const s = session();
  assert.ok(accessFromSession(s, false, 1000));
  for (const override of [
    { mode: "subscription" },
    { status: "open" },
    { payment_status: "unpaid" },
    { amount_total: 1 },
    { amount_total: 1900 },
    { currency: "cad" },
    { livemode: true },
    { metadata: { ...s.metadata, kind: "pro_bundle" } },
    { metadata: { ...s.metadata, packet_id: "bad" } },
    { metadata: { ...s.metadata, case_hash: "bad" } },
    { payment_intent: null },
  ])
    assert.equal(
      accessFromSession({ ...s, ...override } as CheckoutSession, false),
      null,
    );
});
test("refunds and disputed purchase payments revoke export eligibility", () => {
  for (const charge of [
    { refunded: true },
    { amount_refunded: 1 },
    { disputed: true },
  ])
    assert.equal(
      accessFromSession(
        { ...session(), payment_intent: { latest_charge: charge } },
        false,
      ),
      null,
    );
});
test("signed access cannot be forged, replayed for a different case, or used after expiry", () => {
  const a = accessFromSession(session(), false, 1000) as Access;
  const token = signAccess(a, "test-secret");
  assert.deepEqual(verifyAccess(token, ["new-secret", "test-secret"], 1001), a);
  assert.equal(verifyAccess(token, ["wrong-secret"], 1001), null);
  assert.equal(
    verifyAccess(token, ["test-secret"], 1000 + ACCESS_SECONDS + 1),
    null,
  );
  assert.equal(verifyAccess(token, ["test-secret"], 900), null);
  const [body, sig] = token.split(".");
  const forged = {
    ...JSON.parse(Buffer.from(body, "base64url").toString()),
    packetId: otherId,
  };
  assert.equal(
    verifyAccess(
      `${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${sig}`,
      ["test-secret"],
      1001,
    ),
    null,
  );
  assert.equal(verifyAccess(`${token}.extra`, ["test-secret"], 1001), null);
});
