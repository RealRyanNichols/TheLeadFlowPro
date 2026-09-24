// Post Creator idea engine: the twenty angles a post can take.
//
// Each angle fits some topic kinds (a warning sign fits a problem, not a team
// member) and carries its own title, four first lines, two photo ideas, the
// body lines of the free draft, and the middle shot of the short video. The
// body leaves [blanks] for what only the owner knows, so the library never
// states a price, a number, or a claim about anyone's business.
//
// A kind is not always enough. Before and after needs a change you can
// photograph, Tool talk needs gear, a seasonal heads-up needs a topic that has
// a season, and so on (`needs` and `avoid`, read by angleFits), so "Tool talk:
// how we train new people" is never drawn. `ctas` keeps "Save this post" and
// "Share this" to the angles people save and share, not a thank you.
//
// The order matches ANGLE_IDS, and the labels come from ANGLE_META (options.ts),
// so the card chip, the AI writer's brief, and this library never drift apart.
// Pure data, browser-safe.

import { ANGLE_META, CTA_IDS, type AngleId, type CtaId } from "../options";
import type { Angle, AngleNeed, Topic, TopicKind, TopicTag } from "./types";

const ALL_KINDS: readonly TopicKind[] = ["problem", "howto", "decision", "work", "team", "story", "local"];

/** Every call to action: a post someone may want to keep or pass on. */
const EVERY_CTA: readonly CtaId[] = CTA_IDS;

/** A post about people or the work itself: reach out or comment, but "Save this post" and "Share this" do not follow it. */
const PEOPLE_CTAS: readonly CtaId[] = CTA_IDS.filter((c) => c !== "save" && c !== "share");

type AngleRule = {
  kinds: readonly TopicKind[];
  needs?: Partial<Record<TopicKind, AngleNeed>>;
  avoid?: readonly TopicTag[];
  ctas: readonly CtaId[];
};

function angle(
  id: AngleId,
  rule: AngleRule,
  title: string,
  hooks: readonly [string, string, string, string],
  shots: readonly [string, string],
  body: readonly string[],
  clip: string,
): Angle {
  const meta = ANGLE_META.find((a) => a.id === id);
  if (!meta) throw new Error(`Unknown Post Creator angle: ${id}`);
  return { id, label: meta.label, ...rule, title, hooks, shots, body, clip };
}

