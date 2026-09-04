// Google Review Kit.
//
// The free review link tool makes the link and a QR. Then the owner has to
// design a counter card, work out how many reviews the target actually takes,
// decide who asks and with what words, and answer whatever comes in, including
// the ugly ones. Most stop at the QR, which is why the average shop asks for
// exactly zero reviews a week.
//
// This builds the whole operation from their numbers: the printed signage in
// their brand, the ask scripts, the response library, the twelve week plan
// with the projected rating per week, and the reminders that make it happen.

import {
  brandOf, count, dec, num, pct, str,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import { buildQr, qrToSvg, qrContrastVerdict } from "../../qr";
import {
  addDays, bigNumbers, bullets, callout, checklist, csvDoc, esc, heading, icsDoc,
  longDate, MADE_WITH, numbered, pLead, paragraph, printDoc, printDocument,
  resolveBrand, scriptBlock, svgDoc, table, textDoc, type PrintSheet,
} from "../docs";

/* ------------------------------- review link ------------------------------- */

/**
 * Whatever they paste becomes the link the QR encodes. A Place ID becomes the
 * one tap writereview URL; a pasted link is used as given; anything else is
 * treated as not-set, and the signage says so instead of encoding a guess.
 */
export function reviewLinkOf(raw: string): { url: string; kind: "link" | "place-id" | "none" } {
  const input = raw.trim();
  if (!input) return { url: "", kind: "none" };
  if (/^https?:\/\/\S+$/i.test(input)) return { url: input, kind: "link" };
  if (/^g\.page\/\S+$/i.test(input)) return { url: `https://${input}`, kind: "link" };
  // Place IDs are URL-safe tokens, typically starting ChIJ or GhIJ, 20+ chars.
  if (/^[A-Za-z0-9_-]{16,300}$/.test(input)) {
    return {
      url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(input)}`,
      kind: "place-id",
    };
  }
  return { url: "", kind: "none" };
}

/* --------------------------------- scripts --------------------------------- */

type Tone = "friendly" | "direct" | "professional";

function askScripts(tone: Tone, ctx: { biz: string; who: string; job: string; link: string }) {
  const { biz, who, job, link } = ctx;
  const sig = who ? `\n\n${who}, ${biz}` : `\n\n${biz}`;
  const theLink = link || "[your review link]";
  const T = (f: string, d: string, p: string) => (tone === "friendly" ? f : tone === "direct" ? d : p);

  return [
    {
      tag: "In person, right after the work",
      when: "The single best moment. Say it while they are telling you it looks great.",
      text: T(
        `Hey, it really helps a small shop like ours when folks say that on Google. If I text you the link right now, would you put that in a review? Takes about a minute.`,
        `That means a lot. Would you put that in a Google review? I will text you the direct link, it takes a minute.`,
        `Thank you, that is very kind. Reviews on Google genuinely help a local business like ours. May I text you a direct link? It takes about a minute.`,
      ),
    },
    {
      tag: "Same day text",
      when: "Send within two hours of finishing, while the work is still fresh.",
      text: T(
        `Thanks again for letting us handle your ${job} today. If you were happy with it, a Google review would mean the world to us. This link goes straight to the review box: ${theLink}${sig}`,
        `Thanks for your business today. A Google review helps us more than any ad. Straight to the box: ${theLink}${sig}`,
        `Thank you for choosing ${biz} for your ${job} today. If you were satisfied with the work, we would be grateful for a Google review. This link opens the review form directly: ${theLink}${sig}`,
      ),
    },
    {
      tag: "Same day email",
      when: "For customers who gave an email instead of a mobile.",
      text: T(
        `Subject: One small favor\n\nThanks for trusting us with your ${job} today. If we did right by you, would you take a minute to say so on Google? It is the main way new folks find us.\n\n${theLink}\n\nAnd if anything was not right, reply to this email instead so I can fix it.${sig}`,
        `Subject: Quick favor\n\nThanks for your business. If the ${job} was done right, a one minute Google review helps us keep the lights on: ${theLink}\n\nIf something was off, reply here and I will fix it.${sig}`,
        `Subject: Thank you from ${biz}\n\nThank you for choosing us for your ${job}. If you were pleased with the result, we would appreciate a short Google review; it is how most of our new customers find us.\n\n${theLink}\n\nIf anything fell short of your expectations, please reply to this email so we can make it right.${sig}`,
      ),
    },
    {
      tag: "Three day follow up",
      when: "Only for people who said yes and have not posted. One nudge, never two.",
      text: T(
        `No pressure at all, just wanted to leave this where you can find it. The review link from the other day: ${theLink}. Either way, thanks for the business.${sig}`,
        `Leaving this here in case it got buried: ${theLink}. Thanks either way.${sig}`,
        `Just resurfacing the review link from earlier this week in case it was lost in a busy inbox: ${theLink}. Thank you again for your business.${sig}`,
      ),
    },
    {
      tag: "Thank you after a review lands",
      when: "Text them the same day you see it. People who feel thanked refer.",
      text: T(
        `Just saw your review. Thank you, seriously. It helps more than you know. If you ever need anything, you know where to find me.${sig}`,
        `Saw the review. Thank you, it genuinely helps. Call me any time you need something.${sig}`,
        `We saw your review this morning. Thank you for taking the time; it makes a real difference for a local business. We look forward to serving you again.${sig}`,
      ),
    },
    {
      tag: "For the regular who always says they will",
      when: "The long time customer who means well. Make it effortless and make it once.",
      text: T(
        `You have been with us for years and I have never once asked you this. If you have a minute, a Google review from you would carry real weight. One tap: ${theLink}. That is the only time I will ask, promise.${sig}`,
        `You know us better than anyone. One review from you is worth ten from strangers: ${theLink}. Only time I will ask.${sig}`,
        `You have trusted ${biz} for a long time, and a review from a long standing customer carries more weight than any advertising. If you are willing: ${theLink}. We will not ask twice.${sig}`,
      ),
    },
  ];
}

const RESPONSES: { band: string; note: string; items: (b: { biz: string; who: string; job: string }) => string[] }[] = [
  {
    band: "Five stars",
    note: "Short, warm, specific. Name what they praised so the reply reads human, and never paste the same one twice in a row.",
    items: ({ who }) => [
      `Thank you for taking the time to say this. It made the crew's day. We will be here whenever you need us again.${who ? ` ${who}` : ""}`,
      `This is exactly what we aim for on every job, and it means a lot to see it written down. Thank you for trusting us.`,
      `Reviews like this are how a local shop stays busy. Thank you, genuinely. The door is always open.`,
    ],
    },
  {
    band: "Four stars",
    note: "Thank them, then ask privately what would have made it five. Do not ask in the public reply.",
    items: () => [
      `Thank you for this. We are glad the work landed well, and we would love to know what would have made it a five. If you are willing, call or text us; we listen.`,
      `We appreciate you taking the time. If there was anything that kept this from being a five star visit, we would honestly like to hear it directly so we can fix it for next time.`,
    ],
  },
  {
    band: "Three stars",
    note: "Neutral reviews are usually one fixable thing. Own the experience without arguing the details in public.",
    items: ({ biz }) => [
      `Thank you for the honest feedback. A middle of the road experience is not what we aim for at ${biz}. If you are open to it, please call us so we can hear what happened and put it right.`,
      `We appreciate you telling us. Something clearly did not land the way it should have, and we would rather fix it than guess. Please reach out directly; we will make the time.`,
    ],
  },
  {
    band: "One and two stars",
    note: "Reply within a day, stay calm, take it offline. Future customers read your reply more carefully than the review.",
    items: ({ who, biz }) => [
      `We are sorry this was your experience. It is not the standard we hold ourselves to, and we want to understand what happened. Please call ${biz}${who ? ` and ask for ${who}` : ""} so we can hear you out and make it right.`,
      `Thank you for telling us, even though it is hard to read. We take this seriously. Please contact us directly so we can look into it properly and do right by you.`,
      `This is disappointing to read and we do not take it lightly. We would like the chance to fix it. Please reach out to us directly; a real person will pick up.`,
      `We hear you. Rather than go back and forth here, we would like to talk. Please call us and we will do everything we reasonably can to put this right.`,
    ],
  },
  {
    band: "A review you believe is fake or mistaken",
    note: "Stay factual and calm; readers can tell. Flag it with Google through your Business Profile as well, but reply meanwhile.",
    items: ({ biz }) => [
      `We take every review seriously, but we have no record of serving you, and we would like to be sure this is not a mix up with another business. Please contact ${biz} directly; if we did work for you, we will make it right, and if not, we will ask Google to review this listing.`,
    ],
  },
];

