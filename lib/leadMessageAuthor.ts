// The mailbox stays verified. Display names come from the authenticated staff
// profile, never from the message request or the lead's assigned owner field.
const VERIFIED_MAILBOX = "ryan@theleadflowpro.com";

export function leadMessageAuthor(
  profileName: string | null | undefined,
  authenticatedEmail: string | null | undefined,
) {
  const name = (profileName ?? "")
    .replace(/[\r\n\u0000-\u001f\u007f<>"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  const displayName = name || "The LeadFlow Pro team";
  return {
    displayName,
    auditName: name || authenticatedEmail || "Authenticated team member",
    from: `${displayName} via The LeadFlow Pro <${VERIFIED_MAILBOX}>`,
    replyTo: VERIFIED_MAILBOX,
    subject: name
      ? `Message from ${name} at The LeadFlow Pro`
      : "Message from The LeadFlow Pro team",
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function leadMessageEmail(
  to: string,
  recipientName: string,
  body: string,
  author: ReturnType<typeof leadMessageAuthor>,
) {
  const firstName = recipientName.trim().split(/\s+/)[0] || "there";
  return {
    from: author.from,
    to,
    reply_to: author.replyTo,
    subject: author.subject,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#0a1220"><p>Hi ${escapeHtml(firstName)},</p><p>${escapeHtml(body).replace(/\n/g, "<br>")}</p><p style="margin-top:22px">${escapeHtml(author.displayName)}<br><span style="color:#4e5866">The LeadFlow Pro &middot; (903) 500-8898</span></p></div>`,
    text: `Hi ${firstName},\n\n${body}\n\n${author.displayName}\nThe LeadFlow Pro · (903) 500-8898`,
  };
}

export function hasLeadEmailAddress(
  email: string | null | undefined,
): email is string {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    !email.toLowerCase().endsWith("@no-email.facebook.lead")
  );
}
