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
      const needed = current >= goal ? 0 : goal >= 5 ? Infinity : Math.max(0, Math.ceil((total * (goal - current)) / (5 - goal) - 1e-9));
      const months = perMonth > 0 && Number.isFinite(needed) ? needed / perMonth : Infinity;
      const askRate = asked > 0 ? (perMonth / asked) * 100 : 0;
      const atTwentyPct = asked * 0.2;
      const monthsIfAsking = atTwentyPct > 0 && Number.isFinite(needed) ? needed / atTwentyPct : Infinity;

      return {
        headline: {
          value: Number.isFinite(needed) ? count(needed) : "Not possible",
          label: `Five-star reviews to reach ${dec(goal, 1)}`,
          sub: !Number.isFinite(needed) ? "An exact 5.0 cannot be reached by adding a finite number of reviews" : Number.isFinite(months) ? `${dec(months, 1)} months at the entered pace` : "No monthly review pace entered",
          tone: needed > 100 ? "bad" : "good",
        },
        stats: [
          { label: "Your rating now", value: dec(current, 2), tone: current >= 4.5 ? "good" : "warn" },
          { label: "Reviews / entered customer count", value: pct(askRate, 1), sub: "not a measured request response rate" },
          { label: "Hypothetical 20% review pace", value: Number.isFinite(monthsIfAsking) ? `${dec(monthsIfAsking, 1)} months` : "n/a", tone: "good" },
          { label: "Difference between modeled paces", value: Number.isFinite(months) && Number.isFinite(monthsIfAsking) ? `${dec(Math.max(0, months - monthsIfAsking), 1)} months` : "n/a", tone: "good" },
        ],
        bars: {
          title: "Two hypothetical review paces",
          caption: "Assumes all added ratings are five stars. The 20% comparison is not a benchmark.",
          items: [
            { label: "Current pace", value: Number.isFinite(months) ? months : 120, display: Number.isFinite(months) ? `${dec(months, 1)} mo` : "never", tone: "bad" },
            { label: "Reviews at 20% of entered customer count", value: Number.isFinite(monthsIfAsking) ? monthsIfAsking : 120, display: Number.isFinite(monthsIfAsking) ? `${dec(monthsIfAsking, 1)} mo` : "n/a", tone: "good" },
          ],
        },
        verdict: {
          tone: "good",
          text:
            !Number.isFinite(needed)
              ? "An exact five-star average cannot be restored by adding a finite number of ratings below it. Focus on the service and honest feedback."
              : `${count(needed)} hypothetical five-star additions reach the entered target. Customers choose whether and what to review; this is not a request quota or rating promise.`,
        },
        note: "Starting averages may be rounded. Invite honest feedback without incentives, selective positive-review requests, or pressure about the rating or content.",
      };
    },
  },

  {
    slug: "bad-review-impact",
    name: "Bad Review Impact Calculator",
    short: "Bad Review Impact",
    emoji: "📉",
    category: "Reputation",
    tagline: "Understand a change in your rating",
    description:
      "See how new one-star ratings change a weighted average. Separate the rating arithmetic from assumptions about leads or revenue.",
    who: "Anybody who just got their first bad review and feels sick about it.",
    problem:
      "A bad review feels personal. What matters is what it does to the number people sort by.",
    payoff: "A weighted-average comparison and a clearly labeled hypothetical rating scenario.",
    steps: [
      "Enter your rating and review count.",
      "See what one, three or five bad reviews do.",
      "Use the arithmetic to understand the average, then review the actual feedback.",
    ],
    fields: [
      { id: "current", label: "Your rating", type: "slider", min: 1, max: 5, step: 0.1, def: 4.7 },
      { id: "total", label: "Reviews you have", type: "slider", min: 1, max: 2000, step: 1, def: 60 },
      { id: "bad", label: "New one-star reviews", type: "slider", min: 1, max: 20, step: 1, def: 1 },
    ],
    run: (v) => {
      const current = num(v, "current");
      const total = num(v, "total");
      const bad = num(v, "bad");

      const newRating = (current * total + 1 * bad) / (total + bad);
      const drop = current - newRating;
      // Algebra avoids subtracting rounded averages; tolerance prevents exact
      // integer answers such as seven becoming eight through floating-point noise.
      const fiveStarsToFix = current <= 1 ? 0 : current >= 5 ? Infinity : Math.max(0, Math.ceil((bad * (current - 1)) / (5 - current) - 1e-9));

      return {
        headline: {
          value: dec(newRating, 2),
          label: `Your rating after ${count(bad)} one-star review${bad > 1 ? "s" : ""}`,
          sub: `Down ${dec(drop, 2)} from ${dec(current, 2)}`,
          tone: newRating < 4 ? "bad" : "warn",
        },
        stats: [
          { label: "Hypothetical five-stars to return", value: Number.isFinite(fiveStarsToFix) ? count(fiveStarsToFix) : "Not possible", tone: "good" },
          { label: "Rating change", value: dec(drop, 2) },
          { label: "Reviews after additions", value: count(total + bad) },
          { label: "Revenue effect", value: "Not determined", sub: "ratings do not measure sales" },
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
          text: "A larger existing review count reduces each new rating's effect on the average. Review the actual feedback, protect customer privacy, and respond with verified facts.",
        },
        note: "This tool calculates rating averages only. It does not estimate lost leads or revenue. Displayed starting ratings may be rounded; exact underlying rating totals can differ. Customers choose their own ratings without incentives or pressure.",
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
      const callLine = phone ? ` Please contact our team at ${phone} so we can review the concern.` : " Please use the contact details on our business profile so our team can review the concern.";

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
            ? `${name ? `${name}, thank` : "Thank"} you for sharing your feedback. We would like to understand more about your experience with ${topic}.${callLine}`
            : type === "bad"
              ? `${name ? `${name}, thank` : "Thank"} you for telling us about your concern with ${topic}. We would like to review what happened.${callLine}`
              : `${name ? `${name}, thank` : "Thank"} you for the feedback. We would like to understand the concern before making any assumptions.${callLine}`;

      const text = `${body}${signature}`;

      return {
        output: {
          title: "Your reply draft. Check the facts before posting.",
          text,
          filename: `review-response-${type}.txt`,
        },
        note:
          type === "unfair"
            ? "Selecting this category does not establish that a review is inaccurate. Verify facts, keep private records out of the reply, and use an authorized contact route."
            : "Read and edit every sentence. Do not add unsupported promises or private customer details. This tool drafts text; it does not publish a response.",
        verdict: {
          tone: "good",
          text: "Write for the reviewer and everyone who may read the public response. Keep it calm, factual, and clear about an achievable next step.",
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
    tagline: "Explore a hypothetical speed scenario",
    description:
      "Compare an illustrative speed-retention curve with a two-second scenario. This is not a measurement of lost customers or revenue.",
    who: "Anyone whose site was built on a page builder loaded with plugins and sliders.",
    problem:
      "Your site takes six seconds on a phone in a truck on rural data. A big share of visitors never see it at all.",
    payoff: "The revenue tied up in load time, so speed stops being a nerd argument.",
    steps: [
      "Test your site on PageSpeed Insights and get your real mobile load time.",
      "Enter your monthly visitors and what a customer is worth.",
      "Compare scenarios, then measure actual visitor behavior.",
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
      const lost = Math.max(0, fastCustomers - nowCustomers) * value;

      return {
        headline: { value: money(lost * 12), label: "Illustrative annual revenue gap", sub: `${money(lost)} a month`, tone: "bad" },
        stats: [
          { label: "Modeled visitors leaving", value: count(visitors * (1 - nowRet)), tone: "bad" },
          { label: "Modeled customers at entered speed", value: dec(nowCustomers, 1) },
          { label: "At a 2 second load", value: dec(fastCustomers, 1), tone: "good" },
          { label: "Modeled gap per extra second", value: load > 2 ? money((lost / (load - 2)) * 12) + "/yr" : "Not applicable", tone: "bad" },
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
              ? "Measure your page on representative mobile connections. Identify the slow resources, change one issue, and compare real measurements."
              : "The entered speed is near the comparison target. Check actual measurements and contact completion before choosing a change.",
        },
        note: "Illustration only: the arbitrary curve removes nine percentage points of retention per second beyond one second, with a 25% floor. It is unvalidated and cannot establish lost sales or causal improvement. Conversion is applied to retained visitors, so do not enter a site-wide conversion rate without adjusting its denominator.",
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
        headline: { value: money(gain * 12), label: `Modeled extra revenue a year from +${dec(lift * 100, 1)} points`, sub: `${money(gain)} a month`, tone: "good" },
        stats: [
          { label: "Inquiries now", value: dec(visitors * conv, 1) + "/mo" },
          { label: "Inquiries after", value: dec(visitors * (conv + lift), 1) + "/mo", tone: "good" },
          { label: "Same gain in extra traffic", value: count(trafficNeeded) + " visitors" },
          { label: "That traffic would cost", value: money(trafficCost) + "/mo", tone: "bad" },
        ],
        bars: {
          title: "Inquiries with the entered conversion assumptions",
          items: [
            { label: "Current scenario", value: visitors * conv, display: dec(visitors * conv, 1) + "/mo", tone: "neutral" },
            { label: "Improved scenario", value: visitors * (conv + lift), display: dec(visitors * (conv + lift), 1) + "/mo", tone: "good" },
          ],
        },
        verdict: {
          tone: "good",
          text: "The improvement is an input, not a prediction. Test a clear next step and a usable contact flow. Include implementation costs before comparing profit.",
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
        headline: { value: money(lostRevenue * 12), label: "Modeled annual gap if mobile matched desktop", sub: `${count(mobileVisitors)} phone visitors a month`, tone: "bad" },
        stats: [
          { label: gapPct >= 0 ? "Mobile rate below desktop by" : "Mobile rate above desktop by", value: pct(Math.abs(gapPct), 0), tone: "bad" },
          { label: "Modeled inquiry gap a month", value: dec(lostInquiries, 1), tone: "bad" },
          { label: "If mobile matched desktop", value: dec(potential, 1) + " inquiries", tone: "good" },
          { label: "Modeled monthly revenue gap", value: money(lostRevenue), tone: "good" },
        ],
        bars: {
          title: "Inquiries a month, by device",
          items: [
            { label: "Desktop", value: visitors * (1 - share) * dConv, display: dec(visitors * (1 - share) * dConv, 1), tone: "good" },
            { label: "Mobile now", value: actual, display: dec(actual, 1), tone: "bad" },
            { label: "At desktop rate", value: potential, display: dec(potential, 1), tone: "good" },
          ],
        },
        verdict: {
          tone: "warn",
          text: "Device audiences may behave differently. Equal conversion is a comparison assumption, not proof of a mobile defect. Test readability, contact buttons, and forms, then measure actual results.",
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
      "Twenty self-reported checks to help review whether a visitor can understand and contact your business. Pull your site up on your phone and go down the list honestly.",
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


      return {
        headline: {
          value: `${score} / 100`,
          label: `Grade: ${grade}`,
          sub: `${count(picked.length)} of ${count(all.length)} basics in place`,
          tone: score >= 80 ? "good" : score >= 60 ? "warn" : "bad",
        },
        stats: [
          { label: "Things to fix", value: count(missing.length), tone: missing.length > 6 ? "bad" : "warn" },
          { label: "What this measures", value: "Checklist coverage", sub: "not traffic, revenue, or ranking" },
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
              ? "Most checklist items are complete. Test the actual contact flow and measure results before drawing conclusions."
              : "Use the missing items as a review list. Some changes need implementation work; verify that each change fits your business.",
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
    tagline: "Make your local listing easier to find and use",
    description:
      "Review your business details, customer contact options, photos, and review routine. Get a practical checklist from your answers, with no Google login required.",
    who: "Every local business with a physical location or a service area.",
    problem:
      "An old phone number, wrong hours, or missing service description can stop a customer from taking the next step.",
    payoff: "A self-reported checklist score and a clear list of details to review.",
    steps: [
      "Open your Google Business Profile.",
      "Check everything that is genuinely done and current.",
      "Review the missing items, starting with accurate business and contact details. This score does not predict Google rankings or leads.",
    ],
    fields: [
      { id: "checks", label: "Check what you have verified", type: "checks", def: [], help: "This tool uses your answers; it does not inspect Google. For an optional feature, check it only after confirming it is configured or does not apply to your business.", options: [
        { value: "claimed", label: "Claimed and verified" },
        { value: "category", label: "Primary category is exactly right" },
        { value: "secondary", label: "Additional categories reviewed; only relevant ones selected" },
        { value: "hours", label: "Hours correct, including holidays" },
        { value: "phone", label: "Phone number matches your website" },
        { value: "website", label: "Website linked" },
        { value: "services", label: "Services listed with descriptions" },
        { value: "description", label: "Business description written" },
        { value: "photos", label: "Real photos show the business and what it offers" },
        { value: "recent", label: "Photos reviewed for outdated or misleading details" },
        { value: "logo", label: "Logo and cover photo set" },
        { value: "posts", label: "Published updates and offers are accurate and current" },
        { value: "customer_answers", label: "Common customer questions answered on the website" },
        { value: "review_process", label: "Honest review requests have a consistent process" },
        { value: "replies", label: "Customer reviews reviewed and answered helpfully" },
        { value: "contact_options", label: "Available contact options tested; replies have an owner" },
        { value: "booking", label: "Booking link tested, or confirmed not applicable" },
        { value: "products", label: "Products or menu reviewed, or confirmed not applicable" },
        { value: "area", label: "Service area set correctly" },
        { value: "utm", label: "Website link tagged so you can track it" },
      ] },
    ],
    run: (v) => {
      const order = ["claimed","category","hours","phone","website","review_process","replies","photos","recent","services","description","posts","customer_answers","contact_options","booking","secondary","products","area","logo","utm"];
      const picked = [...new Set(list(v, "checks"))].filter((key) => order.includes(key));
      const labels: Record<string, string> = {
        claimed: "Claim and verify the business profile using Google's available verification options",
        category: "Choose the primary category that best describes the business",
        secondary: "Use additional categories only when they accurately describe the business",
        hours: "Check regular and holiday hours so customers know when they can reach you",
        phone: "Make the phone number match your website exactly",
        website: "Link your website",
        services: "List every service with a real description",
        description: "Write a clear, factual business description within the current field limit",
        photos: "Add useful, real photos of the business, team, and work you can show with permission",
        recent: "Review photos and replace images that no longer represent the business accurately",
        logo: "Set the logo and cover photo",
        posts: "Review published updates, offers, and dates; remove information that is no longer accurate",
        customer_answers: "Answer real customer questions clearly on your website; do not depend on a profile Q&A feature being available",
        review_process: "Invite genuine customers to leave honest reviews without incentives or selecting only happy customers",
        replies: "Review customer feedback and write useful replies without disclosing private customer details",
        contact_options: "Test the phone and website links. If WhatsApp or SMS is available for your profile, add it only when someone can respond",
        booking: "Test the booking link if appointments apply; otherwise mark it not applicable",
        products: "Review supported product or menu features if relevant; otherwise mark them not applicable",
        area: "Set the service area to the towns you really serve",
        utm: "Tag the website link so you can see the traffic it sends",
      };
      const missing = order.filter((o) => !picked.includes(o));
      const score = Math.round((picked.length / order.length) * 100);
      return {
        headline: {
          value: `${score} / 100`,
          label: "Your checklist coverage",
          sub: `${count(picked.length)} of ${count(order.length)} done`,
          tone: score >= 75 ? "good" : score >= 50 ? "warn" : "bad",
        },
        stats: [
          { label: "Items left", value: count(missing.length), tone: missing.length > 8 ? "bad" : "warn" },
          { label: "Source", value: "Your answers", sub: "No live profile inspection" },
          { label: "Ranking prediction", value: "Not measured" },
          { label: "Review first", value: missing.length ? labels[missing[0]].split(".")[0] : "Keep details current", tone: "good" },
        ],
        table: missing.length
          ? { title: "Details to review", headers: ["#", "Next action"], rows: missing.map((m, i) => [i + 1, labels[m]]) }
          : undefined,
        verdict: {
          tone: "good",
          text: "This score measures the checklist items you confirmed, not Google's ranking system. Local results depend on relevance, distance, and prominence. There is no promised review count, photo count, or posting schedule that guarantees a position or more calls.",
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
    tagline: "Explore a form-length scenario",
    description:
      "Compare form lengths using an explicit illustrative completion curve. The output is a scenario, not measured lost leads or revenue.",
    who: "Anyone whose contact form asks for a mailing address and a budget range.",
    problem:
      "A longer form asks for more effort. Whether removing a question improves qualified inquiries needs to be tested with your audience.",
    payoff: "A transparent comparison to help plan a real form test.",
    steps: [
      "Count the actual fields on your form. Required fields are not counted twice in this model.",
      "Enter your traffic and value per customer.",
      "Compare the hypothetical three-field scenario, then measure actual completions.",
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
        headline: { value: money(lost * close * value * 12), label: "Illustrative annual revenue gap", sub: `${dec(lost, 1)} leads a month`, tone: "bad" },
        stats: [
          { label: "Modeled completed forms now", value: dec(now, 1) },
          { label: "With 3 fields", value: dec(trimmed, 1), tone: "good" },
          { label: "Illustrative completion rate", value: pct(completion(fields) * 100, 0), tone: fields > 5 ? "bad" : "good" },
          { label: "Fields above comparison length", value: count(Math.max(0, fields - 3)), tone: "warn" },
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
        note: "Illustration only: each field beyond three retains 90% of the previous modeled completions, with a 15% floor. These are arbitrary, unvalidated assumptions, not measured abandonment or revenue loss.",
        verdict: {
          tone: "good",
          text: "Keep the information needed for the next step. Test a shorter form against real completed submissions; fewer fields do not guarantee more qualified leads.",
        },
      };
    },
  },
];
