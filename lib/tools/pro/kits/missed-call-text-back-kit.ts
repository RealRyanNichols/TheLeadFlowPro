// Missed Call Text-Back Kit.
//
// The free Missed Call Money Calculator tells an owner the number. The free
// Text-Back Script Writer gives them one message. Neither of those is the
// thing they actually need, which is the whole phone recovery system: what
// goes out at 2pm on a Tuesday versus 9pm on a Saturday, who is responsible
// for answering, how many minutes they promised, what happens when nobody
// replies, and a file their texting platform can import without retyping.
//
// That is what this builds, in their name, from their own call volume.

import {
  brandOf, count, money, money2, num, str,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import {
  addDays, bigNumbers, bullets, callout, checklist, csvDoc, heading, icsDoc, longDate,
  MADE_WITH, nextBusinessDay, numbered, pLead, paragraph, printDoc, printDocument,
  resolveBrand, scriptBlock, table, textDoc, weekdayOf, type PrintSheet,
} from "../docs";

/* ------------------------------- the messages ------------------------------ */

type Tone = "friendly" | "direct" | "professional";

type Scenario = {
  id: string;
  label: string;
  /** When it fires, in plain words, for the platform sheet. */
  trigger: string;
  delayMinutes: number;
  channel: "text" | "voicemail" | "email";
  /** Why this one exists. Printed under the script. */
  why: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "instant",
    label: "Missed during business hours",
    trigger: "Call ends unanswered while you are open",
    delayMinutes: 1,
    channel: "text",
    why: "The single highest value message in the kit. A caller who gets a text inside two minutes is usually still holding the phone.",
  },
  {
    id: "after-hours",
    label: "Missed after hours",
    trigger: "Call ends unanswered outside your open hours",
    delayMinutes: 1,
    channel: "text",
    why: "Says the words that stop them dialing the next name: we saw it, you are first in the morning.",
  },
  {
    id: "weekend",
    label: "Missed on a weekend",
    trigger: "Call ends unanswered Saturday or Sunday",
    delayMinutes: 1,
    channel: "text",
    why: "Weekend callers expect silence. Answering at all is the whole advantage.",
  },
  {
    id: "second-call",
    label: "They called twice",
    trigger: "Second unanswered call from the same number inside two hours",
    delayMinutes: 1,
    channel: "text",
    why: "Two calls in one afternoon is an emergency or a big job. This one gets treated differently.",
  },
  {
    id: "voicemail",
    label: "They left a voicemail",
    trigger: "Voicemail received",
    delayMinutes: 3,
    channel: "text",
    why: "Somebody who leaves a voicemail is serious. Texting back beats calling back, because they can answer from a meeting.",
  },
  {
    id: "closed-day",
    label: "Missed on a closed day or holiday",
    trigger: "Call ends unanswered on a day you are closed",
    delayMinutes: 1,
    channel: "text",
    why: "Set this one once a year and forget it. It stops a holiday from costing you the week's best job.",
  },
  {
    id: "no-reply-hour",
    label: "No reply after an hour",
    trigger: "One hour after the first text with no reply",
    delayMinutes: 60,
    channel: "text",
    why: "Most people meant to answer and got busy. One nudge recovers a real share of them.",
  },
  {
    id: "no-reply-next-day",
    label: "No reply next morning",
    trigger: "Next business morning with still no reply",
    delayMinutes: 1080,
    channel: "text",
    why: "The last automatic one. After this a human decides whether to call.",
  },
  {
    id: "answered-quote",
    label: "They replied and want a price",
    trigger: "Sent by hand once they answer",
    delayMinutes: 0,
    channel: "text",
    why: "The handoff from an automatic text to a real conversation, without losing the thread.",
  },
  {
    id: "greeting-busy",
    label: "Voicemail greeting, working hours",
    trigger: "Recorded once on your business line",
    delayMinutes: 0,
    channel: "voicemail",
    why: "Tells the caller a text is coming so they stop dialing competitors while they wait.",
  },
  {
    id: "greeting-after",
    label: "Voicemail greeting, after hours",
    trigger: "Recorded once, or scheduled after hours",
    delayMinutes: 0,
    channel: "voicemail",
    why: "The same job as the after hours text, for the people who never read texts.",
  },
  {
    id: "email-recap",
    label: "Email version for the ones who prefer it",
    trigger: "Sent when you have an email but no mobile",
    delayMinutes: 5,
    channel: "email",
    why: "Some callers are offices, not phones. Same promise, longer form.",
  },
];

