// Quote Follow-Up Kit.
//
// The free Unclosed Quote Calculator shows what the pile of quiet estimates is
// worth. This builds the machine that works the pile: seven touches over
// thirty days, each with a different job, on real dates, with the words for
// the calls and the replies to the five objections that actually come up.
//
// The touches use [First name] and [Job] as visible placeholders on purpose.
// A follow-up is sent to one person about one quote; the kit personalizes the
// business side and leaves the customer side clearly marked for a human.

import {
  brandOf, count, dec, money, num, pct, str,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import {
  addDays, bigNumbers, bullets, callout, checklist, csvDoc, heading, icsDoc, longDate,
  MADE_WITH, nextBusinessDay, numbered, pLead, paragraph, printDoc, printDocument,
  resolveBrand, scriptBlock, table, textDoc, weekdayOf, type PrintSheet,
} from "../docs";

/* --------------------------------- touches --------------------------------- */

type Tone = "friendly" | "direct" | "professional";

type Touch = {
  day: number;
  channel: "text" | "call" | "email";
  label: string;
  job: string;
};

const TOUCHES: Touch[] = [
  { day: 1, channel: "text", label: "Did it land", job: "Confirms the quote arrived and opens the door for questions while it is fresh." },
  { day: 3, channel: "call", label: "The real conversation", job: "The highest value touch in the sequence. Most quotes close on this call or never." },
  { day: 7, channel: "email", label: "The recap", job: "Everything they need to say yes in one place: scope, price, timing, next step." },
  { day: 12, channel: "text", label: "One question", job: "A single easy question that restarts a stalled thread without pressure." },
  { day: 18, channel: "email", label: "The proof", job: "A short story of a similar job done well. Confidence, not pressure." },
  { day: 24, channel: "call", label: "The schedule call", job: "Honest scheduling reality: when you could actually start if they said yes this week." },
  { day: 30, channel: "text", label: "Closing the file", job: "The polite last word. It wins a surprising share by itself, and it ends cleanly." },
];

function touchMessage(
  touch: Touch,
  tone: Tone,
  ctx: { biz: string; who: string; job: string; window: string },
): { subject?: string; text: string } {
  const { biz, who, job, window } = ctx;
  const sig = who ? `\n\n${who}, ${biz}` : `\n\n${biz}`;
  const T = (f: string, d: string, p: string) => (tone === "friendly" ? f : tone === "direct" ? d : p);

  switch (touch.day) {
    case 1:
      return {
        text: T(
          `Hey [First name], wanted to make sure the ${job} quote made it to you. If anything in it reads funny or you want to talk through options, just reply here. No rush.${sig}`,
          `[First name], confirming the ${job} quote reached you. Questions, reply here.${sig}`,
          `Hello [First name], I am confirming that your ${job} quote was delivered. If you have any questions or would like to review options, please reply at your convenience.${sig}`,
        ),
      };
    case 3:
      return {
        text: T(
          `CALL SCRIPT\n\nOpen: "Hey [First name], it is ${who || biz}. Not chasing you, just wanted to see if the ${job} quote raised any questions."\n\nThen stop talking. Whatever they say next tells you which page of the objection sheet you are on.\n\nIf they are positive: "Great. The next step is picking a start window. I have got ${window} open, want me to pencil you in while we talk?"\n\nIf they are hesitant: "Totally fair. What is the part that gives you pause, the price, the timing, or something in the scope?" Then work the objection sheet.\n\nClose either way: "Whatever you decide, I appreciate you letting us quote it."`,
          `CALL SCRIPT\n\nOpen: "[First name], ${who || biz}. Any questions on the ${job} quote?"\n\nStop and listen.\n\nPositive: "Next step is a start window. ${window} is open, want it?"\n\nHesitant: "Fair. Price, timing, or scope?" Work the objection sheet.\n\nClose: "Appreciate you letting us quote it either way."`,
          `CALL SCRIPT\n\nOpening: "Good morning [First name], this is ${who || biz}. I am calling to see whether the ${job} quote raised any questions."\n\nAllow them to respond fully.\n\nIf positive: "The next step would be selecting a start window. We currently have ${window} available."\n\nIf hesitant: "That is understandable. May I ask whether the concern is the price, the timing, or the scope?" Address it with the objection sheet.\n\nClosing: "Thank you for the opportunity to quote the work, whatever you decide."`,
        ),
      };
    case 7:
      return {
        subject: T(
          `Everything about your ${job}, in one place`,
          `Your ${job} quote, summarized`,
          `Summary of your ${job} quotation`,
        ),
        text: T(
          `Hi [First name],\n\nWanted to put everything in one email so it is easy to find when you are ready.\n\nWhat we quoted: [Job]\nThe number: [Price]\nHow long it takes: [Duration]\nWhen we could start: ${window}\n\nThe quote is good as written for 30 days from the date on it. If anything about the scope should change, tell me and I will re-price it honestly rather than squeeze it in sideways.\n\nReply here or call and we will get you on the board.${sig}`,
          `[First name],\n\nOne email with everything:\n\nScope: [Job]\nPrice: [Price]\nDuration: [Duration]\nEarliest start: ${window}\n\nQuote is good for 30 days as written. Reply or call to book it.${sig}`,
          `Dear [First name],\n\nFor ease of reference, here is a summary of your quotation.\n\nScope of work: [Job]\nQuoted price: [Price]\nExpected duration: [Duration]\nEarliest available start: ${window}\n\nThe quotation remains valid as written for 30 days from its date. Should the scope need to change, we will provide a revised figure.\n\nPlease reply or call when you are ready to proceed.${sig}`,
        ),
      };
    case 12:
      return {
        text: T(
          `[First name], one quick question and then I will leave you be: is the ${job} still on your list this season, or has it moved down the pile? Either answer is useful.${sig}`,
          `[First name], quick one: is the ${job} still happening this season? Either answer helps.${sig}`,
          `Hello [First name], one brief question: is the ${job} still planned for this season? Either answer helps us plan our schedule.${sig}`,
        ),
      };
    case 18:
      return {
        subject: T(`The one we finished last week`, `A ${job} like yours`, `A recent ${job} project`),
        text: T(
          `Hi [First name],\n\nNo ask in this one. We wrapped a ${job} last week that started out a lot like yours, and the owner said the part they were most nervous about turned out to be the easiest.\n\n[One or two honest sentences about that job: what it was, what it took, how it turned out. Real details beat polished ones.]\n\nIf you want to talk to somebody we have done this for, say the word and I will connect you.${sig}`,
          `[First name],\n\nNo ask here. Finished a ${job} last week similar to yours.\n\n[One or two honest sentences about it.]\n\nWant to talk to the owner about how it went? Say the word.${sig}`,
          `Dear [First name],\n\nNothing is required of you in this note. We recently completed a ${job} similar to the one we quoted for you.\n\n[One or two honest sentences about that project.]\n\nIf a reference would be helpful, we would be glad to arrange one.${sig}`,
        ),
      };
    case 24:
      return {
        text: T(
          `CALL SCRIPT\n\n"Hey [First name], ${who || biz} again. I am building the schedule for the next few weeks and I have ${window} open. I did not want to give your slot away without asking. Do you want it, or should I plan around you for now?"\n\nThat is the whole call. It is honest scarcity: you really are building the schedule, and you really will give the slot away. Do not invent urgency that is not there.`,
          `CALL SCRIPT\n\n"[First name], ${who || biz}. Building the schedule. ${window} is open and I did not want to give your slot away without asking. Want it?"\n\nHonest scarcity only. If the slot is not really scarce, do not say it is.`,
          `CALL SCRIPT\n\n"Good morning [First name], this is ${who || biz}. We are finalizing our schedule for the coming weeks and currently have ${window} available. Before assigning it elsewhere, I wanted to offer it to you."\n\nUse only when the schedule pressure is real.`,
        ),
      };
    default:
      return {
        text: T(
          `[First name], last note from me on the ${job}, promise. I am closing the file so you stop hearing from us. If life got busy and you still want it done, reply any time, the quote stands for 30 days from its date and I will requote it honestly after that. Thanks for considering us either way.${sig}`,
          `[First name], last one. Closing the file on the ${job}. If you still want it, reply any time. Thanks for considering us.${sig}`,
          `Dear [First name], this is our final note regarding the ${job}. We are closing the file so that you receive no further messages. Should you wish to proceed in the future, we would be glad to hear from you. Thank you for considering ${biz}.${sig}`,
        ),
      };
  }
}

const OBJECTIONS: { name: string; reply: (ctx: { biz: string; job: string }) => string; note: string }[] = [
  {
    name: "It is more than we wanted to spend",
    note: "Never cut the price on the spot. Cut scope or offer phasing; a fast discount tells them the first number was padded.",
    reply: ({ job }) =>
      `"I hear you. Rather than shave the number and shave the work quietly, let me ask: is it the total, or the timing of it? If it is the total, we can look at what could come out of the scope honestly. If it is the timing, we can split the ${job} into two phases so it does not land all at once."`,
  },
  {
    name: "We got a cheaper quote",
    note: "Do not trash the competitor. Anchor to what the quote includes, then let them decide.",
    reply: () =>
      `"That is fair, and they may be right for you. Can I ask you to check two lines on it before you decide: what it says about [the thing you include that cheap quotes skip], and who is on the hook if something is wrong a month later. If theirs covers both, take it with my blessing."`,
  },
  {
    name: "We need to think about it",
    note: "Thinking about it usually means one unspoken concern. Name the options gently.",
    reply: () =>
      `"Of course. Just so I am useful while you do: is it the money, the timing, or wanting to be sure of us? People usually mean one of the three, and each one has a different answer I can actually give you."`,
  },
  {
    name: "Waiting on the insurance company or another decision maker",
    note: "Make yourself the easy next step, not another thing to manage.",
    reply: () =>
      `"Understood, that part is out of your hands. Would it help if I put together the one page version they always ask for, so the conversation goes faster? And want me to check back in two weeks or leave it with you?"`,
  },
  {
    name: "They went quiet",
    note: "Silence is rarely a no. Work the ladder and never send two messages in a row that both ask for something.",
    reply: () =>
      `Do not chase harder, chase smarter: the day 12 one question text and the day 18 proof email exist for exactly this. If day 30 arrives with no reply, close the file cleanly. A clean close-out earns more callbacks than a fourth nudge.`,
  },
];

/* ---------------------------------- fields --------------------------------- */

const FIELDS: ProToolDef["fields"] = [
  { id: "quotes", label: "Quotes you send per month", type: "slider", min: 1, max: 300, step: 1, def: 30, section: "Your quotes" },
  { id: "value", label: "Average quote value", type: "money", def: 3200, section: "Your quotes" },
  { id: "closeNow", label: "Percent you close today", type: "slider", min: 1, max: 90, step: 1, def: 28, suffix: "%", section: "Your quotes" },
  {
    id: "lift", label: "Extra you would close with follow-up", type: "slider", min: 1, max: 40, step: 1, def: 10, suffix: "%", section: "Your quotes",
    help: "Percentage points added to your close rate. Your planning number, not a promise.",
  },
  { id: "margin", label: "Gross margin", type: "slider", min: 5, max: 95, step: 1, def: 38, suffix: "%", section: "Your quotes" },
  {
    id: "job", label: "What you quote", type: "text", def: "job", section: "The words",
    placeholder: "roof, remodel, cleaning, install",
    help: "One or two words. Goes into every touch so they read written, not generated.",
  },
  {
    id: "who", label: "Who follows up", type: "text", def: "", section: "The words",
    placeholder: "Ryan", help: "A first name signs the messages. Blank uses the business name.",
  },
  {
    id: "window", label: "Your honest start window", type: "text", def: "the week after next", section: "The words",
    placeholder: "the week after next",
    help: "Used in the schedule call. Keep it true; the script refuses to fake scarcity.",
  },
  {
    id: "tone", label: "How you talk to customers", type: "select", def: "friendly", section: "The words",
    options: [
      { value: "friendly", label: "Friendly and local" },
      { value: "direct", label: "Short and direct" },
      { value: "professional", label: "Professional and formal" },
    ],
  },
  {
    id: "startDate", label: "The day the quote goes out", type: "text", def: "", section: "The clock",
    placeholder: "2026-09-08", help: "YYYY-MM-DD. The seven touches land on real dates from here. Blank starts today.",
  },
];

/* ----------------------------------- run ----------------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function startDateOf(v: Values): string {
  const raw = str(v, "startDate").trim();
  if (ISO.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    if (y >= 1970 && y <= 2999 && m >= 1 && m <= 12 && d >= 1 && d <= 31) return raw;
  }
  return new Date().toISOString().slice(0, 10);
}

function run(v: Values): Result {
  const brand = resolveBrand(brandOf(v));
  const quotes = Math.max(1, num(v, "quotes", 30));
  const value = num(v, "value", 3200);
  const closeNow = num(v, "closeNow", 28) / 100;
  const lift = num(v, "lift", 10) / 100;
  const margin = num(v, "margin", 38) / 100;
  const job = (str(v, "job").trim() || "job").slice(0, 40);
  const who = str(v, "who").trim().slice(0, 40);
  const window = (str(v, "window").trim() || "the week after next").slice(0, 80);
  const tone = (str(v, "tone", "friendly") || "friendly") as Tone;
  const start = startDateOf(v);

  // Identical math to the free calculator, deliberately.
  const openQuotes = quotes * (1 - closeNow);
  const extraJobs = quotes * lift;
  const extraRevenue = extraJobs * value;
  const extraProfit = extraRevenue * margin;
  const perQuote = value * lift;

  const ctx = { biz: brand.name, who, job, window };
  const tones: Tone[] = ["friendly", "direct", "professional"];

  const dated = TOUCHES.map((touch) => ({
    ...touch,
    date: nextBusinessDay(addDays(start, touch.day)),
  }));

  /* ------------------------------- documents ------------------------------- */

  const touchSheets: PrintSheet[] = dated.map((touch, i) => {
    const message = touchMessage(touch, tone, ctx);
    return {
      breakBefore: i > 0,
      eyebrow: `Touch ${i + 1} of ${dated.length} · Day ${touch.day} · ${weekdayOf(touch.date)}, ${longDate(touch.date)}`,
      title: `${touch.label} (${touch.channel})`,
      html:
        callout("What this touch is for", touch.job) +
        scriptBlock(
          `Your voice: ${tone}${message.subject ? ` · Subject: ${message.subject}` : ""}`,
          message.text,
          "Square brackets are yours to fill before sending: the customer's name, the price, anything in [brackets]. Nothing goes out with a bracket still in it.",
        ) +
        tones
          .filter((t) => t !== tone)
          .map((t) => {
            const alt = touchMessage(touch, t, ctx);
            return scriptBlock(`${t}${alt.subject ? ` · Subject: ${alt.subject}` : ""}`, alt.text);
          })
          .join(""),
    };
  });

  const playbook = printDocument(
    brand,
    `Quote follow-up playbook for ${brand.name}`,
    [
      {
        eyebrow: "Quote follow-up playbook",
        title: `The pile on ${brand.name}'s desk`,
        html:
          pLead(
            `You send about ${count(quotes)} quotes a month at ${money(value)} and close ${pct(closeNow * 100, 0)} of them. That leaves roughly ${count(openQuotes)} quotes a month sitting open, and the follow-up in this kit is aimed at ${pct(lift * 100, 0)} points of them.`,
          ) +
          bigNumbers([
            { value: money(extraRevenue * 12), label: "A year of quotes the ladder is aimed at" },
            { value: money(extraProfit * 12), label: "Of that would be profit at your margin" },
            { value: money(perQuote), label: "What working the ladder is worth per quote" },
          ]) +
          callout(
            "Read this before the first send",
            "Seven touches is not seven asks. Each one has a different job, two of them ask for nothing at all, and the last one closes the file politely. The system works because it never turns into pestering.",
          ) +
          heading("The ladder at a glance") +
          table(
            ["Day", "Lands on", "Channel", "The touch", "Its job"],
            dated.map((t) => [
              String(t.day),
              `${weekdayOf(t.date)}, ${longDate(t.date)}`,
              t.channel,
              t.label,
              t.job,
            ]),
          ) +
          heading("What the numbers assumed") +
          bullets([
            `The ${pct(lift * 100, 0)} point lift is your planning input. Follow-up reliably wins back some share of open quotes; how much depends on your market, your prices and whether the touches actually go out.`,
            "Dates that land on a weekend roll to the next working day.",
            "Nothing in this kit promises revenue or close rates.",
          ]),
      },
      ...touchSheets,
      {
        breakBefore: true,
        eyebrow: "When they push back",
        title: "The five objections that actually come up",
        html: OBJECTIONS.map(
          (o) => callout(o.name, o.note) + scriptBlock("What to say", o.reply({ biz: brand.name, job })),
        ).join(""),
      },
      {
        breakBefore: true,
        eyebrow: "The wall sheet",
        title: "Send order, one page",
        html:
          paragraph("Pin this by the desk. One line per touch, tick the box when it goes out.") +
          table(
            ["", "Day", "Channel", "Touch", "Sent"],
            dated.map((t, i) => [String(i + 1), `Day ${t.day}`, t.channel, t.label, ""]),
          ) +
          checklist([
            "The quote itself went out with a date on it, because day 30 leans on that date",
            "Every [bracket] is filled before a message leaves",
            `${who || "Somebody"} owns the two calls and has the objection sheet in reach`,
            "A reply, any reply, stops the ladder and starts a conversation",
          ]),
      },
    ],
    { footNote: MADE_WITH },
  );

  const allTouches = tones
    .map(
      (t) =>
        `################ ${t.toUpperCase()} VOICE ################\n\n` +
        dated
          .map((touch) => {
            const m = touchMessage(touch, t, ctx);
            return `=== DAY ${touch.day}: ${touch.label.toUpperCase()} (${touch.channel}) ===${m.subject ? `\nSubject: ${m.subject}` : ""}\n\n${m.text}`;
          })
          .join("\n\n\n"),
    )
    .join("\n\n\n");

  const documents: ToolDocument[] = [
    printDoc(
      "playbook",
      "Follow-up playbook",
      "Your numbers, all seven touches in three voices, the objection sheet, and the one page send order.",
      "quote-follow-up-playbook.html",
      playbook,
    ),
    textDoc(
      "touches",
      `${dated.length * 3} messages and call scripts`,
      "Every touch in all three voices, plain text, ready to paste into your phone or CRM.",
      "quote-follow-up-touches.txt",
      allTouches,
    ),
    csvDoc(
      "crm",
      "CRM import sheet",
      "Day, date, channel, subject and body for each touch. Import it instead of retyping.",
      "quote-follow-up-import.csv",
      ["day", "date", "channel", "subject", "message"],
      dated.map((touch) => {
        const m = touchMessage(touch, tone, ctx);
        return [touch.day, touch.date, touch.channel, m.subject ?? "", m.text];
      }),
    ),
    icsDoc(
      "reminders",
      "The ladder on your calendar",
      "Seven reminders on the real dates, each carrying its message or call script.",
      "quote-follow-up-ladder.ics",
      dated.map((touch) => ({
        date: touch.date,
        time: touch.channel === "call" ? "10:00" : "08:45",
        minutes: 15,
        title: `${brand.name}: day ${touch.day} ${touch.channel}, ${touch.label}`,
        description: touchMessage(touch, tone, ctx).text,
      })),
      `${brand.name} quote follow-up`,
    ),
    textDoc(
      "objections",
      "Objection sheet",
      "The five pushbacks that actually come up on quote calls, and what to say to each.",
      "quote-objection-sheet.txt",
      OBJECTIONS.map((o) => `=== ${o.name.toUpperCase()} ===\n${o.note}\n\n${o.reply({ biz: brand.name, job })}`).join(
        "\n\n\n",
      ),
    ),
  ];

  return {
    headline: {
      value: money(extraRevenue * 12),
      label: "A year of quotes this ladder is aimed at",
      sub: `${money(extraProfit * 12)} of that is profit at your margin`,
      tone: "good",
    },
    explain: `About ${count(openQuotes)} of your ${count(quotes)} monthly quotes go quiet. A ${pct(lift * 100, 0)} point lift on your ${pct(closeNow * 100, 0)} percent close rate is ${dec(extraJobs, 1)} extra jobs a month at ${money(value)} each. The seven touches below are how that lift usually gets won, and two of them are phone calls, which is why they close.`,
    stats: [
      { label: "Quotes going quiet monthly", value: count(openQuotes), sub: money(openQuotes * value) + " of work", tone: "warn" },
      { label: "Extra jobs a month at your lift", value: dec(extraJobs, 1), tone: "good" },
      { label: "Worth per quote followed up", value: money(perQuote), tone: "good" },
      { label: "First touch goes out", value: longDate(nextBusinessDay(addDays(start, 1))) },
    ],
    bars: {
      title: "Where your quotes go today",
      items: [
        { label: "Closed", value: quotes * closeNow, display: count(quotes * closeNow), tone: "good" },
        { label: "Winnable with follow-up", value: extraJobs, display: dec(extraJobs, 1), tone: "warn" },
        { label: "Gone either way", value: Math.max(0, openQuotes - extraJobs), display: count(Math.max(0, openQuotes - extraJobs)), tone: "bad" },
      ],
    },
    verdict: {
      tone: "neutral",
      text: `Seven touches over thirty days, starting ${longDate(nextBusinessDay(addDays(start, 1)))}: three texts, two emails, two calls, each with a different job, and a clean close-out at the end. The kit writes all of it in your voice.`,
    },
    assumptions: [
      "The lift is your planning input. Nothing here guarantees close rates or revenue.",
      "Touches assume the customer inquired and received a quote from you, which is ordinary business follow-up. Honor any request to stop immediately.",
      "Weekend dates roll to the next working day.",
    ],
    documents,
  };
}

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 19,
  promise:
    "Seven follow-up touches over thirty days, on real dates, in your voice, with the call scripts and the objection sheet.",
  kit: [
    "Follow-up playbook with your numbers and every touch, printable",
    "21 messages and call scripts across three voices",
    "CRM import sheet with day, channel, subject and body",
    "Calendar file putting all seven touches on real dates",
    "Objection sheet for the five pushbacks that actually come up",
    "One page send order for the wall",
  ],
  upgradeFrom: [
    "quote-follow-up-calculator",
    "lead-response-time",
    "close-rate-calculator",
    "lead-value-calculator",
  ],
  freePreview:
    "Run your real quote volume and close rate, see what the ladder is aimed at, and read exactly what is in every document.",
};

