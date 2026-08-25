// The 30 nurture emails, one per day, steps 101-130. This file IS the
// reviewable draft set: every subject and body lives here in plain text so
// Ryan can read and edit copy without touching the sending machinery.
//
// Voice rules, enforced by tests/nurture.test.ts:
//   short paragraphs, plain English, no em dashes, no corporate filler,
//   no invented numbers, no guaranteed results, no client names.
// Every email: one insight, one next action, one soft CTA link.
// The sender appends the signature and the signed unsubscribe footer.

import { STEP_BASE } from "./sequence";

export type NurtureEmailInput = {
  first: string;
  /** Verbatim form answers, used only to pick a matching free tool. */
  goals: string | null;
};

export type NurtureEmail = {
  day: number;
  step: number;
  subject: string;
  body: (input: NurtureEmailInput) => string;
};

const SITE = "https://www.theleadflowpro.com";

// Free-tool matcher for days 17 and 24. Reads the lead's own form answers and
// picks the closest tool; the generic library is the honest fallback.
export function pickToolLink(goals: string | null, alternate = false): { label: string; url: string } {
  const text = (goals ?? "").toLowerCase();
  const picks: Array<[RegExp, string, string]> = [
    [/miss\w* call|phone|answer/, "Missed Call Cost Calculator", "/tools/missed-call-calculator"],
    [/review|reputation|google/, "Google Review Link Builder", "/tools/google-review-link"],
    [/invoice|payment|billing|cash/, "Late Invoice Calculator", "/tools/late-invoice-calculator"],
    [/ad|facebook|marketing|budget/, "Ad Budget Planner", "/tools/ad-budget-planner"],
    [/time|busy|hours|admin/, "Task Automation Savings", "/tools/task-automation-savings"],
    [/lead|follow/, "Lead Value Calculator", "/tools/lead-value-calculator"],
  ];
  const matched = picks.filter(([re]) => re.test(text));
  const chosen = alternate ? matched[1] ?? matched[0] : matched[0];
  if (chosen) return { label: chosen[1], url: `${SITE}${chosen[2]}` };
  return { label: "the free tool library", url: `${SITE}/tools` };
}

const e = (day: number, subject: string, body: NurtureEmail["body"]): NurtureEmail => ({
  day,
  step: STEP_BASE + day,
  subject,
  body,
});

