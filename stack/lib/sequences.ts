// Follow-up sequences with consent and stop conditions.
//
// A sequence is a list of day offsets and channels. Enrolling a person
// creates one enrollment; each step becomes a send only when every gate
// passes at send time, not at enrollment time: the person still consents
// to that channel, has not replied STOP, is not in a stop status, has not
// replied (when the sequence stops on reply), and the local clock is inside
// the send window. Every send carries a dedupe key so a retried job cannot
// send a step twice.

import type { Channel, SequenceConfig, StackConfig } from "./config";
import type { Person } from "./people";

export type Enrollment = {
  id: string;
  personId: string;
  sequenceId: string;
  enrolledAt: string;
  /** Index of the next step to send. */
  nextStep: number;
  endedAt: string | null;
  endedReason: string | null;
  /** Set when the person replied on any channel after enrollment. */
  repliedAt: string | null;
};

export type PlannedSend = {
  dedupeKey: string;
  enrollmentId: string;
  personId: string;
  channel: Channel;
  templateId: string;
  /** The earliest instant the send may go out, after the quiet-hours shift. */
  sendAt: string;
  step: number;
};

export type SkipReason = "no_consent" | "stopped" | "status_stop" | "replied" | "ended" | "not_due" | "no_address" | "module_off";

export type StepDecision = { send: PlannedSend } | { skip: SkipReason; endEnrollment?: boolean };

export function dedupeKey(enrollmentId: string, step: number): string {
  return `seq:${enrollmentId}:${step}`;
}

export function enroll(person: Person, sequence: SequenceConfig, now: Date, newId: () => string): Enrollment | null {
  if (person.stoppedAt || person.status === "do_not_contact") return null;
  if (sequence.stopOnStatus.includes(person.status)) return null;
  return { id: newId(), personId: person.id, sequenceId: sequence.id, enrolledAt: now.toISOString(), nextStep: 0, endedAt: null, endedReason: null, repliedAt: null };
}

/** Local hour in a zone, without a library. */
export function localHour(at: Date, timezone: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(at);
  return Number.parseInt(h, 10) % 24;
}

/** Shift an instant forward to the next moment inside the send window. */
export function withinSendWindow(at: Date, timezone: string, window: { start: number; end: number }): Date {
  let probe = new Date(at.getTime());
  for (let i = 0; i < 48; i++) {
    const h = localHour(probe, timezone);
    if (h >= window.start && h < window.end) return probe;
    probe = new Date(probe.getTime() + 60 * 60_000);
    probe.setUTCMinutes(0, 0, 0);
  }
  return probe;
}

export function decideStep(config: StackConfig, sequence: SequenceConfig, enrollment: Enrollment, person: Person, now: Date): StepDecision {
  if (!config.modules.sequences) return { skip: "module_off" };
  if (enrollment.endedAt) return { skip: "ended" };
  if (person.stoppedAt || person.status === "do_not_contact") return { skip: "stopped", endEnrollment: true };
  if (sequence.stopOnStatus.includes(person.status)) return { skip: "status_stop", endEnrollment: true };
  if (sequence.stopOnReply && enrollment.repliedAt) return { skip: "replied", endEnrollment: true };
  const step = sequence.steps[enrollment.nextStep];
  if (!step) return { skip: "ended", endEnrollment: true };
  const due = new Date(new Date(enrollment.enrolledAt).getTime() + step.day * 86_400_000);
  if (due.getTime() > now.getTime()) return { skip: "not_due" };
  if (step.channel === "sms" && !person.consentSms) return { skip: "no_consent" };
  if (step.channel === "email" && !person.consentEmail) return { skip: "no_consent" };
  if (step.channel === "sms" && !person.phone) return { skip: "no_address" };
  if (step.channel === "email" && !person.email) return { skip: "no_address" };
  const sendAt = withinSendWindow(now, config.business.timezone, config.consent.quietHours);
  return {
    send: {
      dedupeKey: dedupeKey(enrollment.id, enrollment.nextStep),
      enrollmentId: enrollment.id,
      personId: person.id,
      channel: step.channel,
      templateId: step.templateId,
      sendAt: sendAt.toISOString(),
      step: enrollment.nextStep,
    },
  };
}

/** After a send is recorded. The enrollment moves on; the last step ends it. */
export function afterSend(enrollment: Enrollment, sequence: SequenceConfig, now: Date): Enrollment {
  const next = enrollment.nextStep + 1;
  if (next >= sequence.steps.length) return { ...enrollment, nextStep: next, endedAt: now.toISOString(), endedReason: "completed" };
  return { ...enrollment, nextStep: next };
}

export function endEnrollment(enrollment: Enrollment, reason: SkipReason, now: Date): Enrollment {
  return { ...enrollment, endedAt: now.toISOString(), endedReason: reason };
}

/**
 * One pass of the scheduler over every open enrollment. Returns the sends
 * that may go out now and the enrollments to update. `alreadySent` is the
 * set of dedupe keys that exist in the sends table, which is what makes a
 * re-run safe.
 */
export function runSequences(
  config: StackConfig,
  people: Person[],
  enrollments: Enrollment[],
  alreadySent: Set<string>,
  now: Date,
): { sends: PlannedSend[]; enrollments: Enrollment[]; skipped: { enrollmentId: string; reason: SkipReason }[] } {
  const byId = new Map(people.map((p) => [p.id, p]));
  const seqById = new Map(config.sequences.map((s) => [s.id, s]));
  const sends: PlannedSend[] = [];
  const skipped: { enrollmentId: string; reason: SkipReason }[] = [];
  const updated = enrollments.map((e) => {
    const person = byId.get(e.personId);
    const sequence = seqById.get(e.sequenceId);
    if (!person || !sequence) return e;
    const decision = decideStep(config, sequence, e, person, now);
    if ("send" in decision) {
      if (alreadySent.has(decision.send.dedupeKey)) return afterSend(e, sequence, now);
      sends.push(decision.send);
      return afterSend(e, sequence, now);
    }
    skipped.push({ enrollmentId: e.id, reason: decision.skip });
    // A due step the person has not consented to, or has no address for,
    // is skipped for good and the sequence moves on; a later step on the
    // other channel can still go out. It is never held and sent later.
    if (decision.skip === "no_consent" || decision.skip === "no_address") return afterSend(e, sequence, now);
    return decision.endEnrollment && !e.endedAt ? endEnrollment(e, decision.skip, now) : e;
  });
  return { sends, enrollments: updated, skipped };
}

/** A reply from the person, on any channel, is recorded on every open enrollment. */
export function recordReply(enrollments: Enrollment[], personId: string, now: Date): Enrollment[] {
  return enrollments.map((e) => (e.personId === personId && !e.endedAt && !e.repliedAt ? { ...e, repliedAt: now.toISOString() } : e));
}
