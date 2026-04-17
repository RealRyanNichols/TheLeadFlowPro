/**
 * Know-Like-Trust scripts library.
 * Every outreach moment falls into one of three phases:
 *   Know  — first impression. They don't know you exist yet.
 *   Like  — they know your name. Now they need a reason to care.
 *   Trust — they like you. Now they need proof you'll deliver.
 *
 * Variables in {curly_braces} get filled in by the app at send time.
 */
export type ScriptPhase = "know" | "like" | "trust";
export type ScriptChannel = "sms" | "dm" | "email" | "voicemail";
export type ScriptKind =
  | "intro"
  | "missed_call"
  | "lead_followup"
  | "appt_reminder"
  | "review_request"
  | "reengagement"
  | "referral_ask"
  | "winback";

export interface Script {
  id: string;
  phase: ScriptPhase;
  kind: ScriptKind;
  channel: ScriptChannel;
  title: string;
  when: string;
  body: string;
  why: string;
  tags: string[];
}

export const PHASE_META: Record<ScriptPhase, { label: string; blurb: string; tone: string }> = {
  know:  { label: "Know",  blurb: "They just found you. Keep it human, keep it short.",       tone: "text-cyan-400  bg-cyan-500/10  border-cyan-500/30" },
  like:  { label: "Like",  blurb: "They remember you. Give them a reason to lean in.",        tone: "text-accent-400 bg-accent-500/10 border-accent-500/30" },
  trust: { label: "Trust", blurb: "They're close. Show proof and make it easy to say yes.",  tone: "text-lead-400   bg-lead-500/10   border-lead-500/30"  }
};

export const KIND_LABEL: Record<ScriptKind, string> = {
  intro:          "First intro",
  missed_call:    "Missed call text-back",
  lead_followup:  "New lead follow-up",
  appt_reminder:  "Appointment reminder",
  review_request: "Review request",
  reengagement:   "Cold lead re-engagement",
  referral_ask:   "Ask for a referral",
  winback:        "Win-back"
};

export const CHANNEL_LABEL: Record<ScriptChannel, string> = {
  sms:       "SMS",
  dm:        "DM",
  email:     "Email",
  voicemail: "Voicemail"
};