export const NURTURE_EMAILS: NurtureEmail[] = [
  // ------------------------------------------------------------ days 1-14 ---
  e(1, "Why I send one short email a day", ({ first }) =>
    [
      `${first},`,
      ``,
      `You checked the box that said you wanted business emails from me, so here is the deal.`,
      ``,
      `One email a day for thirty days. Each one is a single idea you can use the same day, in plain English, usually in under a minute of reading. No pitch parade. If one ever wastes your time, the unsubscribe link at the bottom works on the first click.`,
      ``,
      `Today's idea is the whole series in one line: the money in a small business is rarely in getting more attention. It is in what happens after someone raises their hand.`,
      ``,
      `Next action: think of the last person who contacted your business and did not buy. Tomorrow I will show you why that happened more often than it should.`,
      ``,
      `If you want to skip ahead and see how I think about all of this, start here:`,
      `${SITE}/start`,
    ].join("\n"),
  ),
  e(2, "The lead you already paid for", ({ first }) =>
    [
      `${first},`,
      ``,
      `Every person who calls, messages, or fills out a form costs you something. Ad money, sign money, or years of reputation. That cost is already spent whether or not anyone follows up.`,
      ``,
      `So the cheapest lead you will ever get is the one sitting in your inbox right now. Chasing a new stranger costs full price. Answering an old hand-raiser costs a text.`,
      ``,
      `Next action: scroll your messages and missed calls from the last two weeks. Reply to every person who never got an answer. A short "still want this handled?" is enough.`,
      ``,
      `When you want a system that makes this automatic, that is literally what I build:`,
      `${SITE}/packages`,
    ].join("\n"),
  ),
  e(3, "Your website has one job", ({ first }) =>
    [
      `${first},`,
      ``,
      `A small business website has one job: turn a visitor into a conversation. Not win a design award. Not explain your whole history. Start a conversation.`,
      ``,
      `Look at your homepage and ask one question. Can a stranger tell, in five seconds, what you do, where you do it, and what to tap next? If any of those three is missing, the site is leaking.`,
      ``,
      `Next action: open your own site on your phone like a customer would. Time yourself to the first button worth tapping.`,
      ``,
      `Want a second set of eyes on it? Grade it free here:`,
      `${SITE}/live`,
    ].join("\n"),
  ),
  e(4, "Speed is the feature nobody advertises", ({ first }) =>
    [
      `${first},`,
      ``,
      `When two businesses look about the same, the one that answers first usually wins. Not the cheaper one. Not the older one. The faster one. People buy from whoever makes it easy while the problem is still burning.`,
      ``,
      `Next action: figure out your real reply time. Look at your last five inquiries and count the hours between their message and your first response. Write the number down. We will use it later this week.`,
      ``,
      `I write about this pattern a lot, with examples from real trades:`,
      `${SITE}/articles`,
    ].join("\n"),
  ),
  e(5, "What to text back when you miss a call", ({ first }) =>
    [
      `${first},`,
      ``,
      `A missed call is not a lost customer. A missed call with no text back usually is.`,
      ``,
      `Here is a text you can save as a template today: "This is ${"{your name}"} with ${"{your business}"}. Sorry I missed you. What can I help with? If it is easier, tell me here and I will get right on it."`,
      ``,
      `Plain, human, fast. It keeps the conversation alive while the person still cares.`,
      ``,
      `Next action: save that as a quick reply on your phone right now. Thirty seconds of setup.`,
      ``,
      `Curious what missed calls cost in your numbers, not mine:`,
      `${SITE}/tools/missed-call-calculator`,
    ].join("\n"),
  ),
  e(6, "Your form is asking too much", ({ first }) =>
    [
      `${first},`,
      ``,
      `Every extra field on a contact form is a toll booth. Name, phone, and one question about the job is enough to start. You can collect the rest in the conversation, where it feels like service instead of paperwork.`,
      ``,
      `Next action: count the fields on your own contact form. If it is more than four, cut it down to the three that matter.`,
      ``,
      `Want to see how I build forms that people actually finish? Look at any page on my site, the forms practice what I preach:`,
      `${SITE}/contact`,
    ].join("\n"),
  ),
  e(7, "Week one, one move", ({ first }) =>
    [
      `${first},`,
      ``,
      `Week one in one paragraph: your cheapest sale is someone who already contacted you. Your website's only job is starting conversations. Speed wins ties. A saved text template beats a lost call. Short forms get finished.`,
      ``,
      `Next action: pick exactly one of those and make it real today. One. The businesses that improve are not the ones that know the most, they are the ones that ship one small fix a week.`,
      ``,
      `If you would rather map all of it at once with me, this is where that starts:`,
      `${SITE}/start`,
    ].join("\n"),
  ),
  e(8, "Reviews are a salesman who works free", ({ first }) =>
    [
      `${first},`,
      ``,
      `Before a stranger calls you, they read what other people said about you. Reviews close deals while you sleep. And the biggest reason businesses have few reviews is simple: nobody asked.`,
      ``,
      `Next action: text your three happiest recent customers and ask for an honest review. Not a good review. An honest one. Make it one tap for them by sending the direct link.`,
      ``,
      `I have a free tool that builds that direct link for your Google profile:`,
      `${SITE}/tools/google-review-link`,
    ].join("\n"),
  ),
  e(9, "Follow-up that does not feel like nagging", ({ first }) =>
    [
      `${first},`,
      ``,
      `Most owners quit following up after one try because they do not want to be annoying. But a follow-up only feels like nagging when it repeats the pitch. It feels like service when it adds something: a reminder of the problem, an answer to a question they asked, a simple "want me to hold your spot?"`,
      ``,
      `Next action: pick one quote or estimate you sent that went quiet. Send one message that helps instead of asks.`,
      ``,
      `This is the exact thinking behind the follow-up systems I install:`,
      `${SITE}/premier-system`,
    ].join("\n"),
  ),
  e(10, "One clear offer beats five vague ones", ({ first }) =>
    [
      `${first},`,
      ``,
      `Confused buyers do not buy. When your site or your ads list everything you could possibly do, the reader has to do the work of figuring out what to ask for. Most will not.`,
      ``,
      `Lead with the one thing most people want first, at a price or a process they can picture. The rest of your services can live one click deeper.`,
      ``,
      `Next action: write your front-door offer in one sentence. What you do, who it is for, what happens next.`,
      ``,
      `Here is how I frame mine, as a working example:`,
      `${SITE}/packages`,
    ].join("\n"),
  ),
  e(11, "Your Google profile is a landing page", ({ first }) =>
    [
      `${first},`,
      ``,
      `For a local business, more strangers meet you on your Google profile than on your website. Photos, hours, services, reviews, and whether you answer the built-in messages. That page is selling for you or against you right now.`,
      ``,
      `Next action: open your profile as a customer. Fix the first thing that looks stale. Usually it is photos or hours.`,
      ``,
      `More local visibility ideas, written for owners, not marketers:`,
      `${SITE}/articles`,
    ].join("\n"),
  ),
  e(12, "Automate the boring, keep the human", ({ first }) =>
    [
      `${first},`,
      ``,
      `The right things to automate are the ones nobody enjoys and everybody forgets: the missed-call text, the appointment reminder, the review ask, the invoice nudge. The wrong things to automate are the ones that make people feel handled instead of helped.`,
      ``,
      `Rule of thumb: automate the remembering, keep the relationship.`,
      ``,
      `Next action: name the one message you keep forgetting to send. That is your first automation.`,
      ``,
      `See what that saves in your own hours:`,
      `${SITE}/tools/task-automation-savings`,
    ].join("\n"),
  ),
  e(13, "The owner's hour", ({ first }) =>
    [
      `${first},`,
      ``,
      `Every job you do IN the business is worth your hourly rate. The hour you spend ON the business, fixing the system that loses leads or the process that forgets follow-up, pays you every week after.`,
      ``,
      `Next action: block one hour this week with no phone. Spend it on the leak you already know about. You have known about it for a while. This is the hour it gets fixed.`,
      ``,
      `If you want that hour guided, this quiz points it at the right target:`,
      `${SITE}/start`,
    ].join("\n"),
  ),
  e(14, "Two weeks in: what to do with all this", ({ first }) =>
    [
      `${first},`,
      ``,
      `Fourteen days of small moves: answer old leads, sharpen the website's first five seconds, reply faster, text back missed calls, shorten forms, ask for reviews, follow up with help, lead with one offer, dust off the Google profile, automate the remembering.`,
      ``,
      `None of it requires new software or a bigger budget. It requires a system that does not depend on your memory.`,
      ``,
      `Next action: reply to this email with the one leak that annoys you most. I read every reply myself.`,
      ``,
      `Or skip the typing and put a time on my calendar:`,
      `${SITE}/book`,
    ].join("\n"),
  ),

  // ----------------------------------------------------------- days 15-30 ---
  e(15, "The five-minute rule", ({ first }) =>
    [
      `${first},`,
      ``,
      `Here is the rule the best local operators live by: answer every new inquiry within five minutes while it is hot, or within one hour with an apology. After that, you are not replying, you are reintroducing yourself.`,
      ``,
      `You do not need to be glued to the phone. You need a first response that goes out without you: a text that says you saw the message and when a human follows.`,
      ``,
      `Next action: write your five-minute auto-first-reply today, even if you send it manually for now.`,
      ``,
      `The systems I build send it for you:`,
      `${SITE}/premier-system`,
    ].join("\n"),
  ),
  e(16, "What is a lead actually worth to you?", ({ first }) =>
    [
      `${first},`,
      ``,
      `Do this math with your own numbers, it takes two minutes.`,
      ``,
      `Average sale in dollars, times how often a customer comes back in a year, times how many years they stay. That is a customer's value. Now multiply by the share of inquiries you close. That is what one LEAD is worth before anyone answers the phone.`,
      ``,
      `Most owners have never run that number, and it changes how urgent follow-up feels.`,
      ``,
      `Next action: run it. Pen and paper is fine, or use the calculator so you can change the inputs:`,
      `${SITE}/tools/lead-value-calculator`,
    ].join("\n"),
  ),
  e(17, "A free tool picked for you", ({ first, goals }) => {
    const tool = pickToolLink(goals, false);
    return [
      `${first},`,
      ``,
      `When you filled out the form, you told me a little about what you are dealing with. Based on that, the free tool on my site I would hand you first is ${tool.label}.`,
      ``,
      `Everything in the tool library is genuinely free, no login, built for owners to get an answer in a couple of minutes.`,
      ``,
      `Next action: run your real numbers through it once. Two minutes.`,
      ``,
      `${tool.url}`,
    ].join("\n");
  }),
  e(18, "Why the posting always stops", ({ first }) =>
    [
      `${first},`,
      ``,
      `Every owner starts posting with good intentions. Then a busy week hits, the streak breaks, and the page goes quiet for a month. The problem was never discipline. It is that posting was a daily decision instead of a scheduled system.`,
      ``,
      `Anything that has to be decided every day eventually loses to the day.`,
      ``,
      `Next action: batch it once. Sit down one time and write out two weeks of simple posts, then schedule them all.`,
      ``,
      `Or have my system do the writing and scheduling in your voice:`,
      `${SITE}/go/time-back`,
    ].join("\n"),
  ),
  e(19, "One customer record beats five inboxes", ({ first }) =>
    [
      `${first},`,
      ``,
      `Right now a customer's story is probably scattered: a call on your cell, a message on Facebook, an email thread, a paper invoice, a note in your head. Any one of those goes missing and the follow-up dies.`,
      ``,
      `One record per customer, everything attached to it, is the single upgrade that makes every other upgrade work.`,
      ``,
      `Next action: pick where your one source of truth will live, even if it is a spreadsheet this month. Scattered perfect tools lose to one honest list.`,
      ``,
      `This is the center of every system I install:`,
      `${SITE}/premier-system`,
    ].join("\n"),
  ),
  e(20, "The questions that pre-sell", ({ first }) =>
    [
      `${first},`,
      ``,
      `The right questions on your website do sales work before you ever talk. Asking "what kind of project" and "how soon" does two things: it makes the visitor picture hiring you, and it hands you a conversation already half-started.`,
      ``,
      `Generic forms collect names. Good forms collect intent.`,
      ``,
      `Next action: add one qualifying question to your form. Just one. "How soon do you want this handled?" earns its place on almost any site.`,
      ``,
      `Watch how my own start page does it:`,
      `${SITE}/start`,
    ].join("\n"),
  ),
  e(21, "Three weeks in. Pick your lane.", ({ first }) =>
    [
      `${first},`,
      ``,
      `Week three was about the machinery: first-reply speed, knowing what a lead is worth, one record per customer, forms that pre-sell, and systems that survive a busy week.`,
      ``,
      `Here is the honest fork in the road. You can build all of this yourself, piece by piece, and these emails will keep helping. Or you can decide your time is the scarce part, and have it built for you.`,
      ``,
      `Next action: two minutes, five questions, and it tells you where to start either way:`,
      `${SITE}/start`,
    ].join("\n"),
  ),
  e(22, "What a System Map finds", ({ first }) =>
    [
      `${first},`,
      ``,
      `The System Map is a paid working session where I go through a business the way a mechanic goes through a truck: where leads enter, where they stall, what tools overlap, what gets paid for twice, what nobody follows up on.`,
      ``,
      `The pattern I see most is not a missing tool. It is five tools that do not talk to each other, and a human bridge (usually the owner) carrying data between them by memory.`,
      ``,
      `Next action: sketch your own map on paper. Boxes for every place a customer's info lives, arrows for how it moves. The arrows that do not exist are the leaks.`,
      ``,
      `Want mine instead? Here is exactly what it covers and costs:`,
      `${SITE}/packages/system-map`,
    ].join("\n"),
  ),
  e(23, "The missed-call math", ({ first }) =>
    [
      `${first},`,
      ``,
      `Grab your phone log for last week and count the missed calls that never got a call or text back. Multiply by what a lead is worth to you (you ran that number on day 16). That is the invoice nobody sends you, every week.`,
      ``,
      `The fix is rarely more staff. It is a text that goes out the moment a call is missed, so the person stays in the conversation until a human is free.`,
      ``,
      `Next action: count last week's missed calls. Just count them.`,
      ``,
      `Then put your numbers in here and see the yearly picture:`,
      `${SITE}/tools/missed-call-calculator`,
    ].join("\n"),
  ),
  e(24, "One more tool, on me", ({ first, goals }) => {
    const tool = pickToolLink(goals, true);
    return [
      `${first},`,
      ``,
      `Second tool pick, based on what you told me when you signed up: ${tool.label}.`,
      ``,
      `Why free? Because a tool that gives you a real answer about your own business says more about how I work than any ad could.`,
      ``,
      `Next action: two minutes, real numbers, one honest answer.`,
      ``,
      `${tool.url}`,
    ].join("\n");
  }),
  e(25, "Ads buy attention. Systems keep it.", ({ first }) =>
    [
      `${first},`,
      ``,
      `The most common ad mistake is not bad targeting or bad creative. It is pointing good ads at a business with no system behind the click: slow replies, no follow-up, no record of who asked.`,
      ``,
      `Attention is rented. The system is owned. Rent attention only when the owned part is ready to catch it.`,
      ``,
      `Next action: before you spend another ad dollar, send yourself a lead through your own funnel and watch what actually happens.`,
      ``,
      `If that test goes badly, this is the fix:`,
      `${SITE}/packages`,
    ].join("\n"),
  ),
  e(26, "If they have to call to buy, some will not", ({ first }) =>
    [
      `${first},`,
      ``,
      `Some of your customers love the phone. The rest will pick whoever lets them book, quote, or pay without a call. Every step that requires a phone call during business hours quietly filters out the people who work those same hours.`,
      ``,
      `Next action: find the one thing customers most often call about, and open a second door for it. A booking link, a simple form, a text number.`,
      ``,
      `My booking page is an example of the second door:`,
      `${SITE}/book`,
    ].join("\n"),
  ),
  e(27, "What a real build looks like", ({ first }) =>
    [
      `${first},`,
      ``,
      `A recent client build, no names: a local service business whose leads arrived in four places and got answered from none of them reliably. We built one intake, one customer record, automatic first replies, and a follow-up queue the staff clears each morning.`,
      ``,
      `The honest division of work: I built the system and connected the pieces. They changed their morning routine to work the queue. The system alone would not have done it. Neither would the routine alone.`,
      ``,
      `Next action: decide which half you are missing, the system or the routine.`,
      ``,
      `More builds like this one:`,
      `${SITE}/portfolio`,
    ].join("\n"),
  ),
  e(28, "The rent-versus-own ledger", ({ first }) =>
    [
      `${first},`,
      ``,
      `Write two columns. Left: every monthly software seat you pay for, times twelve. Right: what those tools would cost as a one-time build you own, sitting in accounts under your name.`,
      ``,
      `For some businesses renting wins, and I will say so. But most owners have never actually run the ledger, and the yearly rent number usually surprises them.`,
      ``,
      `Next action: run the ledger. Ten minutes, your real subscriptions.`,
      ``,
      `How the ownership side works when I build it:`,
      `${SITE}/packages`,
    ].join("\n"),
  ),
  e(29, "What working with me actually looks like", ({ first }) =>
    [
      `${first},`,
      ``,
      `Week by week, no mystery. First we map the business and agree in writing on what gets built. Then I build in short cycles you can see, in accounts you own from day one. You get progress you can click, not status reports. At handoff, you hold the keys: the code, the data, the logins. Then I train you and your people on it.`,
      ``,
      `No long contract. The work is scoped, built, and handed over.`,
      ``,
      `Next action: if you have been reading these and nodding, the next step is one conversation:`,
      `${SITE}/book`,
    ].join("\n"),
  ),
  e(30, "Last one. Three doors.", ({ first }) =>
    [
      `${first},`,
      ``,
      `This is email thirty of thirty, so I will keep the promise I made on day one and stop here.`,
      ``,
      `Three doors, all genuinely fine by me:`,
      ``,
      `1. Reply to this email with a question, a leak, or just what you fixed this month. I read every reply.`,
      `2. Book a call and we will map your next move together: ${SITE}/book`,
      `3. Unsubscribe below. No hard feelings, and the free tools stay free either way.`,
      ``,
      `Whatever you pick, go be the business that answers first.`,
    ].join("\n"),
  ),
];

/** Lookup by ledger step number. */
export function emailForStep(step: number): NurtureEmail | null {
  return NURTURE_EMAILS.find((email) => email.step === step) ?? null;
}
