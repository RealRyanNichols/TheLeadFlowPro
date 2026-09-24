// The HTML layer for the thirty day follow-up sequences.
//
// lib/nurture.ts and lib/nurtureRentReceipt.ts own the words. This file owns
// how they look in an inbox:
// a picture, the copy, one orange button, a free tool the reader can use
// today, the text and call buttons, and the footer with a one click
// unsubscribe. The plain text version still goes out beside it, so a client
// that strips HTML gets the same email it always got.
//
// RULES: every price, phone number, and email address is read from lib/site
// or lib/septemberSpecial, never typed here. No dashes of any kind in copy.
// No promise of leads, sales, revenue, cost per lead, or a Google position.
// Images are self hosted on the site: no third party hosts.

import { ENDS_AT as SPECIAL_ENDS_AT, STARTS_AT as SPECIAL_STARTS_AT } from "@/lib/septemberSpecial";
import { NURTURE_CAMPAIGN, nurtureLink, nurtureSubjectFor, type NurtureStep } from "@/lib/nurture";
import type { NurtureContext } from "@/lib/nurtureContext";
import { RENT_RECEIPT_CAMPAIGN, RENT_RECEIPT_FIRST_STEP } from "@/lib/nurtureRentReceipt";
import { BUSINESS } from "@/lib/site/business";
import { bookingPage } from "@/lib/site/external-links";
import { PRICES, usd } from "@/lib/site/prices";

const SITE = BUSINESS.siteUrl;
const BRAND_MARK = `${SITE}/images/leadflow-pro-app-icon-192.png`;

/** A free calculator or generator on /tools, offered inside an email. */
export type NurtureTool = {
  slug: string;
  title: string;
  blurb: string;
  label?: string;
};

/** What each step carries beside its words. Keyed by lead_emails.step. */
export type NurtureStepMedia = {
  /** Path under the site's public folder, or absolute. Rendered 600px wide. */
  hero?: string;
  heroAlt?: string;
  /** The label on the orange button. The link is the step's own link. */
  cta: string;
  /**
   * The label when the step's own link is the booking page (a hot lead in
   * the Rent Receipt series, or a door day). Falls back to a plain call label.
   */
  ctaHot?: string;
  /** Where the button goes. Defaults to the step's own nurture link. */
  ctaHref?: string;
  tool?: NurtureTool;
};

