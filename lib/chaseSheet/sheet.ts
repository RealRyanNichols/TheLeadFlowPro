// Today's sheet.
//
// Given the owner's profile and every quote they hold, this decides which
// quotes get a touch today, in what order, with the exact message and the
// one-tap link to send it, and adds up the money: what is open, what is on the
// sheet today, what chasing has won, what went quiet.
//
// Pure. The API route hands it rows and a date; the tests hand it fixtures.

import {
  bandFor,
  coreStepCount,
  daysBetween,
  planSequence,
  type Band,
  type PlannedStep,
  type PlanInput,
} from "./cadence";
import { mailLink, renderMessage, smsLink, telLink, type MessageContext, type RenderedMessage } from "./messages";
import { getTrade } from "./trades";
import type { Profile, Quote, Touch } from "./types";

export type SheetItem = {
  quote: Quote;
  step: PlannedStep;
  message: RenderedMessage;
  /** 0 when due today, larger when the owner is behind. */
  overdueDays: number;
  band: Band;
  amountLabel: string;
  links: {
    sms?: string;
    /** The voicemail text for a call step. */
    smsFallback?: string;
    tel?: string;
    mail?: string;
  };
  /** Touches so far, newest first, for the quote's history. */
  history: Touch[];
};

export type Ledger = {
  openCount: number;
  openCents: number;
  dueCount: number;
  dueCents: number;
  overdueCount: number;
  wonCount: number;
  wonCents: number;
  /** Won after at least one chase touch: the number the sheet earns its keep on. */
  wonAfterChaseCount: number;
  wonAfterChaseCents: number;
  lostCount: number;
  lostCents: number;
  /** Open quotes past the close touch with no answer. */
  quietCount: number;
  quietCents: number;
  /** Touches sent in the last seven days. */
  touchesThisWeek: number;
};

export type Sheet = {
  today: string;
  /** Due today or overdue, in the order to work them. */
  due: SheetItem[];
  /** Due in the next seven days. */
  upcoming: SheetItem[];
  /** Open quotes with nothing left in the sequence. */
  quiet: Quote[];
  ledger: Ledger;
};