function messageFor(
  scenario: Scenario,
  tone: Tone,
  ctx: {
    biz: string;
    who: string;
    job: string;
    link: string;
    hours: string;
    promise: number;
  },
): string {
  const { biz, who, job, link, hours, promise } = ctx;
  const sig = who ? ` ${who}` : "";
  const signOff = who ? `\n\n${who}, ${biz}` : `\n\n${biz}`;
  const linkLine = link ? `\n\nOr grab a time here: ${link}` : "";
  // Pluralized on the rounded hours, not the raw minutes: 90 minutes rounds
  // to 2 hours and must not read "inside 2 hour" in a customer text.
  const promiseHours = Math.round(promise / 60);
  const within = promise >= 60 ? `${promiseHours} hour${promiseHours === 1 ? "" : "s"}` : `${promise} minutes`;

  const T = <A, B, C>(f: A, d: B, p: C) => (tone === "friendly" ? f : tone === "direct" ? d : p);

  switch (scenario.id) {
    case "instant":
      return String(
        T(
          `Hey, this is${sig} at ${biz}. Sorry we missed you, hands are full on a ${job}. Text me back what you need and where you are and I will take care of you.${linkLine}`,
          `${biz} here. Missed your call. What do you need and what part of town? I will come back inside ${within}.`,
          `Hello, this is ${biz}. We are sorry to have missed your call. Please reply with your name and what you need and we will respond within ${within}.${linkLine}`,
        ),
      );
    case "after-hours":
      return String(
        T(
          `This is${sig} at ${biz}. We are done for the day${hours ? `, we are back ${hours}` : ""}, but I saw your call and you are first up in the morning. Tell me what is going on and I will already have it read when I open.${linkLine}`,
          `${biz}. Closed right now${hours ? `, open ${hours}` : ""}. Send me what you need and you are first in the morning.`,
          `Thank you for calling ${biz}. Our office is closed${hours ? `; our hours are ${hours}` : ""}. Please reply with the details and we will respond first thing on the next business day.${linkLine}`,
        ),
      );
    case "weekend":
      return String(
        T(
          `This is${sig} with ${biz}. It is the weekend so the crew is off, but I still saw your call. If it can wait until Monday tell me what you need and you are at the top of the list. If it cannot wait, say URGENT and I will call you back.`,
          `${biz}. Weekend, so we are off. Reply URGENT if it cannot wait, otherwise you are first Monday.`,
          `Thank you for contacting ${biz}. We are closed for the weekend. Please reply with the details of your request, or reply URGENT if the matter cannot wait until Monday.`,
        ),
      );
    case "second-call":
      return String(
        T(
          `I see you called twice, so I am guessing this one matters. This is${sig} at ${biz}. Tell me what is happening and I will call you the second I am free.`,
          `Saw you called twice. ${biz}. What is going on? Calling you back shortly.`,
          `This is ${biz}. We note that you have called more than once and we want to make sure you are taken care of. Please reply with the details and we will return your call as a priority.`,
        ),
      );
    case "voicemail":
      return String(
        T(
          `Got your voicemail, thank you for leaving it, most people do not. This is${sig} at ${biz}. I have the short version already. Texting is usually faster than phone tag so tell me a good window and I will lock it in.${linkLine}`,
          `Got your voicemail. ${biz}. Texting is faster than phone tag. What time works?`,
          `This is ${biz}. We have received your voicemail and it has been noted. Replying here is often quicker than returning calls. Please let us know a convenient window.${linkLine}`,
        ),
      );
    case "closed-day":
      return String(
        T(
          `This is${sig} at ${biz}. We are closed today, but your call came through to me and I am not going to leave you wondering. Send me the details and you are first on the list when we open back up.`,
          `${biz}. Closed today. Send the details, you are first when we reopen.`,
          `Thank you for contacting ${biz}. We are closed today. Please reply with your request and we will address it on the next business day.`,
        ),
      );
    case "no-reply-hour":
      return String(
        T(
          `Just making sure this reached you. Still happy to help with the ${job} whenever you are ready.${signOff}`,
          `Checking this got to you. Still here when you need the ${job} handled.${signOff}`,
          `Following up to confirm our message was received. We remain available to assist with your ${job}.${signOff}`,
        ),
      );
    case "no-reply-next-day":
      return String(
        T(
          `Morning. Last one from me so I am not a pest. If the timing is off, no problem at all, keep my number. If you still need the ${job} done, just reply here and I will get you on the schedule.${signOff}`,
          `Last message from me. Still need the ${job}? Reply and I will schedule it. If not, keep the number.${signOff}`,
          `Good morning. This is our final follow up regarding your inquiry. If you would still like to proceed with the ${job}, please reply and we will schedule it at your convenience.${signOff}`,
        ),
      );
    case "answered-quote":
      return String(
        T(
          `Perfect, that helps. Two quick things and I can give you a real number instead of a guess: when do you need it done, and can you send a photo of what we are looking at?`,
          `Got it. When do you need it, and can you send a photo? Then I can price it properly.`,
          `Thank you for the details. To provide an accurate quote, could you confirm your preferred timing and send a photograph of the work area?`,
        ),
      );
    case "greeting-busy":
      return String(
        T(
          `You have reached ${biz}. We are out on a ${job} right now, which is exactly why you should not wait on hold. Hang up and you will get a text from this number in about a minute. Answer it and we will take care of you.`,
          `${biz}. We are on a ${job}. Hang up and you will get a text from this number in a minute. Answer it and we will get you handled.`,
          `You have reached ${biz}. We are currently assisting another customer. You will receive a text message from this number shortly; please reply to it and we will respond promptly.`,
        ),
      );
    case "greeting-after":
      return String(
        T(
          `You have reached ${biz} after hours${hours ? `. We are open ${hours}` : ""}. You will get a text from this number in a moment. Reply to it with what you need and you will be first up when we open.`,
          `${biz}, after hours${hours ? `. Open ${hours}` : ""}. Watch for a text from this number and reply to it. You will be first in the morning.`,
          `You have reached ${biz} outside of business hours${hours ? `. Our hours are ${hours}` : ""}. You will receive a text message shortly. Please reply with your request and we will respond on the next business day.`,
        ),
      );
    default:
      return String(
        T(
          `Hi, this is${sig} at ${biz}. We missed your call today and I did not want to leave it there. Reply to this email or text the number you called and tell me what you need for the ${job}. We come back inside ${within} during working hours${hours ? `, and we are open ${hours}` : ""}.${linkLine}${signOff}`,
          `${biz}. We missed your call today. Reply here or text the number you called with what you need. We respond inside ${within}.${linkLine}${signOff}`,
          `Hello, this is ${biz}. We were unable to take your call today. Please reply to this message or text the number you dialed with the details of your request. We respond within ${within} during business hours${hours ? `; our hours are ${hours}` : ""}.${linkLine}${signOff}`,
        ),
      );
  }
}