const TOOLS = {
  missedCall: {
    slug: "missed-call-calculator",
    title: "Missed call calculator",
    blurb: "Put in your average job and how many calls you miss a week. It shows what walks out the door every month.",
    label: "Run the missed call math",
  },
  responseTime: {
    slug: "lead-response-time",
    title: "Lead response time scorecard",
    blurb: "Grade how fast a new lead hears back from you today, and what the five minute window is worth.",
    label: "Score my response time",
  },
  textback: {
    slug: "missed-call-textback-script",
    title: "Missed call text back script",
    blurb: "Writes the one message to save on your phone so answering a missed call is a tap, not a decision.",
    label: "Write my text back",
  },
  rentReceipt: {
    slug: "rent-receipt",
    title: "The rent receipt",
    blurb: "Add up every monthly tool you pay for and see what you actually own at the end of the year.",
    label: "Add up my rent",
  },
  websiteGrader: {
    slug: "website-grader",
    title: "Website grader",
    blurb: "Paste your address. It checks the things that decide whether a site brings you a customer or sits there.",
    label: "Grade my website",
  },
  quoteFollowUp: {
    slug: "quote-follow-up-calculator",
    title: "Quote follow up calculator",
    blurb: "How many quotes go out, how many get a second touch, and what the gap is costing you.",
    label: "Run my quote math",
  },
  googleProfile: {
    slug: "google-business-profile-scorecard",
    title: "Google Business Profile scorecard",
    blurb: "Ten checks on the listing people see before they ever reach your website.",
    label: "Score my profile",
  },
  reviewLink: {
    slug: "google-review-link",
    title: "Google review link maker",
    blurb: "Builds the one link that opens the review box directly, so asking takes one text.",
    label: "Make my review link",
  },
  reviewScript: {
    slug: "review-request-script",
    title: "Review request script",
    blurb: "The words to send after a finished job that get a real review instead of a promise.",
    label: "Write my review ask",
  },
  afterHours: {
    slug: "after-hours-lead-calculator",
    title: "After hours lead calculator",
    blurb: "How many people reach out when you are closed, and what happens to them right now.",
    label: "See my after hours math",
  },
  adBudget: {
    slug: "ad-budget-planner",
    title: "Ad budget planner",
    blurb: "Start from the jobs you want, not from a number somebody pulled out of the air.",
    label: "Plan my ad budget",
  },
  formFriction: {
    slug: "form-friction-calculator",
    title: "Form friction calculator",
    blurb: "Every extra field on your form costs you people. See how many.",
    label: "Check my form",
  },
  leadValue: {
    slug: "lead-value-calculator",
    title: "Lead value calculator",
    blurb: "What one lead is worth to your business once you know your close rate and your average job.",
    label: "Value one lead",
  },
  subscriptionAudit: {
    slug: "subscription-audit",
    title: "Subscription audit",
    blurb: "List what renews every month. Most owners find at least one thing they forgot they pay for.",
    label: "Audit my subscriptions",
  },
  noShow: {
    slug: "no-show-calculator",
    title: "No show calculator",
    blurb: "Missed appointments have a price. This puts a number on it and on the reminder that fixes it.",
    label: "Run my no show math",
  },
  voicemail: {
    slug: "voicemail-script-generator",
    title: "Voicemail script",
    blurb: "A greeting that tells a caller exactly what happens next instead of losing them to the next name.",
    label: "Write my voicemail",
  },
} satisfies Record<string, NurtureTool>;

const IMG = {
  freeBuild: "/images/page-art/free-build-website-inquiries.webp",
  connected: "/images/homepage-v2/connected-company-hero.webp",
  loop: "/images/homepage-v2/company-operating-loop.webp",
  cockpit: "/images/homepage-v2/proof-cockpit.webp",
  reminder: "/images/visual-system/automate-the-reminder.webp",
  oneRecord: "/images/visual-system/one-customer-one-record.webp",
  traceSale: "/images/visual-system/trace-the-sale.webp",
  quoteFollowUp: "/images/services/quote-follow-up-light.webp",
  customerRecord: "/images/services/customer-record-light.webp",
  tools: "/images/page-art/tools-library.png",
  contact: "/images/page-art/contact.png",
  approvalPath: "/images/offer-v2/website-launch-approval-path.webp",
  premierSystem: "/images/social/premier-system-20260907.jpg",
  premierStudents: "/images/premier/premier-students.jpg",
  premierClassroom: "/images/premier/premier-classroom.jpg",
  mall: "/proof/mall-walk-poster.jpg",
  ryan: "/images/ryan-meta-raybans-production-clean.jpg",
  coffee: "/images/page-art/coffee-demo.png",
  proKits: "/images/page-art/pro-kits.png",
  olguy: "/images/proof/olguyfarms-og.jpg",
} as const;

/**
 * One entry per step 101 to 130. A step without an entry still renders: it
 * gets the default button and no picture. Keep every alt text honest about
 * what the picture is.
 */
