import type { Lead, Workspace } from "./types";
import { firstName, formatPhone } from "./phone";

// Message drafting in the business's voice. Deterministic on purpose: the
// same lead and the same settings produce the same draft, so the owner can
// learn what their business says and trust it. Every text ends with the
// opt-out line, every email carries the business's real contact line, and
// nothing promises a result.

export type Draft = {
  channel: "sms" | "email";
  purpose: "text_back" | "email_reply" | "follow_up" | "quote_follow_up" | "review_ask" | "reschedule" | "custom";
  subject?: string;
  body: string;
  /** Why this draft says what it says, shown beside it. */
  note: string;
};

const SMS_LIMIT = 300;

export function signOff(ws: Workspace): string {
  const who = ws.owner_name?.trim() ? `${ws.owner_name.trim()}, ${ws.name}` : ws.name;
  return who;
}

function greeting(ws: Workspace, lead: Lead): string {
  const name = firstName(lead.name);
  if (ws.voice === "formal") return name ? `Hello ${name},` : "Hello,";
  if (ws.voice === "friendly") return name ? `Hey ${name}!` : "Hey there!";
  return name ? `Hi ${name},` : "Hi,";
}

function thing(lead: Lead, ws: Workspace): string {
  const svc = (lead.service ?? "").trim();
  if (svc) return svc.toLowerCase();
  if (ws.services.length === 1) return ws.services[0].toLowerCase();
  return "your request";
}

function contactLine(ws: Workspace): string {
  const bits: string[] = [];
  if (ws.phone) bits.push(`Call or text ${formatPhone(ws.phone)}`);
  if (ws.email) bits.push(ws.email);
  return bits.join(" or ");
}

export function textBack(ws: Workspace, lead: Lead): Draft {
  const name = firstName(lead.name);
  const who = ws.owner_name?.trim() || ws.name;
  const opener =
    ws.voice === "friendly"
      ? `${name ? `Hey ${name}, ` : "Hey, "}this is ${who} with ${ws.name}.`
      : `${name ? `${name}, ` : ""}this is ${who} with ${ws.name}.`;
  const body = clampSms(
    `${opener} Got your request about ${thing(lead, ws)} and I am on it. I will call you shortly. Save this number, it is my direct line. Reply STOP to opt out.`,
  );
  return {
    channel: "sms",
    purpose: "text_back",
    body,
    note: "Sent the moment a lead arrives so they know a real person saw it. Names the business, promises a call, and carries the opt-out line.",
  };
}

export function emailReply(ws: Workspace, lead: Lead): Draft {
  const subject = `Got your request${lead.service ? `: ${lead.service}` : ""}`;
  const lines = [
    greeting(ws, lead),
    "",
    `Thanks for reaching out to ${ws.name}. I saw your request about ${thing(lead, ws)} and I am already looking at it.`,
    "",
    `I will reach out shortly to go over the details${lead.phone ? ` (I have ${formatPhone(lead.phone)} as your number)` : ""}. If there is a better time or number, reply and tell me.`,
    "",
    contactLine(ws) ? `${contactLine(ws)}.` : "",
    "",
    signOff(ws),
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));
  return {
    channel: "email",
    purpose: "email_reply",
    subject,
    body: lines.join("\n"),
    note: "The instant reply for leads who left an email. Confirms the request, says a call is coming, and gives them a way to correct the number.",
  };
}