export const ANGLES: readonly Angle[] = [
  angle(
    "quick-tip",
    { kinds: ["problem", "howto"], ctas: EVERY_CTA },
    "Quick tip: {topic}",
    [
      "Here is a quick tip about {topic}.",
      "Save this quick tip about {topic}.",
      "Quick tip time: {topic}.",
      "A tip worth knowing about {topic}.",
    ],
    ["A close-up of your hands showing the tip", "You sharing the tip to the camera in one breath"],
    ["[the tip, in one or two plain sentences]", "Not sure it applies to you? Ask us first."],
    "Shot: Show [the tip in action]",
  ),
  angle(
    "myth-fact",
    { kinds: ["problem", "howto", "decision"], ctas: EVERY_CTA },
    "Myth vs fact: {topic}",
    [
      "There is a lot of mixed advice out there about {topic}.",
      "Myth or fact? Let's talk about {topic}.",
      "Before you believe what you read about {topic}, read this.",
      "Here is a common myth about {topic}.",
    ],
    ["You saying the myth, then the fact, to the camera", "A phone note that says Myth on one line and Fact on the next"],
    ["The myth: [what people often believe].", "The fact: [what is actually true, in a sentence or two]."],
    "Shot: Say [the fact, plainly]",
  ),
  angle(
    "people-ask",
    { kinds: ["problem", "howto", "decision", "work"], ctas: EVERY_CTA },
    "A common question about {topic}",
    [
      "People often ask about {topic}, so here is a plain answer.",
      "Question of the week: {topic}.",
      "Wondering about {topic}? You are not the only one.",
      "Here is a straight answer about {topic}.",
    ],
    ["You answering the question on camera in under a minute", "A photo of the part or spot the question is about"],
    ["The question: [the question in a customer's words]", "The answer: [your answer in two or three plain sentences]"],
    "Shot: Give [the answer, plainly]",
  ),
  angle(
    "behind-scenes",
    { kinds: ["work", "team"], ctas: PEOPLE_CTAS },
    "Behind the scenes: {topic}",
    [
      "A look behind the scenes: {topic}.",
      "Most people never see this part: {topic}.",
      "Here is a peek behind the curtain: {topic}.",
      "Behind the scenes today: {topic}.",
    ],
    ["A wide photo of the work area or the team", "A short clip of the part most people never see"],
    ["[what you are showing and why it matters]"],
    "Shot: Show [the part people never see]",
  ),
  angle(
    "before-after",
    { kinds: ["problem", "work"], needs: { problem: "visible", work: "visible" }, ctas: PEOPLE_CTAS },
    "Before and after: {topic}",
    [
      "Before and after: {topic}.",
      "Take a look at this before and after on {topic}.",
      "What a difference: {topic}.",
      "From before to after: {topic}.",
    ],
    ["A before photo and an after photo from the same spot", "A short clip that moves from the before to the after"],
    ["Before: [what it looked like].", "After: [what you did, shared with the customer's OK]."],
    "Shot: Show [the after, from the same spot]",
  ),
  angle(
    "mistake",
    { kinds: ["problem", "howto", "decision"], ctas: EVERY_CTA },
    "A mistake to avoid: {topic}",
    [
      "Here is an easy mistake to avoid with {topic}.",
      "Here is a common mistake people make with {topic}.",
      "A mistake that is easy to make with {topic}, and what to do instead.",
      "Save yourself some trouble with {topic}.",
    ],
    ["You pointing to what the mistake looks like", "The wrong way and the right way side by side"],
    ["The mistake: [what people do].", "Do this instead: [the better way]."],
    "Shot: Show [the better way]",
  ),
  angle(
    "checklist",
    { kinds: ["problem", "howto", "decision"], ctas: EVERY_CTA },
    "A short checklist: {topic}",
    [
      "Here is a short checklist for {topic}.",
      "Before you deal with {topic}, check these.",
      "Save this checklist for {topic}.",
      "A simple list to keep handy: {topic}.",
    ],
    ["A handwritten checklist on a clipboard", "A quick clip checking off each item"],
    ["Check: [the first thing to look at]", "Check: [the second thing to look at]", "Anything look off? Ask us."],
    "Shot: Show [each thing to check]",
  ),
  angle(
    "this-or-that",
    { kinds: ["decision"], needs: { decision: "choice" }, ctas: EVERY_CTA },
    "This or that: {topic}",
    [
      "This or that? Let's talk about {topic}.",
      "Trying to decide on {topic}? Here is how to think about it.",
      "A quick comparison: {topic}.",
      "Here is a simple way to choose: {topic}.",
    ],
    ["The two options side by side", "You holding up one option in each hand"],
    ["One way: [when it makes sense].", "The other way: [when it makes sense]."],
    "Shot: Show [the two options side by side]",
  ),
  angle(
    "day-on-job",
    { kinds: ["work", "team"], avoid: ["gear"], ctas: PEOPLE_CTAS },
    "A day on the job: {topic}",
    [
      "A day on the job: {topic}.",
      "Come along for part of the day: {topic}.",
      "Today on the job: {topic}.",
      "Here is a slice of a normal day: {topic}.",
    ],
    ["A short clip from the start of the day", "A photo of the team or the shop at the start of the day"],
    ["[what happened today, in your words]"],
    "Shot: Show [a moment from the day]",
  ),
  angle(
    "meet-team",
    { kinds: ["team"], ctas: PEOPLE_CTAS },
    "Meet the team: {topic}",
    [
      "Meet the team: {topic}.",
      "Say hello to {topic}.",
      "Here is someone you might meet: {topic}.",
      "The people behind the work: {topic}.",
    ],
    ["A friendly photo of the person, with their OK", "A short clip of them saying hello"],
    ["[their name and what they do, shared with their OK]", "[one thing they are happy to share about themselves]"],
    "Shot: Show [them at work, with their OK]",
  ),
  angle(
    "our-story",
    { kinds: ["story"], ctas: PEOPLE_CTAS },
    "Our story: {topic}",
    [
      "A little of our story: {topic}.",
      "Here is something you might not know about us: {topic}.",
      "Our story, in one post: {topic}.",
      "A bit about us: {topic}.",
    ],
    ["An older photo from the early days, if you have one", "You telling the story to the camera"],
    ["[the story, in two or three true sentences]"],
    "Shot: Show [a photo from the early days]",
  ),
  angle(
    "local-love",
    { kinds: ["local"], ctas: PEOPLE_CTAS },
    "Local love: {topic}",
    [
      "Some local love today: {topic}.",
      "A shout out close to home: {topic}.",
      "Here is a little local love: {topic}.",
      "Close to home and worth a shout out: {topic}.",
    ],
    ["A photo at the local spot, with permission", "A short clip saying what you like about it"],
    ["[the place or event and why you like it]"],
    "Shot: Show [the place or the event]",
  ),
  angle(
    "heads-up",
    { kinds: ["problem", "howto"], needs: { problem: "seasons", howto: "seasons" }, ctas: EVERY_CTA },
    "{Season} heads-up: {topic}",
    [
      "{Season} is a good time to think about {topic}.",
      "A {season} heads-up about {topic}.",
      "Something to think about this {season}: {topic}.",
      "A quick {season} reminder about {topic}.",
    ],
    ["A seasonal photo near the thing you are talking about", "You giving the heads-up to the camera"],
    ["[what to watch for this {season}]"],
    "Shot: Show [what to watch for]",
  ),
  angle(
    "what-to-expect",
    { kinds: ["work", "decision"], needs: { work: "visit" }, ctas: EVERY_CTA },
    "What to expect: {topic}",
    [
      "What to expect: {topic}.",
      "No surprises. Here is how it goes: {topic}.",
      "Wondering how it goes? Here is what to expect: {topic}.",
      "A plain walk through: {topic}.",
    ],
    ["A photo of each step, in order", "A short clip walking through the first step"],
    ["[the steps, in plain words]", "Questions first? Ask us."],
    "Shot: Show [the first step]",
  ),
  angle(
    "tool-talk",
    { kinds: ["work"], needs: { work: "gear" }, ctas: PEOPLE_CTAS },
    "Tool talk: {topic}",
    [
      "Tool talk: {topic}.",
      "Here is some gear that matters: {topic}.",
      "A closer look at the gear: {topic}.",
      "A quick look at the tools: {topic}.",
    ],
    ["A close-up of the tool", "A short clip of the tool in use"],
    ["[what the tool is and what it does for the job]"],
    "Shot: Show [the tool at work]",
  ),
  angle(
    "warning-signs",
    { kinds: ["problem"], needs: { problem: "early" }, ctas: EVERY_CTA },
    "Warning signs: {topic}",
    [
      "Here is how to spot {topic} early.",
      "A few signs worth knowing about {topic}.",
      "Could it be {topic}? Here is what to look for.",
      "Catch it early: {topic}.",
    ],
    ["A photo of what the sign looks like", "You pointing out the sign on camera"],
    ["What to look for: [the signs, in plain words]", "Not sure what you are seeing? Ask us."],
    "Shot: Show [what the sign looks like]",
  ),
  angle(
    "cost-factors",
    { kinds: ["decision"], ctas: EVERY_CTA },
    "What affects the cost: {topic}",
    [
      "What affects the cost of {topic}? Here is a plain answer.",
      "Wondering what goes into the price of {topic}?",
      "A few things change the price of {topic}.",
      "Here is why prices vary for {topic}.",
    ],
    ["You explaining the price factors at a job", "A photo of the parts or materials that change the price"],
    ["What changes the price: [the two or three things that matter most]", "Want a price for your job? Ask us."],
    "Shot: Show [what changes the price]",
  ),
  angle(
    "thank-you",
    { kinds: ["team"], avoid: ["self"], ctas: PEOPLE_CTAS },
    "Thank you: {topic}",
    [
      "A big thank you to {topic}.",
      "Today we want to thank {topic}.",
      "Grateful today for {topic}.",
      "A quick thank you to {topic}.",
    ],
    ["A photo of the person or people you are thanking, with their OK", "A short clip saying thank you"],
    ["[what you are thankful for, in your words]"],
    "Shot: Show [who you are thanking, with their OK]",
  ),
  angle(
    "your-turn",
    { kinds: ALL_KINDS, ctas: PEOPLE_CTAS },
    "Your turn: {topic}",
    [
      "Your turn: what would you like to know about {topic}?",
      "Got a question about {topic}? Ask it below.",
      "Quick question for you about {topic}.",
      "We want to hear from you about {topic}.",
    ],
    ["A photo that sets up the question", "A short clip asking the question to the camera"],
    ["[the question you want people to answer]"],
    "Shot: Ask [your question] to the camera",
  ),
  angle(
    "three-steps",
    { kinds: ["problem", "howto"], ctas: EVERY_CTA },
    "Three steps: {topic}",
    [
      "Three simple steps for {topic}.",
      "Keep it simple: three steps for {topic}.",
      "Three steps to keep in mind with {topic}.",
      "Here are three easy steps for {topic}.",
    ],
    ["Three quick photos, one per step", "A short clip showing each step"],
    ["Step one: [the first step]", "Step two: [the second step]", "Step three: ask us if anything looks wrong."],
    "Shot: Show [each step]",
  ),
];

const BY_ID = new Map<AngleId, Angle>(ANGLES.map((a) => [a.id, a]));

export function angleById(id: AngleId): Angle {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown Post Creator angle: ${id}`);
  return found;
}

/** The angles that can take a topic of this kind, before its tags are checked, in ANGLE_IDS order. */
export function anglesForKind(kind: TopicKind): readonly Angle[] {
  return ANGLES.filter((a) => a.kinds.includes(kind));
}

/** True when the angle reads right on this topic: its kind, what the angle needs of that kind, and nothing it avoids. */
export function angleFits(a: Angle, topic: Topic): boolean {
  if (!a.kinds.includes(topic.kind)) return false;
  const need = a.needs?.[topic.kind];
  if (need === "seasons" && !topic.seasons?.length) return false;
  if (need && need !== "seasons" && !topic.tags?.includes(need)) return false;
  return !a.avoid?.some((tag) => topic.tags?.includes(tag));
}

/** The angles that fit a topic, in ANGLE_IDS order. */
export function anglesForTopic(topic: Topic): readonly Angle[] {
  return ANGLES.filter((a) => angleFits(a, topic));
}