/* ---------------------------------- fields --------------------------------- */

const FIELDS: ProToolDef["fields"] = [
  {
    id: "missed", label: "Calls you miss in a normal week", type: "slider",
    min: 0, max: 60, step: 1, def: 6, section: "Your phone",
    help: "Open your call log and count seven days. It is almost always higher than the guess.",
  },
  {
    id: "closeRate", label: "How many of those callers would have bought", type: "slider",
    min: 5, max: 100, step: 5, def: 30, suffix: "%", section: "Your phone",
  },
  { id: "ticket", label: "Average first sale", type: "money", def: 400, section: "Your phone" },
  {
    id: "repeats", label: "Repeat purchases after the first job", type: "slider",
    min: 0, max: 19, step: 1, def: 1, section: "Your phone",
    help: "How many more times a happy customer buys. Zero means they buy once.",
  },
  {
    id: "afterHours", label: "Share of missed calls that land after hours", type: "slider",
    min: 0, max: 100, step: 5, def: 35, suffix: "%", section: "Your phone",
    help: "Evenings and weekends. This decides how much of the kit is the after hours half.",
  },
  {
    id: "job", label: "What you call the work", type: "text", def: "job", section: "How you answer",
    placeholder: "job, repair, cleaning, case, appointment",
    help: "One word. It goes into every message so they do not read like a template.",
  },
  {
    id: "who", label: "Who the texts come from", type: "text", def: "", section: "How you answer",
    placeholder: "Ryan", help: "A first name outperforms a company name. Leave it blank to use the business name.",
  },
  {
    id: "hours", label: "Your open hours", type: "text", def: "", section: "How you answer",
    placeholder: "Monday to Friday, 7 to 5",
  },
  {
    id: "link", label: "Booking or quote link", type: "text", def: "", section: "How you answer",
    placeholder: "yourbusiness.com/book", help: "Optional. Left blank, the messages ask them to reply instead.",
  },
  {
    id: "tone", label: "How you talk to customers", type: "select", def: "friendly", section: "How you answer",
    options: [
      { value: "friendly", label: "Friendly and local" },
      { value: "direct", label: "Short and direct" },
      { value: "professional", label: "Professional and formal" },
    ],
  },
  {
    id: "promise", label: "Minutes you promise to respond within", type: "slider",
    min: 5, max: 240, step: 5, def: 30, suffix: " min", section: "The rule",
    help: "The number that goes on the wall. Pick one you can actually keep on a bad day.",
  },
  {
    id: "owner", label: "Who is responsible for answering", type: "text", def: "", section: "The rule",
    placeholder: "Front desk, then Ryan", help: "Names on the poster. A rule with no name on it is not a rule.",
  },
  {
    id: "startDate", label: "Start the ladder on", type: "text", def: "", section: "The rule",
    placeholder: "2026-09-08", help: "Any date, as YYYY-MM-DD. Left blank it starts today.",
  },
];

