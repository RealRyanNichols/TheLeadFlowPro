// One record per person. A lead, a customer, and a member are the same
// human at different points, so the stack keeps one row and moves its
// status. Matching is by normalized phone, then by normalized email; a
// new submission that matches an existing person updates that person and
// never creates a twin.

import type { PersonStatus } from "./config";

export type Person = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: PersonStatus;
  /** Where the first contact came from. Kept forever. */
  firstSource: string;
  consentSms: boolean;
  consentEmail: boolean;
  /** Set when they replied STOP or asked not to be contacted. Never cleared by automation. */
  stoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
};

export type Incoming = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  source: string;
  consentSms?: boolean;
  consentEmail?: boolean;
  tags?: string[];
};

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15 && raw.trim().startsWith("+")) return `+${digits}`;
  return null;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

export function findPerson(people: Person[], incoming: { phone?: string | null; email?: string | null }): Person | null {
  const phone = normalizePhone(incoming.phone);
  const email = normalizeEmail(incoming.email);
  if (phone) {
    const byPhone = people.find((p) => p.phone === phone);
    if (byPhone) return byPhone;
  }
  if (email) {
    const byEmail = people.find((p) => p.email === email);
    if (byEmail) return byEmail;
  }
  return null;
}

export type UpsertResult = { person: Person; created: boolean; changed: string[] };

/**
 * Merge an incoming submission into the people list. Consent only ever
 * moves up through a submission (a checked box); it moves down only through
 * STOP or the owner, which are separate functions.
 */
export function upsertPerson(people: Person[], incoming: Incoming, now: Date, newId: () => string): UpsertResult {
  const phone = normalizePhone(incoming.phone);
  const email = normalizeEmail(incoming.email);
  if (!phone && !email) throw new Error("a person needs a phone or an email");
  const existing = findPerson(people, { phone, email });
  const at = now.toISOString();
  if (!existing) {
    const person: Person = {
      id: newId(),
      name: (incoming.name ?? "").trim(),
      phone,
      email,
      status: "lead",
      firstSource: incoming.source,
      consentSms: incoming.consentSms === true,
      consentEmail: incoming.consentEmail === true,
      stoppedAt: null,
      createdAt: at,
      updatedAt: at,
      tags: [...new Set(incoming.tags ?? [])],
    };
    people.push(person);
    return { person, created: true, changed: [] };
  }
  const changed: string[] = [];
  if (!existing.phone && phone) {
    existing.phone = phone;
    changed.push("phone");
  }
  if (!existing.email && email) {
    existing.email = email;
    changed.push("email");
  }
  if (incoming.name?.trim() && !existing.name) {
    existing.name = incoming.name.trim();
    changed.push("name");
  }
  if (incoming.consentSms === true && !existing.consentSms && !existing.stoppedAt) {
    existing.consentSms = true;
    changed.push("consentSms");
  }
  if (incoming.consentEmail === true && !existing.consentEmail && !existing.stoppedAt) {
    existing.consentEmail = true;
    changed.push("consentEmail");
  }
  for (const t of incoming.tags ?? []) {
    if (!existing.tags.includes(t)) {
      existing.tags.push(t);
      if (!changed.includes("tags")) changed.push("tags");
    }
  }
  if (changed.length) existing.updatedAt = at;
  return { person: existing, created: false, changed };
}

const STOP_WORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];

export function isStopMessage(text: string, extraWords: string[] = []): boolean {
  const first = text.trim().toLowerCase().split(/\s+/)[0] ?? "";
  return [...STOP_WORDS, ...extraWords.map((w) => w.toLowerCase())].includes(first);
}

/** STOP is global for the person: every channel, every sequence, immediately. */
export function applyStop(person: Person, now: Date): Person {
  person.consentSms = false;
  person.consentEmail = false;
  person.stoppedAt = now.toISOString();
  person.status = "do_not_contact";
  person.updatedAt = now.toISOString();
  return person;
}

/** Owner-driven status moves. do_not_contact is one-way from automation's point of view. */
export function setStatus(person: Person, status: PersonStatus, now: Date): Person {
  if (person.status === "do_not_contact" && status !== "do_not_contact") {
    throw new Error("a person who asked not to be contacted stays that way until they opt back in themselves");
  }
  person.status = status;
  person.updatedAt = now.toISOString();
  return person;
}