export function money(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export function planInputFor(quote: Quote, profile: Profile): PlanInput {
  return { sentOn: quote.sentOn, amountCents: quote.amountCents, urgency: quote.urgency, tradeId: profile.tradeId };
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function contextFor(quote: Quote, profile: Profile, today: string): MessageContext {
  return {
    first: firstNameOf(quote.customerName),
    job: quote.job.trim() || getTrade(profile.tradeId).jobNoun,
    amount: quote.amountCents > 0 ? money(quote.amountCents) : "",
    biz: profile.business.trim() || "us",
    owner: profile.owner.trim(),
    window: profile.window.trim() || "the week after next",
    tradeId: profile.tradeId,
    tone: profile.tone,
    month: Number(today.slice(5, 7)) || 1,
    seed: quote.id,
  };
}

/** Everything the sheet shows for one quote at one step. */
export function itemFor(
  quote: Quote,
  step: PlannedStep,
  profile: Profile,
  today: string,
  touches: Touch[],
  overdueDays: number = Math.max(0, daysBetween(step.on, today)),
): SheetItem {
  const ctx = contextFor(quote, profile, today);
  const message = renderMessage(step.role, ctx);
  const links: SheetItem["links"] = {};
  if (quote.customerPhone) {
    links.tel = telLink(quote.customerPhone);
    if (message.channel === "text") links.sms = smsLink(quote.customerPhone, message.body);
    if (message.fallbackText) links.smsFallback = smsLink(quote.customerPhone, message.fallbackText);
  }
  if (quote.customerEmail && message.channel === "text") {
    links.mail = mailLink(quote.customerEmail, message.subject ?? `About ${ctx.job}`, message.body);
  }
  return {
    quote,
    step,
    message,
    overdueDays,
    band: bandFor(quote.amountCents, getTrade(profile.tradeId)),
    amountLabel: money(quote.amountCents),
    links,
    history: touches.filter((t) => t.quoteId === quote.id).sort((a, b) => (a.at < b.at ? 1 : -1)),
  };
}

/** The whole planned sequence for a quote, with the messages, for the detail view. */
export function sequenceFor(quote: Quote, profile: Profile, today: string): { step: PlannedStep; message: RenderedMessage; done: boolean }[] {
  const ctx = contextFor(quote, profile, today);
  return planSequence(planInputFor(quote, profile)).map((step) => ({
    step,
    message: renderMessage(step.role, ctx),
    done: step.step <= quote.done,
  }));
}

function sortDue(a: SheetItem, b: SheetItem): number {
  // Behind first, then bigger money, then the older quote.
  if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
  if (b.quote.amountCents !== a.quote.amountCents) return b.quote.amountCents - a.quote.amountCents;
  return a.quote.sentOn < b.quote.sentOn ? -1 : 1;
}

export function buildSheet(quotes: Quote[], touches: Touch[], profile: Profile, today: string): Sheet {
  const due: SheetItem[] = [];
  const upcoming: SheetItem[] = [];
  const quiet: Quote[] = [];

  for (const quote of quotes) {
    if (quote.status !== "open") continue;
    // The stored date is the schedule: set from the plan when the quote was
    // added, re-spaced after every touch, moved by a snooze. The plan supplies
    // the step's role and channel.
    const planned = quote.nextOn ? planSequence(planInputFor(quote, profile))[quote.done] : undefined;
    if (!planned || !quote.nextOn) {
      quiet.push(quote);
      continue;
    }
    const wait = daysBetween(today, quote.nextOn);
    if (wait <= 0) due.push(itemFor(quote, { ...planned, on: today }, profile, today, touches, Math.max(0, -wait)));
    else if (wait <= 7) upcoming.push(itemFor(quote, { ...planned, on: quote.nextOn }, profile, today, touches, 0));
  }

  due.sort(sortDue);
  upcoming.sort((a, b) => (a.step.on < b.step.on ? -1 : a.step.on > b.step.on ? 1 : b.quote.amountCents - a.quote.amountCents));

  return { today, due, upcoming, quiet, ledger: buildLedger(quotes, touches, profile, today, due) };
}

export function buildLedger(quotes: Quote[], touches: Touch[], profile: Profile, today: string, due?: SheetItem[]): Ledger {
  const ledger: Ledger = {
    openCount: 0, openCents: 0, dueCount: 0, dueCents: 0, overdueCount: 0,
    wonCount: 0, wonCents: 0, wonAfterChaseCount: 0, wonAfterChaseCents: 0,
    lostCount: 0, lostCents: 0, quietCount: 0, quietCents: 0, touchesThisWeek: 0,
  };
  const sentByQuote = new Map<string, number>();
  for (const t of touches) {
    if (t.outcome === "sent" || t.outcome === "no_answer") {
      sentByQuote.set(t.quoteId, (sentByQuote.get(t.quoteId) ?? 0) + 1);
      if (daysBetween(t.at.slice(0, 10), today) <= 7) ledger.touchesThisWeek += 1;
    }
  }
  for (const q of quotes) {
    if (q.status === "open") {
      ledger.openCount += 1;
      ledger.openCents += q.amountCents;
      if (!q.nextOn || q.done >= coreStepCount(planInputFor(q, profile))) {
        ledger.quietCount += 1;
        ledger.quietCents += q.amountCents;
      }
    } else if (q.status === "won") {
      ledger.wonCount += 1;
      ledger.wonCents += q.amountCents;
      if ((sentByQuote.get(q.id) ?? 0) > 0 || q.done > 0) {
        ledger.wonAfterChaseCount += 1;
        ledger.wonAfterChaseCents += q.amountCents;
      }
    } else if (q.status === "lost") {
      ledger.lostCount += 1;
      ledger.lostCents += q.amountCents;
    }
  }
  const dueItems = due ?? buildSheet(quotes, touches, profile, today).due;
  ledger.dueCount = dueItems.length;
  ledger.dueCents = dueItems.reduce((sum, i) => sum + i.quote.amountCents, 0);
  ledger.overdueCount = dueItems.filter((i) => i.overdueDays > 0).length;
  return ledger;
}