export const NURTURE_STEP_MEDIA: Record<number, NurtureStepMedia> = {
  101: { hero: IMG.freeBuild, heroAlt: "A five page business website on a laptop, tablet, and phone", cta: "See the whole offer", tool: TOOLS.rentReceipt },
  102: { hero: IMG.approvalPath, heroAlt: "The approval path a build goes through before it launches", cta: "Read the scope", tool: TOOLS.websiteGrader },
  103: { hero: IMG.oneRecord, heroAlt: "One customer, one record: every call, text, and form in one place", cta: "See what a working site does", tool: TOOLS.websiteGrader },
  104: { hero: IMG.reminder, heroAlt: "Automate the reminder, keep the owner", cta: "See the follow up pack", tool: TOOLS.textback },
  105: { hero: IMG.connected, heroAlt: "A connected company: website, phone, email, and records in one system", cta: "Own your platform", tool: TOOLS.rentReceipt },
  106: { hero: IMG.loop, heroAlt: "The operating loop: post, click, form, customer, sale", cta: "See the engine, itemized", tool: TOOLS.adBudget },
  107: { hero: IMG.contact, heroAlt: "An open envelope, a phone, and a notebook", cta: "Answer the one question", tool: TOOLS.missedCall },
  108: { hero: IMG.customerRecord, heroAlt: "A laptop with the call, email, and calendar that belong to one customer", cta: "Plug the missed call hole", tool: TOOLS.textback },
  109: { hero: IMG.ryan, heroAlt: "Ryan Nichols", cta: "See what I do promise", tool: TOOLS.leadValue },
  110: { hero: IMG.premierSystem, heroAlt: "Premier Dental Academy of Longview: a school, a team, a connected system", cta: "Inspect the proof", ctaHref: nurtureLink(10, "/portfolio"), tool: TOOLS.googleProfile },
  111: { hero: IMG.cockpit, heroAlt: "Glass panels showing the parts of a business system", cta: "Bring your site to the call", ctaHref: nurtureLink(11, "/book"), tool: TOOLS.websiteGrader },
  112: { hero: IMG.mall, heroAlt: "A still from the Longview Mall walk video", cta: "Somewhere good to put them", tool: TOOLS.googleProfile },
  113: { hero: IMG.quoteFollowUp, heroAlt: "A clipboard, a calendar, and a phone tied together", cta: "See where leads land", tool: TOOLS.formFriction },
  114: { hero: IMG.traceSale, heroAlt: "Can you trace the sale? Post, click, form, customer, sale", cta: "Fix the back first", tool: TOOLS.quoteFollowUp },
  115: { hero: IMG.coffee, heroAlt: "A coffee shop with its website and phone in front of it", cta: "Walk your three answers with me", ctaHref: nurtureLink(15, "/book"), tool: TOOLS.responseTime },
  116: { hero: IMG.traceSale, heroAlt: "Tracing a sale from the post to the customer", cta: "See tracking done right", tool: TOOLS.adBudget },
  117: { hero: IMG.olguy, heroAlt: "O-L Guy Farms: one East Texas family behind the work", cta: "See a small business that did it", tool: TOOLS.leadValue },
  118: { hero: IMG.reminder, heroAlt: "Automate the reminder, keep the owner", cta: "See the follow up, explained", tool: TOOLS.quoteFollowUp },
  119: { hero: IMG.premierClassroom, heroAlt: "Two Premier Dental Academy students in the classroom", cta: "Make the ask", tool: TOOLS.reviewScript },
  120: { hero: IMG.connected, heroAlt: "A connected company you own", cta: "See what you keep", tool: TOOLS.subscriptionAudit },
  121: { hero: IMG.loop, heroAlt: "The operating loop", cta: "Three weeks in, one move", tool: TOOLS.afterHours },
  122: { hero: IMG.customerRecord, heroAlt: "A customer record with the call, email, and calendar attached", cta: "See the first optional service", tool: TOOLS.missedCall },
  123: { hero: IMG.approvalPath, heroAlt: "The build path from intake to launch", cta: "See the ten days", tool: TOOLS.websiteGrader },
  124: { hero: IMG.contact, heroAlt: "An inbox, a phone, and a notebook", cta: "Get out of the Sunday inbox", tool: TOOLS.afterHours },
  125: { hero: IMG.premierStudents, heroAlt: "Premier Dental Academy of Longview students outside the school", cta: "See posting done for you", tool: TOOLS.googleProfile },
  126: { hero: IMG.cockpit, heroAlt: "The parts of a business system, under glass", cta: "Change the next year", tool: TOOLS.rentReceipt },
  127: { hero: IMG.ryan, heroAlt: "Ryan Nichols", cta: "Book the twenty minutes", ctaHref: nurtureLink(27, "/book"), tool: TOOLS.responseTime },
  128: { hero: IMG.oneRecord, heroAlt: "One customer, one record", cta: "See if this is for you", tool: TOOLS.noShow },
  129: { hero: IMG.freeBuild, heroAlt: "A five page business website on three screens", cta: "Apply for one of the ten", tool: TOOLS.voicemail },
  130: { hero: IMG.mall, heroAlt: "A still from the Longview Mall walk video", cta: "The door is open", tool: TOOLS.reviewLink },

  // The Rent Receipt series, steps 501 to 530 (lib/nurtureRentReceipt.ts).
  // Days 1 to 5 branch on the pain in the words, so their pictures and labels
  // stay pain neutral. The tool card never repeats the link the words carry.
  501: { hero: IMG.contact, heroAlt: "An open envelope, a phone, and a notebook", cta: "Run the two minute check", ctaHot: "Pick a time, I call you", tool: TOOLS.responseTime },
  502: { hero: IMG.oneRecord, heroAlt: "One customer, one record: every call, text, and form in one place", cta: "Open the free tool", ctaHot: "Grab a slot", tool: TOOLS.subscriptionAudit },
  503: { hero: IMG.connected, heroAlt: "A connected company: website, phone, email, and records in one system", cta: "See the system running", ctaHot: "Book the twenty minutes", tool: TOOLS.formFriction },
  504: { hero: IMG.reminder, heroAlt: "Automate the reminder, keep the owner", cta: "Put a number on it", ctaHot: "Pick a time, I call you", tool: TOOLS.voicemail },
  505: { hero: IMG.ryan, heroAlt: "Ryan Nichols", cta: "Take the next step", ctaHot: "Grab a slot", tool: TOOLS.leadValue },
  506: { hero: IMG.premierSystem, heroAlt: "Premier Dental Academy of Longview: a school, a team, a connected system", cta: "See the work", ctaHot: "Book the twenty minutes", tool: TOOLS.googleProfile },
  507: { hero: IMG.contact, heroAlt: "An open envelope, a phone, and a notebook", cta: "Pick a time, I call you", ctaHot: "Pick a time, I call you", tool: TOOLS.rentReceipt },
  508: { hero: IMG.tools, heroAlt: "The free tools library on TheLeadFlowPro.com", cta: "Add up my rent", ctaHot: "Grab a slot", tool: TOOLS.subscriptionAudit },
  509: { hero: IMG.cockpit, heroAlt: "Glass panels showing the parts of a business system", cta: "See mine running", ctaHot: "Book the twenty minutes", tool: TOOLS.websiteGrader },
  510: { hero: IMG.loop, heroAlt: "The operating loop: post, click, form, customer, sale", cta: "Open the Scoreboard", ctaHot: "Pick a time, I call you", tool: TOOLS.leadValue },
  511: { hero: IMG.ryan, heroAlt: "Ryan Nichols", cta: "Pick a time, I call you", ctaHot: "Pick a time, I call you", tool: TOOLS.responseTime },
  512: { hero: IMG.coffee, heroAlt: "A coffee shop with its website and phone in front of it", cta: "Who is on the other end", ctaHot: "Grab a slot", tool: TOOLS.missedCall },
  513: { hero: IMG.premierStudents, heroAlt: "Premier Dental Academy of Longview students outside the school", cta: "Make my review link", ctaHot: "Book the twenty minutes", tool: TOOLS.reviewScript },
  514: { hero: IMG.traceSale, heroAlt: "Can you trace the sale? Post, click, form, customer, sale", cta: "See the after hours math", ctaHot: "Pick a time, I call you", tool: TOOLS.voicemail },
  515: { hero: IMG.contact, heroAlt: "An open envelope, a phone, and a notebook", cta: "Pick a time, I call you", ctaHot: "Pick a time, I call you", tool: TOOLS.quoteFollowUp },
  516: { hero: IMG.traceSale, heroAlt: "Tracing a sale from the post to the customer", cta: "Grade my website", ctaHot: "Grab a slot", tool: TOOLS.adBudget },
  517: { hero: IMG.olguy, heroAlt: "O-L Guy Farms: one East Texas family behind the work", cta: "Open the free courses", ctaHot: "Book the twenty minutes", tool: TOOLS.formFriction },
  518: { hero: IMG.customerRecord, heroAlt: "A laptop with the call, email, and calendar that belong to one customer", cta: "Make my review link", ctaHot: "Pick a time, I call you", tool: TOOLS.googleProfile },
  519: { hero: IMG.connected, heroAlt: "A connected company you own", cta: "See the stack live", ctaHot: "Grab a slot", tool: TOOLS.subscriptionAudit },
  520: { hero: IMG.customerRecord, heroAlt: "A customer record with the call, email, and calendar attached", cta: "Open the free courses", ctaHot: "Book the twenty minutes", tool: TOOLS.textback },
  521: { hero: IMG.loop, heroAlt: "The operating loop", cta: "See the System Map", ctaHot: "Pick a time, I call you", tool: TOOLS.afterHours },
  522: { hero: IMG.approvalPath, heroAlt: "The build path from intake to launch", cta: "See every price", ctaHot: "Grab a slot", tool: TOOLS.rentReceipt },
  523: { hero: IMG.mall, heroAlt: "A still from the Longview Mall walk video", cta: "Open the free tools", ctaHot: "Book the twenty minutes", tool: TOOLS.googleProfile },
  524: { hero: IMG.premierStudents, heroAlt: "Premier Dental Academy of Longview students outside the school", cta: "Open the free courses", ctaHot: "Pick a time, I call you", tool: TOOLS.reviewScript },
  525: { hero: IMG.cockpit, heroAlt: "The parts of a business system, under glass", cta: "Open the Scoreboard", ctaHot: "Grab a slot", tool: TOOLS.leadValue },
  526: { hero: IMG.reminder, heroAlt: "Automate the reminder, keep the owner", cta: "Score my response time", ctaHot: "Book the twenty minutes", tool: TOOLS.textback },
  527: { hero: IMG.oneRecord, heroAlt: "One customer, one record", cta: "See the finished ones", ctaHot: "Pick a time, I call you", tool: TOOLS.noShow },
  528: { hero: IMG.tools, heroAlt: "The free tools library on TheLeadFlowPro.com", cta: "Open the academy", ctaHot: "Grab a slot", tool: TOOLS.websiteGrader },
  529: { hero: IMG.ryan, heroAlt: "Ryan Nichols", cta: "Pick a time, I call you", ctaHot: "Pick a time, I call you", tool: TOOLS.rentReceipt },
  530: { hero: IMG.mall, heroAlt: "A still from the Longview Mall walk video", cta: "Pick a time, I call you", ctaHot: "Pick a time, I call you", tool: TOOLS.missedCall },
};

