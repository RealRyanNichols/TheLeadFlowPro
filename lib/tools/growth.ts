import { type ToolDef, num, str, list, money, money2, pct, count, dec } from "./types";

/* Reputation and website. What people see before they ever call you. */

export const GROWTH_TOOLS: ToolDef[] = [
  /* ------------------------------- REPUTATION ------------------------------- */
  {
    slug: "google-review-link",
    name: "Google Review Link + QR Maker",
    short: "Review Link + QR",
    emoji: "⭐",
    category: "Reputation",
    tagline: "One tap to your review page",
    description:
      "Turn your Google Business Profile into a direct review link and a printable QR code. Put it on receipts, counters, invoices and truck doors.",
    who: "Any local business that wants more Google reviews without begging.",
    problem:
      "Telling a customer to go leave you a review means opening Google, searching, scrolling, finding the button. Most people quit halfway. A direct link drops them straight on the star box.",
    payoff:
      "A link and a QR code you can put anywhere, that opens the review form in one tap.",
    steps: [
      "Find your Google Place ID with Google's free Place ID Finder.",
      "Paste it here. The link and QR code build themselves.",
      "Save the QR image and put it on receipts, invoices, counter cards and the back of your truck.",
      "Text the link the same day you finish the work, while they still like you.",
    ],
    faqs: [
      { q: "Where do I find my Place ID?", a: "Google 'Place ID Finder', search your business name, and copy the ID it shows. It starts with ChIJ. Takes about thirty seconds." },
      { q: "Can I offer a discount for reviews?", a: "No. Google's policy prohibits incentivizing reviews, and it can get your reviews stripped. Ask everybody, not just the happy ones, and ask right after you deliver." },
    ],
    featured: true,
    custom: "review-link",
    embedHeight: 820,
    fields: [],
    run: () => ({}),
  },

  {
    slug: "review-goal-calculator",
    name: "Star Rating Goal Calculator",
    short: "Rating Goal",
    emoji: "🌟",
    category: "Reputation",
    tagline: "How many reviews to get back to 4.8",
    description:
      "Enter your rating and count. See exactly how many new five-star reviews it takes to hit the number you want, and how long that takes at your current pace.",
    who: "Any business sitting at 4.2 wondering why the phone is quieter than it used to be.",
    problem:
      "One bad stretch pulls your average down and you have no idea how deep the hole is or how long the climb takes.",
    payoff: "A specific review count and a weekly pace to hit it.",
    steps: [
      "Enter your current star rating and total review count.",
      "Set the rating you want.",
      "Read the number of five-star reviews it takes and how long at your pace.",
    ],
    fields: [
      { id: "current", label: "Your rating now", type: "slider", min: 1, max: 5, step: 0.1, def: 4.3 },
      { id: "total", label: "Reviews you have", type: "slider", min: 1, max: 2000, step: 1, def: 47 },
      { id: "goal", label: "Rating you want", type: "slider", min: 3, max: 5, step: 0.1, def: 4.8 },
      { id: "perMonth", label: "New reviews you get a month", type: "slider", min: 0, max: 100, step: 1, def: 3 },
      { id: "asked", label: "Customers a month you could ask", type: "slider", min: 1, max: 500, step: 1, def: 60 },
    ],
    run: (v) => {
      const current = num(v, "current");
      const total = num(v, "total");
      const goal = num(v, "goal");
      const perMonth = num(v, "perMonth");
      const asked = num(v, "asked");

      // n new 5-star reviews: (current*total + 5n) / (total + n) = goal
      const needed = goal >= 5 ? Infinity : Math.max(0, Math.ceil((total * (goal - current)) / (5 - goal)));
      const months = perMonth > 0 && Number.isFinite(needed) ? needed / perMonth : Infinity;
      const askRate = asked > 0 ? (perMonth / asked) * 100 : 0;
      const atTwentyPct = asked * 0.2;
      const monthsIfAsking = atTwentyPct > 0 && Number.isFinite(needed) ? needed / atTwentyPct : Infinity;

      return {
        headline: {
          value: Number.isFinite(needed) ? count(needed) : "Not possible",
          label: `Five-star reviews to reach ${dec(goal, 1)}`,
          sub: Number.isFinite(months) ? `${dec(months, 1)} months at your current pace` : "You are not collecting reviews",
          tone: needed > 100 ? "bad" : "good",
        },
        stats: [
          { label: "Your rating now", value: dec(current, 2), tone: current >= 4.5 ? "good" : "warn" },
          { label: "Review request rate", value: pct(askRate, 1), sub: "of customers who leave one" },
          { label: "If you ask everyone", value: Number.isFinite(monthsIfAsking) ? `${dec(monthsIfAsking, 1)} months` : "n/a", tone: "good" },
          { label: "Time saved by asking", value: Number.isFinite(months) && Number.isFinite(monthsIfAsking) ? `${dec(Math.max(0, months - monthsIfAsking), 1)} months` : "n/a", tone: "good" },
        ],
        bars: {
          title: "How fast you climb",
          caption: "Same goal. Only the asking changes.",
          items: [
            { label: "Current pace", value: Number.isFinite(months) ? months : 120, display: Number.isFinite(months) ? `${dec(months, 1)} mo` : "never", tone: "bad" },
            { label: "Ask 20% of customers", value: Number.isFinite(monthsIfAsking) ? monthsIfAsking : 120, display: Number.isFinite(monthsIfAsking) ? `${dec(monthsIfAsking, 1)} mo` : "n/a", tone: "good" },
          ],
        },
        verdict: {
          tone: "good",
          text:
            needed > 200
              ? "That is a long climb from where you sit. The fastest fix is volume: ask every single customer, every time, starting today."
              : `${count(needed)} good reviews. At ${count(asked)} customers a month you could do that in a season if you actually ask.`,
        },
        note: "You cannot delete honest bad reviews and you should not try. You outweigh them.",
      };
    },
  },

  {
    slug: "bad-review-impact",
    name: "Bad Review Impact Calculator",
    short: "Bad Review Impact",
    emoji: "📉",
    category: "Reputation",
    tagline: "What one angry customer costs you",
    description:
      "See what a single one-star does to your average, and what dropping below four stars does to the people deciding between you and the next name on the list.",
    who: "Anybody who just got their first bad review and feels sick about it.",
    problem:
      "A bad review feels personal. What matters is what it does to the number people sort by.",
    payoff: "Perspective, plus the exact number of good reviews that erase it.",
    steps: [
      "Enter your rating and review count.",
      "See what one, three or five bad reviews do.",
      "See how many good ones cancel them out.",
    ],
    fields: [
      { id: "current", label: "Your rating", type: "slider", min: 1, max: 5, step: 0.1, def: 4.7 },
      { id: "total", label: "Reviews you have", type: "slider", min: 1, max: 2000, step: 1, def: 60 },
      { id: "bad", label: "New one-star reviews", type: "slider", min: 1, max: 20, step: 1, def: 1 },
      { id: "leads", label: "Leads a month", type: "slider", min: 1, max: 500, step: 1, def: 50 },
      { id: "value", label: "Value of a customer", type: "money", def: 900 },
      { id: "close", label: "Close rate", type: "slider", min: 5, max: 90, step: 5, def: 30, suffix: "%" },
    ],
    run: (v) => {
      const current = num(v, "current");
      const total = num(v, "total");
      const bad = num(v, "bad");
      const leads = num(v, "leads");
      const value = num(v, "value");
      const close = num(v, "close") / 100;

      const newRating = (current * total + 1 * bad) / (total + bad);
      const drop = current - newRating;
      // Rough demand sensitivity: below 4.0 people start filtering you out.
      const demandFactor = (r: number) => Math.min(1, Math.max(0.35, (r - 3) / 1.7));
      const lostLeads = leads * (demandFactor(current) - demandFactor(newRating));
      const lostRevenue = lostLeads * close * value * 12;
      const fiveStarsToFix = newRating < current ? Math.ceil(((current - newRating) * (total + bad)) / Math.max(0.01, 5 - current)) : 0;

      return {
        headline: {
          value: dec(newRating, 2),
          label: `Your rating after ${count(bad)} one-star review${bad > 1 ? "s" : ""}`,
          sub: `Down ${dec(drop, 2)} from ${dec(current, 2)}`,
          tone: newRating < 4 ? "bad" : "warn",
        },
        stats: [
          { label: "Five-stars to erase it", value: count(fiveStarsToFix), tone: "good" },
          { label: "Estimated leads lost a month", value: dec(lostLeads, 1), tone: "bad" },
          { label: "Estimated yearly cost", value: money(lostRevenue), tone: "bad" },
          { label: "Rating floor to protect", value: "4.0", sub: "below this people filter you out" },
        ],
        bars: {
          title: "What review volume does to the damage",
          caption: "The same bad review on a bigger pile barely moves the needle.",
          items: [25, 50, 100, 250, 500].map((n) => {
            const r = (current * n + 1 * bad) / (n + bad);
            return { label: `${n} reviews`, value: current - r, display: `-${dec(current - r, 2)}`, tone: (current - r > 0.1 ? "bad" : "good") as "bad" | "good" };
          }),
        },
        verdict: {
          tone: "good",
          text: "The real defense against bad reviews is volume. At 300 reviews a one-star is a rounding error. At 20 it is a crisis. Go get reviews before you need them.",
        },
        note: "The lead impact here is a rough model, not a measured fact. Ratings are one of many things people weigh. The direction is reliable, the exact dollar is not.",
      };
    },
  },

  {
    slug: "review-response-writer",
    name: "Review Response Writer",
    short: "Review Responses",
    emoji: "🗣️",
    category: "Reputation",
    tagline: "Answer every review without sounding like a robot",
    description:
      "Paste in what they said, pick the situation, and get a response you can post. Calm, human, and written so the next customer reading it trusts you more.",
    who: "Any owner who freezes up writing a reply to a public review.",
    problem:
      "Bad replies do more damage than bad reviews. Arguing in public costs you the customers who were still deciding.",
    payoff: "A reply you can post in thirty seconds that is written for the reader, not the reviewer.",
    steps: [
      "Pick whether the review was good, mixed or bad.",
      "Add the customer's first name and what they mentioned.",
      "Copy the reply, read it once, and post it.",
    ],
    fields: [
      { id: "type", label: "What kind of review", type: "select", def: "good", options: [
        { value: "good", label: "Good review, 4 or 5 stars" },
        { value: "mixed", label: "Mixed, 3 stars" },
        { value: "bad", label: "Bad review, 1 or 2 stars" },
        { value: "unfair", label: "Bad and not accurate" },
      ] },
      { id: "business", label: "Your business name", type: "text", def: "", placeholder: "Piney Woods Plumbing" },
      { id: "name", label: "Customer first name", type: "text", def: "", placeholder: "Dale" },
      { id: "topic", label: "What they mentioned", type: "text", def: "", placeholder: "the water heater install" },
      { id: "phone", label: "Your phone number", type: "text", def: "", placeholder: "(903) 500-8898" },
      { id: "owner", label: "Who is signing it", type: "text", def: "", placeholder: "Ryan, owner" },
    ],
    run: (v) => {
      const type = str(v, "type", "good");
      const biz = str(v, "business").trim();
      const name = str(v, "name").trim();
      const topic = str(v, "topic").trim() || "the work we did";
      const phone = str(v, "phone").trim();
      const owner = str(v, "owner").trim();
      const callLine = phone ? ` Call or text me directly at ${phone}` : " Reach out to me directly";

      // The signature builds from whichever pieces exist. Nothing entered, no line.
      const signature =
        owner && biz ? `\n\n- ${owner}, ${biz}` : owner ? `\n\n- ${owner}` : biz ? `\n\n- The team at ${biz}` : "";

      // Every opening has to read as a full sentence with or without a name.
      const body =
        type === "good"
          ? name
            ? `${name}, thank you. Hearing that ${topic} went well is the whole reason we do this.\n\nWe appreciate you taking the time to write it out, and we appreciate the trust. If you ever need us again, you know where to find us.`
            : `Thank you for taking the time to write this. Hearing that ${topic} went well is the whole reason we do this.\n\nWe appreciate the trust. If you ever need us again, you know where to find us.`
          : type === "mixed"
            ? `${name ? `${name}, thank` : "Thank"} you for the honest review. Three stars tells me we got the job done but did not give you the experience we want to be known for.\n\nI would like to hear what would have made it a five.${callLine} and I will make it right where I can.`
            : type === "bad"
              ? `${name ? `${name}, I` : "I"} am sorry. That is not the standard we hold ourselves to, and I am not going to argue with you in a review box about it.\n\nI want to understand what happened with ${topic} and fix what can be fixed.${callLine}. I will pick up.`
              : `${name ? `${name}, thank` : "Thank"} you for the feedback. I take every review seriously, and I want to get this right.\n\nMy records show a different sequence of events than what is described here, so I would rather talk it through than go back and forth publicly.${callLine} and I will give you my full attention.`;

      const text = `${body}${signature}`;

      return {
        output: {
          title: "Your reply. Read it once, then post it.",
          text,
          filename: `review-response-${type}.txt`,
        },
        note:
          type === "unfair"
            ? "Never call a customer a liar in public, even when you are right. The person reading this is not the reviewer, it is your next customer deciding whether you are steady under pressure."
            : "Reply to every review, good and bad, within 48 hours. It shows up to the next person reading, and Google notices activity too.",
        verdict: {
          tone: "good",
          text: "The audience for a review reply is never the reviewer. It is the hundred people who read it later.",
        },
      };
    },
  },

  /* -------------------------------- WEBSITE --------------------------------- */
  {
    slug: "website-speed-money",
    name: "Slow Website Cost Calculator",
    short: "Site Speed Cost",
    emoji: "🐌",
    category: "Website",
    tagline: "Every second costs you customers",
    description:
      "People leave slow sites. Put a dollar figure on your load time and see what getting under two seconds is worth.",
    who: "Anyone whose site was built on a page builder loaded with plugins and sliders.",
    problem:
      "Your site takes six seconds on a phone in a truck on rural data. A big share of visitors never see it at all.",
    payoff: "The revenue tied up in load time, so speed stops being a nerd argument.",
    steps: [
      "Test your site on PageSpeed Insights and get your real mobile load time.",
      "Enter your monthly visitors and what a customer is worth.",
      "See what each second is costing you.",
    ],
    fields: [
      { id: "visitors", label: "Website visitors a month", type: "slider", min: 50, max: 100000, step: 50, def: 1800 },
      { id: "loadTime", label: "Your mobile load time in seconds", type: "slider", min: 0.5, max: 15, step: 0.1, def: 5.5 },
      { id: "conversion", label: "Visitors who contact you", type: "slider", min: 0.1, max: 20, step: 0.1, def: 2, suffix: "%" },
      { id: "value", label: "Value of a customer", type: "money", def: 800 },
      { id: "close", label: "Close rate on inquiries", type: "slider", min: 5, max: 95, step: 5, def: 35, suffix: "%" },
    ],
    run: (v) => {
      const visitors = num(v, "visitors");
      const load = num(v, "loadTime");
      const conv = num(v, "conversion") / 100;
      const value = num(v, "value");
      const close = num(v, "close") / 100;

      // Bounce model: abandonment climbs steeply past ~3s on mobile.
      const retention = (s: number) => Math.min(1, Math.max(0.25, 1 - Math.max(0, s - 1) * 0.09));
      const nowRet = retention(load);
      const fastRet = retention(2);
      const nowCustomers = visitors * nowRet * conv * close;
      const fastCustomers = visitors * fastRet * conv * close;
      const lost = (fastCustomers - nowCustomers) * value;

      return {
        headline: { value: money(lost * 12), label: "Lost every year to load time", sub: `${money(lost)} a month`, tone: "bad" },
        stats: [
          { label: "Visitors who leave early", value: count(visitors * (1 - nowRet)), tone: "bad" },
          { label: "Customers a month now", value: dec(nowCustomers, 1) },
          { label: "At a 2 second load", value: dec(fastCustomers, 1), tone: "good" },
          { label: "Cost of each extra second", value: money((lost / Math.max(0.1, load - 2)) * 12) + "/yr", tone: "bad" },
        ],
        bars: {
          title: "Visitors who stick around by load time",
          items: [1, 2, 3, 5, 8].map((s) => ({
            label: `${s}s`,
            value: visitors * retention(s),
            display: count(visitors * retention(s)),
            tone: (s <= 2 ? "good" : s <= 4 ? "warn" : "bad") as "good" | "warn" | "bad",
          })),
        },
        verdict: {
          tone: load > 3 ? "bad" : "good",
          text:
            load > 3
              ? "Most of this is images that were never resized, a page builder, and six plugins doing one job. It is fixable in an afternoon by somebody who knows where to look."
              : "You are in decent shape. Keep images compressed and do not let anybody install a slider.",
        },
        note: "The retention curve here is a working model of well-documented mobile abandonment behavior, not a measurement of your site. Run PageSpeed Insights for your real numbers.",
      };
    },
  },

  {
    slug: "conversion-lift-calculator",
    name: "Conversion Rate Lift Calculator",
    short: "Conversion Lift",
    emoji: "🔺",
    category: "Website",
    tagline: "What one more percent is worth",
    description:
      "Before you buy more traffic, find out what converting the traffic you already have would do.",
    who: "Anyone with a site that gets visitors and not enough calls.",
    problem:
      "Everybody wants more traffic. Almost nobody checks what happens to the traffic they already paid for.",
    payoff: "A revenue number for a conversion improvement, plus what the same gain would cost in traffic.",
    steps: [
      "Enter your traffic and current conversion rate.",
      "Set the improvement you think you could get.",
      "Compare it to buying the same result in traffic.",
    ],
    fields: [
      { id: "visitors", label: "Visitors a month", type: "slider", min: 50, max: 100000, step: 50, def: 2000 },
      { id: "conv", label: "Percent who contact you now", type: "slider", min: 0.1, max: 25, step: 0.1, def: 1.8, suffix: "%" },
      { id: "lift", label: "Improvement you could make", type: "slider", min: 0.1, max: 10, step: 0.1, def: 1, suffix: " pts" },
      { id: "close", label: "Close rate", type: "slider", min: 5, max: 95, step: 5, def: 35, suffix: "%" },
      { id: "value", label: "Value of a customer", type: "money", def: 900 },
      { id: "cpc", label: "Cost per website visitor from ads", type: "money", def: 3 },
    ],
    run: (v) => {
      const visitors = num(v, "visitors");
      const conv = num(v, "conv") / 100;
      const lift = num(v, "lift") / 100;
      const close = num(v, "close") / 100;
      const value = num(v, "value");
      const cpc = num(v, "cpc");

      const now = visitors * conv * close * value;
      const after = visitors * (conv + lift) * close * value;
      const gain = after - now;
      const trafficNeeded = conv > 0 ? (visitors * lift) / conv : 0;
      const trafficCost = trafficNeeded * cpc;

      return {
        headline: { value: money(gain * 12), label: `Extra revenue a year from +${dec(lift * 100, 1)} points`, sub: `${money(gain)} a month`, tone: "good" },
        stats: [
          { label: "Inquiries now", value: dec(visitors * conv, 1) + "/mo" },
          { label: "Inquiries after", value: dec(visitors * (conv + lift), 1) + "/mo", tone: "good" },
          { label: "Same gain in extra traffic", value: count(trafficNeeded) + " visitors" },
          { label: "That traffic would cost", value: money(trafficCost) + "/mo", tone: "bad" },
        ],
        bars: {
          title: "Fix the page or buy the traffic",
          items: [
            { label: "Fix conversion", value: 0, display: "one-time work", tone: "good" },
            { label: "Buy the traffic", value: trafficCost * 12, display: money(trafficCost * 12) + "/yr", tone: "bad" },
          ],
        },
        verdict: {
          tone: "good",
          text: "Phone number in the header, one clear button, proof near the top, a form that asks three questions instead of nine. That is usually the whole point improvement.",
        },
      };
    },
  },

  {
    slug: "mobile-traffic-loss",
    name: "Mobile Visitor Loss Calculator",
    short: "Mobile Loss",
    emoji: "📱",
    category: "Website",
    tagline: "Most of your visitors are on a phone",
    description:
      "If your site is awkward on a phone, most of your traffic is having a bad experience. See what that costs.",
    who: "Anyone whose site was designed on a big monitor and never checked on a phone.",
    problem:
      "Tiny text, buttons you cannot hit, a menu that will not close, a phone number that is not tappable. Desktop looks fine so nobody notices.",
    payoff: "The cost of the mobile experience, and the three fixes that matter.",
    steps: [
      "Pull up your own site on your phone right now.",
      "Enter your traffic and how much of it is mobile.",
      "Be honest about how much worse mobile converts.",
    ],
    fields: [
      { id: "visitors", label: "Visitors a month", type: "slider", min: 50, max: 100000, step: 50, def: 2200 },
      { id: "mobileShare", label: "Share on a phone", type: "slider", min: 20, max: 95, step: 5, def: 70, suffix: "%" },
      { id: "desktopConv", label: "Desktop conversion rate", type: "slider", min: 0.1, max: 25, step: 0.1, def: 3, suffix: "%" },
      { id: "mobileConv", label: "Mobile conversion rate", type: "slider", min: 0.1, max: 25, step: 0.1, def: 1.1, suffix: "%" },
      { id: "value", label: "Value of a customer", type: "money", def: 750 },
      { id: "close", label: "Close rate", type: "slider", min: 5, max: 95, step: 5, def: 35, suffix: "%" },
    ],
    run: (v) => {
      const visitors = num(v, "visitors");
      const share = num(v, "mobileShare") / 100;
      const dConv = num(v, "desktopConv") / 100;
      const mConv = num(v, "mobileConv") / 100;
      const value = num(v, "value");
      const close = num(v, "close") / 100;

      const mobileVisitors = visitors * share;
      const actual = mobileVisitors * mConv;
      const potential = mobileVisitors * dConv;
      const lostInquiries = Math.max(0, potential - actual);
      const lostRevenue = lostInquiries * close * value;
      const gapPct = dConv > 0 ? ((dConv - mConv) / dConv) * 100 : 0;

      return {
        headline: { value: money(lostRevenue * 12), label: "Lost every year on mobile", sub: `${count(mobileVisitors)} phone visitors a month`, tone: "bad" },
        stats: [
          { label: "Mobile converts worse by", value: pct(gapPct, 0), tone: "bad" },
          { label: "Inquiries lost a month", value: dec(lostInquiries, 1), tone: "bad" },
          { label: "If mobile matched desktop", value: dec(potential, 1) + " inquiries", tone: "good" },
          { label: "Revenue back a month", value: money(lostRevenue), tone: "good" },
        ],
        bars: {
          title: "Inquiries a month, by device",
          items: [
            { label: "Desktop", value: visitors * (1 - share) * dConv, display: dec(visitors * (1 - share) * dConv, 1), tone: "good" },
            { label: "Mobile now", value: actual, display: dec(actual, 1), tone: "bad" },
            { label: "Mobile fixed", value: potential, display: dec(potential, 1), tone: "good" },
          ],
        },
        verdict: {
          tone: "warn",
          text: "Three fixes cover most of it: a tap-to-call button that is always visible, text you can read without pinching, and a form that fits on one screen.",
        },
      };
    },
  },

  {
    slug: "seo-traffic-value",
    name: "What Your Google Rankings Are Worth",
    short: "SEO Value",
    emoji: "🔎",
    category: "Website",
    tagline: "Put a price on showing up",
    description:
      "Free traffic is not free, it is earned. See what your organic visitors would cost if you had to buy them, and what moving up one spot is worth.",
    who: "Anyone deciding whether SEO or local search work is worth paying for.",
    problem:
      "Organic traffic feels like it does not count because there is no invoice attached to it.",
    payoff: "The replacement cost of your rankings, and the value of climbing.",
    steps: [
      "Enter your organic visitors a month.",
      "Enter what a click costs in ads for your kind of work.",
      "See the replacement value and what moving up would add.",
    ],
    fields: [
      { id: "visitors", label: "Organic visitors a month", type: "slider", min: 10, max: 50000, step: 10, def: 900 },
      { id: "cpc", label: "Cost per click if you bought it", type: "money", def: 4 },
      { id: "conv", label: "Percent who contact you", type: "slider", min: 0.1, max: 25, step: 0.1, def: 2.5, suffix: "%" },
      { id: "close", label: "Close rate", type: "slider", min: 5, max: 95, step: 5, def: 35, suffix: "%" },
      { id: "value", label: "Value of a customer", type: "money", def: 900 },
      { id: "growth", label: "Traffic growth you are aiming for", type: "slider", min: 10, max: 300, step: 10, def: 50, suffix: "%" },
    ],
    run: (v) => {
      const visitors = num(v, "visitors");
      const cpc = num(v, "cpc");
      const conv = num(v, "conv") / 100;
      const close = num(v, "close") / 100;
      const value = num(v, "value");
      const growth = num(v, "growth") / 100;

      const replacement = visitors * cpc;
      const customers = visitors * conv * close;
      const revenue = customers * value;
      const growthRevenue = revenue * growth;

      return {
        headline: { value: money(replacement * 12), label: "What your rankings would cost to buy", sub: `${count(visitors)} visitors a month at ${money2(cpc)} a click`, tone: "good" },
        stats: [
          { label: "Customers from organic", value: dec(customers, 1) + "/mo", tone: "good" },
          { label: "Revenue from organic", value: money(revenue * 12) + "/yr", tone: "good" },
          { label: `Value of +${pct(growth * 100)} traffic`, value: money(growthRevenue * 12) + "/yr", tone: "good" },
          { label: "Ad spend replaced monthly", value: money(replacement) },
        ],
        bars: {
          title: "Organic vs paying for the same traffic",
          items: [
            { label: "Rankings you have", value: replacement * 12, display: money(replacement * 12) + "/yr", tone: "good" },
            { label: `After +${pct(growth * 100)}`, value: replacement * 12 * (1 + growth), display: money(replacement * 12 * (1 + growth)) + "/yr", tone: "good" },
          ],
        },
        verdict: {
          tone: "good",
          text: "Rankings keep working after you stop paying. Ads stop the day the card declines. Both have a place. Only one is an asset.",
        },
        note: "This values your existing traffic. It does not promise ranking improvements, because nobody can.",
      };
    },
  },

  {
    slug: "website-grader",
    name: "Website Scorecard",
    emoji: "✅",
    category: "Website",
    tagline: "Score your site in two minutes",
    description:
      "Twenty checks that actually decide whether a visitor calls you. Pull your site up on your phone and go down the list honestly.",
    who: "Anyone who suspects their website is not pulling its weight.",
    problem:
      "Most small business sites look fine and do nothing. The gap is never design, it is the basics nobody checked.",
    payoff: "A score, a grade, and a list of exactly what to fix first.",
    steps: [
      "Open your website on your phone.",
      "Check every box that is honestly true.",
      "Fix the unchecked ones in the order listed.",
    ],
    fields: [
      { id: "checks", label: "Check what is true about your site", type: "checks", def: ["phone", "mobile"], options: [
        { value: "phone", label: "Phone number visible without scrolling, and tappable" },
        { value: "mobile", label: "Looks right on a phone" },
        { value: "fast", label: "Loads in under 3 seconds on cell data" },
        { value: "cta", label: "One obvious thing you want people to do" },
        { value: "what", label: "Says what you do in the first sentence" },
        { value: "where", label: "Says what towns you serve" },
        { value: "proof", label: "Reviews or testimonials near the top" },
        { value: "photos", label: "Real photos of your work, not stock" },
        { value: "form", label: "Contact form with 4 fields or fewer" },
        { value: "hours", label: "Hours and service area listed" },
        { value: "ssl", label: "Padlock in the address bar" },
        { value: "gbp", label: "Linked to your Google Business Profile" },
        { value: "map", label: "Map or directions on the contact page" },
        { value: "pricing", label: "Some pricing or starting-at information" },
        { value: "faq", label: "Answers the questions people always ask" },
        { value: "text", label: "People can text you, not just call" },
        { value: "book", label: "People can book or request a time online" },
        { value: "fresh", label: "Updated in the last 12 months" },
        { value: "titles", label: "Page titles say what the page is, with your town" },
        { value: "track", label: "You can see where visitors come from" },
      ] },
      { id: "visitors", label: "Visitors a month", type: "slider", min: 50, max: 50000, step: 50, def: 1200 },
      { id: "value", label: "Value of a customer", type: "money", def: 800 },
    ],
    run: (v) => {
      const picked = list(v, "checks");
      const all = ["phone","mobile","fast","cta","what","where","proof","photos","form","hours","ssl","gbp","map","pricing","faq","text","book","fresh","titles","track"];
      const labels: Record<string, string> = {
        phone: "Put your phone number in the header and make it tappable",
        mobile: "Fix the phone layout, that is most of your traffic",
        fast: "Compress images and cut plugins until it loads under 3 seconds",
        cta: "Pick one action and make it the loudest thing on the page",
        what: "Say what you do and who for, in the first sentence",
        where: "List the towns you serve, by name",
        proof: "Move reviews above the fold",
        photos: "Replace stock photos with your actual work",
        form: "Cut the form to name, phone, and what they need",
        hours: "Add hours and service area",
        ssl: "Get an SSL certificate, most hosts do it free",
        gbp: "Link and claim your Google Business Profile",
        map: "Add a map and directions link",
        pricing: "Add starting-at pricing so you stop quoting tire kickers",
        faq: "Write out the five questions everybody asks",
        text: "Add texting, most people prefer it",
        book: "Let people book a time without calling",
        fresh: "Update it, an old site reads as a closed business",
        titles: "Fix page titles to include the service and the town",
        track: "Add basic analytics so you know what is working",
      };
      const missing = all.filter((a) => !picked.includes(a));
      const score = Math.round((picked.length / all.length) * 100);
      const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
      const visitors = num(v, "visitors");
      const value = num(v, "value");
      // Rough model: each missing basic costs a slice of conversion.
      const estLoss = missing.length * visitors * 0.0015 * value * 12;

      return {
        headline: {
          value: `${score} / 100`,
          label: `Grade: ${grade}`,
          sub: `${count(picked.length)} of ${count(all.length)} basics in place`,
          tone: score >= 80 ? "good" : score >= 60 ? "warn" : "bad",
        },
        stats: [
          { label: "Things to fix", value: count(missing.length), tone: missing.length > 6 ? "bad" : "warn" },
          { label: "Estimated yearly cost", value: money(estLoss), sub: "of the gaps", tone: "bad" },
          { label: "Biggest win available", value: missing.length ? labels[missing[0]].split(",")[0] : "You are solid", tone: "good" },
          { label: "Score if you fix the top 5", value: `${Math.min(100, score + Math.min(5, missing.length) * 5)} / 100`, tone: "good" },
        ],
        table: missing.length
          ? {
              title: "Your fix list, most important first",
              headers: ["#", "Do this"],
              rows: missing.map((m, i) => [i + 1, labels[m]]),
            }
          : undefined,
        verdict: {
          tone: score >= 80 ? "good" : "warn",
          text:
            score >= 80
              ? "Your site is doing its job. Now make sure something answers the leads it produces within five minutes."
              : "None of these are design problems. They are all decisions. That is good news, because decisions are cheap to change.",
        },
      };
    },
  },

  {
    slug: "google-business-profile-scorecard",
    name: "Google Business Profile Scorecard",
    short: "GBP Scorecard",
    emoji: "📍",
    category: "Website",
    tagline: "The free listing that outranks your website",
    description:
      "For most local businesses the Google Business Profile brings more calls than the website. Check yours against the list of what actually moves it.",
    who: "Every local business with a physical location or a service area.",
    problem:
      "Most profiles are half filled out, have four photos from 2019, and have never had a single post. That is free ground being given away.",
    payoff: "A score and a prioritized list, all of it free to fix.",
    steps: [
      "Open your Google Business Profile.",
      "Check everything that is genuinely done and current.",
      "Work the fix list top down. It is all free.",
    ],
    fields: [
      { id: "checks", label: "Check what is done", type: "checks", def: ["claimed", "hours"], options: [
        { value: "claimed", label: "Claimed and verified" },
        { value: "category", label: "Primary category is exactly right" },
        { value: "secondary", label: "Secondary categories added" },
        { value: "hours", label: "Hours correct, including holidays" },
        { value: "phone", label: "Phone number matches your website" },
        { value: "website", label: "Website linked" },
        { value: "services", label: "Services listed with descriptions" },
        { value: "description", label: "Business description written" },
        { value: "photos", label: "20+ real photos" },
        { value: "recent", label: "Photos added in the last 30 days" },
        { value: "logo", label: "Logo and cover photo set" },
        { value: "posts", label: "Posting at least twice a month" },
        { value: "qa", label: "Questions section seeded and answered" },
        { value: "reviews50", label: "50 or more reviews" },
        { value: "replies", label: "Replying to every review" },
        { value: "messaging", label: "Messaging turned on and watched" },
        { value: "booking", label: "Booking link added" },
        { value: "products", label: "Products or menu filled in" },
        { value: "area", label: "Service area set correctly" },
        { value: "utm", label: "Website link tagged so you can track it" },
      ] },
    ],
    run: (v) => {
      const picked = list(v, "checks");
      const order = ["claimed","category","hours","phone","website","reviews50","replies","photos","recent","services","description","posts","qa","messaging","booking","secondary","products","area","logo","utm"];
      const labels: Record<string, string> = {
        claimed: "Claim and verify the profile. Nothing else matters until this is done",
        category: "Set the primary category exactly. It is the single biggest ranking factor here",
        secondary: "Add secondary categories for everything else you do",
        hours: "Fix your hours, including holidays. Wrong hours generate one-star reviews",
        phone: "Make the phone number match your website exactly",
        website: "Link your website",
        services: "List every service with a real description",
        description: "Write the business description, 750 characters, plain English",
        photos: "Get to 20+ real photos. Trucks, crew, before and after, storefront",
        recent: "Add photos monthly. Fresh photos signal an active business",
        logo: "Set the logo and cover photo",
        posts: "Post twice a month. Offers, jobs finished, seasonal reminders",
        qa: "Seed the Q&A with the questions you get every day, and answer them",
        reviews50: "Get past 50 reviews. Volume beats perfection",
        replies: "Reply to every review, good and bad",
        messaging: "Turn on messaging, and actually watch it",
        booking: "Add a booking link",
        products: "Fill in products or menu items",
        area: "Set the service area to the towns you really serve",
        utm: "Tag the website link so you can see the traffic it sends",
      };
      const missing = order.filter((o) => !picked.includes(o));
      const score = Math.round((picked.length / order.length) * 100);
      const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";

      return {
        headline: {
          value: `${score} / 100`,
          label: `Profile grade: ${grade}`,
          sub: `${count(picked.length)} of ${count(order.length)} done`,
          tone: score >= 75 ? "good" : score >= 50 ? "warn" : "bad",
        },
        stats: [
          { label: "Items left", value: count(missing.length), tone: missing.length > 8 ? "bad" : "warn" },
          { label: "Cost to fix all of it", value: "$0", sub: "just time", tone: "good" },
          { label: "Hours it would take", value: `${dec(missing.length * 0.4, 1)} hrs` },
          { label: "Do this first", value: missing.length ? labels[missing[0]].split(".")[0] : "Keep posting", tone: "good" },
        ],
        table: missing.length
          ? { title: "Fix list, in order", headers: ["#", "Do this"], rows: missing.map((m, i) => [i + 1, labels[m]]) }
          : undefined,
        verdict: {
          tone: "good",
          text: "For a lot of local businesses this listing brings more calls than the website does. It is free, and most of your competitors have half of it blank.",
        },
      };
    },
  },

  {
    slug: "form-friction-calculator",
    name: "Form Field Friction Calculator",
    short: "Form Friction",
    emoji: "🧱",
    category: "Website",
    tagline: "Every extra field costs you leads",
    description:
      "Each question you add to a contact form loses people. See how many, and what your nine-field form is costing you.",
    who: "Anyone whose contact form asks for a mailing address and a budget range.",
    problem:
      "Long forms feel thorough. They are actually a filter that removes your busiest, highest-value prospects first.",
    payoff: "The cost of your current form and what trimming it recovers.",
    steps: [
      "Count the fields on your contact form. Count required ones twice as heavy.",
      "Enter your traffic and value per customer.",
      "See what cutting to three fields does.",
    ],
    fields: [
      { id: "fields", label: "Fields on your form", type: "slider", min: 1, max: 20, step: 1, def: 8 },
      { id: "visitors", label: "People who reach the form each month", type: "slider", min: 10, max: 20000, step: 10, def: 400 },
      { id: "baseStart", label: "Percent who start filling it out", type: "slider", min: 5, max: 100, step: 5, def: 45, suffix: "%" },
      { id: "value", label: "Value of a customer", type: "money", def: 850 },
      { id: "close", label: "Close rate", type: "slider", min: 5, max: 95, step: 5, def: 35, suffix: "%" },
    ],
    run: (v) => {
      const fields = num(v, "fields");
      const visitors = num(v, "visitors");
      const start = num(v, "baseStart") / 100;
      const value = num(v, "value");
      const close = num(v, "close") / 100;
      // Each field past the third loses roughly a tenth of finishers.
      const completion = (f: number) => Math.max(0.15, Math.pow(0.9, Math.max(0, f - 3)));
      const now = visitors * start * completion(fields);
      const trimmed = visitors * start * completion(3);
      const lost = trimmed - now;

      return {
        headline: { value: money(lost * close * value * 12), label: "Lost a year to extra form fields", sub: `${dec(lost, 1)} leads a month`, tone: "bad" },
        stats: [
          { label: "Leads a month now", value: dec(now, 1) },
          { label: "With 3 fields", value: dec(trimmed, 1), tone: "good" },
          { label: "Completion rate now", value: pct(completion(fields) * 100, 0), tone: fields > 5 ? "bad" : "good" },
          { label: "Extra fields costing you", value: count(Math.max(0, fields - 3)), tone: "warn" },
        ],
        bars: {
          title: "Leads a month by form length",
          items: [3, 5, 7, 10].map((f) => ({
            label: `${f} fields`,
            value: visitors * start * completion(f),
            display: dec(visitors * start * completion(f), 1),
            tone: (f <= 3 ? "good" : f <= 5 ? "warn" : "bad") as "good" | "warn" | "bad",
          })),
        },
        verdict: {
          tone: "good",
          text: "Name, phone, and what do you need. That is the form. Everything else you can ask on the phone, once they are already talking to you.",
        },
      };
    },
  },
];
