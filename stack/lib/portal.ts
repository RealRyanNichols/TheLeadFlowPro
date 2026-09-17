// The member portal. A signed-in person sees their own record and nothing
// else. This module builds that view from the full data set and is the
// only place the filter lives, so a test can prove another person's rows
// never leak. In the deployed stack the same rule is also RLS on every
// table (schema/001_core.sql); this is the application-side wall.

import type { StackConfig } from "./config";
import type { Payment } from "./payments";
import type { Person } from "./people";

export type MessageRow = { id: string; personId: string; channel: "sms" | "email"; direction: "in" | "out"; body: string; at: string };
export type DocumentRow = { id: string; personId: string; title: string; url: string; issuedAt: string };

export type PortalData = { people: Person[]; payments: Payment[]; messages: MessageRow[]; documents: DocumentRow[] };

export type PortalView = {
  profile: { name: string; phone: string | null; email: string | null; status: string; textsOn: boolean; emailsOn: boolean } | null;
  payments: { amount: string; status: string; description: string; at: string }[];
  messages: { direction: "in" | "out"; channel: string; body: string; at: string }[];
  documents: { title: string; url: string; issuedAt: string }[];
};

export function portalView(config: StackConfig, data: PortalData, viewerPersonId: string): PortalView {
  if (!config.modules.portal) throw new Error("portal module is off");
  const me = data.people.find((p) => p.id === viewerPersonId) ?? null;
  const shows = new Set(config.portal.shows);
  const own = <T extends { personId: string | null }>(rows: T[]) => rows.filter((r) => r.personId === viewerPersonId);
  return {
    profile: me && shows.has("profile") ? { name: me.name, phone: me.phone, email: me.email, status: me.status, textsOn: me.consentSms, emailsOn: me.consentEmail } : null,
    payments: shows.has("payments")
      ? own(data.payments).map((p) => ({ amount: `${(p.amountCents / 100).toFixed(2)} ${p.currency}`, status: p.status, description: p.description, at: p.updatedAt }))
      : [],
    messages: shows.has("messages") ? own(data.messages).map((m) => ({ direction: m.direction, channel: m.channel, body: m.body, at: m.at })) : [],
    documents: shows.has("documents") ? own(data.documents).map((d) => ({ title: d.title, url: d.url, issuedAt: d.issuedAt })) : [],
  };
}

/** A member may change their own contact preferences. Turning a channel off is honored immediately; turning one on records consent. */
export function updateOwnPreferences(person: Person, viewerPersonId: string, prefs: { textsOn?: boolean; emailsOn?: boolean }, now: Date): Person {
  if (person.id !== viewerPersonId) throw new Error("a member can only change their own preferences");
  if (person.stoppedAt && (prefs.textsOn || prefs.emailsOn)) {
    // Opting back in after STOP is the person's own act, which this is.
    person.stoppedAt = null;
    if (person.status === "do_not_contact") person.status = "lead";
  }
  if (typeof prefs.textsOn === "boolean") person.consentSms = prefs.textsOn;
  if (typeof prefs.emailsOn === "boolean") person.consentEmail = prefs.emailsOn;
  person.updatedAt = now.toISOString();
  return person;
}
