// The scorecard: is the follow-up plan being worked, and are the ads paying
// for the right people. A handful of numbers, then the signals in plain
// words: fix this, do less of this, do more of this, keep doing this, too
// early to call.
//
// Ryan, October 7, 2026: "Here's our numbers. Here's what you're doing right.
// Here's what you're doing wrong. This is what you should do more of. This is
// what you should do less of."
//
// Two rules keep it honest.
//   1. A number the board cannot read is "not read", never 0. No call on the
//      record is reported as exactly that. It does not say nobody called: on
//      Oct 7, 2026 the team was marking calls in Meta's Leads Center, where
//      this back office cannot see them.
//   2. Small numbers do not get verdicts. Two ads with three leads each have
//      no winner yet, and the board says so instead of moving money on noise.
//      MIN_LEADS_TO_JUDGE is that line.
//
// The targets (five minutes to the first call, five attempts in two days)
// are the plan's own (lib/followUpPlan.ts), not industry statistics.
//
// Pure module. Nothing here reads, writes or sends.

import { FIRST_CALL_MINUTES, FULL_CALL_PLAN } from "@/lib/followUpPlan";
import type { FollowUpGroup, LeadPace, NextActionBoard } from "@/lib/nextAction";

export type SignalVerdict = "fix" | "less" | "more" | "keep" | "watch";

export const VERDICT_LABELS: Record<SignalVerdict, string> = {
  fix: "Fix this",
  less: "Do less of this",
  more: "Do more of this",
  keep: "Keep doing this",
  watch: "Too early to call",
};

/** Display order: what is costing money first. */
export const VERDICT_ORDER: readonly SignalVerdict[] = ["fix", "less", "more", "keep", "watch"];

export type Signal = {
  id: string;
  verdict: SignalVerdict;
  title: string;
  /** The evidence, with the count and the window. */
  detail: string;
  /** The one thing to do about it. */
  action: string;
};

export type Kpi = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: "plain" | "good" | "warn";
};

export type ScoreLead = {
  id: string;
  created_at: string;
  status: string;
  group: FollowUpGroup | null;
  source: string | null;
  ad_id: string | null;
  expected_value_cents: number | null;
};

export type AdRow = {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  /** Meta's effective delivery state: ACTIVE, PAUSED, CAMPAIGN_PAUSED, ... */
  effective_status: string;
  spendCents: number;
  /** Leads by Meta's own count. */
  platformLeads: number;
};

export type EmailTotals = {
  /** Automatic emails sent in the window. */
  sent: number;
  /** Emails a mail server accepted, by the delivery events on record. Null when they are not read. The base opens are measured against. */
  delivered: number | null;
  /** Emails with at least one open on record. Null when opens are not read. */
  opened: number | null;
  clicked: number | null;
  bounced: number | null;
  /** When the first delivery or open event was recorded. Null when none is on record. */
  trackedSince: string | null;
};

/** An ad needs this many leads before its cost is compared with another ad's. */
export const MIN_LEADS_TO_JUDGE = 10;
/** Form answers needed before the mix of lead quality gets a verdict. */
export const MIN_ANSWERS_TO_JUDGE = 8;
/** An ad that has spent this much with no lead is worth a look, whatever else is true. */
export const SPEND_WITHOUT_LEAD_CENTS = 7_500;
/** Delivered emails needed before the share opened gets a verdict. */
export const MIN_DELIVERED_TO_JUDGE = 50;
/** Days of open tracking needed before the share opened gets a verdict. */
export const MIN_TRACKING_DAYS = 7;
/** Leads with a call on the record needed before a wait is called typical. */
export const MIN_CALLS_FOR_TYPICAL = 3;
/** Unknown numbers saved as leads in the window before the board says to deal with them. */
export const UNKNOWN_CALLERS_TO_FLAG = 5;
/** The plan's own target: attempts in the first two days (three on day 0, two on day 1). */
export const ATTEMPTS_IN_48H_TARGET = FULL_CALL_PLAN.filter((s) => s.day <= 1).length;

const META_SOURCES = new Set(["meta_lead_ad", "facebook-lead-ad", "facebook_lead_ad"]);

