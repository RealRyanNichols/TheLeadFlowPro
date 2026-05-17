import { LEADFLOW_FROM_EMAIL, LEADFLOW_PUBLIC_EMAIL } from "@/lib/contact";

type Attribution = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export type PaidAuditNotificationInput = {
  intakeId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  businessUrl?: string | null;
  monthlyRevenueRange?: string | null;
  currentLeadSource?: string | null;
  responseTime?: string | null;
  leakConcern?: string | null;
  auditReadiness?: string | null;
  reviewTimeline?: string | null;
  currentPageUrl?: string | null;
  clientCreatedAt?: string | null;
  attribution?: Attribution | null;
};

export type PaidAuditContextNotificationInput = {
  intakeId?: string | null;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  businessUrl?: string | null;
  linksToReview?: string | null;
  leadPathNotes?: string | null;
  accessNotes?: string | null;
  currentPageUrl?: string | null;
  clientCreatedAt?: string | null;
  attribution?: Attribution | null;
};

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function line(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<p style="margin:0 0 10px 0"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

function textLine(label: string, value: string | null | undefined) {
  return value ? `${label}: ${value}` : null;
}

function resendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from:
      process.env.RESEND_FROM_ADDRESS ||
      `Ryan @ The LeadFlow Pro <${LEADFLOW_FROM_EMAIL}>`,
    to: process.env.LEADFLOW_NOTIFY_EMAIL || LEADFLOW_PUBLIC_EMAIL,
  };
}

async function sendNotification({
  subject,
  replyTo,
  html,
  text,
  logPrefix,
}: {
  subject: string;
  replyTo: string;
  html: string;
  text: string;
  logPrefix: string;
}) {
  const config = resendConfig();
  if (!config.apiKey) {
    console.warn(`[${logPrefix}] RESEND_API_KEY missing; notification not emailed`, {
      to: config.to,
      subject,
      replyTo,
    });
    return { sent: false, reason: "no_resend_key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[${logPrefix}] Resend error ${res.status}: ${body}`);
      return { sent: false, reason: "resend_error" };
    }

    return { sent: true };
  } catch (error) {
    console.error(`[${logPrefix}] Resend exception:`, error);
    return { sent: false, reason: "resend_exception" };
  }
}

export async function sendPaidAuditNotification(input: PaidAuditNotificationInput) {
  const adminHref = "https://www.theleadflowpro.com/admin/requests?goal=paid-lead-leak-audit-197";
  const subject = `New $197 audit application: ${input.businessName || input.fullName}`;
  const attribution = input.attribution;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#0f172a;background:#f8fafc">
      <div style="background:#020617;color:white;border-radius:20px;padding:22px;margin-bottom:18px">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#67e8f9;font-weight:700">The LeadFlow Pro - $197 Lead Leak Audit</div>
        <h1 style="margin:10px 0 0 0;font-size:26px;line-height:1.15">New paid audit application</h1>
        <p style="margin:10px 0 0 0;color:#cbd5e1">This visitor applied for the $197 audit. Confirm fit, send payment step, then review the lead path.</p>
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Contact</h2>
        ${line("Name", input.fullName)}
        ${line("Email", input.email)}
        ${line("Phone", input.phone)}
        ${line("Business", input.businessName)}
        ${line("Website", input.businessUrl)}
        ${line("Intake ID", input.intakeId)}
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Audit signal</h2>
        ${line("Revenue range", input.monthlyRevenueRange)}
        ${line("Main lead source", input.currentLeadSource)}
        ${line("Response time", input.responseTime)}
        ${line("Ready to invest", input.auditReadiness)}
        ${line("Review timeline", input.reviewTimeline)}
        ${line("Page URL", input.currentPageUrl)}
        ${line("Client timestamp", input.clientCreatedAt)}
        ${
          input.leakConcern
            ? `<p style="margin:12px 0 6px 0"><strong>Where they think the leak is:</strong></p><div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(input.leakConcern)}</div>`
            : ""
        }
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Attribution</h2>
        ${line("UTM source", attribution?.utmSource)}
        ${line("UTM medium", attribution?.utmMedium)}
        ${line("UTM campaign", attribution?.utmCampaign)}
        ${line("UTM content", attribution?.utmContent)}
        ${line("UTM term", attribution?.utmTerm)}
      </div>

      <a href="${adminHref}" style="display:inline-block;background:#f07a10;color:white;text-decoration:none;font-weight:700;border-radius:12px;padding:12px 16px">Open Ryan admin queue</a>
    </div>
  `;

  const text = [
    "New $197 Lead Leak Audit application",
    "",
    textLine("Name", input.fullName),
    textLine("Email", input.email),
    textLine("Phone", input.phone),
    textLine("Business", input.businessName),
    textLine("Website", input.businessUrl),
    textLine("Intake ID", input.intakeId),
    "",
    textLine("Revenue range", input.monthlyRevenueRange),
    textLine("Main lead source", input.currentLeadSource),
    textLine("Response time", input.responseTime),
    textLine("Ready to invest", input.auditReadiness),
    textLine("Review timeline", input.reviewTimeline),
    textLine("Page URL", input.currentPageUrl),
    textLine("Client timestamp", input.clientCreatedAt),
    "",
    input.leakConcern ? `Where they think the leak is:\n${input.leakConcern}` : null,
    "",
    textLine("UTM source", attribution?.utmSource),
    textLine("UTM medium", attribution?.utmMedium),
    textLine("UTM campaign", attribution?.utmCampaign),
    textLine("UTM content", attribution?.utmContent),
    textLine("UTM term", attribution?.utmTerm),
    "",
    `Admin queue: ${adminHref}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendNotification({
    subject,
    replyTo: input.email,
    html,
    text,
    logPrefix: "paid-audit",
  });
}

