// The designed version of the contractor owner series (lib/contractorSeries.ts).
//
// Built for the inbox, not the browser: tables, inline styles, a <style>
// block only for phones and fonts, no background images, no CSS a mail client
// drops on the floor. Every button is a real link in a real table cell, so
// Outlook shows it and Resend can count the click.
//
// LOOK: a dark header and hero, a white reading card, a dark "your next move"
// panel with one blue button, then the free tool, the open loop for the next
// email, Ryan's signature and the footer with the one click unsubscribe.
//
// RULES: words come from lib/contractorSeries.ts. Phone, address and names
// come from lib/site/business.ts. No dashes in copy. Images are self hosted on
// the site. Nothing here promises leads, sales or revenue.

import { BUSINESS } from "@/lib/site/business";
import {
  CONTRACTOR_SIGNATURE_PHOTO,
  contractorSubject,
  contractorToolLink,
  type ContractorBlock,
  type ContractorEmail,
} from "@/lib/contractorSeries";

const SITE = BUSINESS.siteUrl;
/** The official LF mark (public/images/brand/leadflow-logo.png) on a white tile. Never the old app icon. */
const BRAND_MARK = `${SITE}/images/email/leadflow-logo-tile.png`;

const FONT = "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif";
const C = {
  page: "#e8edf4",
  night: "#07101f",
  navy: "#0b1730",
  ink: "#0b1220",
  body: "#2a3344",
  muted: "#5b6577",
  faint: "#8a94a6",
  line: "#e3e9f2",
  blue: "#2563eb",
  blueDeep: "#1d4ed8",
  blueSoft: "#eef4ff",
  sky: "#93c5fd",
  green: "#16a34a",
};

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function absolute(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${SITE}${path}`;
}

function lines(text: string): string {
  return text.split("\n").map(esc).join("<br>");
}

/** A button Outlook cannot break: a bgcolor cell around a padded link. */
function button(href: string, label: string, opts: { tone?: "blue" | "outline"; full?: boolean } = {}): string {
  const tone = opts.tone ?? "blue";
  const bg = tone === "blue" ? C.blue : "transparent";
  const border = tone === "blue" ? C.blueDeep : "rgba(191,219,254,0.55)";
  const color = tone === "blue" ? "#ffffff" : "#e6eeff";
  const width = opts.full ? ' width="100%"' : "";
  return `<table role="presentation"${width} cellpadding="0" cellspacing="0" border="0" class="btn" style="border-collapse:separate;"><tr>
<td align="center" bgcolor="${tone === "blue" ? C.blue : C.navy}" style="border-radius:12px;background:${bg};border:1.5px solid ${border};">
<a href="${esc(href)}" target="_blank" style="display:inline-block;padding:16px 26px;font-family:${FONT};font-size:16px;font-weight:800;line-height:1.1;letter-spacing:0.01em;color:${color};text-decoration:none;border-radius:12px;">${esc(label)}&nbsp;&rarr;</a>
</td></tr></table>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 18px;font-family:${FONT};font-size:17px;line-height:1.65;color:${C.body};">${lines(text)}</p>`;
}

function callout(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;border-collapse:separate;"><tr>
<td width="5" bgcolor="${C.blue}" style="background:${C.blue};border-radius:4px;font-size:0;line-height:0;">&nbsp;</td>
<td style="padding:16px 20px;background:${C.blueSoft};border-radius:0 14px 14px 0;font-family:${FONT};font-size:18px;line-height:1.5;font-weight:800;color:${C.ink};">${lines(text)}</td>
</tr></table>`;
}

function quote(text: string, who: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;border-collapse:separate;"><tr>
<td bgcolor="${C.navy}" style="background:${C.navy};border-radius:18px;padding:26px 28px 24px;">
<p style="margin:0;height:34px;font-family:Georgia,'Times New Roman',serif;font-size:60px;line-height:60px;color:#3b82f6;mso-line-height-rule:exactly;">&ldquo;</p>
<p style="margin:0 0 16px;font-family:${FONT};font-size:21px;line-height:1.45;font-weight:700;color:#ffffff;">${lines(text)}</p>
<p style="margin:0;font-family:${FONT};font-size:12.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${C.sky};">${esc(who)}</p>
</td></tr></table>`;
}

