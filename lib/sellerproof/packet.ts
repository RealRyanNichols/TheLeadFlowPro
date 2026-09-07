// Seller-entered facts only. No provider calls, inferred identity, or invented evidence.
export const SELLERPROOF = {
  name: "SellerProof",
  kind: "sellerproof_packet",
  priceCents: 4900,
  version: 1,
} as const;
export const PLATFORMS = [
  "Stripe",
  "Shopify",
  "PayPal",
  "Square",
  "Other",
] as const;
export const REASONS = [
  "Unrecognized payment",
  "Not received",
  "Not as described",
  "Canceled subscription",
  "Refund not received",
  "Duplicate payment",
  "Other",
] as const;
export const PRODUCT_TYPES = [
  "Physical goods",
  "Digital product",
  "Service",
  "Subscription",
] as const;
export const EVIDENCE_TYPES = [
  "Receipt",
  "Delivery",
  "Usage or access",
  "Customer messages",
  "Terms or policy",
  "Cancellation or refund",
  "Other",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type Packet = {
  id: string;
  business: string;
  platform: (typeof PLATFORMS)[number];
  reason: (typeof REASONS)[number];
  productType: (typeof PRODUCT_TYPES)[number];
  orderId: string;
  disputeId: string;
  amount: string;
  currency: string;
  deadline: string;
  description: string;
  statement: string;
  events: { date: string; description: string; source: string }[];
  evidence: {
    type: EvidenceType;
    title: string;
    fileName: string;
    date: string;
    note: string;
  }[];
};
export const DISCLAIMER =
  "Not legal advice. No outcome guarantees. Review every fact and submit the evidence yourself through your payment provider.";
export const REVIEW_ITEMS = [
  "Every date, amount, and statement matches my records.",
  "I have removed full card numbers, security codes, and unrelated private information.",
  "I understand named files are not attached; I will upload the originals to my payment provider.",
  "I have checked the provider's deadline and submission requirements. I submit the evidence myself.",
];
export const PROVIDER_GUIDES: Partial<Record<Packet["platform"], string>> = {
  Stripe: "https://docs.stripe.com/disputes/responding",
  Shopify: "https://help.shopify.com/en/manual/payments/chargebacks",
  Square:
    "https://squareup.com/help/us/en/article/3882-payment-disputes-walkthrough",
};
export function emptyPacket(id: string): Packet {
  return {
    id,
    business: "",
    platform: "Stripe",
    reason: "Unrecognized payment",
    productType: "Digital product",
    orderId: "",
    disputeId: "",
    amount: "",
    currency: "USD",
    deadline: "",
    description: "",
    statement: "",
    events: [],
    evidence: [],
  };
}
const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
}
export function validPacketId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  );
}
function text(x: unknown, limit: number): string {
  if (typeof x !== "string" || x.length > limit)
    throw new Error("A field is missing or too long.");
  return x.trim();
}
function date(x: unknown): string {
  const s = text(x, 10);
  if (s && !validDate(s)) throw new Error("Use a valid calendar date.");
  return s;
}
function option<T extends string>(x: unknown, options: readonly T[]): T {
  if (typeof x !== "string" || !options.includes(x as T))
    throw new Error("Choose a valid option.");
  return x as T;
}
// Luhn detects plausible card numbers without treating long tracking IDs as cards.
export function containsCardData(s: string): boolean {
  if (/\b(?:cvv|cvc|security code)\s*[:=]?\s*\d{3,4}\b/i.test(s)) return true;
  return (s.match(/\b(?:\d[ -]?){12,18}\d\b/g) ?? []).some((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    if (/^(\d)\1+$/.test(digits)) return false;
    let sum = 0;
    for (let i = digits.length - 1, j = 0; i >= 0; i--, j++) {
      let n = Number(digits[i]);
      if (j % 2) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
    }
    return sum % 10 === 0;
  });
}
export function parsePacket(value: unknown): Packet {
  if (!isRecord(value) || !validPacketId(value.id))
    throw new Error("Invalid packet. Start a new draft.");
  if (
    !Array.isArray(value.events) ||
    value.events.length > 30 ||
    !Array.isArray(value.evidence) ||
    value.evidence.length > 40
  )
    throw new Error("Use up to 30 timeline entries and 40 evidence items.");
  const p: Packet = {
    id: value.id,
    business: text(value.business, 160),
    platform: option(value.platform, PLATFORMS),
    reason: option(value.reason, REASONS),
    productType: option(value.productType, PRODUCT_TYPES),
    orderId: text(value.orderId, 160),
    disputeId: text(value.disputeId, 160),
    amount: text(value.amount, 14),
    currency: text(value.currency, 3),
    deadline: date(value.deadline),
    description: text(value.description, 2000),
    statement: text(value.statement, 10000),
    events: value.events.map((e) => {
      if (!isRecord(e)) throw new Error("Invalid timeline entry.");
      return {
        date: date(e.date),
        description: text(e.description, 1000),
        source: text(e.source, 300),
      };
    }),
    evidence: value.evidence.map((e) => {
      if (!isRecord(e)) throw new Error("Invalid evidence item.");
      return {
        type: option(e.type, EVIDENCE_TYPES),
        title: text(e.title, 200),
        fileName: text(e.fileName, 240),
        date: date(e.date),
        note: text(e.note, 5000),
      };
    }),
  };
  if (p.amount && !/^\d{1,9}(?:\.\d{1,2})?$/.test(p.amount))
    throw new Error("Enter an amount with no more than two decimal places.");
  if (!/^[A-Z]{3}$/.test(p.currency))
    throw new Error("Use a three-letter currency code, such as USD.");
  if (containsCardData(JSON.stringify(p)))
    throw new Error(
      "Possible card data detected. Remove full card numbers and security codes before continuing.",
    );
  return p;
}
export function purchaseErrors(p: Packet): string[] {
  return [
    !p.business && "Add your business name.",
    !p.orderId && "Add the order or payment reference.",
    !p.disputeId && "Add the processor's dispute reference.",
    (!p.amount || Number(p.amount) <= 0) && "Add the disputed amount.",
    !p.deadline && "Enter the response deadline from your provider.",
    !p.description && "Describe what was purchased.",
  ].filter((x): x is string => !!x);
}
export function evidenceChecklist(
  p: Packet,
): { type: EvidenceType; why: string; present: boolean }[] {
  const expected: [EvidenceType, string][] = [
    ["Receipt", "Connect the payment and order to the item or service."],
    [
      "Customer messages",
      "Include the relevant conversation, with dates and context.",
    ],
    ["Terms or policy", "Use the version shown to the customer at purchase."],
  ];
  expected.push(
    p.productType === "Physical goods"
      ? [
          "Delivery",
          "Include carrier records and delivery details that relate to this order.",
        ]
      : [
          "Usage or access",
          "Include dated access, completion, download, or service records if you have them.",
        ],
  );
  if (
    [
      "Canceled subscription",
      "Refund not received",
      "Duplicate payment",
    ].includes(p.reason)
  )
    expected.push([
      "Cancellation or refund",
      "Include the request, response, and any refund transaction records.",
    ]);
  return expected.map(([type, why]) => ({
    type,
    why,
    present: p.evidence.some((e) => e.type === type && !!e.title && !!e.note),
  }));
}
export function packetGaps(p: Packet): string[] {
  return [
    ...purchaseErrors(p),
    ...evidenceChecklist(p)
      .filter((e) => !e.present)
      .map((e) => `${e.type}: no described evidence entered.`),
    ...p.evidence.flatMap((e, i) =>
      [
        !e.title && `Evidence ${i + 1}: add a title.`,
        !e.note && `Evidence ${i + 1}: explain what the source actually shows.`,
      ].filter((x): x is string => !!x),
    ),
    ...p.events.flatMap((e, i) =>
      [
        !e.date && `Timeline ${i + 1}: date unknown.`,
        !e.source && `Timeline ${i + 1}: source not identified.`,
      ].filter((x): x is string => !!x),
    ),
  ];
}
export function responseDraft(p: Packet): string {
  const events = p.events
    .filter((e) => e.description)
    .slice()
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  return [
    `Merchant response draft: ${p.business || "[business name missing]"}`,
    `Dispute: ${p.disputeId || "[dispute reference missing]"}\nPayment provider: ${p.platform}\nReason supplied by merchant: ${p.reason}\nOrder / payment reference: ${p.orderId || "[reference missing]"}\nDisputed amount: ${p.amount ? `${p.currency} ${p.amount}` : "[amount missing]"}`,
    `Product or service\n${p.description || "[description missing]"}`,
    `Merchant statement\n${p.statement || "[Add your explanation, supported by the evidence you identify below.]"}`,
    `Timeline supplied by merchant\n${events.map((e) => `${e.date || "Date unknown"}: ${e.description}${e.source ? ` (Source: ${e.source})` : " (Source not identified)"}`).join("\n") || "[No timeline entered.]"}`,
    `Evidence index\n${p.evidence.map((e, i) => `E${i + 1}. ${e.title || "Untitled evidence"} (${e.type})${e.date ? ` | ${e.date}` : ""}${e.fileName ? ` | File to attach: ${e.fileName}` : ""}\n${e.note || "[Description missing.]"}`).join("\n\n") || "[No evidence entered.]"}`,
  ].join("\n\n");
}
export function escapeHtml(x: string): string {
  return x
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export function renderPacket(p: Packet): string {
  const gaps = packetGaps(p);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>SellerProof evidence packet</title><style>body{font:15px/1.65 system-ui,sans-serif;color:#0f172a;background:#eef2f6;margin:0}main{max-width:780px;margin:auto;background:white;padding:44px}h1{font-size:32px;line-height:1.2}h2{font-size:19px;color:#1f49eb}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}aside{background:#f1f5f9;padding:18px;border-left:3px solid #1f49eb;margin:24px 0}li{margin:8px 0}.sub{color:#475569}footer{border-top:1px solid #cbd5e1;margin-top:30px;padding-top:18px;font-size:12px}@media print{body{background:white}main{padding:0;max-width:none}.print-help{display:none}h2{break-after:avoid}aside{break-inside:avoid}@page{size:letter;margin:.65in}</style></head><body><main><p class="sub">SellerProof · The LeadFlow Pro</p><h1>Chargeback evidence packet</h1><p>For ${escapeHtml(p.business)} · Provider deadline entered: ${escapeHtml(p.deadline)}</p><aside class="print-help">Use your browser's Print menu, then choose Save as PDF. Keep the file private. This document includes your notes and evidence index; upload the original evidence files separately in your provider's dashboard.</aside><pre>${escapeHtml(responseDraft(p))}</pre><h2>Preparation notes for the merchant</h2><p>These are organizational prompts, not a processor acceptance check. Review which sections belong in your final submission.</p><ul>${gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("") || "<li>No gaps detected by this checklist. Evidence authenticity, completeness, and acceptance are not verified.</li>"}</ul><h2>Before you submit</h2><ol>${REVIEW_ITEMS.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol><p>Use the current instructions and exact deadline in your own dispute dashboard. Attach original records, not links alone. Keep a copy of the submission and its receipt.</p><footer>${DISCLAIMER} SellerProof organizes the information you enter. It does not verify authenticity, connect to your processor, attach original files, or submit a dispute.</footer></main></body></html>`;
}
