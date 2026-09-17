// The owner dashboard. Answers four questions from the stack's own rows:
// who needs a reply, what is scheduled to go out, what money moved, and
// who asked to be left alone. Counts only; nothing estimated.

import type { StackConfig } from "./config";
import type { Payment } from "./payments";
import { paymentActions } from "./payments";
import type { Person } from "./people";
import type { Enrollment, PlannedSend } from "./sequences";

export type OwnerDashboard = {
  businessName: string;
  people: { total: number; leads: number; customers: number; members: number; doNotContact: number };
  consent: { textsOn: number; emailsOn: number };
  sequences: { open: number; completed: number; stoppedByPerson: number; queuedSends: number };
  money: { paidCents: number; refundedCents: number; failed: number; currency: string } | null;
  actions: string[];
};

export function buildOwnerDashboard(config: StackConfig, people: Person[], enrollments: Enrollment[], queued: PlannedSend[], payments: Payment[]): OwnerDashboard {
  const count = (s: Person["status"]) => people.filter((p) => p.status === s).length;
  const paid = payments.filter((p) => p.status === "paid");
  const refunded = payments.filter((p) => p.status === "refunded");
  const failed = payments.filter((p) => p.status === "failed");
  const actions: string[] = [];
  const noReplyLeads = people.filter((p) => p.status === "lead" && !p.stoppedAt).length;
  if (noReplyLeads) actions.push(`${noReplyLeads} lead${noReplyLeads === 1 ? "" : "s"} still at lead status. Move each to customer, past, or leave a note.`);
  for (const a of paymentActions(payments)) actions.push(a.text);
  if (config.modules.sequences && config.sequences.length === 0) actions.push("Sequences are on but none are defined.");
  return {
    businessName: config.business.name,
    people: { total: people.length, leads: count("lead"), customers: count("customer"), members: count("member"), doNotContact: count("do_not_contact") },
    consent: { textsOn: people.filter((p) => p.consentSms).length, emailsOn: people.filter((p) => p.consentEmail).length },
    sequences: {
      open: enrollments.filter((e) => !e.endedAt).length,
      completed: enrollments.filter((e) => e.endedReason === "completed").length,
      stoppedByPerson: enrollments.filter((e) => e.endedReason === "stopped" || e.endedReason === "replied").length,
      queuedSends: queued.length,
    },
    money: config.modules.payments
      ? {
          paidCents: paid.reduce((s, p) => s + p.amountCents, 0),
          refundedCents: refunded.reduce((s, p) => s + p.amountCents, 0),
          failed: failed.length,
          currency: payments[0]?.currency ?? "USD",
        }
      : null,
    actions,
  };
}