export function followUp(ws: Workspace, lead: Lead, step: number): Draft {
  const name = firstName(lead.name);
  const who = ws.owner_name?.trim() || ws.name;
  const svc = thing(lead, ws);
  const variants = [
    `${name ? `${name}, ` : ""}${who} with ${ws.name} here. Following up on ${svc}. Still want to get that handled? Reply with a good time and I will call. Reply STOP to opt out.`,
    `${name ? `Hi ${name}, ` : ""}checking back on ${svc}. If you got it taken care of, no worries. If not, I can still help. ${who}, ${ws.name}. Reply STOP to opt out.`,
    `${name ? `${name}, ` : ""}one more note on ${svc}. Happy to answer any question, no pressure. ${who}, ${ws.name}. Reply STOP to opt out.`,
    `${name ? `Hi ${name}, ` : ""}last check-in on ${svc}. I will leave it with you from here. If the timing gets better, text this number. ${who}, ${ws.name}. Reply STOP to opt out.`,
  ];
  const body = clampSms(variants[Math.min(step, variants.length - 1)]);
  return {
    channel: lead.phone && !lead.unsubscribed_at ? "sms" : "email",
    purpose: "follow_up",
    subject: lead.phone && !lead.unsubscribed_at ? undefined : `Checking back on ${svc}`,
    body,
    note: `Follow-up ${step + 1} of ${ws.settings.followUpDays.length}. Short, no pressure, easy to answer, and it ends the ladder cleanly on the last step.`,
  };
}

export function quoteFollowUp(ws: Workspace, lead: Lead, daysSinceQuote: number): Draft {
  const name = firstName(lead.name);
  const who = ws.owner_name?.trim() || ws.name;
  const svc = thing(lead, ws);
  const body =
    daysSinceQuote <= 2
      ? `${name ? `${name}, ` : ""}${who} with ${ws.name}. Wanted to make sure the quote for ${svc} came through and see if any question came up. Reply here or call ${formatPhone(ws.phone)}. Reply STOP to opt out.`
      : `${name ? `${name}, ` : ""}${who} with ${ws.name}. Checking on the ${svc} quote. If anything about it needs adjusting, tell me and I will rework it. Reply STOP to opt out.`;
  return {
    channel: "sms",
    purpose: "quote_follow_up",
    body: clampSms(body),
    note: "A quote without a follow-up is a quote that goes to whoever calls back first. This asks one question and leaves the door open.",
  };
}

export function reviewAsk(ws: Workspace, lead: Lead): Draft {
  const name = firstName(lead.name);
  const who = ws.owner_name?.trim() || ws.name;
  const link = ws.review_link?.trim();
  const body = clampSms(
    `${name ? `${name}, ` : ""}thank you for choosing ${ws.name}. If we did right by you, a quick Google review helps more than you know${link ? `: ${link}` : "."} ${who}. Reply STOP to opt out.`,
  );
  return {
    channel: "sms",
    purpose: "review_ask",
    body,
    note: link
      ? "Sent after a job is marked won. One ask, the direct link, no pressure."
      : "Add your Google review link in Settings so this carries the direct link.",
  };
}

export function reschedule(ws: Workspace, lead: Lead): Draft {
  const name = firstName(lead.name);
  const who = ws.owner_name?.trim() || ws.name;
  const body = clampSms(
    `${name ? `${name}, ` : ""}${who} with ${ws.name}. Looks like we missed each other. What day and time works best this week? Reply here and I will lock it in. Reply STOP to opt out.`,
  );
  return {
    channel: "sms",
    purpose: "reschedule",
    body,
    note: "For a booked lead who did not show or answer. Asks for a time instead of an explanation.",
  };
}

/** Never split a text into three carrier segments. */
export function clampSms(body: string): string {
  const one = body.replace(/\s+/g, " ").trim();
  if (one.length <= SMS_LIMIT) return one;
  const cut = one.slice(0, SMS_LIMIT - 24).replace(/\s+\S*$/, "");
  return `${cut}. Reply STOP to opt out.`;
}

/** The owner's alert text, from their own number to their own phone. */
export function ownerAlertText(ws: Workspace, lead: Lead): string {
  const bits = [`New lead: ${lead.name || "no name"}`];
  if (lead.phone) bits.push(formatPhone(lead.phone));
  if (lead.service) bits.push(lead.service);
  if (lead.message) bits.push(`"${lead.message.slice(0, 80)}"`);
  bits.push(`Open: https://www.theleadflowpro.com/hq/leads/${lead.id}`);
  return bits.join(" | ");
}
