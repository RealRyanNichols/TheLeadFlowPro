// Butterfly-effect playbook engine.
// Each step has a set of "next moves" the user picks from. After they confirm
// the action, the chosen move's nextId advances the state — which exposes a
// different set of moves based on what actually happened. One choice changes
// the timeline.

export type VerifyKind = "auto" | "self" | "timer";

export type NextMove = {
  id: string;           // id of the step this move leads to
  label: string;        // short CTA text: "Text 20 past patients"
  detail?: string;      // one-line consequence preview
  vibe: "good" | "neutral" | "bad" | "bold";
};

export type Step = {
  id: string;
  situation: string;         // "You have 6 open slots this Thursday."
  why: string;               // why this matters right now
  action?: string;           // the concrete thing they should do
  script?: string;           // copy-pasteable text/script
  verify: VerifyKind;
  verifyHint: string;        // "We'll check your SMS log for outbound texts"
  moves: NextMove[];
  terminal?: "win" | "loss" | "pause";
};

export type Playbook = {
  id: string;
  title: string;
  industry: string;
  goal: string;
  duration: string;          // "3–5 days"
  difficulty: "easy" | "medium" | "spicy";
  rootStepId: string;
  steps: Record<string, Step>;
};

// -----------------------------------------------------------------------------
// PB-1: Dental — Fill a slow week (fully branched showcase)
// -----------------------------------------------------------------------------
const fillSlowWeek: Playbook = {
  id: "dental-fill-slow-week",
  title: "Fill a slow Thursday",
  industry: "Dental / cosmetic",
  goal: "Fill 6 empty hygiene slots this week",
  duration: "2–3 days",
  difficulty: "easy",
  rootStepId: "start",
  steps: {
    start: {
      id: "start",
      situation: "You have 6 open slots this Thursday and Friday.",
      why: "Empty chairs are pure lost revenue. One hour empty ≈ $180 gone.",
      verify: "self",
      verifyHint: "Confirm you checked the schedule.",
      moves: [
        {
          id: "text-past-patients",
          label: "Text 20 past patients with a last-minute offer",
          detail: "Highest reply rate (we see ~22%). Good first move.",
          vibe: "good"
        },
        {
          id: "post-ig-story",
          label: "Post an IG story with a same-week promo",
          detail: "Wider reach, slower response. Works if you have 2k+ followers.",
          vibe: "neutral"
        },
        {
          id: "call-insurance-verif",
          label: "Call the 8 leads with unverified insurance",
          detail: "Removes the #1 booking blocker.",
          vibe: "bold"
        }
      ]
    },

    // ---- Branch A: SMS blast ------------------------------------------------
    "text-past-patients": {
      id: "text-past-patients",
      situation: "Send this to 20 patients who haven't been in for 7+ months.",
      why: "Warm list. They already trust you — they just forgot to rebook.",
      action: "Copy the script below, send from your SMS tool (or Lead Inbox).",
      script: "Hey {first_name} — it's been a bit! We have two openings this Thursday + Friday and I saved one for you. Reply YES and I'll lock it in. — {your_name}",
      verify: "auto",
      verifyHint: "We'll verify by counting outbound messages in your Lead Inbox in the last 2h.",
      moves: [
        {
          id: "sms-good-reply",
          label: "5+ replied — now work the hot ones",
          detail: "Book the yeses, send a video to the maybes.",
          vibe: "good"
        },
        {
          id: "sms-low-reply",
          label: "0–2 replied — warm up the cold list instead",
          detail: "Pivot to a follow-up video + offer.",
          vibe: "neutral"
        },
        {
          id: "sms-got-ghosted",
          label: "Got no replies at all — reset & retarget",
          detail: "Something was off: timing, tone, or list. We'll diagnose.",
          vibe: "bad"
        }
      ]
    },

    "sms-good-reply": {
      id: "sms-good-reply",
      situation: "You got replies. Now speed matters — every 10min you wait cuts close-rate ~7%.",
      why: "Hot leads cool fast. Book them before the day ends.",
      verify: "self",
      verifyHint: "Mark done once you've texted back every YES with a time.",
      moves: [
        {
          id: "send-prep-video",
          label: "Send pre-appointment video to everyone who booked",
          detail: "Drops no-show rate ~30%. Builds rapport before they walk in.",
          vibe: "good"
        },
        {
          id: "followup-maybes",
          label: "Send the 'maybe' replies a 15-sec GIF explaining financing",
          detail: "Removes the #1 cosmetic-case blocker.",
          vibe: "good"
        },
        {
          id: "end-win",
          label: "All booked — declare victory",
          detail: "Close the playbook and log what worked.",
          vibe: "bold"
        }
      ]
    },

    "sms-low-reply": {
      id: "sms-low-reply",
      situation: "Low response. Most likely: list was cold, or the offer wasn't urgent enough.",
      why: "Not every list converts on a first ping. Stack a warm-up touch before asking again.",
      verify: "self",
      verifyHint: "Confirm you've sent the follow-up.",
      moves: [
        {
          id: "send-video-followup",
          label: "Send a 30-sec personal video to the non-responders",
          detail: "Moves reply rate from ~5% to ~18% on cold lists.",
          vibe: "good"
        },
        {
          id: "pivot-to-ads",
          label: "Pivot: boost a before/after reel to a 10-mi radius",
          detail: "Opens a cold-traffic lane while the list cools.",
          vibe: "neutral"
        }
      ]
    },

    "sms-got-ghosted": {
      id: "sms-got-ghosted",
      situation: "Zero replies from 20 texts is a signal, not a failure.",
      why: "Usually one of three things: wrong list, wrong hour, wrong offer. Diagnose before retrying.",
      verify: "self",
      verifyHint: "Pick the likely reason so we can adjust your next move.",
      moves: [
        {
          id: "pivot-to-ads",
          label: "List is stale — switch to paid reach",
          detail: "Start a small boost to new eyeballs.",
          vibe: "neutral"
        },
        {
          id: "post-ig-story",
          label: "Try the organic lane — IG story with the same offer",
          detail: "Different audience, same ask.",
          vibe: "neutral"
        }
      ]
    },

    "send-prep-video": {
      id: "send-prep-video",
      situation: "Fire a short prep video to each new booking — in your voice, by name.",
      why: "They show up warmer. Staff's day runs smoother. Stars in reviews later.",
      action: "Pull a video from your Video & GIF library or record a fresh 20-sec one.",
      verify: "auto",
      verifyHint: "We'll detect attachment sends from your Lead Inbox.",
      moves: [
        {
          id: "end-win",
          label: "Done — close this playbook",
          detail: "You filled chairs AND prepped the patients. Double win.",
          vibe: "good"
        },
        {
          id: "followup-maybes",
          label: "While you're at it — nudge the maybes",
          detail: "Same momentum, new conversation.",
          vibe: "neutral"
        }
      ]
    },

    "followup-maybes": {
      id: "followup-maybes",
      situation: "Send a 15-second GIF or clip explaining 0% financing to everyone who replied 'maybe'.",
      why: "Cosmetic cases stall on price 8 times out of 10. Remove that blocker proactively.",
      action: "Use the 'Financing explainer' clip in your Video & GIF library.",
      verify: "self",
      verifyHint: "Mark done once sent.",
      moves: [
        {
          id: "end-win",
          label: "All maybes nudged — wrap up",
          vibe: "good"
        }
      ]
    },

    "send-video-followup": {
      id: "send-video-followup",
      situation: "Send a 30-sec personal video to anyone who didn't reply.",
      why: "Video beats text on cold lists. You become a real person, not a number.",
      action: "Record once, send to all non-responders with a first-name merge.",
      verify: "auto",
      verifyHint: "We'll count outbound video attachments.",
      moves: [
        {
          id: "sms-good-reply",
          label: "Got fresh replies — go work them",
          vibe: "good"
        },
        {
          id: "pivot-to-ads",
          label: "Still quiet — open the paid lane",
          vibe: "neutral"
        }
      ]
    },

    "pivot-to-ads": {
      id: "pivot-to-ads",
      situation: "Run a $25 boost on a before/after reel to a 10-mile radius for 48 hours.",
      why: "When your list is cold, rent some attention. Cheapest learning in marketing.",
      action: "Use Ad Copy Generator → pick 'Same-week openings' → Meta Boost.",
      verify: "timer",
      verifyHint: "Come back in 48h — we'll pull results automatically.",
      moves: [
        {
          id: "sms-good-reply",
          label: "Got 3+ leads from the boost — work them like hot replies",
          vibe: "good"
        },
        {
          id: "end-pause",
          label: "Pause the playbook — revisit next week",
          vibe: "neutral"
        }
      ]
    },

    // ---- Branch B: IG story -------------------------------------------------
    "post-ig-story": {
      id: "post-ig-story",
      situation: "Post a story at 7pm with a 'Thursday/Friday openings — DM me' prompt.",
      why: "7pm is peak saves. Stories are low-effort, high-reply.",
      action: "Record a 10-sec clip. Sticker: countdown + DM prompt.",
      verify: "auto",
      verifyHint: "We'll detect the new story via your Instagram connection.",
      moves: [
        {
          id: "sms-good-reply",
          label: "Got DMs — go work them like hot replies",
          vibe: "good"
        },
        {
          id: "text-past-patients",
          label: "Crickets — stack a text blast on top",
          vibe: "neutral"
        }
      ]
    },

    // ---- Branch C: insurance calls -----------------------------------------
    "call-insurance-verif": {
      id: "call-insurance-verif",
      situation: "Call the 8 leads whose insurance you haven't verified yet.",
      why: "Insurance ambiguity is the #1 reason a quote ghosts. One call removes that wall.",
      action: "Call, verify, text them the out-of-pocket number with a booking link.",
      verify: "auto",
      verifyHint: "We'll count outbound calls on your number.",
      moves: [
        {
          id: "sms-good-reply",
          label: "3+ verified & interested — book them",
          vibe: "good"
        },
        {
          id: "text-past-patients",
          label: "Insurance walls cleared — now work the past-patient list too",
          vibe: "neutral"
        }
      ]
    },

    // ---- Terminal nodes -----------------------------------------------------
    "end-win": {
      id: "end-win",
      situation: "Playbook complete. Chairs filled, patients prepped, momentum on your side.",
      why: "We'll log what worked here and surface it next time the schedule dips.",
      verify: "self",
      verifyHint: "Close the playbook.",
      moves: [],
      terminal: "win"
    },

    "end-pause": {
      id: "end-pause",
      situation: "Paused. Not every play works on the first run.",
      why: "We'll remember where you left off. Pick it back up when the data changes.",
      verify: "self",
      verifyHint: "Come back anytime.",
      moves: [],
      terminal: "pause"
    }
  }
};

