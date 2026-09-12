// Phone handling for the plugin. Numbers arrive from web forms, SMS
// webhooks, Meta forms, and voice dictation in ChatGPT, so they come in
// every shape. Everything is stored as E.164 and shown as (903) 555-0142.

export function toE164(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15 && String(raw).trim().startsWith("+")) return `+${digits}`;
  return null;
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

/** The trailing ten digits, for matching a texter to a lead across formats. */
export function last10(raw: unknown): string | null {
  const e = toE164(raw);
  if (!e) return null;
  return e.slice(-10);
}

export function isPlausibleEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && value.length <= 200;
}

export function normalizeEmail(value: unknown): string | null {
  if (!isPlausibleEmail(value)) return null;
  return value.trim().toLowerCase();
}

export function firstName(name: string | null | undefined): string {
  const n = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!n || n.length > 30) return "";
  if (/^[A-Za-z][A-Za-z'.-]*$/.test(n)) return n[0].toUpperCase() + n.slice(1);
  return "";
}
