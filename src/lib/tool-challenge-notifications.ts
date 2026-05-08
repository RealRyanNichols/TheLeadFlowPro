const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM_ADDRESS ||
  "Ryan @ The LeadFlow Pro <hello@theleadflowpro.com>";
const DEFAULT_NOTIFY_EMAIL = "theflashflash24@gmail.com";

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

export type ToolChallengeNotificationInput = {
  fullName: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  businessUrl?: string | null;
  industry?: string | null;
  toolName: string;
  toolProblem: string;
  businessImpact?: string | null;
  currentProcess?: string | null;
  currentWebsiteNotes?: string | null;
  budgetTier?: string | null;
  timeline?: string | null;
  toolFocus?: string | null;
  promptStack?: string | null;
  promptDraft?: string | null;
  insightSnapshot?: string | null;
  intakeId?: string | null;
};

export async function sendToolChallengeNotification(input: ToolChallengeNotificationInput) {
  const to = process.env.LEADFLOW_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL;
  const subject = `New Stump Me request: ${input.toolName} — ${input.fullName}`;
  const adminHref = "https://www.theleadflowpro.com/admin/requests";
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#0f172a;background:#f8fafc">
      <div style="background:#020617;color:white;border-radius:20px;padding:22px;margin-bottom:18px">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#67e8f9;font-weight:700">The LeadFlow Pro · Stump Me</div>
        <h1 style="margin:10px 0 0 0;font-size:26px;line-height:1.15">New buildout request</h1>
        <p style="margin:10px 0 0 0;color:#cbd5e1">This came from /challenge. The visitor created a prompt, business leak estimate, and tool request.</p>
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Contact</h2>
        ${line("Name", input.fullName)}
        ${line("Email", input.email)}
        ${line("Phone", input.phone)}
        ${line("Business", input.businessName)}
        ${line("Website", input.businessUrl)}
        ${line("Industry", input.industry)}
        ${line("Intake ID", input.intakeId)}
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Tool request</h2>
        ${line("Tool", input.toolName)}
        ${line("Focus", input.toolFocus)}
        ${line("Budget tier", input.budgetTier)}
        ${line("Timeline", input.timeline)}
        ${
          input.currentWebsiteNotes
            ? `<p style="margin:12px 0 6px 0"><strong>Current website / benchmark notes:</strong></p><div style="white-space:pre-wrap;background:#ecfeff;border-radius:12px;padding:12px">${escapeHtml(input.currentWebsiteNotes)}</div>`
            : ""
        }
        <p style="margin:12px 0 6px 0"><strong>Problem:</strong></p>
        <div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(input.toolProblem)}</div>
        ${
          input.businessImpact
            ? `<p style="margin:12px 0 6px 0"><strong>What changes if it works:</strong></p><div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(input.businessImpact)}</div>`
            : ""
        }
        ${
          input.currentProcess
            ? `<p style="margin:12px 0 6px 0"><strong>Current process:</strong></p><div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(input.currentProcess)}</div>`
            : ""
        }
      </div>

      ${
        input.promptStack
          ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px"><h2 style="font-size:18px;margin:0 0 12px 0">Prompt Build Lab stack</h2><div style="white-space:pre-wrap;background:#ecfeff;color:#0f172a;border-radius:12px;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6">${escapeHtml(input.promptStack)}</div></div>`
          : ""
      }

      ${
        input.promptDraft
          ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px"><h2 style="font-size:18px;margin:0 0 12px 0">Prompt Ryan gets</h2><div style="white-space:pre-wrap;background:#020617;color:#e2e8f0;border-radius:12px;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6">${escapeHtml(input.promptDraft)}</div></div>`
          : ""
      }

      ${
        input.insightSnapshot
          ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px"><h2 style="font-size:18px;margin:0 0 12px 0">Insight snapshot</h2><div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6">${escapeHtml(input.insightSnapshot)}</div></div>`
          : ""
      }

      <a href="${adminHref}" style="display:inline-block;background:#f07a10;color:white;text-decoration:none;font-weight:700;border-radius:12px;padding:12px 16px">Open Ryan admin queue</a>
    </div>
  `;

  const text = [
    "New Stump Me buildout request",
    "",
    `Name: ${input.fullName}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    input.businessName ? `Business: ${input.businessName}` : null,
    input.businessUrl ? `Website: ${input.businessUrl}` : null,
    input.industry ? `Industry: ${input.industry}` : null,
    input.intakeId ? `Intake ID: ${input.intakeId}` : null,
    "",
    `Tool: ${input.toolName}`,
    input.toolFocus ? `Focus: ${input.toolFocus}` : null,
    input.budgetTier ? `Budget: ${input.budgetTier}` : null,
    input.timeline ? `Timeline: ${input.timeline}` : null,
    "",
    "Problem:",
    input.toolProblem,
    input.businessImpact ? `\nWhat changes if it works:\n${input.businessImpact}` : null,
    input.currentProcess ? `\nCurrent process:\n${input.currentProcess}` : null,
    input.currentWebsiteNotes ? `\nCurrent website / benchmark notes:\n${input.currentWebsiteNotes}` : null,
    input.promptStack ? `\nPrompt Build Lab stack:\n${input.promptStack}` : null,
    input.promptDraft ? `\nPrompt Ryan gets:\n${input.promptDraft}` : null,
    input.insightSnapshot ? `\nInsight snapshot:\n${input.insightSnapshot}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (!RESEND_API_KEY) {
    console.warn("[tool-challenge] RESEND_API_KEY missing; notification not emailed", {
      to,
      subject,
      email: input.email,
      toolName: input.toolName,
    });
    return { sent: false, reason: "no_resend_key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        reply_to: input.email,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[tool-challenge] Resend error ${res.status}: ${body}`);
      return { sent: false, reason: "resend_error" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[tool-challenge] Resend exception:", error);
    return { sent: false, reason: "resend_exception" };
  }
}
