import type { Workspace } from "./types";
import { formatPhone } from "./phone";

// The weekly content drafts: three posts, one ad, one short video script
// with a shot list, all in the business's voice and about the business's
// own services. Deterministic per week so a re-run never produces a second
// set of drafts, and rotating through angles so week two never repeats week
// one. Nothing here invents a statistic; when a number would help, the
// draft leaves a bracketed blank for the owner's real one.

export type ContentDraft = {
  kind: "post" | "ad" | "video_script";
  title: string;
  hook: string;
  body: string;
  cta: string;
  extras: Record<string, unknown>;
};

export type ContentBundle = {
  weekOf: string;
  angle: string;
  drafts: ContentDraft[];
};

type Angle = {
  id: string;
  label: string;
  post: (ctx: Ctx) => ContentDraft;
};

type Ctx = {
  ws: Workspace;
  name: string;
  who: string;
  city: string;
  area: string;
  service: string;
  services: string[];
  phone: string;
  offer: string;
  friendly: boolean;
  formal: boolean;
  seed: number;
};

function ctxFor(ws: Workspace, seed: number): Ctx {
  const services = ws.services.map((s) => s.trim()).filter(Boolean);
  const service = services.length ? services[seed % services.length] : "our work";
  const city = ws.city?.trim() || "";
  const state = ws.state?.trim() || "";
  return {
    ws,
    name: ws.name,
    who: ws.owner_name?.trim() || ws.name,
    city,
    area: city ? `${city}${state ? `, ${state}` : ""}` : "our area",
    service,
    services,
    phone: formatPhone(ws.phone),
    offer: ws.offer?.trim() || "",
    friendly: ws.voice === "friendly",
    formal: ws.voice === "formal",
    seed,
  };
}