/** The special is on the calendar. Show its banner only while it is open. */
export function septemberSpecialOpen(now = Date.now()): boolean {
  return now >= Date.parse(SPECIAL_STARTS_AT) && now < Date.parse(SPECIAL_ENDS_AT);
}

function centralClock(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS.timezone }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: BUSINESS.timezone }).format(d).replace(":00", "");
  return `${day} at ${time} Central`;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absolute(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${SITE}${path}`;
}

function stripLeadingEmoji(subject: string): string {
  return subject.replace(/^[^\p{L}\p{N}"']+/u, "").trim();
}

const URL_LINE = /^https?:\/\/\S+$/;

/**
 * Splits the plain body into paragraphs and pulls out any line that is only a
 * URL. Those lines were the old call to action; in HTML the button carries it.
 */
export function splitNurtureBody(text: string): { paragraphs: string[]; links: string[] } {
  const paragraphs: string[] = [];
  const links: string[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    const kept: string[] = [];
    for (const line of lines) {
      if (URL_LINE.test(line.trim())) links.push(line.trim());
      else kept.push(line);
    }
    const para = kept.join("\n").trim();
    if (para) paragraphs.push(para);
  }
  return { paragraphs, links };
}

function button(href: string, label: string, tone: "primary" | "ghost" = "primary"): string {
  const bg = tone === "primary" ? "#ff9e18" : "#ffffff";
  const color = tone === "primary" ? "#11121b" : "#20212b";
  const border = tone === "primary" ? "#e99736" : "#d9d0c2";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td align="center" bgcolor="${bg}" style="border-radius:12px;border:1.5px solid ${border};">
<a href="${esc(href)}" style="display:inline-block;padding:15px 24px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${color};text-decoration:none;border-radius:12px;">${esc(label)}</a>
</td></tr></table>`;
}

