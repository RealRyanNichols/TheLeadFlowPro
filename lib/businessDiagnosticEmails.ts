import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUSINESS_DIAGNOSTIC_CAMPAIGN,
  answerString,
  type DiagnosticAnswers,
} from "@/lib/businessDiagnostic";
import { unsubscribeSecret, unsubscribeUrl } from "@/lib/unsubscribe";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Ryan Nichols <ryan@theleadflowpro.com>";
const INTERNAL_FROM = "The LeadFlow Pro <leadflow@theleadflowpro.com>";
const REPLY_TO = "hello@theleadflowpro.com";
const ADMIN_URL = "https://www.theleadflowpro.com/admin/leads";
const SERVER_RESUME_TOKEN_RE = /^r1([0-9a-f]{32})([A-Za-z0-9_-]{43})$/;

export type DiagnosticNurtureLead = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type DiagnosticEmailContext = {
  firstName: string;
  answers: DiagnosticAnswers;
  resumeUrl: string;
  bookUrl: string;
};

export type DiagnosticEmailStep = {
  step: number;
  day: number;
  subject: string;
  body: (context: DiagnosticEmailContext) => string;
};

function attributedUrl(rawUrl: string, day: number, content: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set("utm_source", "email");
    url.searchParams.set("utm_medium", "diagnostic_nurture");
    url.searchParams.set("utm_campaign", BUSINESS_DIAGNOSTIC_CAMPAIGN);
    url.searchParams.set("utm_content", `day${day}_${content}`);
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function bookUrl(day: number): string {
  return attributedUrl("https://www.theleadflowpro.com/book", day, "book");
}

function resumeSigningSecret(): string | null {
  return process.env.DIAGNOSTIC_RESUME_SECRET?.trim() || unsubscribeSecret();
}

function requestIdFromHex(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Server-issued bearer link for scheduled emails. The browser's original
 * random token remains hash-only in the database. This second token is an
 * HMAC of the request id, so cron can issue a working resume link without
 * storing or reconstructing the browser token.
 */
export function diagnosticServerResumeToken(requestId: string): string | null {
  const secret = resumeSigningSecret();
  const hex = requestId.replace(/-/g, "").toLowerCase();
  if (!secret || !/^[0-9a-f]{32}$/.test(hex)) return null;
  const signature = createHmac("sha256", secret)
    .update(`diagnostic-resume:v1:${hex}`)
    .digest("base64url");
  return `r1${hex}${signature}`;
}

export function verifyDiagnosticServerResumeToken(token: string): string | null {
  const match = SERVER_RESUME_TOKEN_RE.exec(token);
  const secret = resumeSigningSecret();
  if (!match || !secret) return null;
  const expected = createHmac("sha256", secret)
    .update(`diagnostic-resume:v1:${match[1]}`)
    .digest("base64url");
  const received = match[2];
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return requestIdFromHex(match[1]);
}

export function diagnosticServerResumeUrl(requestId: string): string | null {
  const token = diagnosticServerResumeToken(requestId);
  if (!token) return null;
  const url = new URL("https://www.theleadflowpro.com/diagnostic");
  url.searchParams.set("resume", token);
  return url.toString();
}

function facebookContext(answers: DiagnosticAnswers): string {
  const status = answerString(answers, "facebook_page_status");
  if (status === "not_created") {
    return "You said the business does not have a Facebook Page yet, so this is the best first move.";
  }
  if (status === "active_without_access") {
    return "You said a Facebook Page exists but you do not control it. Start by recovering access instead of building a duplicate Page.";
  }
  if (status === "inactive") {
    return "You said the Facebook Page is inactive. Keep the Page and refresh it before starting over.";
  }
  return "Even if your Facebook Page is already active, use this checklist to make sure the business owns it and a customer can act from it.";
}

function youtubeContext(answers: DiagnosticAnswers): string {
  const status = answerString(answers, "youtube_status");
  if (status === "not_created") {
    return "You said YouTube is not set up yet. Create the channel under a business-controlled Google account, then add one backup owner.";
  }
  if (status === "active_without_access") {
    return "You said a YouTube presence exists but you do not control it. Recover access before publishing anything new.";
  }
  if (status === "inactive") {
    return "You said YouTube is inactive. You do not need a new channel. Refresh the description, links, and banner, then publish the next useful answer.";
  }
  return "If your YouTube channel is already active, check that the business controls the account and every video points people to one clear next step.";
}

export const DIAGNOSTIC_EMAIL_STEPS: DiagnosticEmailStep[] = [
  {
    step: 200,
    day: 0,
    subject: "Your Business Growth Diagnostic is in",
    body: ({ firstName, answers, resumeUrl }) => `${firstName},

I have your Business Growth Diagnostic. The more useful detail you add, the more specific I can make the review and the next-step proposal.

${facebookContext(answers)}

Today, take ten minutes and write down three things: what you sell, who it helps, and the one action you want somebody to take after finding you online. That becomes the foundation for every page and post.

You can add to your answers here:
${resumeUrl}`,
  },
  {
    step: 201,
    day: 1,
    subject: "Set up the Facebook foundation first",
    body: ({ firstName, answers, resumeUrl }) => `${firstName},

${facebookContext(answers)}

Facebook Page checklist:

1. Use the exact business name customers know.
2. Add the right category, service area, phone, website, and hours.
3. Write a plain-language description of what you do and who you help.
4. Add a real logo and cover photo.
5. Set one action button: call, message, book, or shop.
6. Turn on two-factor authentication and give two trusted people full control.

Never email or text a password to a vendor. Use Meta's access controls.

If the Page status in your questionnaire changes, update it here:
${resumeUrl}`,
  },
  {
    step: 202,
    day: 2,
    subject: "Build YouTube from questions you already answer",
    body: ({ firstName, answers, resumeUrl }) => `${firstName},

${youtubeContext(answers)}

Start with five questions customers ask before they trust you. Record one honest answer at a time on your phone. Give each video a literal title a customer might search, say who you help in the first few seconds, and finish with one next step.

One useful recording can become a YouTube video, a Facebook post, and short clips. Do not build three separate content jobs when one clear answer can do all three.

Add your channel link or update its status here:
${resumeUrl}`,
  },
  {
    step: 203,
    day: 3,
    subject: "A simple three-post plan you can repeat",
    body: ({ firstName, resumeUrl }) => `${firstName},

You do not need thirty random content ideas. Rotate three useful jobs:

Teach: answer one question customers ask before buying.
Prove: show a real job, result, review, process, or behind-the-scenes detail.
Invite: tell the right person what to do next and make the next step easy.

If your team can sustain three good posts a day, use one of each. If not, one useful post a day is a strong place to start. Posting frequency by itself does not guarantee reach, leads, or sales. Consistency, relevance, and a clear next step matter more than filling a quota.

Own the Facebook and YouTube foundation first. TikTok can be an optional place to reuse the same short clips after those two are under the business's control.

Add your current posting rhythm and content assets here:
${resumeUrl}`,
  },
  {
    step: 204,
    day: 4,
    subject: "Find the leak on your website in fifteen minutes",
    body: ({ firstName, resumeUrl }) => `${firstName},

Open your website on your phone and test it like a new customer:

1. Can you tell what the business does in five seconds?
2. Is the next action obvious without scrolling?
3. Do call, form, booking, and checkout buttons work?
4. Does a test form reach the person who will answer it?
5. Can the business owner access the domain, website, analytics, and store?

Do not send passwords through this questionnaire. List the systems and who controls them. Access can be handled later through official invitations.

Add anything you find here:
${resumeUrl}`,
  },
  {
    step: 205,
    day: 5,
    subject: "Give every new lead a next action",
    body: ({ firstName, resumeUrl }) => `${firstName},

Map the path for one new inquiry today:

1. Where does it land?
2. Who owns the first reply?
3. What useful reply can go out immediately?
4. When is the first human follow-up?
5. Where is the next action recorded?

Fast, relevant follow-up helps you stay in the conversation, but no response-time rule guarantees a sale. The practical goal is simpler: no lead sits unseen and every conversation has an owner.

Update the lead-flow section with your real process:
${resumeUrl}`,
  },
  {
    step: 206,
    day: 6,
    subject: "Turn your answers into the next three moves",
    body: ({ firstName, resumeUrl, bookUrl: booking }) => `${firstName},

You now have the raw material for a practical plan. Read your answers once and mark:

1. The leak costing attention, time, or opportunities now.
2. The asset you already own that can work harder.
3. The smallest change your team can maintain every week.

Add any missing detail before the review:
${resumeUrl}

If you want to walk through the priorities with me, choose a time here:
${booking}

Reply to this email if a call is easier. I read the replies myself.`,
  },
];

export function diagnosticStepsDueBy(ageInDays: number): DiagnosticEmailStep[] {
  return DIAGNOSTIC_EMAIL_STEPS.filter((step) => step.day <= Math.max(0, ageInDays));
}

function firstNameOf(fullName: string | null | undefined): string {
  return String(fullName ?? "").trim().split(/\s+/)[0] || "there";
}

type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  reply_to?: string;
  headers?: Record<string, string>;
};

async function sendResend(payload: ResendPayload): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Diagnostic email send failed:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "Diagnostic email send threw:",
      error instanceof Error ? error.message : "unknown error",
    );
    return false;
  }
}

