import { type Tool, num, money, money2, pct, count, dec, rampMonths } from "./types";

export const LEAD_TOOLS: Tool[] = [
  {
    slug: "missed-call-calculator",
    name: "Missed Call Money Calculator",
    short: "Missed Call Money",
    emoji: "📵",
    category: "Leads",
    tagline: "See what missed calls actually cost you",
    description:
      "Punch in how many calls you miss and what a customer is worth. See the real dollars walking to your competitors every month.",
    who: "Any business where the phone is the front door: trades, clinics, shops, restaurants, salons, law offices.",
    problem:
      "You are on a ladder, in a chair, under a truck, or with a customer. The phone rings twice and they call the next name on the list. Nobody leaves a voicemail anymore.",
    payoff:
      "A number big enough to make you finally fix the phone. Most shops find five figures a year sitting in missed calls.",
    steps: [
      "Count the calls you miss in a normal week. Check your phone log, do not guess low.",
      "Enter what a customer is worth on the first job.",
      "Add how many times a happy customer comes back.",
      "Look at the yearly number, then go turn on missed-call text-back.",
    ],
    faqs: [
      { q: "How do I know how many calls I miss?", a: "Open your phone's call log and count the missed and unanswered calls for the last seven days. Most owners are shocked. If you have a business line, your carrier can show you a report." },
      { q: "What is missed-call text-back?", a: "When a call goes unanswered, the caller instantly gets a text: sorry we missed you, what can we help with. Most people answer a text. It catches a big share of the calls you would have lost." },
    ],
    featured: true,
    embedHeight: 900,
    fields: [
      { id: "missed", label: "Calls you miss per week", type: "slider", min: 0, max: 60, step: 1, def: 5, help: "Check your call log. It is usually higher than you think." },
      { id: "closeRate", label: "How many of those callers would have bought", type: "slider", min: 5, max: 100, step: 5, def: 30, suffix: "%" },
      { id: "ticket", label: "Average first sale", type: "money", def: 250 },
      { id: "repeats", label: "Times a customer comes back", type: "slider", min: 1, max: 20, step: 1, def: 2, suffix: "x" },
    ],
    run: (v) => {
      const missed = num(v, "missed");
      const rate = num(v, "closeRate") / 100;
      const ticket = num(v, "ticket");
      const repeats = Math.max(1, num(v, "repeats"));
      const weekly = missed * rate * ticket * repeats;
      const monthly = (weekly * 52) / 12;
      const yearly = weekly * 52;
      const customersLost = missed * rate * 52;

      return {
        headline: { value: money(yearly), label: "Walking out the door every year", sub: `${money(monthly)} a month`, tone: "bad" },
        stats: [
          { label: "Lost per week", value: money(weekly), tone: "bad" },
          { label: "Customers lost a year", value: count(customersLost), tone: "bad" },
          { label: "Calls missed a year", value: count(missed * 52) },
          { label: "Recovered by a text-back", value: money(yearly * 0.5), sub: "if it catches half", tone: "good" },
        ],
        ramp: rampMonths(monthly, "Watch it pile up, month by month", "Same missed calls, twelve months in a row."),
        verdict: {
          tone: "bad",
          text: `Every missed call is worth about ${money2(rate * ticket * repeats)} to you. You are missing ${count(missed)} a week.`,
        },
        note: "An instant text-back catches a large share of these. It is one of the cheapest things you can add to a business.",
      };
    },
  },

  {
    slug: "lead-response-time",
    name: "Lead Response Time Calculator",
    short: "Response Time",
    emoji: "⚡",
    category: "Leads",
    tagline: "Slow replies are why leads go cold",
    description:
      "The first business to answer usually wins the job. See what your reply time is costing you against a competitor who answers in five minutes.",
    who: "Anyone getting leads from a website form, Facebook, Google or a referral.",
    problem:
      "You get the email at 9am, see it at 4pm, call at 5:30. By then they already booked somebody who called back in ten minutes.",
    payoff: "A dollar figure on the delay, which is usually the cheapest problem you have to fix.",
    steps: [
      "Enter how many leads you get and how long you actually take to reply.",
      "Compare it against a five-minute reply.",
      "Set up an instant auto-reply tonight. It costs nothing.",
    ],
    fields: [
      { id: "leads", label: "Leads per month", type: "slider", min: 1, max: 500, step: 1, def: 40 },
      { id: "hours", label: "Hours before you usually reply", type: "slider", min: 0, max: 72, step: 1, def: 8 },
      { id: "ticket", label: "Average job value", type: "money", def: 850 },
      { id: "baseClose", label: "Your close rate when you do reply fast", type: "slider", min: 5, max: 90, step: 5, def: 40, suffix: "%" },
    ],
    run: (v) => {
      const leads = num(v, "leads");
      const hours = num(v, "hours");
      const ticket = num(v, "ticket");
      const base = num(v, "baseClose") / 100;
      // Decay curve: contact and conversion odds fall off sharply after the first hour.
      const decay = (h: number) => Math.max(0.12, Math.exp(-h / 6));
      const fastFactor = decay(0.08);
      const yourFactor = decay(hours);
      const fastRevenue = leads * base * fastFactor * ticket;
      const yourRevenue = leads * base * yourFactor * ticket;
      const lost = fastRevenue - yourRevenue;

      return {
        headline: { value: money(lost * 12), label: "Lost every year to slow replies", sub: `${money(lost)} a month`, tone: "bad" },
        stats: [
          { label: "Jobs won replying in 5 min", value: count(leads * base * fastFactor), tone: "good" },
          { label: `Jobs won at ${count(hours)} hours`, value: count(leads * base * yourFactor), tone: "bad" },
          { label: "Jobs lost a month", value: count(leads * base * (fastFactor - yourFactor)), tone: "bad" },
          { label: "Revenue difference a month", value: money(lost), tone: "bad" },
        ],
        bars: {
          title: "Jobs won per month by reply speed",
          caption: "Same leads. Only the clock changed.",
          items: [
            { label: "5 minutes", value: leads * base * decay(0.08), display: count(leads * base * decay(0.08)), tone: "good" },
            { label: "1 hour", value: leads * base * decay(1), display: count(leads * base * decay(1)), tone: "good" },
            { label: "4 hours", value: leads * base * decay(4), display: count(leads * base * decay(4)), tone: "warn" },
            { label: "24 hours", value: leads * base * decay(24), display: count(leads * base * decay(24)), tone: "bad" },
            { label: `You: ${count(hours)}h`, value: leads * base * yourFactor, display: count(leads * base * yourFactor), tone: "bad" },
          ],
        },
        verdict: {
          tone: "bad",
          text: "You do not have to answer in five minutes. Something you own has to answer in five minutes. That is the whole fix.",
        },
        note: "The decay curve here is a working model based on the well-known pattern that contact rates drop hard after the first hour. Your business will have its own curve. The direction is never wrong.",
      };
    },
  },

  {
    slug: "lead-value-calculator",
    name: "What Is a Lead Worth?",
    short: "Lead Value",
    emoji: "🎣",
    category: "Leads",
    tagline: "The number that decides your whole marketing budget",
    description:
      "Work out what one raw lead is worth to you. Once you know that, you know what you can spend to get one, and whether anybody is ripping you off.",
    who: "Anyone buying leads, running ads, or being pitched by a lead company.",
    problem:
      "A lead company quotes you $80 a lead and you have no idea if that is a steal or a scam.",
    payoff: "A defensible per-lead number you can hold every marketing decision against.",
    steps: [
      "Enter your close rate and average job.",
      "Add repeat business and referrals, because a lead is not one job.",
      "Compare the result to what anyone is charging you per lead.",
    ],
    fields: [
      { id: "closeRate", label: "Leads that turn into customers", type: "slider", min: 1, max: 100, step: 1, def: 25, suffix: "%" },
      { id: "ticket", label: "Average first job", type: "money", def: 600 },
      { id: "margin", label: "Gross margin", type: "slider", min: 5, max: 95, step: 1, def: 45, suffix: "%" },
      { id: "repeat", label: "Repeat jobs from a customer", type: "slider", min: 0, max: 20, step: 1, def: 2 },
      { id: "referral", label: "Customers each one refers", type: "slider", min: 0, max: 5, step: 0.5, def: 0.5 },
      { id: "paying", label: "What you pay per lead now", type: "money", def: 50 },
    ],
    run: (v) => {
      const close = num(v, "closeRate") / 100;
      const ticket = num(v, "ticket");
      const margin = num(v, "margin") / 100;
      const repeat = num(v, "repeat");
      const referral = num(v, "referral");
      const paying = num(v, "paying");

      const customerRevenue = ticket * (1 + repeat) * (1 + referral);
      const customerProfit = customerRevenue * margin;
      const leadRevenue = customerRevenue * close;
      const leadProfit = customerProfit * close;
      const maxPay = leadProfit * 0.4;
      const roi = paying > 0 ? ((leadProfit - paying) / paying) * 100 : 0;

      return {
        headline: { value: money2(leadRevenue), label: "Revenue per raw lead", sub: `${money2(leadProfit)} of gross profit`, tone: "good" },
        stats: [
          { label: "Lifetime value of one customer", value: money(customerRevenue), tone: "good" },
          { label: "Ceiling per lead", value: money2(leadProfit), sub: "above this you lose money" },
          { label: "Comfortable to pay", value: money2(maxPay), sub: "leaves real profit", tone: "good" },
          { label: "Return on what you pay now", value: pct(roi, 0), tone: roi > 0 ? "good" : "bad" },
        ],
        bars: {
          title: "What a lead is worth vs what you pay",
          items: [
            { label: "You pay", value: paying, display: money2(paying), tone: "warn" },
            { label: "Comfortable price", value: maxPay, display: money2(maxPay), tone: "good" },
            { label: "Absolute ceiling", value: leadProfit, display: money2(leadProfit), tone: "bad" },
          ],
        },
        verdict: {
          tone: paying < maxPay ? "good" : paying < leadProfit ? "warn" : "bad",
          text:
            paying < maxPay
              ? `At ${money2(paying)} a lead you have room to buy more of them. That is usually the right move.`
              : paying < leadProfit
                ? `You are profitable but thin. Push close rate or ticket before you buy more leads.`
                : `You are paying more than a lead is worth. Fix close rate first or stop buying.`,
        },
      };
    },
  },

  {
    slug: "cost-per-lead-calculator",
    name: "Cost Per Lead & Cost Per Customer",
    short: "Cost Per Lead",
    emoji: "🏷️",
    category: "Leads",
    tagline: "What you are really paying to get a customer",
    description:
      "Everything you spend to get attention, divided by what you actually get. The two numbers every marketing conversation should start with.",
    who: "Anyone spending money on ads, flyers, sponsorships, mailers or lead services.",
    problem:
      "Spend goes out, jobs come in, and nobody connects the two. So you cannot tell what to cut and what to double.",
    payoff: "Cost per lead and cost per customer, plus what one point of close rate would save.",
    steps: [
      "Add up everything you spent last month to get attention.",
      "Enter leads and customers from it.",
      "Compare cost per customer to what a customer is worth.",
    ],
    fields: [
      { id: "spend", label: "Marketing spend per month", type: "money", def: 2500 },
      { id: "leads", label: "Leads it produced", type: "slider", min: 1, max: 1000, step: 1, def: 45 },
      { id: "customers", label: "Customers that closed", type: "slider", min: 0, max: 500, step: 1, def: 11 },
      { id: "value", label: "What a customer is worth to you", type: "money", def: 1400 },
      { id: "margin", label: "Gross margin", type: "slider", min: 5, max: 95, step: 1, def: 45, suffix: "%" },
    ],
    run: (v) => {
      const spend = num(v, "spend");
      const leads = Math.max(1, num(v, "leads"));
      const customers = num(v, "customers");
      const value = num(v, "value");
      const margin = num(v, "margin") / 100;
      const cpl = spend / leads;
      const cac = customers > 0 ? spend / customers : 0;
      const closeRate = (customers / leads) * 100;
      const profitPer = value * margin;
      const netPer = profitPer - cac;
      const roas = spend > 0 ? (customers * value) / spend : 0;
      const betterClose = leads * ((closeRate + 5) / 100);
      const betterCac = betterClose > 0 ? spend / betterClose : 0;

      return {
        headline: {
          value: customers > 0 ? money2(cac) : "No customers",
          label: "Cost to get one customer",
          sub: `${money2(cpl)} per lead, ${pct(closeRate, 1)} close rate`,
          tone: netPer > 0 ? "good" : "bad",
        },
        stats: [
          { label: "Cost per lead", value: money2(cpl) },
          { label: "Gross profit per customer", value: money2(profitPer), tone: "good" },
          { label: netPer >= 0 ? "Profit after acquisition" : "Loss per customer", value: money2(Math.abs(netPer)), tone: netPer >= 0 ? "good" : "bad" },
          { label: "Return on ad spend", value: `${dec(roas, 2)}x`, tone: roas >= 3 ? "good" : roas >= 1 ? "warn" : "bad" },
        ],
        bars: {
          title: "What you pay vs what you get",
          items: [
            { label: "Cost per customer", value: cac, display: money2(cac), tone: "warn" },
            { label: "Profit per customer", value: profitPer, display: money2(profitPer), tone: "good" },
          ],
        },
        verdict: {
          tone: netPer > 0 ? "good" : "bad",
          text:
            customers === 0
              ? "Zero customers from this spend means the problem is downstream of the ad. Look at reply speed and follow-up before you touch the budget."
              : `Raising close rate by 5 points would drop your cost per customer to ${money2(betterCac)} without spending another dollar.`,
        },
        note: "Include everything: ad spend, agency fees, lead subscriptions, print, sponsorships. Leaving costs out is how people convince themselves marketing is working.",
      };
    },
  },

  {
    slug: "no-show-calculator",
    name: "No-Show Cost Calculator",
    short: "No-Shows",
    emoji: "👻",
    category: "Leads",
    tagline: "Empty chairs, empty slots, empty pockets",
    description:
      "Every no-show is a slot you could have sold, plus the drive, plus the setup. See the yearly total and what reminders would recover.",
    who: "Clinics, salons, shops, trades, consultants, anybody who books appointments.",
    problem:
      "You held the time. You drove there. They forgot. That hour is gone and it cannot be resold.",
    payoff: "The yearly cost of no-shows, and the fix that recovers most of it.",
    steps: [
      "Enter appointments a week and your no-show rate.",
      "Add drive and setup time you eat when they do not show.",
      "See what automated reminders would put back.",
    ],
    fields: [
      { id: "appts", label: "Appointments per week", type: "slider", min: 1, max: 300, step: 1, def: 35 },
      { id: "noShow", label: "No-show rate", type: "slider", min: 1, max: 50, step: 1, def: 12, suffix: "%" },
      { id: "value", label: "Value of one appointment", type: "money", def: 180 },
      { id: "wasted", label: "Wasted hours per no-show", type: "slider", min: 0, max: 5, step: 0.25, def: 0.75 },
      { id: "hourly", label: "What your hour is worth", type: "money", def: 95 },
      { id: "reminderLift", label: "No-shows reminders would prevent", type: "slider", min: 0, max: 90, step: 5, def: 60, suffix: "%" },
    ],
    run: (v) => {
      const appts = num(v, "appts");
      const rate = num(v, "noShow") / 100;
      const value = num(v, "value");
      const wasted = num(v, "wasted");
      const hourly = num(v, "hourly");
      const lift = num(v, "reminderLift") / 100;
      const perWeek = appts * rate;
      const lostRevenue = perWeek * value;
      const lostTime = perWeek * wasted * hourly;
      const weekly = lostRevenue + lostTime;
      const yearly = weekly * 52;
      const recovered = yearly * lift;

      return {
        headline: { value: money(yearly), label: "No-shows cost you this every year", sub: `${count(perWeek * 52)} empty slots`, tone: "bad" },
        stats: [
          { label: "Lost per week", value: money(weekly), tone: "bad" },
          { label: "Wasted time value", value: money(lostTime * 52), sub: "drive and setup", tone: "bad" },
          { label: "Recovered by reminders", value: money(recovered), tone: "good" },
          { label: "Still lost after reminders", value: money(yearly - recovered), tone: "warn" },
        ],
        ramp: rampMonths(yearly / 12, "Empty slots adding up", "Twelve months of the same no-show rate."),
        verdict: {
          tone: "good",
          text: `Text reminders at 24 hours and 2 hours plus a confirm link would put roughly ${money(recovered)} a year back. That is the highest return, lowest effort fix in this whole toolbox.`,
        },
        note: "Add a deposit for first-time bookings and the no-show rate usually drops hard on its own.",
      };
    },
  },

  {
    slug: "quote-follow-up-calculator",
    name: "Unclosed Quote Calculator",
    short: "Unclosed Quotes",
    emoji: "📬",
    category: "Leads",
    tagline: "The money already sitting on your desk",
    description:
      "You already did the hard part. You measured, you priced, you sent it. Then nobody followed up. See what that pile is worth.",
    who: "Trades, remodelers, roofers, agencies, anybody who sends estimates.",
    problem:
      "Most quotes get one send and no follow-up. The customer was not saying no, they were busy.",
    payoff: "The value of a follow-up sequence you can set up once.",
    steps: [
      "Enter quotes you send a month and what percent you close today.",
      "Set how many of the rest a real follow-up would win.",
      "See the yearly number, then go build the follow-up.",
    ],
    fields: [
      { id: "quotes", label: "Quotes you send per month", type: "slider", min: 1, max: 300, step: 1, def: 30 },
      { id: "value", label: "Average quote value", type: "money", def: 3200 },
      { id: "closeNow", label: "Percent you close today", type: "slider", min: 1, max: 90, step: 1, def: 28, suffix: "%" },
      { id: "lift", label: "Extra you would close with follow-up", type: "slider", min: 1, max: 40, step: 1, def: 10, suffix: "%", help: "Percentage points added to your close rate, not a percent of a percent." },
      { id: "margin", label: "Gross margin", type: "slider", min: 5, max: 95, step: 1, def: 38, suffix: "%" },
    ],
    run: (v) => {
      const quotes = num(v, "quotes");
      const value = num(v, "value");
      const closeNow = num(v, "closeNow") / 100;
      const lift = num(v, "lift") / 100;
      const margin = num(v, "margin") / 100;

      const openQuotes = quotes * (1 - closeNow);
      const openValue = openQuotes * value;
      const extraJobs = quotes * lift;
      const extraRevenue = extraJobs * value;
      const extraProfit = extraRevenue * margin;

      return {
        headline: { value: money(extraRevenue * 12), label: "Extra revenue a follow-up would win per year", sub: `${money(extraProfit * 12)} of that is profit`, tone: "good" },
        stats: [
          { label: "Quotes sitting open monthly", value: count(openQuotes), sub: money(openValue) + " of work", tone: "warn" },
          { label: "Extra jobs a month", value: dec(extraJobs, 1), tone: "good" },
          { label: "Extra revenue a month", value: money(extraRevenue), tone: "good" },
          { label: "New close rate", value: pct((closeNow + lift) * 100, 0), tone: "good" },
        ],
        bars: {
          title: "Where your quotes go today",
          items: [
            { label: "Closed", value: quotes * closeNow, display: count(quotes * closeNow), tone: "good" },
            { label: "Winnable with follow-up", value: extraJobs, display: dec(extraJobs, 1), tone: "warn" },
            { label: "Gone", value: Math.max(0, openQuotes - extraJobs), display: count(Math.max(0, openQuotes - extraJobs)), tone: "bad" },
          ],
        },
        verdict: {
          tone: "good",
          text: "Day 1 text, day 3 call, day 7 email, day 14 last-call text. Four touches, written once, sent automatically. That is the whole system.",
        },
      };
    },
  },

  {
    slug: "close-rate-calculator",
    name: "Close Rate Impact Calculator",
    short: "Close Rate",
    emoji: "🤝",
    category: "Leads",
    tagline: "What five more points is worth",
    description:
      "Before you spend another dollar on ads, find out what fixing your close rate would do with the leads you already get.",
    who: "Anyone about to increase their ad budget.",
    problem:
      "Buying more leads is expensive. Closing more of the ones you have is free.",
    payoff: "A direct comparison between spending more and selling better.",
    steps: [
      "Enter your leads and current close rate.",
      "Move the improvement slider.",
      "Compare it against what the same gain would cost in ad spend.",
    ],
    fields: [
      { id: "leads", label: "Leads per month", type: "slider", min: 1, max: 500, step: 1, def: 50 },
      { id: "close", label: "Close rate today", type: "slider", min: 1, max: 90, step: 1, def: 22, suffix: "%" },
      { id: "improve", label: "Points you could add", type: "slider", min: 1, max: 40, step: 1, def: 5, suffix: " pts" },
      { id: "value", label: "Average job value", type: "money", def: 900 },
      { id: "cpl", label: "What a lead costs you", type: "money", def: 55 },
    ],
    run: (v) => {
      const leads = num(v, "leads");
      const close = num(v, "close") / 100;
      const improve = num(v, "improve") / 100;
      const value = num(v, "value");
      const cpl = num(v, "cpl");

      const now = leads * close * value;
      const after = leads * (close + improve) * value;
      const gain = after - now;
      const extraJobs = leads * improve;
      const leadsNeeded = close > 0 ? extraJobs / close : 0;
      const adCost = leadsNeeded * cpl;

      return {
        headline: { value: money(gain * 12), label: "Extra revenue a year from closing better", sub: `${money(gain)} a month`, tone: "good" },
        stats: [
          { label: "Extra jobs a month", value: dec(extraJobs, 1), tone: "good" },
          { label: "Same gain by buying leads", value: count(leadsNeeded) + " leads", tone: "warn" },
          { label: "That would cost", value: money(adCost) + "/mo", tone: "bad" },
          { label: "Saved by fixing close rate", value: money(adCost * 12) + "/yr", tone: "good" },
        ],
        bars: {
          title: "Monthly revenue, before and after",
          items: [
            { label: `Today at ${pct(close * 100)}`, value: now, display: money(now), tone: "neutral" },
            { label: `At ${pct((close + improve) * 100)}`, value: after, display: money(after), tone: "good" },
          ],
        },
        verdict: {
          tone: "good",
          text: "Answer faster, follow up four times, ask for the sale, and make it easy to say yes. That is usually worth more than doubling the ad budget.",
        },
      };
    },
  },

  {
    slug: "lead-goal-planner",
    name: "Reverse Revenue Goal Planner",
    short: "Revenue Goal",
    emoji: "🧭",
    category: "Leads",
    tagline: "Work backward from the number you want",
    description:
      "Name a revenue goal. This tells you the leads, calls, quotes and jobs a week it takes to get there.",
    who: "Any owner who has a goal but no daily plan attached to it.",
    problem:
      "Goals stay dreams until they turn into a weekly activity number somebody can actually do on a Tuesday.",
    payoff: "A weekly scoreboard that adds up to the year you said you wanted.",
    steps: [
      "Enter the revenue you want this year.",
      "Enter your average job and your close rate.",
      "Read the weekly lead and quote targets. Put them on the wall.",
    ],
    fields: [
      { id: "goal", label: "Revenue goal for the year", type: "money", def: 600000 },
      { id: "ticket", label: "Average job", type: "money", def: 1800 },
      { id: "close", label: "Close rate", type: "slider", min: 1, max: 90, step: 1, def: 30, suffix: "%" },
      { id: "leadToQuote", label: "Leads that become a quote", type: "slider", min: 5, max: 100, step: 5, def: 60, suffix: "%" },
      { id: "weeks", label: "Weeks you work", type: "slider", min: 30, max: 52, step: 1, def: 48 },
      { id: "current", label: "Revenue you did last year", type: "money", def: 420000 },
    ],
    run: (v) => {
      const goal = num(v, "goal");
      const ticket = Math.max(1, num(v, "ticket"));
      const close = Math.max(0.01, num(v, "close") / 100);
      const l2q = Math.max(0.01, num(v, "leadToQuote") / 100);
      const weeks = Math.max(1, num(v, "weeks"));
      const current = num(v, "current");

      const jobs = goal / ticket;
      const quotes = jobs / close;
      const leads = quotes / l2q;
      const gap = goal - current;

      return {
        headline: { value: dec(leads / weeks, 1), label: "Leads you need every week", sub: `${count(leads)} leads for the year`, tone: "neutral" },
        stats: [
          { label: "Jobs a year", value: count(jobs), sub: `${dec(jobs / weeks, 1)} a week` },
          { label: "Quotes a year", value: count(quotes), sub: `${dec(quotes / weeks, 1)} a week` },
          { label: "Growth needed", value: current > 0 ? pct((gap / current) * 100, 0) : "n/a", tone: gap > 0 ? "warn" : "good" },
          { label: "Revenue a week", value: money(goal / weeks) },
        ],
        bars: {
          title: "The weekly scoreboard",
          items: [
            { label: "Leads", value: leads / weeks, display: dec(leads / weeks, 1), tone: "neutral" },
            { label: "Quotes", value: quotes / weeks, display: dec(quotes / weeks, 1), tone: "warn" },
            { label: "Jobs", value: jobs / weeks, display: dec(jobs / weeks, 1), tone: "good" },
          ],
        },
        verdict: {
          tone: "neutral",
          text: `Hit ${dec(leads / weeks, 1)} leads and ${dec(quotes / weeks, 1)} quotes a week for ${count(weeks)} weeks and the goal takes care of itself. Track the weekly number, not the yearly one.`,
        },
      };
    },
  },

  {
    slug: "capacity-calculator",
    name: "Job Capacity Calculator",
    short: "Capacity",
    emoji: "📦",
    category: "Leads",
    tagline: "How much work can you actually take?",
    description:
      "Before you spend on marketing, find out whether you could even handle the calls. Then see what the ceiling on your revenue really is.",
    who: "Service businesses with crews, chairs, bays or trucks.",
    problem:
      "Marketing a business that is already at capacity just makes people mad at you. Marketing one with open slots prints money.",
    payoff: "Your true ceiling, your open slots, and what filling them is worth.",
    steps: [
      "Enter your crews and how long a job takes.",
      "Read your maximum jobs per week.",
      "Compare to what you actually do. The gap is your opportunity.",
    ],
    fields: [
      { id: "crews", label: "Crews, chairs, bays or techs", type: "slider", min: 1, max: 50, step: 1, def: 2 },
      { id: "hoursDay", label: "Productive hours per day", type: "slider", min: 1, max: 14, step: 0.5, def: 7 },
      { id: "days", label: "Days per week", type: "slider", min: 1, max: 7, step: 1, def: 5 },
      { id: "jobHours", label: "Hours per job", type: "slider", min: 0.25, max: 40, step: 0.25, def: 3 },
      { id: "actual", label: "Jobs you actually do a week", type: "slider", min: 0, max: 200, step: 1, def: 14 },
      { id: "value", label: "Average job value", type: "money", def: 550 },
    ],
    run: (v) => {
      const crews = num(v, "crews");
      const hoursDay = num(v, "hoursDay");
      const days = num(v, "days");
      const jobHours = Math.max(0.25, num(v, "jobHours"));
      const actual = num(v, "actual");
      const value = num(v, "value");

      const maxJobs = (crews * hoursDay * days) / jobHours;
      const open = Math.max(0, maxJobs - actual);
      const utilization = maxJobs > 0 ? (actual / maxJobs) * 100 : 0;
      const openValue = open * value * 52;
      const ceiling = maxJobs * value * 52;

      return {
        headline: { value: pct(utilization, 0), label: "You are running at this much of capacity", sub: `${dec(actual, 0)} of ${dec(maxJobs, 1)} jobs a week`, tone: utilization > 90 ? "warn" : "good" },
        stats: [
          { label: "Open slots a week", value: dec(open, 1), tone: open > 0 ? "warn" : "good" },
          { label: "Empty capacity a year", value: money(openValue), tone: "bad" },
          { label: "Your revenue ceiling", value: money(ceiling) },
          { label: "Revenue today", value: money(actual * value * 52) },
        ],
        bars: {
          title: "Booked vs open",
          items: [
            { label: "Booked", value: actual, display: dec(actual, 0), tone: "good" },
            { label: "Open", value: open, display: dec(open, 1), tone: "bad" },
          ],
        },
        verdict: {
          tone: utilization > 90 ? "warn" : "good",
          text:
            utilization > 90
              ? "You are nearly full. Raise prices before you buy more leads, or add capacity first. More marketing right now just creates unhappy people on a waitlist."
              : `You have room for ${dec(open, 1)} more jobs a week. That is ${money(openValue)} a year of ceiling you are not touching. Marketing makes sense right now.`,
        },
      };
    },
  },

  {
    slug: "after-hours-lead-calculator",
    name: "After-Hours Lead Calculator",
    short: "After Hours",
    emoji: "🌙",
    category: "Leads",
    tagline: "Most people shop when you are closed",
    description:
      "Nights, weekends and lunch are when people finally get a minute to call somebody. See what happens to those leads at your business.",
    who: "Any business with normal business hours and customers with jobs.",
    problem:
      "Your customer is at work when you are at work. They call at 7pm, hit voicemail, and hire whoever answers.",
    payoff: "The value of covering the hours nobody is watching the phone.",
    steps: [
      "Estimate what share of your leads arrive outside business hours.",
      "Set what happens to them now.",
      "See what an after-hours auto-response would hold onto.",
    ],
    fields: [
      { id: "leads", label: "Total leads a month", type: "slider", min: 1, max: 600, step: 1, def: 60 },
      { id: "share", label: "Share that come in after hours", type: "slider", min: 5, max: 80, step: 5, def: 35, suffix: "%" },
      { id: "lostNow", label: "Of those, how many you lose today", type: "slider", min: 10, max: 100, step: 5, def: 70, suffix: "%" },
      { id: "saveRate", label: "How many an instant auto-reply holds", type: "slider", min: 10, max: 90, step: 5, def: 55, suffix: "%" },
      { id: "value", label: "Value of a customer", type: "money", def: 700 },
      { id: "close", label: "Close rate", type: "slider", min: 5, max: 90, step: 5, def: 30, suffix: "%" },
    ],
    run: (v) => {
      const leads = num(v, "leads");
      const share = num(v, "share") / 100;
      const lostNow = num(v, "lostNow") / 100;
      const save = num(v, "saveRate") / 100;
      const value = num(v, "value");
      const close = num(v, "close") / 100;

      const afterHours = leads * share;
      const lost = afterHours * lostNow;
      const saved = lost * save;
      const savedRevenue = saved * close * value;

      return {
        headline: { value: money(savedRevenue * 12), label: "Recoverable every year with an after-hours reply", sub: `${count(lost * 12)} leads a year currently die overnight`, tone: "good" },
        stats: [
          { label: "After-hours leads a month", value: count(afterHours) },
          { label: "Lost overnight now", value: count(lost), tone: "bad" },
          { label: "Held by an auto-reply", value: count(saved), tone: "good" },
          { label: "Revenue back per month", value: money(savedRevenue), tone: "good" },
        ],
        bars: {
          title: "What happens to after-hours leads",
          items: [
            { label: "Reach you now", value: afterHours - lost, display: count(afterHours - lost), tone: "good" },
            { label: "Saved by auto-reply", value: saved, display: count(saved), tone: "warn" },
            { label: "Still lost", value: lost - saved, display: count(lost - saved), tone: "bad" },
          ],
        },
        verdict: {
          tone: "good",
          text: "You do not have to answer the phone at 9pm. A text that says we got your message, first thing in the morning we will call, and here is our booking link holds the customer until you can.",
        },
      };
    },
  },
];