export const SCRIPTS: Script[] = [
  // ── KNOW ────────────────────────────────────────────────────
  {
    id: "k1",
    phase: "know",
    kind: "missed_call",
    channel: "sms",
    title: "Missed call — instant text-back",
    when: "Fires within 60 seconds of a missed call",
    body:
`Hey {first_name}, this is {business_name} — sorry we missed you! We're with another customer right now. Quickest way to get you answers: text me back here or grab a time at {booking_link}.`,
    why: "Most customers call 2–3 businesses. First responder wins. A text within 5 minutes is 21× more likely to convert than one sent 30 minutes later.",
    tags: ["urgent", "high-converting"]
  },
  {
    id: "k2",
    phase: "know",
    kind: "lead_followup",
    channel: "sms",
    title: "New lead — 2-minute follow-up",
    when: "Fires 2 minutes after a form fill or ad lead",
    body:
`Hi {first_name}! Thanks for reaching out to {business_name}. I saw you were interested in {topic}. Do you have 60 seconds to tell me what you're hoping to solve? I'll send you the exact info you need — no pressure, no spam.`,
    why: "Leads contacted within 5 minutes are 9× more likely to convert. Asking a question (instead of pitching) opens a real conversation.",
    tags: ["high-converting", "question-based"]
  },
  {
    id: "k3",
    phase: "know",
    kind: "intro",
    channel: "dm",
    title: "Instagram DM — someone just followed",
    when: "Fires when a new follower interacts with a post",
    body:
`Hey {first_name}! Saw you liked the {post_topic} post — thanks for the follow. Quick question: are you local to {city}, or following for content? Just curious what brought you in 👋`,
    why: "Engagement replies to DMs at 5× the rate of cold outreach. One casual question beats a sales pitch every time.",
    tags: ["soft-touch", "relationship"]
  },
  {
    id: "k4",
    phase: "know",
    kind: "intro",
    channel: "voicemail",
    title: "Ringless voicemail — first touch",
    when: "Use for lead lists where you have phone numbers only",
    body:
`Hey {first_name}, this is {your_name} with {business_name}. No need to call me back — I just wanted to drop you a quick hello and let you know we're here if you ever need {service}. If you're curious, shoot me a text at this number. Have a great day.`,
    why: "Ringless voicemail gets 20–30% callback rates when it feels human and doesn't pitch. No ask = no resistance.",
    tags: ["soft-touch", "no-pitch"]
  },

  // ── LIKE ────────────────────────────────────────────────────
  {
    id: "l1",
    phase: "like",
    kind: "lead_followup",
    channel: "sms",
    title: "No-reply bump after 24 hours",
    when: "Lead didn't reply to first message after 24h",
    body:
`Hey {first_name} — still thinking about {topic}? I put together a quick 45-second video that covers the 3 most common questions. Want me to send it over? It'll save us both a long conversation.`,
    why: "A clear offer of value (a video, a guide) beats 'just checking in.' Gives a reason to reply beyond 'yes/no.'",
    tags: ["re-engagement", "video"]
  },
  {
    id: "l2",
    phase: "like",
    kind: "lead_followup",
    channel: "sms",
    title: "The story bump (relatable)",
    when: "2–3 days of no reply",
    body:
`{first_name}, just thought of you. We had a customer last week with a really similar situation — {brief_story}. I'll leave it at that. If you want the details, just text 'YES' and I'll send the 2-minute version.`,
    why: "Story breaks through noise. Specifics (last week, similar situation) signal you remember them, not a broadcast.",
    tags: ["story", "social-proof"]
  },
  {
    id: "l3",
    phase: "like",
    kind: "reengagement",
    channel: "dm",
    title: "Cold lead re-engagement (DM)",
    when: "14+ days of silence",
    body:
`{first_name}! I know it's been a minute. Totally understand if now's not the right time. Just in case it's still on your mind — we're running {current_offer} this month. If timing's off, no worries at all, just didn't want to assume.`,
    why: "Giving permission to say no ('no worries at all') removes pressure — and doubles reply rates in most tests.",
    tags: ["low-pressure", "permission-to-say-no"]
  },
  {
    id: "l4",
    phase: "like",
    kind: "appt_reminder",
    channel: "sms",
    title: "Appointment reminder — day before",
    when: "24 hours before appointment",
    body:
`Hi {first_name}! Just confirming {business_name} tomorrow at {appt_time}. Reply 'C' to confirm or 'R' if you need to reschedule. Looking forward to seeing you! Parking: {parking_note}`,
    why: "One-touch confirm ('C' / 'R') cuts no-shows by 30–40%. Parking note reduces friction on arrival.",
    tags: ["reduces-no-shows", "one-touch"]
  },

  // ── TRUST ───────────────────────────────────────────────────
  {
    id: "t1",
    phase: "trust",
    kind: "review_request",
    channel: "sms",
    title: "Review request — day after service",
    when: "24 hours after completed appointment or purchase",
    body:
`Hey {first_name}! Hope everything went great yesterday. Quick favor — if {business_name} earned it, could you leave us a Google review? It takes 30 seconds and it massively helps us: {review_link} 🙏 And if anything wasn't 5-star, please tell me first so I can fix it.`,
    why: "'Tell me first if it wasn't 5-star' catches bad reviews before they go public AND shows you care. Drives 3–4× the public reviews.",
    tags: ["reviews", "reputation"]
  },
  {
    id: "t2",
    phase: "trust",
    kind: "referral_ask",
    channel: "sms",
    title: "Referral ask — happy customer",
    when: "7–14 days after a successful outcome",
    body:
`{first_name}, glad you're happy with how {service} turned out. One ask: know anyone else who could use a {service_short}? I'll take great care of them — and I'll send you a {referral_reward} as a thank-you for every one that books.`,
    why: "Happy customers referred-once refer again. Naming a concrete reward (not 'a gift') triples referral rates.",
    tags: ["referrals", "rewards"]
  },
  {
    id: "t3",
    phase: "trust",
    kind: "lead_followup",
    channel: "sms",
    title: "The objection-killer",
    when: "Lead stalled after pricing conversation",
    body:
`{first_name}, I get it — {price_objection} is the #1 thing people weigh. Here's what I usually say: {reframe}. Plus we offer {payment_option}. Want me to walk through the numbers on a 5-minute call? Free, no pressure — {booking_link}`,
    why: "Acknowledging the objection ('I get it') beats defending the price. Offering a tool (payment plan) and an easy next step (5-min call) beats a hard close.",
    tags: ["price-objection", "reframe"]
  },
  {
    id: "t4",
    phase: "trust",
    kind: "winback",
    channel: "email",
    title: "Win-back email — former customer",
    when: "Previous customer hasn't returned in 6+ months",
    body:
`Hi {first_name},

Noticed it's been a bit since we saw you at {business_name}. No pressure at all — just wanted to check in. A lot has changed on our end: {new_thing}.

If you'd like to come back, reply to this email and I'll personally set up your next appointment — and as a thank-you for being a returning customer, {winback_offer}.

If you've moved on, I totally get it. Either way — thanks for trusting us once. Meant a lot.

— {your_name}`,
    why: "Personal, low-pressure, names something new. Most win-back emails fail because they feel like marketing — this one reads like a human.",
    tags: ["winback", "personal"]
  },
  {
    id: "t5",
    phase: "trust",
    kind: "appt_reminder",
    channel: "sms",
    title: "Day-of confirmation with prep",
    when: "Morning of appointment",
    body:
`Good morning {first_name}! Can't wait to see you at {appt_time} today. Two quick things to save time: {prep_item_1} and {prep_item_2}. Address: {address}. Text me if anything comes up!`,
    why: "Prep notes = less time in your chair = more customers per day. Day-of text also catches last-minute conflicts earlier.",
    tags: ["day-of", "operational"]
  }
];

export function scriptsByPhase(phase: ScriptPhase) {
  return SCRIPTS.filter((s) => s.phase === phase);
}