/* ---------------------------------- helpers -------------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function startDateOf(v: Values): string {
  const raw = str(v, "startDate").trim();
  if (ISO.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    if (y >= 1970 && y <= 2999 && m >= 1 && m <= 12 && d >= 1 && d <= 31) return raw;
  }
  return new Date().toISOString().slice(0, 10);
}

/* ----------------------------------- run ----------------------------------- */

function run(v: Values): Result {
  const brand = resolveBrand(brandOf(v));
  const missed = num(v, "missed");
  const rate = num(v, "closeRate") / 100;
  const ticket = num(v, "ticket");
  const repeats = Math.max(0, num(v, "repeats"));
  const afterHoursShare = num(v, "afterHours") / 100;
  const promise = Math.max(5, num(v, "promise", 30));
  const tone = (str(v, "tone", "friendly") || "friendly") as Tone;
  const job = (str(v, "job").trim() || "job").slice(0, 40);
  const who = str(v, "who").trim().slice(0, 40);
  const hours = str(v, "hours").trim().slice(0, 80);
  const rawLink = str(v, "link").trim().slice(0, 200);
  const link = rawLink ? (/^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`) : "";
  const owner = str(v, "owner").trim().slice(0, 120);
  const start = startDateOf(v);

  const perCustomer = ticket * (1 + repeats);
  const perCall = rate * perCustomer;
  const weekly = missed * perCall;
  const yearly = weekly * 52;
  const monthly = yearly / 12;
  // Half is the figure the free calculator already shows and is deliberately
  // conservative. It is an assumption printed on the page, never a promise.
  const recovered = yearly * 0.5;
  const afterHoursCalls = missed * afterHoursShare;

  const ctx = { biz: brand.name, who, job, link, hours, promise };
  const tones: Tone[] = ["friendly", "direct", "professional"];

  /* ------------------------------ the documents ---------------------------- */

  const scriptSheets: PrintSheet[] = SCENARIOS.map((scenario, i) => ({
    breakBefore: i > 0,
    eyebrow: `Message ${i + 1} of ${SCENARIOS.length}`,
    title: scenario.label,
    html:
      paragraph(`Fires: ${scenario.trigger}. Channel: ${scenario.channel}.`) +
      callout("Why this one exists", scenario.why) +
      scriptBlock(
        `Your tone: ${tone}`,
        messageFor(scenario, tone, ctx),
        "Paste this one into your system. The two below are the same message in the other two voices, in case this one does not sound like you.",
      ) +
      tones
        .filter((t) => t !== tone)
        .map((t) => scriptBlock(t, messageFor(scenario, t, ctx)))
        .join(""),
  }));

  const ladder = [
    { day: 0, label: "Missed call, instant text", scenario: "instant" },
    { day: 0, label: "One hour nudge if no reply", scenario: "no-reply-hour" },
    { day: 1, label: "Next morning, last automatic text", scenario: "no-reply-next-day" },
    { day: 2, label: "A human calls, once", scenario: "answered-quote" },
    { day: 5, label: "Check the list of who never answered", scenario: "no-reply-hour" },
    { day: 12, label: "Second chance text on the quiet ones", scenario: "no-reply-next-day" },
    { day: 30, label: "Monthly review of every missed call", scenario: "instant" },
  ].map((step) => {
    // Day zero is whenever the call came in, so it is left alone. Everything
    // after it is a move somebody has to make, and the printed table names the
    // weekday: telling an owner to send the last automatic text on Saturday
    // contradicts the weekend script two pages earlier, which says the crew is
    // off. So every later step rolls to the next working day.
    const date = step.day === 0 ? start : nextBusinessDay(addDays(start, step.day));
    return { ...step, date };
  });

  const playbook = printDocument(
    brand,
    `Missed Call Playbook for ${brand.name}`,
    [
      {
        eyebrow: "Missed call playbook",
        title: `What the phone is costing ${brand.name}`,
        html:
          pLead(
            `This kit was built from your own numbers: ${count(missed)} missed calls a week, ${money(ticket)} on a first ${job}, and a promise to answer inside ${promise} minutes.`,
          ) +
          bigNumbers([
            { value: money(yearly), label: "Walking out the door each year" },
            { value: money(monthly), label: "Every month" },
            { value: money2(perCall), label: "What one missed call is worth" },
            { value: count(Math.round(afterHoursCalls)), label: "Of those calls land after hours" },
          ]) +
          callout(
            "The one number to remember",
            `Every unanswered ring is worth about ${money2(perCall)} to this business. That is what makes a thirty second text worth setting up.`,
          ) +
          heading("How to use this kit") +
          numbered([
            "Read the phone rule on the next page and put a name against it. Hang it where the phone is.",
            "Open the platform sheet and import it, or paste the messages one at a time using the setup sheet.",
            "Send yourself a test call from another phone and confirm the text arrives.",
            "Work the ladder for thirty days, then look at the review page and change one thing.",
          ]) +
          heading("What this assumed") +
          bullets([
            `A caller is worth ${money(perCustomer)} in total: ${money(ticket)} on the first ${job} plus ${count(repeats)} repeat purchase${repeats === 1 ? "" : "s"}.`,
            `${Math.round(rate * 100)} percent of the people who call would have bought.`,
            "The recovery figure on this page assumes a text-back catches half of the calls you currently lose. That is an estimate from your own inputs, not a promise about your results.",
            "Nothing here is a guarantee of leads, revenue or response rates.",
          ]),
      },
      {
        breakBefore: true,
        eyebrow: "Put this where the phone is",
        title: "The phone rule",
        html:
          bigNumbers([
            { value: `${promise} min`, label: "Every caller gets an answer inside" },
            { value: count(missed), label: "Calls we are missing each week" },
            { value: money(weekly), label: "That is worth, weekly" },
          ]) +
          heading("Who answers") +
          paragraph(owner || "Write the names here. A rule with nobody's name against it is a suggestion.") +
          heading("The rule, in five lines") +
          numbered([
            `Answer inside three rings when you can. If you cannot, the text goes out inside ${promise} minutes.`,
            "Nobody sends a caller to voicemail without the text going out behind it.",
            "Two calls from the same number in one afternoon is treated as urgent and gets a human.",
            "Every missed call is written down, even the ones that answered the text.",
            "At close, whoever has the phone reads the list and clears it before going home.",
          ]) +
          heading("What good looks like at the end of the week") +
          checklist([
            "Every missed call got a text inside the promised window",
            "Every text that got a reply got a human answer the same day",
            "The missed call list is empty at close each day",
            "Anyone who called twice was called back by a person",
          ]),
      },
      ...scriptSheets,
      {
        breakBefore: true,
        eyebrow: "Thirty days",
        title: "The follow-up ladder",
        html:
          pLead(
            `Seven moves on real dates, starting ${longDate(start)}. The first three are automatic. The rest need a person, which is the point.`,
          ) +
          table(
            ["When", "Date", "What happens", "Who"],
            ladder.map((step) => [
              step.day === 0 ? "Same day" : `Day ${step.day}`,
              `${weekdayOf(step.date)}, ${longDate(step.date)}`,
              step.label,
              step.day <= 1 ? "Automatic" : owner || "A person",
            ]),
          ) +
          callout(
            "The one people skip",
            "Day 12. The second chance text on people who never answered is the cheapest work in this kit, and almost nobody does it.",
          ) +
          heading("The monthly review, four questions") +
          numbered([
            "How many calls did we miss, and was it more or less than last month?",
            "How many of those answered the text?",
            "How many turned into work, and what was it worth?",
            "What one thing would have caught more of them: earlier, different words, or a different person answering?",
          ]),
      },
    ],
    { footNote: MADE_WITH },
  );

  const wallPoster = printDocument(
    brand,
    `Phone rule for ${brand.name}`,
    [
      {
        eyebrow: brand.name,
        title: "Answer the phone. Every time.",
        html:
          `<div class="big"><div><b>${promise} min</b><span>Every caller hears back inside</span></div>` +
          `<div><b>${money2(perCall)}</b><span>What one missed call is worth</span></div>` +
          `<div><b>${count(missed)}</b><span>We are missing this many a week</span></div></div>` +
          heading("Who has the phone") +
          paragraph(owner || "____________________________") +
          heading("Every single time") +
          numbered([
            "Three rings, then it goes to the next person.",
            `If nobody catches it, the text goes out inside ${promise} minutes.`,
            "Called twice in one afternoon means a person calls them back.",
            "Write it on the list. Clear the list before you go home.",
          ]) +
          callout("If you only remember one thing", `A ringing phone is worth ${money2(perCall)}. Pick it up.`),
      },
    ],
    { footNote: MADE_WITH },
  );

  const allMessages = SCENARIOS.map((scenario) => {
    const block = tones
      .map((t) => `--- ${t.toUpperCase()} ---\n${messageFor(scenario, t, ctx)}`)
      .join("\n\n");
    return [
      `===========================================`,
      `${scenario.label.toUpperCase()}`,
      `Fires: ${scenario.trigger}`,
      `Channel: ${scenario.channel}   Delay: ${scenario.delayMinutes} minutes`,
      `Why: ${scenario.why}`,
      `===========================================`,
      "",
      block,
    ].join("\n");
  }).join("\n\n\n");

  const setupSheet = [
    `MISSED CALL TEXT-BACK SETUP for ${brand.name}`,
    "",
    "You do not need a new phone system to run this. Pick the row that matches what you already have.",
    "",
    "IF YOU HAVE A TEXTING PLATFORM OR CRM",
    "  Import the platform sheet (the CSV in this kit). It carries the trigger, the",
    "  delay in minutes, the channel and the message for every scenario. Map the",
    "  columns to whatever that platform calls them and turn on the first three rows",
    "  before you touch anything else.",
    "",
    "IF YOU JUST HAVE AN IPHONE",
    "  1. Settings, then Apps, then Messages, then Text Message Forwarding is not it.",
    "     What you want is Settings, General, Keyboard, Text Replacement.",
    `  2. Add a replacement. Phrase: the instant message below. Shortcut: mcall`,
    "  3. Now typing mcall in any text expands to the whole message.",
    "  4. For true automation, Settings, Focus, Driving, Auto-Reply, set it to All",
    "     Contacts and paste the after hours message.",
    "",
    "IF YOU JUST HAVE AN ANDROID",
    "  1. Messages app, tap your picture, Message settings, then Quick responses.",
    "  2. Paste each message as its own quick response.",
    "  3. Phone app, three dots, Settings, Quick responses covers the decline-with-text.",
    "",
    "IF YOU HAVE A RECEPTIONIST OR ANSWERING SERVICE",
    "  Give them the phone rule page and the first four messages. Tell them the",
    `  ${promise} minute promise is theirs to keep, and that two calls from one number`,
    "  in an afternoon always reaches a human.",
    "",
    "TEST IT BEFORE YOU TRUST IT",
    "  Call your own business line from a phone that is not in your contacts. Let it",
    "  ring out. Time how long the text takes. If it does not arrive, nothing else in",
    "  this kit matters yet.",
    "",
    "COMPLIANCE, THE SHORT VERSION",
    "  These are replies to somebody who just called you, which is the cleanest",
    "  footing there is. Keep it that way: reply to inbound calls, honor STOP",
    "  immediately, and do not load these numbers into a marketing blast later",
    "  without separate permission. Check your own obligations before you scale it.",
    "",
    "THE INSTANT MESSAGE, READY TO PASTE",
    "",
    messageFor(SCENARIOS[0], tone, ctx),
  ].join("\n");

  const documents: ToolDocument[] = [
    printDoc(
      "playbook",
      "Missed Call Playbook",
      `Your numbers, the phone rule, all ${SCENARIOS.length} messages in three voices, and the thirty day ladder.`,
      "missed-call-playbook.html",
      playbook,
    ),
    printDoc(
      "poster",
      "Phone rule wall poster",
      "One page for the wall by the phone. Names, the promise, and what a ring is worth.",
      "phone-rule-poster.html",
      wallPoster,
    ),
    textDoc(
      "messages",
      `All ${SCENARIOS.length * 3} messages`,
      "Every scenario in all three voices, plain text, ready to paste anywhere.",
      "missed-call-messages.txt",
      allMessages,
    ),
    csvDoc(
      "platform",
      "Platform import sheet",
      "Trigger, delay, channel and message. Import it into a texting platform or CRM instead of retyping.",
      "missed-call-platform-import.csv",
      ["scenario", "trigger", "channel", "delay_minutes", "message"],
      SCENARIOS.map((s) => [s.label, s.trigger, s.channel, s.delayMinutes, messageFor(s, tone, ctx)]),
    ),
    textDoc(
      "setup",
      "Setup sheet",
      "How to run this on a texting platform, a plain iPhone, a plain Android, or with a receptionist.",
      "missed-call-setup.txt",
      setupSheet,
    ),
    icsDoc(
      "ladder",
      "Ladder reminders",
      "The seven moves on real dates, each carrying its message, straight into your phone calendar.",
      "missed-call-ladder.ics",
      [
        ...ladder.map((step) => ({
          date: step.date,
          time: "08:30",
          minutes: 15,
          title: `${brand.name}: ${step.label}`,
          description: messageFor(
            SCENARIOS.find((s) => s.id === step.scenario) ?? SCENARIOS[0],
            tone,
            ctx,
          ),
        })),
        {
          date: nextBusinessDay(start),
          time: "17:00",
          minutes: 10,
          title: `${brand.name}: clear the missed call list`,
          description: `Read today's missed calls. Every one gets an answer or a note. The rule is ${promise} minutes.`,
        },
      ],
      `${brand.name} missed calls`,
    ),
  ];

  return {
    headline: {
      value: money(yearly),
      label: "Walking out the door every year",
      sub: `${money(monthly)} a month, ${money2(perCall)} per unanswered ring`,
      tone: "bad",
    },
    explain:
      missed > 0
        ? `At ${count(missed)} missed calls a week and ${money(ticket)} on a first ${job}, every ring that goes unanswered is worth about ${money2(perCall)}. Roughly ${count(Math.round(afterHoursCalls))} of those weekly calls land after you close, which is why the kit has a separate after hours half.`
        : `Nothing is being lost at zero missed calls a week. Put in a real number from your call log and the kit builds itself around it.`,
    stats: [
      { label: "Lost per week", value: money(weekly), tone: "bad" },
      { label: "Customers lost a year", value: count(missed * rate * 52), tone: "bad" },
      { label: "If a text-back catches half", value: money(recovered), sub: "an estimate, not a promise", tone: "good" },
      { label: "Your promise", value: `${promise} minutes`, sub: "goes on the wall poster" },
    ],
    bars: {
      title: "Where the missed calls land",
      caption: "Split from the after hours share you set.",
      items: [
        {
          label: "During open hours",
          value: Math.max(0, missed - afterHoursCalls),
          display: `${count(Math.round(missed - afterHoursCalls))} calls a week`,
          tone: "warn",
        },
        {
          label: "After hours and weekends",
          value: afterHoursCalls,
          display: `${count(Math.round(afterHoursCalls))} calls a week`,
          tone: "bad",
        },
      ],
    },
    verdict: {
      tone: missed > 0 ? "bad" : "neutral",
      text:
        missed > 0
          ? `${count(missed)} unanswered calls a week at ${money2(perCall)} each. The kit turns that into ${SCENARIOS.length} messages, a rule with a name on it, and a thirty day ladder starting ${longDate(start)}.`
          : "Set your real missed call count and the whole kit rebuilds around it.",
    },
    assumptions: [
      `A customer is worth ${money(perCustomer)}: the first ${job} plus ${count(repeats)} repeat purchase${repeats === 1 ? "" : "s"}.`,
      "The recovery figure assumes a text-back catches half the calls currently lost. It is an illustration from your inputs, not a claim about your results.",
      "Messages are replies to people who called you. Check your own texting obligations before using them for anything else.",
    ],
    documents,
  };
}

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 19,
  promise:
    "Every text your phone should send when you miss a call, the rule that says who answers, and the thirty day ladder, all in your name.",
  kit: [
    "Missed Call Playbook, your numbers and every message, printable",
    "Phone rule wall poster for the shop",
    "36 messages: 12 scenarios in 3 voices",
    "Platform import sheet for your texting app or CRM",
    "Setup sheet for iPhone, Android, a platform, or a receptionist",
    "Calendar reminders for the whole thirty day ladder",
  ],
  upgradeFrom: [
    "missed-call-calculator",
    "missed-call-textback-script",
    "voicemail-script-generator",
    "after-hours-lead-calculator",
    "lead-response-time",
  ],
  freePreview:
    "Run your real numbers and see what the phone is costing, the after hours split, and every document the kit builds.",
};