/* ---------------------------------- fields --------------------------------- */

const FIELDS: ProToolDef["fields"] = [
  {
    id: "reviewLink", label: "Your review link or Place ID", type: "text", def: "", section: "Your reviews",
    placeholder: "ChIJ... or https://g.page/r/...",
    help: "Paste the link from the free review link tool, or your Place ID. Left blank, the signage carries a sample code you replace later.",
  },
  { id: "current", label: "Your rating now", type: "slider", min: 1, max: 5, step: 0.1, def: 4.3, section: "Your reviews" },
  { id: "total", label: "Reviews you have", type: "slider", min: 0, max: 2000, step: 1, def: 47, section: "Your reviews" },
  { id: "goal", label: "Rating you want", type: "slider", min: 3, max: 4.9, step: 0.1, def: 4.8, section: "Your reviews" },
  {
    id: "weekly", label: "Customers you serve in a week", type: "slider", min: 1, max: 500, step: 1, def: 40, section: "Your reviews",
    help: "Everyone you could reasonably ask, not just the delighted ones.",
  },
  {
    id: "yesRate", label: "How many of those will actually post", type: "slider", min: 5, max: 60, step: 5, def: 25, suffix: "%", section: "Your reviews",
    help: "Asked well, in person, a quarter is realistic. This is your planning number, not a promise.",
  },
  {
    id: "job", label: "What you call the work", type: "text", def: "job", section: "How you ask",
    placeholder: "job, visit, cleaning, appointment",
  },
  {
    id: "who", label: "Who does the asking", type: "text", def: "", section: "How you ask",
    placeholder: "Ryan", help: "A name makes the scripts read like a person. Blank uses the business name.",
  },
  {
    id: "tone", label: "How you talk to customers", type: "select", def: "friendly", section: "How you ask",
    options: [
      { value: "friendly", label: "Friendly and local" },
      { value: "direct", label: "Short and direct" },
      { value: "professional", label: "Professional and formal" },
    ],
  },
  {
    id: "startDate", label: "Start the plan on", type: "text", def: "", section: "How you ask",
    placeholder: "2026-09-08", help: "Any date, as YYYY-MM-DD. Left blank it starts today.",
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
  const current = Math.min(5, Math.max(1, num(v, "current", 4.3)));
  const total = Math.max(0, num(v, "total"));
  const goal = Math.min(4.9, Math.max(3, num(v, "goal", 4.8)));
  const weekly = Math.max(1, num(v, "weekly", 40));
  const yesRate = Math.max(0.05, num(v, "yesRate", 25) / 100);
  const job = (str(v, "job").trim() || "job").slice(0, 40);
  const who = str(v, "who").trim().slice(0, 40);
  const tone = (str(v, "tone", "friendly") || "friendly") as Tone;
  const start = startDateOf(v);
  const review = reviewLinkOf(str(v, "reviewLink").slice(0, 400));

  // The same formula the free review goal calculator uses, with the same
  // stated assumption: every new review is five stars.
  const alreadyThere = current >= goal;
  const needed = alreadyThere ? 0 : Math.max(0, Math.ceil((total * (goal - current)) / (5 - goal)));
  const weeklyYes = weekly * yesRate;
  const weeksToGoal = needed > 0 && weeklyYes > 0 ? Math.ceil(needed / weeklyYes) : 0;

  // Week by week projection over twelve weeks.
  const plan = Array.from({ length: 12 }, (_, i) => {
    const gained = Math.round(weeklyYes * (i + 1));
    const projected = total + gained > 0 ? (current * total + 5 * gained) / (total + gained) : current;
    return {
      week: i + 1,
      date: addDays(start, i * 7),
      asks: Math.round(weekly),
      expected: Math.max(1, Math.round(weeklyYes)),
      runningTotal: total + gained,
      projected: Math.min(5, projected),
    };
  });
  const twelveWeekRating = plan[11].projected;

  const scripts = askScripts(tone, { biz: brand.name, who, job, link: review.url });

  /* ------------------------------- the QR art ------------------------------ */

  // The code prints in the brand color only when the contrast genuinely
  // survives a scanner; otherwise it falls back to ink and the playbook says
  // why. A pretty code that does not scan is worse than no code.
  const verdict = qrContrastVerdict(brand.color, "#FFFFFF");
  const qrDark = verdict && verdict.tone === "good" ? brand.color : "#0A1220";
  const encoded = review.url || "https://www.theleadflowpro.com/tools/google-review-link";
  const model = buildQr({ data: encoded, level: "Q", quietZone: 4, dark: qrDark, light: "#FFFFFF" });
  const qrSvg = qrToSvg(model, 2048);
  const qrInline = (inches: number) =>
    `<span class="qr" style="width:${inches}in;height:${inches}in;display:inline-block">${qrSvg.replace(
      /width="\d+" height="\d+"/,
      `width="100%" height="100%"`,
    )}</span>`;
  const sampleNote =
    review.kind === "none"
      ? `<p style="margin-top:10px;font-size:11px;color:#b3261e;font-weight:700">SAMPLE CODE. Add your review link or Place ID in the kit and reprint before using this.</p>`
      : "";

  /* ------------------------------- documents ------------------------------- */

  const signFace = (headline: string, sub: string, inches: number) =>
    `<div class="sign cardface">
      <p class="headline">${esc(headline)}</p>
      <p class="sub">${esc(sub)}</p>
      ${qrInline(inches)}
      ${sampleNote}
      <p class="foot">${esc(brand.name)}${brand.phone ? ` &nbsp;·&nbsp; ${esc(brand.phone)}` : ""}</p>
    </div>`;

  const signage = printDocument(
    brand,
    `Review signage for ${brand.name}`,
    [
      {
        eyebrow: "Counter card",
        title: "For the front counter",
        html:
          paragraph("Print on cardstock, trim to the frame, and stand it where money changes hands.") +
          signFace("Happy with the work?", "Scan to leave us a Google review. Takes one minute.", 2.2),
      },
      {
        breakBefore: true,
        eyebrow: "Letter poster",
        title: "For the wall or the window",
        html: signFace("Tell Google what you told us.", "One scan, one minute, and it genuinely helps a local business.", 3),
      },
      {
        breakBefore: true,
        eyebrow: "Invoice and receipt strip",
        title: "For the bottom of every invoice",
        html:
          paragraph("Three per page. Trim on the lines and staple one to every receipt and estimate that goes out.") +
          [1, 2, 3]
            .map(
              () =>
                `<div class="cardface" style="display:flex;align-items:center;gap:18px;border:1px dashed #b9c6da;border-radius:10px;padding:14px 18px;margin-bottom:14px">
                  ${qrInline(1.1)}
                  <div>
                    <p style="margin:0;font-weight:800;font-size:16px">Happy with your ${esc(job)}?</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#3c4d67">Scan to leave ${esc(brand.name)} a Google review. It takes about a minute and it helps more than you would think.</p>
                  </div>
                </div>`,
            )
            .join("") +
          sampleNote,
      },
      {
        breakBefore: true,
        eyebrow: "Table tent",
        title: "Fold on the line",
        html:
          paragraph("Print, fold along the middle, and it stands on its own. Same face on both sides.") +
          signFace("One minute. One favor.", "Scan to leave us a Google review.", 2) +
          `<div style="border-top:2px dashed #b9c6da;margin:18px 0"></div>` +
          signFace("One minute. One favor.", "Scan to leave us a Google review.", 2),
      },
    ],
    { footNote: MADE_WITH },
  );

  const playbookSheets: PrintSheet[] = [
    {
      eyebrow: "Review playbook",
      title: `Getting ${brand.name} to ${dec(goal, 1)} stars`,
      html:
        pLead(
          alreadyThere
            ? `You are already at ${dec(current, 1)} with ${count(total)} reviews, which meets the ${dec(goal, 1)} target. The plan below keeps the reviews coming so one bad week cannot move the number.`
            : `You are at ${dec(current, 1)} stars across ${count(total)} reviews. Reaching ${dec(goal, 1)} takes about ${count(needed)} new five star reviews, and at your volume that is roughly ${count(weeksToGoal)} week${weeksToGoal === 1 ? "" : "s"} of asking properly.`,
        ) +
        bigNumbers([
          { value: alreadyThere ? "Met" : count(needed), label: alreadyThere ? "Target rating" : "Reviews needed" },
          { value: count(Math.round(weeklyYes)), label: "Expected per week, asked well" },
          { value: dec(twelveWeekRating, 2), label: "Projected rating after 12 weeks" },
        ]) +
        callout(
          "The rule that makes this work",
          "Ask everyone, ask in person, ask the same day. The words are on the next page. The moment is right after they thank you.",
        ) +
        heading("The rules of the road") +
        numbered([
          "Never pay, discount or gift for a review. Google prohibits it and can strip every review you have.",
          "Ask everybody, not just the happy ones. Filtering who you ask can violate platform rules and it shows.",
          "One follow up, ever. Two is pestering and it gets you the wrong kind of review.",
          "Reply to every review inside a week, five stars and one star alike. The reply is read by the next customer, not the last one.",
          "Never argue in a reply. Take it offline with the response library in this kit.",
        ]) +
        heading("What this projection assumed") +
        bullets([
          "Every new review is five stars. Real mileage varies, which is why the plan tracks actuals next to the projection.",
          `A ${pct(yesRate * 100, 0)} yes rate when asked in person the same day. That is your planning number, not a promise about your results.`,
          "Ratings shown are computed averages; Google rounds and weighs its display differently.",
        ]),
    },
    ...RESPONSES.map((band, i) => ({
      breakBefore: true,
      eyebrow: `Responding, ${i + 1} of ${RESPONSES.length}`,
      title: band.band,
      html:
        callout("How to use these", band.note) +
        band.items({ biz: brand.name, who, job })
          .map((text, j) => scriptBlock(`Reply ${j + 1}`, text))
          .join(""),
    })),
    {
      breakBefore: true,
      eyebrow: "The wall tracker",
      title: "Twelve weeks, one line a week",
      html:
        paragraph("Fill the actual column by hand every Friday. The projection column is what the math expected; the gap between them tells you whether the asking is really happening.") +
        table(
          ["Week", "Starts", "Asks", "Expected new", "Projected total", "Projected rating", "Actual"],
          plan.map((w) => [
            String(w.week),
            longDate(w.date),
            String(w.asks),
            String(w.expected),
            String(w.runningTotal),
            dec(w.projected, 2),
            "",
          ]),
        ) +
        checklist([
          "The signage is printed and standing where customers pay",
          "The same day text is saved in the phone and takes one tap to send",
          `${who || "Somebody"} owns the ask and knows it`,
          "Every review from last week has a reply",
        ]),
    },
  ];

  const playbook = printDocument(brand, `Review playbook for ${brand.name}`, playbookSheets, {
    footNote: MADE_WITH,
  });

  const responsesText = RESPONSES.map(
    (band) =>
      `=== ${band.band.toUpperCase()} ===\n${band.note}\n\n${band
        .items({ biz: brand.name, who, job })
        .map((t, i) => `${i + 1}. ${t}`)
        .join("\n\n")}`,
  ).join("\n\n\n");

  const documents: ToolDocument[] = [
    printDoc(
      "signage",
      "Review signage pack",
      "Counter card, wall poster, invoice strips and a table tent, each carrying your code and your brand.",
      "review-signage-pack.html",
      signage,
    ),
    printDoc(
      "playbook",
      "Review playbook and tracker",
      "The plan to your target rating, the rules that keep it clean, the response library, and the twelve week wall tracker.",
      "review-playbook.html",
      playbook,
    ),
    svgDoc(
      "qr",
      "Review QR, print resolution",
      "The vector file a sign shop or printer asks for. Scales to a billboard without a blur.",
      "review-qr.svg",
      qrSvg,
    ),
    textDoc(
      "scripts",
      `${scripts.length * 3} ask scripts`,
      "Every ask, in all three voices: in person, same day text, email, the one follow up, the thank you, and the loyal regular.",
      "review-ask-scripts.txt",
      (["friendly", "direct", "professional"] as Tone[])
        .map(
          (t) =>
            `################ ${t.toUpperCase()} VOICE ################\n\n` +
            askScripts(t, { biz: brand.name, who, job, link: review.url })
              .map((s) => `=== ${s.tag} ===\nWhen: ${s.when}\n\n${s.text}`)
              .join("\n\n\n"),
        )
        .join("\n\n\n"),
    ),
    textDoc(
      "responses",
      `${RESPONSES.reduce((n, b) => n + b.items({ biz: brand.name, who, job }).length, 0)} review responses`,
      "Replies for every star band, including the review you believe is fake, written to be read by the next customer.",
      "review-responses.txt",
      responsesText,
    ),
    csvDoc(
      "plan",
      "Twelve week plan",
      "Week by week: asks, expected new reviews, projected total and projected rating, with a column for actuals.",
      "review-plan.csv",
      ["week", "week_starts", "asks", "expected_new_reviews", "projected_total", "projected_rating", "actual_new_reviews"],
      plan.map((w) => [w.week, w.date, w.asks, w.expected, w.runningTotal, dec(w.projected, 2), ""]),
    ),
    icsDoc(
      "reminders",
      "Weekly ask reminders",
      "Twelve Friday reminders, each carrying that week's ask script so the phone does the remembering.",
      "review-reminders.ics",
      plan.map((w, i) => ({
        date: w.date,
        time: "09:00",
        minutes: 15,
        title: `${brand.name}: ask ${w.asks} customers for a review this week`,
        description: scripts[i % scripts.length].text,
      })),
      `${brand.name} reviews`,
    ),
  ];

  return {
    headline: alreadyThere
      ? {
          value: dec(current, 1),
          label: "Already at your target",
          sub: `${count(total)} reviews. The job now is keeping the flow on.`,
          tone: "good",
        }
      : {
          value: count(needed),
          label: `Five star reviews to reach ${dec(goal, 1)}`,
          sub: `about ${count(weeksToGoal)} week${weeksToGoal === 1 ? "" : "s"} at your volume, asked well`,
          tone: needed > weeklyYes * 26 ? "warn" : "neutral",
        },
    explain: alreadyThere
      ? `At ${dec(current, 1)} stars you have met the ${dec(goal, 1)} target. The kit builds the machine that keeps it there: the signage, the asks, and the replies, because a rating nobody feeds drifts down on its own.`
      : `Moving ${count(total)} reviews from ${dec(current, 1)} to ${dec(goal, 1)} takes about ${count(needed)} new five star reviews. You see ${count(weekly)} customers a week; at a ${pct(yesRate * 100, 0)} yes rate that is ${count(Math.round(weeklyYes))} new reviews a week, which puts the target about ${count(weeksToGoal)} week${weeksToGoal === 1 ? "" : "s"} out.`,
    stats: [
      { label: "Rating today", value: dec(current, 1), sub: `${count(total)} reviews` },
      { label: "Asks per week", value: count(weekly) },
      { label: "Expected new reviews a week", value: count(Math.round(weeklyYes)), tone: "good" },
      { label: "Projected after 12 weeks", value: dec(twelveWeekRating, 2), sub: "if every new review is five stars", tone: "good" },
    ],
    bars: {
      title: "The projected climb",
      caption: "Projected rating at the end of each month of asking.",
      items: [4, 8, 12].map((w) => ({
        label: `Week ${w}`,
        value: plan[w - 1].projected,
        display: dec(plan[w - 1].projected, 2),
        tone: plan[w - 1].projected >= goal ? "good" : "neutral",
      })),
    },
    verdict: {
      tone: "neutral",
      text:
        review.kind === "none"
          ? "Add your review link or Place ID and every sign, script and reminder carries the real one tap link. The free review link tool on this site finds it in about a minute."
          : `The kit is built around your one tap link. Print the signage, save the same day text, and start the plan ${longDate(start)}.`,
    },
    assumptions: [
      "Every new review is assumed to be five stars. The tracker records actuals next to the projection for exactly that reason.",
      "The yes rate is your planning input, not a promise. Nothing here guarantees reviews or ratings.",
      "Google prohibits paying or incentivizing for reviews, and the scripts are written to stay inside that line.",
    ],
    documents,
  };
}

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 19,
  promise:
    "Your review link turned into printed signage, ask scripts, a response library and a twelve week plan, all in your brand.",
  kit: [
    "Signage pack: counter card, poster, invoice strips, table tent",
    "Print resolution vector QR for the sign shop",
    "18 ask scripts across three voices",
    "12 review responses for every star band, fakes included",
    "Twelve week plan with projected rating per week",
    "Weekly phone reminders carrying that week's script",
  ],
  upgradeFrom: [
    "google-review-link",
    "review-goal-calculator",
    "review-request-script",
    "review-response-writer",
    "bad-review-impact",
  ],
  freePreview:
    "Run your real rating and volume, see how many reviews the target takes and the projected climb, and see every document the kit builds.",
};