function paragraphHtml(para: string): string {
  // Single newlines inside a paragraph are deliberate line breaks in Ryan's
  // copy ("One. ... Two. ..."), so keep them.
  const html = para
    .split("\n")
    .map((line) => esc(line))
    .join("<br>");
  return `<p style="margin:0 0 16px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:17px;line-height:1.6;color:#20212b;">${html}</p>`;
}

export type RenderNurtureInput = {
  step: NurtureStep;
  firstName: string;
  unsubUrl: string;
  /** The form answers (lib/nurtureContext.ts). The Rent Receipt steps render from it; Free Build ignores it. */
  context?: NurtureContext;
  now?: number;
};

/** Which campaign a step belongs to, for the links this file adds itself. */
export function campaignForStep(step: NurtureStep): string {
  return step.step >= RENT_RECEIPT_FIRST_STEP ? RENT_RECEIPT_CAMPAIGN : NURTURE_CAMPAIGN;
}

/**
 * The email. 600px, table based, inline styles, one primary button, one
 * tool card, text and call buttons, and the footer. The subject doubles as
 * the headline so the inbox line and the first line agree.
 */
export function renderNurtureHtml({ step, firstName, unsubUrl, context, now = Date.now() }: RenderNurtureInput): string {
  const media = NURTURE_STEP_MEDIA[step.step] ?? { cta: "See it" };
  const campaign = campaignForStep(step);
  const body = step.body(firstName, context);
  const { paragraphs, links } = splitNurtureBody(body);
  const ctaHref = media.ctaHref ?? links[0] ?? nurtureLink(step.day);
  // When the words close on the booking page, the button says so.
  const booking = bookingPage();
  const ctaLabel = booking && ctaHref.startsWith(booking) ? (media.ctaHot ?? "Pick a time, I call you") : media.cta;
  const headline = stripLeadingEmoji(nurtureSubjectFor(step, context));
  const preheader = paragraphs.find((p) => !/^\S+,$/.test(p.trim()))?.split("\n")[0]?.slice(0, 120) ?? headline;
  const specialOpen = septemberSpecialOpen(now);
  const specialHref = `${SITE}/september-special?utm_source=email&utm_medium=nurture&utm_campaign=${campaign}&utm_content=day${step.day}_special`;
  const toolHref = media.tool
    ? `${SITE}/tools/${media.tool.slug}?utm_source=email&utm_medium=nurture&utm_campaign=${campaign}&utm_content=day${step.day}_tool`
    : null;

  const hero = media.hero
    ? `<tr><td style="padding:0;"><img src="${esc(absolute(media.hero))}" alt="${esc(media.heroAlt ?? "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`
    : "";

  const specialBanner = specialOpen
    ? `<tr><td style="padding:0 28px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td style="background:#fff3df;border:1px solid #ffbb5e;border-radius:14px;padding:16px 18px;">
<p style="margin:0 0 6px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#b35c00;">This week only. Five businesses.</p>
<p style="margin:0 0 12px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#20212b;">The whole first month, done for you, for <strong>${esc(usd(PRICES.septemberSpecialTotal))} one time</strong>: on site video, your ad with ${esc(usd(PRICES.septemberSpecialAds))} of ad spend inside the price, 100 Facebook posts, the website, and the thirty day follow up. Closes ${esc(centralClock(SPECIAL_ENDS_AT))}, or when the fifth business takes it.</p>
${button(specialHref, "See the September special")}
</td></tr></table></td></tr>`
    : "";

  const toolCard = media.tool && toolHref
    ? `<tr><td style="padding:8px 28px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td style="background:#f1eefb;border:1px solid #d9d0f5;border-radius:14px;padding:16px 18px;">
<p style="margin:0 0 4px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#5135e5;">Free tool. Use it today.</p>
<p style="margin:0 0 4px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:17px;font-weight:800;color:#20212b;">${esc(media.tool.title)}</p>
<p style="margin:0 0 12px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.5;color:#34313f;">${esc(media.tool.blurb)}</p>
${button(toolHref, media.tool.label ?? "Open the tool", "ghost")}
</td></tr></table></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f3efe8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3efe8;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3efe8;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e9e1d4;">
<tr><td style="padding:20px 28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;">
<img src="${esc(BRAND_MARK)}" alt="" width="36" height="36" style="display:inline-block;vertical-align:middle;border-radius:9px;border:0;">
<span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#5135e5;">The LeadFlow Pro</span>
</td>
<td align="right" style="vertical-align:middle;font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:#625f6d;white-space:nowrap;">Day ${step.day} of 30</td>
</tr></table>
</td></tr>
${hero}
<tr><td style="padding:24px 28px 6px;">
<h1 style="margin:0 0 16px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:26px;line-height:1.2;letter-spacing:-0.02em;color:#20212b;">${esc(headline)}</h1>
${paragraphs.map(paragraphHtml).join("\n")}
<div style="height:6px;line-height:6px;">&nbsp;</div>
${button(ctaHref, ctaLabel)}
</td></tr>
${specialBanner}
${toolCard}
<tr><td style="padding:14px 28px 6px;">
<p style="margin:0 0 10px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#34313f;">Rather talk than read? I answer my own phone. No pitch, no catch.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:10px;">${button(BUSINESS.phone.sms, `Text ${BUSINESS.phone.display}`, "ghost")}</td>
<td>${button(BUSINESS.phone.tel, "Call Ryan", "ghost")}</td>
</tr></table>
</td></tr>
<tr><td style="padding:22px 28px 26px;">
<p style="margin:0;font-family:Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#20212b;">Ryan Nichols<br><span style="color:#625f6d;">${esc(BUSINESS.name)}, ${esc(BUSINESS.city)}, Texas</span></p>
</td></tr>
<tr><td style="padding:18px 28px 24px;background:#f6f2ea;border-top:1px solid #ebe4d8;">
<p style="margin:0 0 8px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#625f6d;">You are getting this because you asked me to send you business emails. One a day for thirty days, then it stops on its own. No texts unless you text first.</p>
<p style="margin:0 0 8px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#625f6d;"><a href="${esc(unsubUrl)}" style="color:#5135e5;text-decoration:underline;">Stop these emails</a>. One click, no login.</p>
<p style="margin:0;font-family:Inter,Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#8a8598;">${esc(BUSINESS.dbaLine)}. ${esc(BUSINESS.address.street)}, ${esc(BUSINESS.address.city)}, ${esc(BUSINESS.address.region)} ${esc(BUSINESS.address.postalCode)}. Nothing in this email is a promise of leads, sales, or revenue.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
