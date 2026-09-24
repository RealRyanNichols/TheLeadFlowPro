import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";
import { TLFP_CREDITS, TLFP_PACKS, earnRule } from "@/lib/tlfpCredits";

// The TLFP Credits launch announcement: who gets it and what it says.
//
// Pure functions only. The route (app/api/admin/tlfp/announce) gathers the
// consented leads, then calls pickRecipients and launchEmail from here, once
// per person, with that person's own one-click unsubscribe link. Keeping the copy here means the numbers in the email
// come from lib/site/prices.ts and lib/tlfpCredits.ts, the same place the
// public page reads them, so the email can never quote a stale price.
//
// Voice rules for this email: short lines, real blank lines, no dashes of any
// kind, the credits only (the token is never mentioned).

export const TLFP_ANNOUNCE = {
  /** Written to lead_activity for every send, and checked before sending again. */
  activityDetail: "TLFP Credits launch email sent",
  campaignTag: "tlfp-credits-launch",
  /** "Prepay $500, get $625 of work", from the Builder pack numbers. */
  subject: `Prepay ${usd(TLFP_PACKS[1].priceUsd)}, get $${TLFP_PACKS[1].credits} of work`,
  preheader: "Buy work ahead, spend it on anything we do. Only good with us, no cash out.",
  utm: "utm_source=resend&utm_medium=email&utm_campaign=tlfp-credits&utm_content=launch",
  /** A sane send is somewhere in here. Outside it, the route refuses. */
  minRecipients: 10,
  maxRecipients: 200,
} as const;

export type AnnounceRecipient = { email: string; firstName: string };

export function normalizeAnnounceEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/** Real-looking, and not one of our own test rows. */
export function isAnnounceable(email: string): boolean {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (/@(example\.com|example\.org|test\.com|mailinator\.com)$/.test(email)) return false;
  if (/\+leadtest@|\+test@|^test@|^zz\s*test/.test(email)) return false;
  return true;
}

function firstNameOf(name: unknown): string {
  const first = String(name ?? "")
    .trim()
    .split(/\s+/)[0];
  return /^[a-z][a-z'.-]*$/i.test(first) ? first : "";
}

/**
 * One list, deduped by email, in this order: consented leads first, then paying
 * customers who are not already leads. Anyone on any unsubscribe list is out.
 */
export function pickRecipients(input: {
  leads: Array<{ email: unknown; full_name?: unknown }>;
  customers: Array<{ email: unknown; name?: unknown }>;
  unsubscribed: unknown[];
}): { recipients: AnnounceRecipient[]; leadCount: number; customerCount: number; removed: number } {
  const out = new Map<string, AnnounceRecipient>();
  for (const lead of input.leads) {
    const email = normalizeAnnounceEmail(lead.email);
    if (isAnnounceable(email) && !out.has(email)) out.set(email, { email, firstName: firstNameOf(lead.full_name) });
  }
  const leadCount = out.size;
  for (const customer of input.customers) {
    const email = normalizeAnnounceEmail(customer.email);
    if (isAnnounceable(email) && !out.has(email)) out.set(email, { email, firstName: firstNameOf(customer.name) });
  }
  const customerCount = out.size - leadCount;
  const blocked = new Set(input.unsubscribed.map(normalizeAnnounceEmail).filter(Boolean));
  let removed = 0;
  for (const email of [...out.keys()]) {
    if (blocked.has(email)) {
      out.delete(email);
      removed += 1;
    }
  }
  return { recipients: [...out.values()], leadCount, customerCount, removed };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function packLine(packIndex: number): string {
  const pack = TLFP_PACKS[packIndex];
  return `${usd(pack.priceUsd)} gets you ${pack.credits.toLocaleString("en-US")} credits`;
}

/** The launch email. Same frame as the 30 day series: 600px card, blue button. */
export function launchEmail(unsubscribeUrl: string): { subject: string; html: string; text: string } {
  const link = `${BUSINESS.siteUrl}${TLFP_CREDITS.path}?${TLFP_ANNOUNCE.utm}`;
  const course = earnRule("course_completed").credits ?? 0;
  const event = earnRule("event_attended").credits ?? 0;
  const referral = earnRule("referral_purchase").percentOfPurchase ?? 0;
  const builder = TLFP_PACKS.find((pack) => pack.id === "builder") ?? TLFP_PACKS[1];
  const leftover = builder.credits - PRICES.systemMap;
  const address = `${BUSINESS.address.street}, ${BUSINESS.address.city} ${BUSINESS.address.region} ${BUSINESS.address.postalCode}`;

  const paragraphs = [
    "Ryan here.",
    "We just turned on TLFP Credits on the site.",
    "One credit is one dollar of LeadFlow Pro work. Websites, lead systems, training, the System Map, all of it.",
    "Buy a pack and the pack comes with extra:",
  ];
  const packs = TLFP_PACKS.map((_, index) => packLine(index));
  const after = [
    "You spend them at checkout like cash. They never turn back into cash, and they only work with us. That is what keeps them simple.",
    `You can also earn them. Finish a course, ${course} credits. Show up at a Coop workshop, ${event}. Send us a client and they buy, you get ${referral} percent of their first purchase in credits.`,
    `The math most people do: the System Map is ${usd(PRICES.systemMap)}. Pay ${usd(builder.priceUsd)} today, the map is covered, and you have ${leftover} credits left for the next thing.`,
  ];
  const closing = [
    `Questions, call or text ${BUSINESS.phone.display}.`,
    `${BUSINESS.operator}\n${BUSINESS.name}\n${address}`,
  ];

  const p = (text: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#e5e7eb">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(TLFP_ANNOUNCE.subject)}</title></head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;color:#0b0f1a">${escapeHtml(TLFP_ANNOUNCE.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111827;border-radius:14px;border:1px solid #1f2937"><tr><td style="padding:32px 28px">
<p style="margin:0 0 18px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd;font-weight:700">${escapeHtml(BUSINESS.name)}</p>
<h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:#ffffff">Credits are live. One dollar each, and packs come with extra.</h1>
${paragraphs.map(p).join("")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse">
${TLFP_PACKS.map(
  (pack) =>
    `<tr><td style="padding:8px 14px;border:1px solid #374151;color:#ffffff;font-size:16px;font-weight:700">${usd(pack.priceUsd)}</td><td style="padding:8px 14px;border:1px solid #374151;color:#e5e7eb;font-size:16px">gets you ${pack.credits.toLocaleString("en-US")} credits</td></tr>`,
).join("")}
</table>
${after.map(p).join("")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px"><tr><td style="background:#2563eb;border-radius:10px"><a href="${link}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">See your balance, buy a pack, grab your referral link</a></td></tr></table>
<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#e5e7eb">Or open <a href="${link}" style="color:#93c5fd">TheLeadFlowPro.com${TLFP_CREDITS.path}</a> on any device.</p>
${closing.map(p).join("")}
<p style="margin:26px 0 0;font-size:12px;line-height:1.5;color:#6b7280">You are getting this because you asked us about a website, a build, or a workshop. <a href="${unsubscribeUrl}" style="color:#9ca3af">Unsubscribe</a>.</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    ...paragraphs,
    packs.join("\n"),
    ...after,
    `See your balance, buy a pack, or grab your referral link here:\n${link}`,
    ...closing,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n\n");

  return { subject: TLFP_ANNOUNCE.subject, html, text };
}
