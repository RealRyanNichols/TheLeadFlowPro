/**
 * Lead intake helpers.
 *
 * All inbound channels (Twilio voice, Twilio SMS, web form, future DM
 * adapters) funnel through these helpers so the Lead + Message rows stay
 * shaped the same way everywhere. "No fake stats" rule applies: numbers
 * are only written when a real event actually fires.
 */

import { prisma } from "@/lib/prisma";
import type { LeadSource, LeadStatus } from "@prisma/client";

// Last 10 digits, US-normalized — enough to coalesce "+1 903 555 1234",
// "(903) 555-1234", and "9035551234" into one lead row.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  // Strip a leading country code "1" for NA numbers; keep full digits otherwise
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.slice(-10) || digits;
}

// Very small template renderer — {{first_name}}, {{business}}, {{name}}.
// Unknown keys are left as-is so the user sees the placeholder and fixes it.
export function renderTemplate(
  tpl: string,
  vars: Record<string, string | null | undefined>,
): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) => {
    const v = vars[key];
    if (v === undefined || v === null || v === "") return m;
    return String(v);
  });
}

interface CreateLeadArgs {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source: LeadSource;
  status?: LeadStatus;
  notes?: string | null;
  meta?: Record<string, unknown>;
  estValue?: number | null;
}

export async function createLead(args: CreateLeadArgs) {
  return prisma.lead.create({
    data: {
      userId: args.userId,
      name: args.name ?? null,
      email: args.email ?? null,
      phone: args.phone ? normalizePhone(args.phone) : null,
      source: args.source,
      status: args.status ?? "new",
      notes: args.notes ?? null,
      meta: (args.meta ?? {}) as any,
      estValue: args.estValue ?? 0,
      lastContact: new Date(),
    },
  });
}

/**
 * Find-or-create by phone within a user's own leads.
 * Two repeat missed calls from the same number = one lead row, two messages.
 */
export async function findOrCreateLeadByPhone(opts: {
  userId: string;
  phone: string;
  source: LeadSource;
  name?: string | null;
}) {
  const normalized = normalizePhone(opts.phone);
  if (!normalized) {
    // Still create, so the message isn't orphaned — just with null phone.
    return createLead({
      userId: opts.userId,
      name: opts.name ?? null,
      source: opts.source,
    });
  }

  const existing = await prisma.lead.findFirst({
    where: { userId: opts.userId, phone: normalized },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return createLead({
    userId: opts.userId,
    name: opts.name ?? null,
    phone: normalized,
    source: opts.source,
  });
}

interface LogMessageArgs {
  leadId: string;
  direction: "inbound" | "outbound";
  channel: "sms" | "email" | "call_log" | "chatbot" | "dm" | "note";
  body: string;
  mediaUrl?: string | null;
  sentBy?: string | null;
}

export async function logMessage(args: LogMessageArgs) {
  // Bump lastContact on the parent lead so the inbox sort works
  // without a separate aggregation query.
  const [msg] = await prisma.$transaction([
    prisma.message.create({
      data: {
        leadId: args.leadId,
        direction: args.direction,
        channel: args.channel,
        body: args.body,
        mediaUrl: args.mediaUrl ?? null,
        sentBy: args.sentBy ?? null,
      },
    }),
    prisma.lead.update({
      where: { id: args.leadId },
      data: { lastContact: new Date() },
    }),
  ]);
  return msg;
}

/**
 * Generate a random form key (for public lead forms). Crypto-random,
 * URL-safe, 24 chars — collision-free enough for our scale.
 */
export function generateFormKey(): string {
  const bytes = new Uint8Array(18);
  // crypto is global in Node 20+
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}