// -----------------------------------------------------------------------------
// Stubs — short version, just a starting node and a couple of moves
// -----------------------------------------------------------------------------
const coldLeadReengage: Playbook = {
  id: "cold-lead-reengage",
  title: "Wake up a cold lead list",
  industry: "Any service business",
  goal: "Pull re-engagement from 60-day-dark leads",
  duration: "1 week",
  difficulty: "medium",
  rootStepId: "start",
  steps: {
    start: {
      id: "start",
      situation: "You have 47 leads who went dark 60+ days ago.",
      why: "Dead leads aren't dead — they're forgotten. Re-ignition costs nothing.",
      verify: "self",
      verifyHint: "Confirm you've pulled the list.",
      moves: [
        {
          id: "send-new-news",
          label: "Send a 'what's new' video with one fresh offer",
          detail: "Shows momentum. Gets 6–12% to reply.",
          vibe: "good"
        },
        {
          id: "ask-for-feedback",
          label: "Ask for feedback — no pitch, just a real question",
          detail: "Lowers their guard. The ones who reply re-enter the funnel warm.",
          vibe: "neutral"
        }
      ]
    },
    "send-new-news": {
      id: "send-new-news",
      situation: "Record a 45-second update: what's new + one limited offer.",
      why: "The offer isn't the ask — the video is. Seeing your face restarts the relationship.",
      verify: "auto",
      verifyHint: "We'll detect outbound video sends to the cold list.",
      moves: [],
      terminal: "pause"
    },
    "ask-for-feedback": {
      id: "ask-for-feedback",
      situation: "Send this: 'Hey {first_name} — quick one. When you looked at us before, what almost got you to book? Just curious, no pitch.'",
      why: "Disarms. People love being asked. You get real reasons to fix.",
      verify: "auto",
      verifyHint: "We'll count the outbound texts.",
      moves: [],
      terminal: "pause"
    }
  }
};