export const KIT: ProToolDef = {
  slug: "quote-follow-up-kit",
  name: "Quote Follow-Up Kit",
  short: "Follow-Up Kit",
  emoji: "📬",
  category: "Leads",
  tagline: "The thirty days after the quote, written for you",
  description:
    "Turn the pile of quiet quotes into a worked sequence: seven touches over thirty days with a different job each, two real call scripts, the objection sheet, a CRM import file, and the dates already on your calendar.",
  who: "Anybody who sends estimates and watches them go quiet: trades, remodelers, roofers, cleaners, agencies, consultants.",
  problem:
    "Most quotes get one send and no follow-up, and the customer was not saying no, they were busy. Writing seven good touches takes an evening nobody has, so the pile just sits there.",
  payoff:
    "The finished sequence in your voice, on real dates, with the words for the calls and the answers to the pushback.",
  steps: [
    "Put your business name and details in the brand kit once.",
    "Enter your real quote volume, value and close rate.",
    "Set what you quote, who follows up, and the day the quote goes out.",
    "Take the playbook, the import sheet, the calendar file and the objection sheet.",
  ],
  faqs: [
    {
      q: "Is seven touches too many?",
      a: "Not the way these are built. Two of them ask for nothing, one is a single easy question, and the last one closes the file politely. What annoys people is the same ask seven times, which is exactly what this is not.",
    },
    {
      q: "Do I have to make the phone calls?",
      a: "The two calls are where most of the money is, which is why they come with word for word scripts and the objection sheet. If you truly will not call, the other five touches still work, just expect less.",
    },
    {
      q: "Can I load this into my CRM or texting platform?",
      a: "Yes. The import sheet carries day, date, channel, subject and body for every touch, mapped to plain columns any platform can take.",
    },
    {
      q: "What are the square brackets in the messages?",
      a: "The customer's side of the personalization: their name, the price, the one honest detail in the proof email. The kit fills in everything about your business and leaves those clearly marked, because a follow-up should never read fully automated.",
    },
  ],
  domain: "sales-marketing",
  toolType: "builder",
  goals: ["improve-follow-up", "make-money", "capture-leads"],
  industries: [
    "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
    "remodeling", "painting", "flooring", "concrete", "cleaning", "pest-control",
    "moving", "photography", "wedding-services", "catering", "printing", "handyman",
    "pool-service", "marketing-agency", "consulting", "it-services",
  ],
  audiences: ["owners", "salespeople", "managers", "contractors"],
  keywords: [
    "quote follow up sequence", "follow up email after quote", "estimate follow up template",
    "sales follow up scripts", "how many times to follow up", "follow up call script",
    "quote follow up text message", "30 day follow up plan",
  ],
  synonyms: ["estimate follow up kit", "quote chasing sequence", "follow up ladder"],
  disclaimer: "general-estimate",
  dataSensitivity: "none",
  popularity: 92,
  isNew: true,
  embedHeight: 1100,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A quote document with a payment landing on it at the end of a dotted thirty day path across a calendar, the touches marked as rising pins along the way.",
  visualFamily: "money-flow",
  primarySubject: "calendar with a dotted follow-up path",
  supportingSubjects: ["quote document", "touch pins", "handshake seal at the end"],
  sceneType: "diagram",
  composition: "calendar filling the right two thirds, quote sheet entering from the left, path arcing across, negative space upper left",
  colorAccent: 3,
  cardImage: "/tools-art/card/quote-follow-up-kit.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/quote-follow-up-kit.svg",
  heroImageAlt: "A thirty day calendar with a dotted follow-up path crossing it from a quote to a closed job",
  ogImage: "/og/tools/quote-follow-up-kit.jpg",
  ogLayout: "diagram",
  ogHook: "Seven touches over thirty days, written in your voice.",
  focalPoint: { x: 0.6, y: 0.5 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};