function lower(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

function ctaLine(c: Ctx): string {
  if (c.phone) return `Call or text ${c.phone}.`;
  if (c.ws.website) return `Reach us at ${c.ws.website}.`;
  return `Message us here.`;
}

const ANGLES: Angle[] = [
  {
    id: "how-we-work",
    label: "How we work",
    post: (c) => ({
      kind: "post",
      title: `How we handle ${lower(c.service)}`,
      hook: `Here is exactly what happens when you call ${c.name} about ${lower(c.service)}.`,
      body: [
        `Here is exactly what happens when you call ${c.name} about ${lower(c.service)}.`,
        "",
        "1. You get a real person, not a menu.",
        "2. We ask what is going on and give you a straight answer on what it takes.",
        "3. You get a price before any work starts.",
        "4. We show up when we said we would.",
        "",
        `That is the whole pitch. ${c.friendly ? "Nothing fancy, just done right." : "No surprises."}`,
        "",
        ctaLine(c),
      ].join("\n"),
      cta: ctaLine(c),
      extras: { angle: "how-we-work" },
    }),
  },
  {
    id: "problem-fix",
    label: "A problem and the fix",
    post: (c) => ({
      kind: "post",
      title: `The ${lower(c.service)} problem people wait too long on`,
      hook: `The most expensive ${lower(c.service)} call we get is the one that waited a month.`,
      body: [
        `The most expensive ${lower(c.service)} call we get is the one that waited a month.`,
        "",
        "Small problem, small fix. Same problem three weeks later, bigger fix. It is not a sales line, it is just how it goes.",
        "",
        `If something in ${c.area} has been nagging at you, send a photo or a quick description. We will tell you honestly whether it can wait.`,
        "",
        ctaLine(c),
      ].join("\n"),
      cta: ctaLine(c),
      extras: { angle: "problem-fix", ask: "Add a real example from last week if you have one." },
    }),
  },
  {
    id: "question",
    label: "A question for the neighborhood",
    post: (c) => ({
      kind: "post",
      title: `Question for ${c.city || "the neighborhood"}`,
      hook: `Quick question for ${c.city || "everyone"}: what is the one ${lower(c.service)} job you keep putting off?`,
      body: [
        `Quick question for ${c.city || "everyone"}: what is the one ${lower(c.service)} job you keep putting off?`,
        "",
        "Drop it in the comments. We will answer every one with what it usually takes and what it usually costs to fix, no strings.",
        "",
        `${c.who}, ${c.name}`,
      ].join("\n"),
      cta: "Comment below.",
      extras: { angle: "question", note: "Reply to every comment within the hour. That is what makes this post work." },
    }),
  },
  {
    id: "offer",
    label: "The offer",
    post: (c) => ({
      kind: "post",
      title: c.offer ? "This week's offer" : `${c.service} this week`,
      hook: c.offer ? `${c.offer}` : `Booking ${lower(c.service)} in ${c.area} this week.`,
      body: [
        c.offer ? c.offer : `Booking ${lower(c.service)} in ${c.area} this week.`,
        "",
        c.offer
          ? `That is the deal from ${c.name}. Mention this post when you call.`
          : `A few openings left. First to call gets first pick of the schedule.`,
        "",
        ctaLine(c),
      ].join("\n"),
      cta: ctaLine(c),
      extras: { angle: "offer", note: c.offer ? "" : "Add a current offer in Settings and this post will carry it." },
    }),
  },
  {
    id: "behind-the-scenes",
    label: "Behind the scenes",
    post: (c) => ({
      kind: "post",
      title: "A look at the work",
      hook: `This is what ${lower(c.service)} looks like when it is done right.`,
      body: [
        `This is what ${lower(c.service)} looks like when it is done right.`,
        "",
        "[Attach a photo or a 10 second clip from a recent job. Before and after if you have both.]",
        "",
        `Every job gets the same care, whether it is a small fix or the whole thing. ${c.formal ? "We appreciate the trust." : "Thanks for trusting us with it."}`,
        "",
        ctaLine(c),
      ].join("\n"),
      cta: ctaLine(c),
      extras: { angle: "behind-the-scenes", needsMedia: true },
    }),
  },
  {
    id: "faq",
    label: "The question everyone asks",
    post: (c) => ({
      kind: "post",
      title: `"How much does ${lower(c.service)} cost?"`,
      hook: `The question we get most about ${lower(c.service)}: how much?`,
      body: [
        `The question we get most about ${lower(c.service)}: how much?`,
        "",
        "Honest answer: it depends on [the two or three things that actually change the price]. Most jobs in [your typical range] land between [low] and [high].",
        "",
        `Send ${c.name} a photo and a sentence about what you need and we will give you a real number, not a range.`,
        "",
        ctaLine(c),
      ].join("\n"),
      cta: ctaLine(c),
      extras: { angle: "faq", note: "Fill the brackets with your real numbers. A real range beats a vague one every time." },
    }),
  },
  {
    id: "thank-you",
    label: "Thank a customer",
    post: (c) => ({
      kind: "post",
      title: "Thank you",
      hook: `A thank you to the ${c.area} folks who called ${c.name} this month.`,
      body: [
        `A thank you to the ${c.area} folks who called ${c.name} this month.`,
        "",
        "Every job on the schedule came from someone who picked up the phone or sent a message. We do not take that lightly.",
        "",
        "If we did right by you, a Google review helps the next person find us.",
        c.ws.review_link ? c.ws.review_link : "[Add your Google review link in Settings]",
      ].join("\n"),
      cta: "Leave a review.",
      extras: { angle: "thank-you" },
    }),
  },
];

function adDraft(c: Ctx): ContentDraft {
  const primary = [
    `${c.area} ${lower(c.service)}, done by ${c.name}.`,
    "",
    "Real person answers. Straight price before the work starts. On time.",
    c.offer ? `\n${c.offer}` : "",
    "",
    "Tap below and we will call you back today.",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
  return {
    kind: "ad",
    title: `Lead ad: ${c.service} in ${c.area}`,
    hook: `${c.service} in ${c.area}? We call you back today.`,
    body: primary,
    cta: "Get Quote",
    extras: {
      headline: `${c.service} in ${c.area}`,
      description: `${c.name}. Call back today.`,
      buttonLabel: "Get Quote",
      formQuestions: [
        `What do you need help with? (${c.services.slice(0, 4).join(", ") || "describe the job"})`,
        "When do you want it done? (this week, this month, just pricing)",
      ],
      targeting: {
        radiusMiles: 25,
        center: c.area,
        note: "Start at $10 to $20 a day, run seven days before judging it, and turn off the ad set that gets no leads by day four.",
      },
      compliance: "Lead ads must describe the service, not the person. No 'are you struggling with' phrasing.",
    },
  };
}

function videoDraft(c: Ctx): ContentDraft {
  const hookLine = `If you have been putting off ${lower(c.service)} in ${c.area}, this is the sign.`;
  const script = [
    `[0-3s, straight to camera] ${hookLine}`,
    `[3-10s, walking the job] I am ${c.who} with ${c.name}. This is what we did for a customer this week. [Point at the work.]`,
    `[10-18s, close-up] The part most people do not see is [one detail that shows care]. That is why it lasts.`,
    `[18-24s, back to camera] Real person answers, straight price before we start, and we show up when we say.`,
    `[24-30s] ${c.phone ? `Call or text ${c.phone}.` : "Message us."} ${c.name}. Talk soon.`,
  ].join("\n");
  return {
    kind: "video_script",
    title: `30 second ${lower(c.service)} video`,
    hook: hookLine,
    body: script,
    cta: c.phone ? `Call or text ${c.phone}` : "Message us",
    extras: {
      lengthSeconds: 30,
      orientation: "vertical",
      shots: [
        { shot: 1, seconds: "0-3", frame: "Face, phone at chest height, job site behind you", onScreen: hookLine.slice(0, 48) },
        { shot: 2, seconds: "3-10", frame: "Walk toward the finished work, keep talking", onScreen: c.name },
        { shot: 3, seconds: "10-18", frame: "Close-up of the detail, hand pointing", onScreen: "Done right" },
        { shot: 4, seconds: "18-24", frame: "Face again, slight smile", onScreen: "Straight price. On time." },
        { shot: 5, seconds: "24-30", frame: "Face, then hold the phone number on screen", onScreen: c.phone || c.name },
      ],
      caption: `${hookLine} ${c.phone ? `Call or text ${c.phone}.` : ""}`.trim(),
      tips: [
        "Film in one take if you can. Mistakes read as honest.",
        "Natural light, no music over the voice.",
        "Post it native on Facebook and Instagram, not as a link.",
      ],
    },
  };
}

/** ISO-like week index used as the rotation seed. */
export function weekIndex(weekOf: string): number {
  const d = new Date(`${weekOf}T00:00:00Z`);
  return Math.floor(d.getTime() / (7 * 86_400_000));
}

export function buildWeeklyContent(ws: Workspace, weekOf: string): ContentBundle {
  const seed = weekIndex(weekOf);
  const c = ctxFor(ws, seed);
  // Three posts per week, walking the angle list so each week's set differs
  // from the last and the offer angle comes around every few weeks.
  const start = (seed * 3) % ANGLES.length;
  const picked = [0, 1, 2].map((i) => ANGLES[(start + i) % ANGLES.length]);
  const posts = picked.map((a, i) => a.post(ctxFor(ws, seed + i)));
  return {
    weekOf,
    angle: picked.map((a) => a.label).join(", "),
    drafts: [...posts, adDraft(c), videoDraft(c)],
  };
}

export function reviewReply(ws: Workspace, review: { name?: string; stars: number; text: string }): ContentDraft {
  const who = ws.owner_name?.trim() || ws.name;
  const name = review.name?.trim();
  const positive = review.stars >= 4;
  const body = positive
    ? `${name ? `${name}, thank you` : "Thank you"} for taking the time to write this. ${review.text.length > 60 ? "It means a lot to the whole crew. " : ""}Call us any time you need us. ${who}, ${ws.name}`
    : `${name ? `${name}, ` : ""}I am sorry this was your experience, and I want to make it right. Please call ${formatPhone(ws.phone) || "us"} and ask for ${who} directly so I can hear what happened and fix it. ${ws.name}`;
  return {
    kind: "post",
    title: `${review.stars} star review reply`,
    hook: body.slice(0, 60),
    body,
    cta: "",
    extras: { kind: "review_reply", stars: review.stars, note: positive ? "Post it as is." : "Reply publicly, then call. Never argue in the thread." },
  };
}