const contractorFirstJob: Playbook = {
  id: "contractor-first-job-this-week",
  title: "Close a first job this week",
  industry: "Contractor / home services",
  goal: "Book 1 paid job in 5 days from scratch",
  duration: "5 days",
  difficulty: "spicy",
  rootStepId: "start",
  steps: {
    start: {
      id: "start",
      situation: "No leads. No list. Just a truck and a phone.",
      why: "Fastest path: be visible in local groups, offer one narrow service, stack trust fast.",
      verify: "self",
      verifyHint: "Confirm you're ready to go.",
      moves: [
        {
          id: "post-in-3-groups",
          label: "Post an intro + offer in 3 local FB groups",
          detail: "Cold but fast. Works in 48h if you're specific.",
          vibe: "good"
        },
        {
          id: "door-knock",
          label: "Door-knock 25 houses on a street you already worked",
          detail: "Highest close rate of any play — if you can stomach it.",
          vibe: "bold"
        }
      ]
    },
    "post-in-3-groups": {
      id: "post-in-3-groups",
      situation: "One post, three groups. Introduce yourself, one narrow offer, photo of recent work.",
      why: "Specific > general. 'Gutter cleaning $99 this week' beats 'handyman'.",
      verify: "self",
      verifyHint: "Mark done when all three posted.",
      moves: [],
      terminal: "pause"
    },
    "door-knock": {
      id: "door-knock",
      situation: "Pick a street you've worked. Knock 25 doors, reference the job you did for their neighbor.",
      why: "Social proof in the flesh. 2-3 will book on the spot.",
      verify: "self",
      verifyHint: "Come back and log how many said yes.",
      moves: [],
      terminal: "pause"
    }
  }
};

export const PLAYBOOKS: Playbook[] = [
  fillSlowWeek,
  coldLeadReengage,
  contractorFirstJob
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}