export async function sendDiagnosticResumeEmail(input: {
  fullName: string;
  email: string;
  resumeUrl: string;
  completenessScore: number;
}): Promise<boolean> {
  const first = firstNameOf(input.fullName);
  return sendResend({
    from: FROM,
    reply_to: REPLY_TO,
    to: [input.email],
    subject: "Your saved Business Growth Diagnostic",
    text: `${first},

Your Business Growth Diagnostic is saved at ${input.completenessScore}% complete.

Use this private link to continue where you left off:
${input.resumeUrl}

The link gives access to the answers you saved, so do not forward it. Please do not put passwords, payment details, private customer records, or API keys in the questionnaire.

Ryan Nichols
The LeadFlow Pro
(903) 500-8898`,
  });
}

export async function sendDiagnosticReceiptEmail(input: {
  fullName: string;
  email: string;
  resumeUrl: string;
  completenessScore: number;
}): Promise<boolean> {
  const first = firstNameOf(input.fullName);
  return sendResend({
    from: FROM,
    reply_to: REPLY_TO,
    to: [input.email],
    subject: "We received your Business Growth Diagnostic",
    text: `${first},

Your Business Growth Diagnostic is in. You provided ${input.completenessScore}% of the proposal-ready detail, and I will use what you shared to identify the first questions and priorities.

You can add or correct information with your private link:
${input.resumeUrl}

I will follow up about the request itself. You will not be added to the 7-Day Business Visibility Jumpstart unless you selected that option.

Ryan Nichols
The LeadFlow Pro
(903) 500-8898`,
  });
}