export const KIT: ProToolDef = {
  slug: "google-review-kit",
  name: "Google Review Kit",
  short: "Review Kit",
  emoji: "⭐",
  category: "Reputation",
  tagline: "The whole review operation, printed in your brand",
  description:
    "Turn your review link into the finished operation: signage for the counter and the wall, ask scripts for every moment, replies for every star band, and a twelve week plan with the projected rating per week.",
  who: "Any local business with a Google Business Profile: trades, restaurants, salons, clinics, shops, offices.",
  problem:
    "The link and the QR are the easy part. The card still has to be designed, somebody has to know the words, the ugly review still needs an answer, and nobody knows how many asks the target rating actually takes.",
  payoff:
    "The finished operation in your name: print the signage today, save the scripts to your phone, and work a plan with a number on every week.",
  steps: [
    "Put your business name, phone and logo in the brand kit once.",
    "Paste your review link or Place ID and set your real rating and volume.",
    "Pick the voice that sounds like you and a start date.",
    "Print the signage, save the scripts, and let the reminders run the plan.",
  ],
  faqs: [
    {
      q: "Where do I get my review link or Place ID?",
      a: "The free Google Review Link tool on this site builds it from your Place ID in about a minute, and Google's own Place ID Finder gives you the ID. Paste either one here.",
    },
    {
      q: "Can I offer a discount for reviews?",
      a: "No, and the kit will not help you do it. Google prohibits incentivized reviews and can strip every review you have. The scripts work because they ask honestly at the right moment.",
    },
    {
      q: "Will this get me to the rating it projects?",
      a: "The projection assumes every new review is five stars and that you actually ask. It is planning math from your own inputs, not a promise, which is why the tracker records your actuals next to it.",
    },
    {
      q: "What if my rating or volume changes?",
      a: "Open the kit and change the numbers. The plan, the projection and every document rebuild at no extra cost.",
    },
  ],
  domain: "sales-marketing",
  toolType: "builder",
  goals: ["create-marketing", "capture-leads", "make-money"],
  industries: [
    "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
    "cleaning", "remodeling", "auto-repair", "restaurant", "coffee-shop", "hair-salon",
    "nail-salon", "barbershop", "spa", "fitness", "medical-practice", "dental-practice",
    "veterinary", "legal", "real-estate", "insurance", "pet-services", "handyman",
    "moving", "retail",
  ],
  audiences: ["owners", "managers", "administrators"],
  keywords: [
    "google review kit", "review qr code sign", "leave us a review card", "review request scripts",
    "how to respond to a bad review", "review response templates", "get more google reviews",
    "review sign printable",
  ],
  synonyms: ["review signage pack", "google review system", "review request kit"],
  disclaimer: "general-estimate",
  dataSensitivity: "none",
  popularity: 94,
  isNew: true,
  embedHeight: 1100,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A counter card standing by a till with a scannable review code on its face, stars rising off the card toward a review page pinned above.",
  visualFamily: "reputation",
  primarySubject: "printed counter card with a QR code",
  supportingSubjects: ["five star row", "till", "small review page"],
  sceneType: "still-life",
  composition: "counter card left of center at two thirds height, stars arcing to the upper right, till low right, negative space upper left",
  colorAccent: 4,
  cardImage: "/tools-art/card/google-review-kit.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/google-review-kit.svg",
  heroImageAlt: "A printed review counter card with a QR code, with five star reviews rising off it",
  ogImage: "/og/tools/google-review-kit.jpg",
  ogLayout: "scene-left",
  ogHook: "Signage, scripts, replies and the plan, in your brand.",
  focalPoint: { x: 0.42, y: 0.55 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};