export async function sendPaidAuditContextNotification(input: PaidAuditContextNotificationInput) {
  const adminHref = "https://www.theleadflowpro.com/admin/requests?goal=paid-lead-leak-audit-197-follow-up";
  const subject = `New audit follow-up context: ${input.businessName || input.fullName || input.email}`;
  const attribution = input.attribution;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#0f172a;background:#f8fafc">
      <div style="background:#020617;color:white;border-radius:20px;padding:22px;margin-bottom:18px">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#67e8f9;font-weight:700">The LeadFlow Pro - Audit next step</div>
        <h1 style="margin:10px 0 0 0;font-size:26px;line-height:1.15">New post-submit context</h1>
        <p style="margin:10px 0 0 0;color:#cbd5e1">The buyer added more context after applying for the $197 audit.</p>
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Contact</h2>
        ${line("Name", input.fullName)}
        ${line("Email", input.email)}
        ${line("Phone", input.phone)}
        ${line("Business", input.businessName)}
        ${line("Website", input.businessUrl)}
        ${line("Intake ID", input.intakeId)}
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Context</h2>
        ${line("Page URL", input.currentPageUrl)}
        ${line("Client timestamp", input.clientCreatedAt)}
        ${
          input.linksToReview
            ? `<p style="margin:12px 0 6px 0"><strong>Links Ryan should review first:</strong></p><div style="white-space:pre-wrap;background:#ecfeff;border-radius:12px;padding:12px">${escapeHtml(input.linksToReview)}</div>`
            : ""
        }
        ${
          input.leadPathNotes
            ? `<p style="margin:12px 0 6px 0"><strong>Lead path notes:</strong></p><div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(input.leadPathNotes)}</div>`
            : ""
        }
        ${
          input.accessNotes
            ? `<p style="margin:12px 0 6px 0"><strong>Access notes:</strong></p><div style="white-space:pre-wrap;background:#fff7ed;border-radius:12px;padding:12px">${escapeHtml(input.accessNotes)}</div>`
            : ""
        }
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Attribution</h2>
        ${line("UTM source", attribution?.utmSource)}
        ${line("UTM medium", attribution?.utmMedium)}
        ${line("UTM campaign", attribution?.utmCampaign)}
        ${line("UTM content", attribution?.utmContent)}
        ${line("UTM term", attribution?.utmTerm)}
      </div>

      <a href="${adminHref}" style="display:inline-block;background:#f07a10;color:white;text-decoration:none;font-weight:700;border-radius:12px;padding:12px 16px">Open Ryan admin queue</a>
    </div>
  `;

  const text = [
    "New $197 Lead Leak Audit follow-up context",
    "",
    textLine("Name", input.fullName),
    textLine("Email", input.email),
    textLine("Phone", input.phone),
    textLine("Business", input.businessName),
    textLine("Website", input.businessUrl),
    textLine("Intake ID", input.intakeId),
    textLine("Page URL", input.currentPageUrl),
    textLine("Client timestamp", input.clientCreatedAt),
    "",
    input.linksToReview ? `Links Ryan should review first:\n${input.linksToReview}` : null,
    input.leadPathNotes ? `\nLead path notes:\n${input.leadPathNotes}` : null,
    input.accessNotes ? `\nAccess notes:\n${input.accessNotes}` : null,
    "",
    textLine("UTM source", attribution?.utmSource),
    textLine("UTM medium", attribution?.utmMedium),
    textLine("UTM campaign", attribution?.utmCampaign),
    textLine("UTM content", attribution?.utmContent),
    textLine("UTM term", attribution?.utmTerm),
    "",
    `Admin queue: ${adminHref}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendNotification({
    subject,
    replyTo: input.email,
    html,
    text,
    logPrefix: "paid-audit-context",
  });
}