function money(cents: number): string {
  const dollars = cents / 100;
  return dollars >= 100 ? `$${Math.round(dollars).toLocaleString("en-US")}` : `$${dollars.toFixed(2)}`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function waitLabel(minutes: number): string {
  if (minutes < 1) return "under a minute";
  if (minutes < 90) return plural(Math.round(minutes), "minute");
  if (minutes < 48 * 60) return plural(Math.round(minutes / 60), "hour");
  return plural(Math.round(minutes / 1440), "day");
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type Scorecard = { days: number; kpis: Kpi[]; signals: Signal[] };

/**
 * Build the scorecard for the last `days` days.
 *
 * `leads` are the real (non-test, not deleted) leads created in the window,
 * open or closed, without the unknown numbers the phone system saved; those
 * are counted in `unknownCallers`. `pace` is lib/nextAction.ts leadPace over
 * the same leads. `board` is the next-action board over every open lead.
 * `ads` is one row per ad for the same window, or null when Meta was not
 * read. `email` is null when the email history was not read.
 */
export function scorecard(input: {
  days: number;
  now: Date;
  leads: readonly ScoreLead[];
  pace: readonly LeadPace[];
  board: NextActionBoard;
  ads: readonly AdRow[] | null;
  email: EmailTotals | null;
  /** Records in the window that are an unknown number, not a named lead. */
  unknownCallers?: number;
}): Scorecard {
  const { days, now, leads, board, ads, email } = input;
  const unknownCallers = input.unknownCallers ?? 0;
  const nowMs = now.getTime();
  const paceById = new Map(input.pace.map((p) => [p.lead_id, p]));
  const signals: Signal[] = [];
  const kpis: Kpi[] = [];
  const windowWords = `the last ${days} days`;

  const metaLeads = leads.filter((l) => META_SOURCES.has(l.source ?? ""));
  const answered = leads.filter((l) => l.group !== null);
  const priority = answered.filter((l) => l.group === "priority");
  const fitCheck = answered.filter((l) => l.group === "fit_check");
  const proposals = leads.filter((l) => l.status === "proposal");
  const won = leads.filter((l) => l.status === "won");

  // ---------------------------------------------------------- the calls --
  // A lead less than an hour old has not had a fair chance to be called.
  const settled = leads.filter((l) => nowMs - Date.parse(l.created_at) >= 3_600_000);
  const withCall = settled.filter((l) => paceById.get(l.id)?.minutesToFirstCall !== null && paceById.get(l.id) !== undefined);
  const noCall = settled.length - withCall.length;
  const waits = withCall.map((l) => paceById.get(l.id)?.minutesToFirstCall).filter((m): m is number => typeof m === "number");
  const fast = waits.filter((m) => m <= FIRST_CALL_MINUTES).length;
  const typicalWait = median(waits);
  // A wait is only called typical when it is: at least three calls on the
  // record, on at least half the leads. Three logged calls out of sixty-six
  // (Oct 7, 2026) say the calls are not being logged, not that they are slow.
  const waitIsTypical = waits.length >= MIN_CALLS_FOR_TYPICAL && waits.length * 2 >= settled.length;
  const talked = leads.filter((l) => paceById.get(l.id)?.talked).length;

  kpis.push({
    key: "leads",
    label: "Leads in",
    value: String(leads.length),
    detail: `${leads.length === 0 ? `None in ${windowWords}.` : `${plural(metaLeads.length, "lead")} from Meta ads, ${windowWords}.`}${
      unknownCallers > 0 ? ` Not counted: ${plural(unknownCallers, "unknown number")} the phone line saved.` : ""
    }`,
    tone: "plain",
  });
  kpis.push({
    key: "speed",
    label: `Called inside ${FIRST_CALL_MINUTES} minutes`,
    value: settled.length === 0 ? "No leads yet" : `${fast} of ${settled.length}`,
    detail:
      typicalWait === null
        ? settled.length === 0
          ? "Nothing to call yet."
          : "No call is on the record for any of them."
        : // One or two calls are not a pattern, so they are counted and not called typical.
          `${
            waitIsTypical
              ? `Typical wait to the first call on the record: ${waitLabel(typicalWait)}.`
              : waits.length === 1
                ? `1 lead has a call on the record, ${waitLabel(typicalWait)} after the form.`
                : `${waits.length} leads have a call on the record. The middle one came ${waitLabel(typicalWait)} after the form.`
          }${noCall > 0 ? ` No call on the record for ${noCall}.` : ""}`,
    tone: settled.length > 0 && fast === settled.length ? "good" : settled.length > 0 ? "warn" : "plain",
  });
  kpis.push({
    key: "reached",
    label: "Talked to",
    value: leads.length === 0 ? "No leads yet" : `${talked} of ${leads.length}`,
    detail: "A call where somebody picked up, either direction. Voicemails and texts do not count.",
    tone: "plain",
  });
  kpis.push({
    key: "priority",
    label: "Priority leads",
    value: answered.length === 0 ? "Not asked" : `${priority.length} of ${answered.length}`,
    detail:
      answered.length === 0
        ? "No lead in the window answered the form questions."
        : "Owner or manager, ready to invest, wants jobs soon. Counted from the form answers.",
    tone: "plain",
  });
  kpis.push({
    key: "proposals",
    label: "At proposal",
    value: String(proposals.length),
    detail: proposals.length === 0 ? `No lead from ${windowWords} is at proposal.` : `${plural(won.length, "lead")} from the same window marked won.`,
    tone: "plain",
  });

  if (board.counts.reply > 0) {
    signals.push({
      id: "replies_owed",
      verdict: "fix",
      title: `${plural(board.counts.reply, "person", "people")} reached out with no reply on the record`,
      detail: "They texted, emailed or called, and nothing going back is on the record. A reply from a personal phone would not show here.",
      action: "Start at the top of Next actions. They contacted you first.",
    });
  }

  if (unknownCallers >= UNKNOWN_CALLERS_TO_FLAG) {
    signals.push({
      id: "unknown_callers",
      verdict: "fix",
      title: `${plural(unknownCallers, "unknown number")} were saved as leads`,
      detail: `Over ${windowWords}. The phone line makes a lead record for every number it does not know, sales calls and robocalls included. They are left out of the numbers here.`,
      action: "Open Unknown callers on Next actions. Put a name on the real ones and close the rest, so the call list shows leads.",
    });
  }

  if (settled.length > 0 && noCall > 0) {
    signals.push({
      id: "no_call_on_record",
      verdict: "fix",
      title: `No call is on the record for ${noCall} of ${settled.length} leads`,
      detail: `Counted over ${windowWords}. Either the calls are not being made, or they are made from a phone this back office cannot see.`,
      action: "Call from the LeadFlow line, or tap an outcome on the call card after every call. A call that is not on the record cannot be counted, and the plan cannot tell you what comes next.",
    });
  }

  if (typicalWait !== null && waitIsTypical) {
    if (typicalWait <= FIRST_CALL_MINUTES) {
      signals.push({
        id: "speed_good",
        verdict: "keep",
        title: "First calls are landing inside five minutes",
        detail: `Typical wait ${waitLabel(typicalWait)}, over ${plural(waits.length, "lead")} with a call on record.`,
        action: "Keep the phone next to you when ads are running.",
      });
    } else if (typicalWait > 60) {
      signals.push({
        id: "speed_slow",
        verdict: "fix",
        title: `The first call is coming ${waitLabel(typicalWait)} after the form`,
        detail: `Typical wait over ${plural(waits.length, "lead")} with a call on record. The plan is five minutes.`,
        action: "Turn on the instant text alert to your phones, and call before you do anything else.",
      });
    }
  }

  // Attempts in the first two days, for leads old enough to have had them and never reached.
  const twoDaysOld = leads.filter((l) => nowMs - Date.parse(l.created_at) >= 48 * 3_600_000 && !paceById.get(l.id)?.talked);
  if (twoDaysOld.length >= 3) {
    const total = twoDaysOld.reduce((sum, l) => sum + (paceById.get(l.id)?.attemptsIn48h ?? 0), 0);
    const average = total / twoDaysOld.length;
    // When most leads have no call on the record at all, "no call on the record" above has already said it once.
    const mostlyUnlogged = noCall * 2 > settled.length && average < 0.5;
    if (!mostlyUnlogged && average < ATTEMPTS_IN_48H_TARGET - 2) {
      signals.push({
        id: "too_few_attempts",
        verdict: "fix",
        title: `${average.toFixed(1)} call attempts on the record in a lead's first two days`,
        detail: `On average, over ${plural(twoDaysOld.length, "lead")} from ${windowWords} with no conversation on the record. The plan is ${ATTEMPTS_IN_48H_TARGET}.`,
        action: "Work the plan in order: three tries the day the form comes in, two the next day.",
      });
    } else if (average >= ATTEMPTS_IN_48H_TARGET - 1) {
      signals.push({
        id: "attempts_good",
        verdict: "keep",
        title: "Leads are getting chased hard in the first two days",
        detail: `${average.toFixed(1)} attempts on the record on average, over ${plural(twoDaysOld.length, "lead")} with no conversation yet. The plan is ${ATTEMPTS_IN_48H_TARGET}.`,
        action: "Keep it up through day five. The plan has a call on every one of those days.",
      });
    }
  }

  // This week's late work is one line; the backlog (more than a week late) is another, so neither hides the other.
  const late = board.today.filter((r) => r.kind !== "reply" && r.overdueHours >= 24);
  if (late.length > 0) {
    const lateProposals = late.filter((r) => r.kind === "proposal_follow_up" || r.kind === "proposal_decide").length;
    signals.push({
      id: "plan_behind",
      verdict: "fix",
      title: `${plural(late.length, "follow-up from this week is", "follow-ups from this week are")} more than a day late`,
      detail: lateProposals > 0 ? `${plural(lateProposals, "of them is a proposal", "of them are proposals")}, the closest money on the board.` : "Counted across every open lead on the plan.",
      action: "Clear proposals first, then promised calls, then first calls.",
    });
  }

  if (board.backlog.length > 0) {
    const promised = board.backlog.filter((r) => r.kind === "callback" || r.kind === "booked_passed").length;
    signals.push({
      id: "backlog",
      verdict: "watch",
      title: `${plural(board.backlog.length, "follow-up is", "follow-ups are")} more than a week late`,
      detail:
        promised > 0
          ? `${plural(promised, "of them is a follow-up date", "of them are follow-up dates")} that passed with nothing on the record since. They sit under today's work, not on top of it.`
          : "They sit under today's work, not on top of it.",
      action: "Work today's list first. Then give each old one a call, or close it.",
    });
  }

  if (board.counts.stale > 0) {
    signals.push({
      id: "stale",
      verdict: "watch",
      title: `${plural(board.counts.stale, "old lead is", "old leads are")} past the end of the plan`,
      detail: "No call on the record, or nothing on the record for more than a month.",
      action: "Give each one call, or close it, so the list shows live leads.",
    });
  }

  // ---------------------------------------------------- who the ad pulls --
  if (answered.length > 0 && answered.length < MIN_ANSWERS_TO_JUDGE) {
    signals.push({
      id: "quality_early",
      verdict: "watch",
      title: `${priority.length} of ${answered.length} form leads are priority`,
      detail: `Only ${plural(answered.length, "lead")} answered the form questions in ${windowWords}. That is not enough to judge the ad by.`,
      action: `Wait for ${MIN_ANSWERS_TO_JUDGE} answers before changing who the ad talks to.`,
    });
  } else if (answered.length >= MIN_ANSWERS_TO_JUDGE) {
    const share = priority.length / answered.length;
    const notOwners = fitCheck.length / answered.length;
    if (notOwners >= 0.25) {
      signals.push({
        id: "quality_not_owners",
        verdict: "less",
        title: `${fitCheck.length} of ${answered.length} form leads are not owners`,
        detail: `Employees and people looking to hire a contractor, over ${windowWords}.`,
        action: "Say who the ad is for in its first line, and put the owner question first on the form.",
      });
    }
    if (share >= 0.3) {
      signals.push({
        id: "quality_good",
        verdict: "more",
        title: `${priority.length} of ${answered.length} form leads are priority`,
        detail: `Owner or manager, says yes to the investment, wants jobs soon. Over ${windowWords}. That is what they answered on the form, not a sale.`,
        action: "Keep the ad's message, and put the calls on these leads first.",
      });
    } else if (share < 0.15) {
      signals.push({
        id: "quality_low",
        verdict: "less",
        title: `Only ${priority.length} of ${answered.length} form leads are priority`,
        detail: `Over ${windowWords}. Most are not ready to invest or are looking further out.`,
        action: "Say the starting investment in the ad, so the people who fill out the form already know it.",
      });
    }
  }

  // -------------------------------------------------------------- the ads --
  if (ads !== null) {
    const running = ads.filter((a) => a.effective_status === "ACTIVE");
    const spendCents = ads.reduce((sum, a) => sum + a.spendCents, 0);
    const platformLeads = ads.reduce((sum, a) => sum + a.platformLeads, 0);
    kpis.push({
      key: "spend",
      label: "Ad spend",
      value: money(spendCents),
      detail: `${plural(platformLeads, "lead")} by Meta's count, ${windowWords}.`,
      tone: "plain",
    });
    kpis.push({
      key: "cost_per_priority",
      label: "Spend per priority lead",
      value: priority.length > 0 ? money(Math.round(spendCents / priority.length)) : "None yet",
      detail: priority.length > 0 ? "Ad spend divided by priority leads from the form answers." : "No priority lead in the window to divide by.",
      tone: "plain",
    });
    kpis.push({
      key: "cost_per_proposal",
      label: "Spend per proposal",
      value: proposals.length > 0 ? money(Math.round(spendCents / proposals.length)) : "None yet",
      detail: proposals.length > 0 ? "Ad spend divided by leads from the window now at proposal." : "No lead from the window is at proposal yet.",
      tone: "plain",
    });

    if (running.length === 0) {
      signals.push({
        id: "no_ads",
        verdict: "fix",
        title: "No ad is running",
        detail: "Meta shows no ad delivering on the LeadFlow account right now.",
        action: "Turn an ad on. Until then the only new leads are the ones who find you on their own.",
      });
    }

    for (const ad of running) {
      if (ad.platformLeads === 0 && ad.spendCents >= SPEND_WITHOUT_LEAD_CENTS) {
        signals.push({
          id: `ad_no_leads_${ad.ad_id}`,
          verdict: "less",
          title: `"${ad.ad_name}" has spent ${money(ad.spendCents)} with no lead`,
          detail: `Over ${windowWords}, by Meta's count.`,
          action: "Pause it, or change the first line and the picture.",
        });
      }
    }

    const judged = running.filter((a) => a.platformLeads >= MIN_LEADS_TO_JUDGE && a.spendCents > 0);
    if (judged.length >= 2) {
      const ranked = judged.map((a) => ({ ad: a, cpl: a.spendCents / a.platformLeads })).sort((x, y) => x.cpl - y.cpl);
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      if (worst.cpl >= best.cpl * 1.3) {
        signals.push({
          id: "ad_winner",
          verdict: "more",
          title: `"${best.ad.ad_name}" is bringing leads for less`,
          detail: `${money(Math.round(best.cpl))} a lead over ${best.ad.platformLeads}, against ${money(Math.round(worst.cpl))} a lead over ${worst.ad.platformLeads} on "${worst.ad.ad_name}".`,
          action: "Check which one brought the priority leads before moving money. The cheaper lead is not always the better one.",
        });
      }
    } else {
      const withLeads = running.filter((a) => a.platformLeads > 0);
      if (withLeads.length >= 2) {
        signals.push({
          id: "ads_early",
          verdict: "watch",
          title: "No winning ad yet",
          detail: `${withLeads.map((a) => `"${a.ad_name}": ${plural(a.platformLeads, "lead")}`).join(". ")}.`,
          action: `Wait for ${MIN_LEADS_TO_JUDGE} leads on each before moving money between them.`,
        });
      }
    }

    // Quality by ad needs the ad on the lead. Until most leads carry it, say so.
    const withAd = metaLeads.filter((l) => l.ad_id);
    if (metaLeads.length >= 3 && withAd.length / metaLeads.length < 0.6) {
      signals.push({
        id: "ad_not_recorded",
        verdict: "watch",
        title: `The ad is recorded on ${withAd.length} of ${metaLeads.length} Meta leads`,
        detail: "Without it the board cannot say which ad brought the priority leads.",
        action: "Nothing to do by hand. Leads that arrived after Meta's reporting access was added carry the ad.",
      });
    } else if (withAd.length >= MIN_ANSWERS_TO_JUDGE) {
      const byAd = new Map<string, { total: number; priority: number }>();
      for (const l of withAd) {
        const row = byAd.get(l.ad_id as string) ?? { total: 0, priority: 0 };
        row.total += 1;
        if (l.group === "priority") row.priority += 1;
        byAd.set(l.ad_id as string, row);
      }
      const named = [...byAd.entries()]
        .map(([adId, row]) => ({ ad: ads.find((a) => a.ad_id === adId), ...row }))
        .filter((r) => r.ad && r.total >= 4)
        .sort((x, y) => y.priority / y.total - x.priority / x.total);
      if (named.length >= 2 && named[0].priority > 0 && named[0].priority / named[0].total >= 2 * (named[named.length - 1].priority / named[named.length - 1].total || 0.01)) {
        const top = named[0];
        signals.push({
          id: "ad_quality_winner",
          verdict: "more",
          title: `"${top.ad?.ad_name}" is bringing the priority leads`,
          detail: `${top.priority} of its ${top.total} leads are priority, over ${windowWords}.`,
          action: "Lean the budget toward it, and write the next ad from its first line.",
        });
      }
    }
  }

  // ------------------------------------------------------------ the email --
  // Opens are measured against delivered emails, never against emails sent:
  // on Oct 7, 2026 delivery and open events had been recorded for one day,
  // and six opens against a week of sends read as 2% when the tracked base
  // said nothing of the kind.
  if (email !== null && email.sent > 0) {
    const delivered = email.delivered ?? 0;
    const trackedMs = Date.parse(email.trackedSince ?? "");
    const trackingDays = Number.isFinite(trackedMs) ? (nowMs - trackedMs) / 86_400_000 : null;
    if (email.opened === null) {
      // Opens were not read at all: say nothing about them.
    } else if (delivered === 0 && email.opened === 0 && email.sent >= 30) {
      signals.push({
        id: "email_opens_missing",
        verdict: "fix",
        title: "No email delivery or open is on the record",
        detail: `${plural(email.sent, "automatic email")} went out in ${windowWords} and none shows as delivered or opened. That points to the events not being recorded, rather than to nobody opening one.`,
        action: "Check that open tracking is on for the sending domain in Resend, and that its webhook points at this site.",
      });
    } else if (delivered >= MIN_DELIVERED_TO_JUDGE) {
      const rate = email.opened / delivered;
      const counted = `${email.opened} of ${delivered} delivered emails show as opened`;
      if (trackingDays !== null && trackingDays < MIN_TRACKING_DAYS) {
        signals.push({
          id: "email_tracking_new",
          verdict: "watch",
          title: `Email tracking is ${trackingDays < 1.5 ? "one day" : `${Math.round(trackingDays)} days`} old`,
          detail: `${counted} so far. Emails sent before tracking began are not in that count.`,
          action: `Give it ${MIN_TRACKING_DAYS} days before judging the subject lines.`,
        });
      } else if (rate < 0.15) {
        signals.push({
          id: "email_opens_low",
          verdict: "fix",
          title: `${Math.round(rate * 100)}% of delivered emails show as opened`,
          detail: `${counted} in ${windowWords}. Open counts are approximate: a mail app can hide an open, or record one nobody made.`,
          action: "Look at where the emails are landing and at the subject lines.",
        });
      } else if (rate >= 0.35) {
        signals.push({
          id: "email_opens_good",
          verdict: "keep",
          title: `${Math.round(rate * 100)}% of delivered emails show as opened`,
          detail: `${counted} in ${windowWords}.`,
          action: "The Next actions list shows who opened. Put those calls first.",
        });
      }
    }
    const bounceBase = delivered > 0 && email.bounced !== null ? delivered + email.bounced : email.sent;
    if (email.bounced !== null && bounceBase >= 30 && email.bounced / bounceBase > 0.05) {
      signals.push({
        id: "email_bounces",
        verdict: "fix",
        title: `${email.bounced} of ${bounceBase} emails bounced`,
        detail: `Over ${windowWords}. Mail providers count bounces against the sender.`,
        action: "Those leads are phone only. Check the form is collecting real addresses.",
      });
    }
  }

  signals.sort((a, b) => VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict));
  return { days, kpis, signals };
}