export const KIT: ProToolDef = {
  slug: "missed-call-text-back-kit",
  name: "Missed Call Text-Back Kit",
  short: "Text-Back Kit",
  emoji: "📲",
  category: "Leads",
  tagline: "The whole phone recovery system, in your name",
  description:
    "Turn the missed call number into the system that fixes it: twelve scenarios in three voices, a platform import sheet, the phone rule with a name against it, and a thirty day ladder on real dates.",
  who: "Any business where the phone is the front door and it rings while your hands are full: trades, clinics, shops, salons, law offices, service crews.",
  problem:
    "The calculator says the missed calls are costing five figures. Then the owner has to write the texts, decide who answers, work out how to load it into their phone, and remember to follow up. Most stop at the number.",
  payoff:
    "The finished system in your name: every message, the rule for the wall, the import file, and the reminders, built from your own call volume.",
  steps: [
    "Put your business name, phone and logo in the brand kit once.",
    "Enter what you actually miss in a week and what a customer is worth.",
    "Pick the voice that sounds like you and the minutes you promise to answer within.",
    "Take the playbook, the poster, the import sheet and the calendar file.",
  ],
  faqs: [
    {
      q: "Do I need a special phone system for this?",
      a: "No. The setup sheet covers a texting platform or CRM if you have one, and a plain iPhone or Android if you do not. There is also a version for a receptionist or answering service.",
    },
    {
      q: "Is texting somebody back after a missed call allowed?",
      a: "Replying to a person who just called you is the cleanest footing there is, and the kit is written to stay on it. Honor STOP straight away and do not move those numbers into a marketing blast later without separate permission. Your own obligations are yours to confirm.",
    },
    {
      q: "What if my numbers change?",
      a: "Open the kit again and change them. Every document rebuilds from the new figures at no extra cost, for as long as the kit exists.",
    },
    {
      q: "How is this different from the free script writer?",
      a: "The free tool writes one text. This builds twelve scenarios in three voices, the coverage rule, the import file for your platform, the setup sheet, and the thirty day ladder on real dates, all carrying your brand.",
    },
  ],
  domain: "sales-marketing",
  toolType: "builder",
  goals: ["capture-leads", "improve-follow-up", "make-money"],
  industries: [
    "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
    "pest-control", "cleaning", "remodeling", "auto-repair", "towing", "moving",
    "medical-practice", "dental-practice", "veterinary", "legal", "real-estate",
    "mortgage-lending", "insurance", "hair-salon", "barbershop", "spa", "restaurant",
    "handyman", "pool-service", "fitness", "pet-services",
  ],
  audiences: ["owners", "managers", "administrators", "contractors"],
  keywords: [
    "missed call text back", "auto reply text for business", "after hours text message",
    "missed call script", "text back automation", "phone coverage rule", "voicemail greeting script",
    "sorry we missed your call text",
  ],
  synonyms: ["missed call automation kit", "text back system", "missed call follow up templates"],
  disclaimer: "general-estimate",
  dataSensitivity: "none",
  popularity: 96,
  isNew: true,
  embedHeight: 1100,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A phone on a workbench sending a text back out to a caller while the owner's hands stay on the job, the reply catching the call before it walks.",
  visualFamily: "phone-comms",
  primarySubject: "phone sending an automatic reply",
  supportingSubjects: ["missed call badge", "outgoing message bubble", "wall clock on the response promise"],
  sceneType: "device",
  composition: "phone right of center at three quarter height, reply bubble arcing left, clock small upper left, negative space lower left",
  colorAccent: 1,
  cardImage: "/tools-art/card/missed-call-text-back-kit.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/missed-call-text-back-kit.svg",
  heroImageAlt:
    "A phone sending an automatic text back to a missed caller, with a clock counting the promised response window",
  ogImage: "/og/tools/missed-call-text-back-kit.jpg",
  ogLayout: "device",
  ogHook: "Every text your phone should send when you miss a call.",
  focalPoint: { x: 0.6, y: 0.5 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};