export async function sendDiagnosticInternalAlert(input: {
  leadId: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string | null;
  sourceChannel: string;
  priority: string;
  completenessScore: number;
  opportunityScore: number;
  summary: string;
  tags: string[];
}): Promise<boolean> {
  return sendResend({
    from: INTERNAL_FROM,
    reply_to: input.email,
    to: [REPLY_TO],
    subject: `NEW BUSINESS DIAGNOSTIC: ${input.fullName} (${input.businessName})`,
    text: [
      `Name: ${input.fullName}`,
      `Business: ${input.businessName}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || "-"}`,
      `Source channel: ${input.sourceChannel}`,
      `Priority: ${input.priority}`,
      `Completeness: ${input.completenessScore}%`,
      `Opportunity score: ${input.opportunityScore}%`,
      `Tags: ${input.tags.join(", ") || "-"}`,
      "",
      input.summary || "No summary provided.",
      "",
      `Open lead: ${ADMIN_URL}/${input.leadId}`,
    ].join("\n"),
  });
}

export type DiagnosticNurtureSendResult =
  | "sent"
  | "already_claimed"
  | "failed"
  | "skipped";

export async function sendDiagnosticNurtureStep(
  supabase: SupabaseClient,
  lead: DiagnosticNurtureLead,
  answers: DiagnosticAnswers,
  resumeUrl: string,
  step: DiagnosticEmailStep,
): Promise<DiagnosticNurtureSendResult> {
  if (!lead.email || lead.email.includes("@no-email.")) return "skipped";
  const secret = unsubscribeSecret();
  if (!process.env.RESEND_API_KEY?.trim() || !secret) return "skipped";

  const claim = await supabase.from("lead_emails").insert({
    lead_id: lead.id,
    step: step.step,
  });
  if (claim.error) {
    if (claim.error.code === "23505") return "already_claimed";
    console.error("Diagnostic email claim failed:", claim.error.code);
    return "failed";
  }

  const unsubUrl = unsubscribeUrl(lead.id, secret);
  const first = firstNameOf(lead.full_name);
  const resume = attributedUrl(resumeUrl, step.day, "resume");
  const body = step.body({
    firstName: first,
    answers,
    resumeUrl: resume,
    bookUrl: bookUrl(step.day),
  });
  const ok = await sendResend({
    from: FROM,
    reply_to: REPLY_TO,
    to: [lead.email],
    subject: step.subject,
    text: [
      body,
      "",
      "Ryan Nichols",
      "The LeadFlow Pro",
      "(903) 500-8898",
      "Longview, Texas",
      "",
      "You are getting this because you requested the 7-Day Business Visibility Jumpstart.",
      `Stop the series any time, one click, no login: ${unsubUrl}`,
    ].join("\n"),
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (!ok) {
    await supabase
      .from("lead_emails")
      .delete()
      .eq("lead_id", lead.id)
      .eq("step", step.step);
    return "failed";
  }

  await supabase.from("lead_activity").insert({
    lead_id: lead.id,
    kind: "system",
    detail: `Sent diagnostic jumpstart day ${step.day}: ${step.subject}`.slice(0, 1000),
  });
  return "sent";
}