function stats(items: { value: string; label: string }[], note: string): string {
  const width = Math.floor(100 / items.length);
  const cells = items
    .map(
      (s, i) => `<td class="stat" width="${width}%" valign="top" style="padding:0 ${i < items.length - 1 ? "10px" : "0"} 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
<td style="background:#f5f8fe;border:1px solid #dbe5f7;border-radius:16px;padding:18px 16px 16px;">
<p style="margin:0 0 6px;font-family:${FONT};font-size:32px;line-height:1;font-weight:900;letter-spacing:-0.02em;color:${C.blueDeep};">${esc(s.value)}</p>
<p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.45;font-weight:600;color:${C.muted};">${esc(s.label)}</p>
</td></tr></table></td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 10px;"><tr>${cells}</tr></table>
<p style="margin:0 0 22px;font-family:${FONT};font-size:12px;line-height:1.55;color:${C.faint};">${esc(note)}</p>`;
}

function badge(content: string, bg: string, color = "#ffffff"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="30" height="30" align="center" valign="middle" bgcolor="${bg}" style="width:30px;height:30px;border-radius:15px;background:${bg};font-family:${FONT};font-size:14px;font-weight:900;line-height:30px;color:${color};">${content}</td></tr></table>`;
}

function steps(items: { title: string; text?: string }[], title?: string): string {
  const rows = items
    .map(
      (item, i) => `<tr>
<td width="44" valign="top" style="padding:0 0 16px;">${badge(String(i + 1), C.blue)}</td>
<td valign="top" style="padding:3px 0 16px;font-family:${FONT};">
<p style="margin:0;font-size:17px;line-height:1.4;font-weight:800;color:${C.ink};">${esc(item.title)}</p>
${item.text ? `<p style="margin:3px 0 0;font-size:15.5px;line-height:1.55;color:${C.muted};">${esc(item.text)}</p>` : ""}
</td></tr>`,
    )
    .join("");
  const heading = title
    ? `<p style="margin:0 0 14px;font-family:${FONT};font-size:12.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${C.blue};">${esc(title)}</p>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 14px;border-collapse:separate;"><tr><td style="border:1px solid ${C.line};border-radius:18px;padding:22px 22px 8px;">
${heading}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr></table>`;
}

function checks(title: string, tone: "yes" | "no", items: string[]): string {
  const yes = tone === "yes";
  const rows = items
    .map(
      (item) => `<tr>
<td width="42" valign="top" style="padding:0 0 12px;">${badge(yes ? "&#10003;" : "&#10005;", yes ? C.green : "#cbd5e1", yes ? "#ffffff" : "#475569")}</td>
<td valign="top" style="padding:4px 0 12px;font-family:${FONT};font-size:16px;line-height:1.5;font-weight:${yes ? 700 : 600};color:${yes ? C.ink : C.muted};">${esc(item)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 14px;border-collapse:separate;"><tr><td style="background:${yes ? "#f3fbf6" : "#f6f7f9"};border:1px solid ${yes ? "#cdebd8" : C.line};border-radius:18px;padding:20px 22px 8px;">
<p style="margin:0 0 14px;font-family:${FONT};font-size:12.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${yes ? C.green : C.muted};">${esc(title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr></table>`;
}

function block(b: ContractorBlock): string {
  switch (b.kind) {
    case "p":
      return para(b.text);
    case "callout":
      return callout(b.text);
    case "quote":
      return quote(b.text, b.who);
    case "stats":
      return stats(b.items, b.note);
    case "steps":
      return steps(b.items, b.title);
    case "checks":
      return checks(b.title, b.tone, b.items);
  }
}

export type RenderContractorInput = {
  email: ContractorEmail;
  firstName: string;
  /** One click unsubscribe. The cron and the welcome both pass one. */
  unsubUrl?: string | null;
  /** Override the image host, for previews only. */
  assetBase?: string;
};

/** The whole email, ready for Resend's html field. */
export function renderContractorHtml({ email, firstName, unsubUrl, assetBase }: RenderContractorInput): string {
  const img = (path: string) => (assetBase ? `${assetBase}${path.split("/").pop()}` : absolute(path));
  const subject = contractorSubject(email, firstName);
  const dayLabel = email.day === 0 ? "Welcome" : `Day ${email.day}`;
  const toolHref = email.tool ? contractorToolLink(email.day, email.tool.slug) : null;
  const brandMark = assetBase ? `${assetBase}leadflow-logo-tile.png` : BRAND_MARK;
  const heroTag = `<img src="${esc(img(email.hero.src))}" alt="${esc(email.hero.alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;">`;
  const heroImg = email.hero.href
    ? `<a href="${esc(email.hero.href)}" target="_blank" style="display:block;text-decoration:none;">${heroTag}</a>`
    : heroTag;

  const toolCard =
    email.tool && toolHref
      ? `<tr><td class="px" style="padding:6px 40px 6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td style="background:${C.blueSoft};border:1px solid #d6e4ff;border-radius:18px;padding:20px 22px;">
<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${C.blue};">Free tool. Use it today.</p>
<p style="margin:0 0 6px;font-family:${FONT};font-size:18px;font-weight:800;color:${C.ink};">${esc(email.tool.title)}</p>
<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.muted};">${esc(email.tool.blurb)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td bgcolor="#ffffff" style="border-radius:12px;background:#ffffff;border:1.5px solid #bcd2fb;">
<a href="${esc(toolHref)}" target="_blank" style="display:inline-block;padding:13px 20px;font-family:${FONT};font-size:14.5px;font-weight:800;color:${C.blueDeep};text-decoration:none;">${esc(email.tool.label)}&nbsp;&rarr;</a>
</td></tr></table>
</td></tr></table>
</td></tr>`
      : "";

  const next = email.next
    ? `<tr><td class="px" style="padding:10px 40px 6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td style="border:1.5px dashed #c9d6ea;border-radius:16px;padding:16px 20px;">
<p style="margin:0 0 4px;font-family:${FONT};font-size:11.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${C.faint};">Coming up</p>
<p style="margin:0;font-family:${FONT};font-size:15.5px;line-height:1.5;font-weight:700;color:${C.ink};">${esc(email.next)}</p>
</td></tr></table>
</td></tr>`
    : "";

  const why =
    email.day === 0
      ? "You are getting this because you applied for a strategy session through our ad on Facebook or Instagram."
      : "You are getting this because you applied for a strategy session through our ad on Facebook or Instagram. Daily for the first month, then every few days, and it stops on its own after six months.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;}
img{border:0;outline:none;text-decoration:none;}
a{color:${C.blue};}
@media only screen and (max-width:620px){
  .shell{width:100%!important;border-radius:0!important;}
  .px{padding-left:22px!important;padding-right:22px!important;}
  .h1{font-size:27px!important;line-height:1.18!important;}
  .stat{display:block!important;width:100%!important;padding:0 0 10px 0!important;}
  .btn,.btn tbody,.btn tr,.btn td,.btn a{display:block!important;width:100%!important;text-align:center!important;box-sizing:border-box!important;}
  .hide-sm{display:none!important;}
  .stack-wrap{width:100%!important;}
  .stack{display:block!important;width:100%!important;padding:0 0 10px 0!important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;color:${C.page};">${esc(email.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td align="center" style="padding:26px 10px 34px;">
<table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dde4ee;">

<tr><td bgcolor="${C.night}" style="background:${C.night};padding:18px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle"><img src="${esc(brandMark)}" alt="The LeadFlow Pro" width="40" height="40" style="display:inline-block;vertical-align:middle;width:40px;height:40px;border-radius:10px;border:0;"><span style="display:inline-block;vertical-align:middle;margin-left:11px;font-family:${FONT};font-size:12.5px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#cfe0ff;">The LeadFlow Pro</span></td>
<td align="right" valign="middle" style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.08em;color:#7d93b8;white-space:nowrap;"><span class="hide-sm">Contractor series &middot; </span>${esc(dayLabel)}</td>
</tr></table>
</td></tr>

<tr><td bgcolor="${C.night}" style="background:${C.night};padding:0;line-height:0;font-size:0;">
${heroImg}
</td></tr>
<tr><td height="4" bgcolor="${C.blue}" style="height:4px;background:${C.blue};background-image:linear-gradient(90deg,${C.blueDeep},#60a5fa,${C.blueDeep});font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td class="px" style="padding:36px 40px 8px;">
<p style="margin:0 0 12px;font-family:${FONT};font-size:12.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${C.blue};">${esc(email.kicker)}</p>
<h1 class="h1" style="margin:0 0 22px;font-family:${FONT};font-size:31px;line-height:1.15;font-weight:900;letter-spacing:-0.022em;color:${C.ink};">${esc(email.headline)}</h1>
${email.blocks(firstName).map(block).join("\n")}
</td></tr>

<tr><td class="px" style="padding:6px 40px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td bgcolor="${C.navy}" style="background:${C.navy};border-radius:20px;padding:26px 26px 22px;">
<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${C.sky};">Your next move</p>
<p style="margin:0 0 18px;font-family:${FONT};font-size:21px;line-height:1.3;font-weight:800;color:#ffffff;">${esc(email.cta.lead ?? email.cta.label)}</p>
${button(email.cta.href, email.cta.label)}
<p style="margin:18px 0 10px;font-family:${FONT};font-size:14px;line-height:1.5;color:#b9c7de;">Rather talk than click? I answer my own phone.</p>
<table role="presentation" class="stack-wrap" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="stack" style="padding:0 10px 0 0;">${button(BUSINESS.phone.tel, "Call Ryan", { tone: "outline" })}</td>
<td class="stack">${button(BUSINESS.phone.sms, "Text Ryan", { tone: "outline" })}</td>
</tr></table>
</td></tr></table>
</td></tr>

${toolCard}
${next}

<tr><td class="px" style="padding:26px 40px 30px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:14px;"><img src="${esc(img(CONTRACTOR_SIGNATURE_PHOTO))}" alt="Ryan Nichols" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:28px;"></td>
<td valign="middle" style="font-family:${FONT};">
<p style="margin:0;font-size:16px;font-weight:800;color:${C.ink};">Ryan Nichols</p>
<p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:${C.muted};">${esc(BUSINESS.name)} &middot; ${esc(BUSINESS.city)}, Texas &middot; <a href="${esc(BUSINESS.phone.tel)}" style="color:${C.blue};text-decoration:none;font-weight:700;">${esc(BUSINESS.phone.display)}</a></p>
</td></tr></table>
${email.ps ? `<p style="margin:20px 0 0;font-family:${FONT};font-size:15.5px;line-height:1.6;color:${C.body};"><strong style="color:${C.ink};">P.S.</strong> ${esc(email.ps)}</p>` : ""}
</td></tr>

<tr><td class="px" bgcolor="#f4f6fa" style="background:#f4f6fa;border-top:1px solid ${C.line};padding:20px 40px 26px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">${esc(why)} No texts unless you text first.</p>
${unsubUrl ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};"><a href="${esc(unsubUrl)}" style="color:${C.blue};text-decoration:underline;">Stop these emails</a>. One click, no login.</p>` : ""}
<p style="margin:0;font-family:${FONT};font-size:11.5px;line-height:1.6;color:${C.faint};">${esc(BUSINESS.dbaLine)}. ${esc(BUSINESS.address.street)}, ${esc(BUSINESS.address.city)}, ${esc(BUSINESS.address.region)} ${esc(BUSINESS.address.postalCode)}. Nothing in this email is a promise of leads, sales or revenue.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
