const DEFAULT_ADMIN_EMAILS = ["ryan@realryannichols.com", "hello@theleadflowpro.com"];

export function adminEmails() {
  const configured = (process.env.LEADFLOW_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ADMIN_EMAILS, ...configured]);
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && adminEmails().has(email.trim().toLowerCase()));
}
