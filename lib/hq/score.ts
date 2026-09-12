import { OPEN_STATUSES, type Lead } from "./types";
import { minutesBetween } from "./time";

// Who to call first. The score is a ranking, not a prediction: it puts the
// hottest, freshest, most reachable lead at the top of the list and says
// why in one line. Nothing here claims a close rate.

const HOT_WORDS = [
  "today",
  "asap",
  "urgent",
  "emergency",
  "now",
  "quote",
  "estimate",
  "price",
  "how much",
  "book",
  "schedule",
  "appointment",
  "leak",
  "broken",
  "not working",
  "ready",
  "this week",
  "tomorrow",
];

export type ScoredLead = { lead: Lead; score: number; reasons: string[] };

export function scoreLead(lead: Lead, now = new Date()): ScoredLead {
  const reasons: string[] = [];
  let score = 0;

  if (!OPEN_STATUSES.includes(lead.status)) {
    return { lead, score: 0, reasons: ["closed"] };
  }

  const ageMin = Math.max(0, minutesBetween(new Date(lead.created_at), now));
  if (lead.status === "new") {
    if (ageMin <= 15) {
      score += 45;
      reasons.push("brand new, answer in the first minutes");
    } else if (ageMin <= 60) {
      score += 40;
      reasons.push("new within the hour");
    } else if (ageMin <= 60 * 24) {
      score += 32;
      reasons.push("new today, still waiting");
    } else if (ageMin <= 60 * 24 * 7) {
      score += 22;
      reasons.push("uncontacted for days");
    } else {
      score += 10;
      reasons.push("old and never contacted");
    }
  }

  if (lead.status === "quoted") {
    score += 30;
    reasons.push("quote out, decision pending");
  }
  if (lead.status === "contacted") {
    score += 18;
    reasons.push("in conversation");
  }

  if (lead.next_follow_up_at && new Date(lead.next_follow_up_at).getTime() <= now.getTime()) {
    score += 20;
    reasons.push("follow-up is due");
  }

  const text = `${lead.message ?? ""} ${lead.service ?? ""} ${lead.notes ?? ""}`.toLowerCase();
  const hits = HOT_WORDS.filter((w) => text.includes(w));
  if (hits.length) {
    score += Math.min(15, 6 + hits.length * 3);
    reasons.push(`said "${hits[0]}"`);
  }

  if (lead.phone) {
    score += 8;
    reasons.push("has a phone number");
  } else if (lead.email) {
    score += 3;
  }

  if (lead.source === "call" || lead.source === "sms") {
    score += 7;
    reasons.push("reached out by phone");
  } else if (lead.source === "meta") {
    score += 4;
    reasons.push("came from an ad");
  }

  if (lead.value_cents && lead.value_cents >= 100_000) {
    score += 6;
    reasons.push("bigger job");
  }

  if (lead.unsubscribed_at) {
    score = Math.min(score, 25);
    reasons.unshift("opted out of texts, call instead");
  }

  return { lead, score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0, 3) };
}

export function rankLeads(leads: Lead[], now = new Date()): ScoredLead[] {
  return leads
    .map((l) => scoreLead(l, now))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.lead.created_at.localeCompare(b.lead.created_at));
}
