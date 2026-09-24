// Post Creator idea engine: the twenty angles a post can take.
//
// Each angle fits some topic kinds (a warning sign fits a problem, not a team
// member) and carries its own title, four first lines, two photo ideas, and
// the body lines of the free draft. The body leaves [blanks] for what only the
// owner knows, so the library never states a price, a number, or a claim
// about anyone's business.
//
// The order matches ANGLE_IDS, and the labels come from ANGLE_META (options.ts),
// so the card chip, the AI writer's brief, and this library never drift apart.
// Pure data, browser-safe.

import { ANGLE_META, type AngleId } from "../options";
import type { Angle, TopicKind } from "./types";

const ALL_KINDS: readonly TopicKind[] = ["problem", "howto", "decision", "work", "team", "story", "local"];

function angle(
  id: AngleId,
  kinds: readonly TopicKind[],
  title: string,
  hooks: readonly [string, string, string, string],
  shots: readonly [string, string],
  body: readonly string[],
): Angle {
  const meta = ANGLE_META.find((a) => a.id === id);
  if (!meta) throw new Error(`Unknown Post Creator angle: ${id}`);
  return { id, label: meta.label, kinds, title, hooks, shots, body };
}

export const ANGLES: readonly Angle[] = [
  angle(
    "quick-tip",
    ["problem", "howto", "work"],
    "Quick tip: {topic}",
    [
      "Here is a quick tip about {topic}.",
      "Save this quick tip about {topic}.",
      "Quick tip time: {topic}.",
      "A tip worth knowing about {topic}.",
    ],
    ["A close-up of your hands showing the tip", "You sharing the tip to the camera in one breath"],
    ["[the tip, in one or two plain sentences]", "Not sure it applies to you? Ask us first."],
  ),
  angle(
    "myth-fact",
    ["problem", "howto", "decision"],
    "Myth vs fact: {topic}",
    [
      "There is a lot of mixed advice out there about {topic}.",
      "Myth or fact? Let's talk about {topic}.",
      "Before you believe what you read about {topic}, read this.",
      "Here is a common myth about {topic}.",
    ],
    ["You saying the myth, then the fact, to the camera", "A phone note that says Myth on one line and Fact on the next"],
    ["The myth: [what people often believe].", "The fact: [what is actually true, in a sentence or two]."],
  ),
  angle(
    "people-ask",
    ["problem", "howto", "decision", "work"],
    "A common question about {topic}",
    [
      "People often ask about {topic}, so here is a plain answer.",
      "Question of the week: {topic}.",
      "Wondering about {topic}? You are not the only one.",
      "Here is a straight answer about {topic}.",
    ],
    ["You answering the question on camera in under a minute", "A photo of the part or spot the question is about"],
    ["The question: [the question in a customer's words]", "The answer: [your answer in two or three plain sentences]"],
  ),
  angle(
    "behind-scenes",
    ["work", "team"],
    "Behind the scenes: {topic}",
    [
      "A look behind the scenes: {topic}.",
      "Most people never see this part: {topic}.",
      "Here is a peek behind the curtain: {topic}.",
      "Behind the scenes today: {topic}.",
    ],
    ["A wide photo of the work area or the team", "A short clip of the part most people never see"],
    ["[what you are showing and why it matters]"],
  ),
  angle(
    "before-after",
    ["problem", "work"],
    "Before and after: {topic}",
    [
      "Before and after: {topic}.",
      "Take a look at this before and after on {topic}.",
      "What a difference: {topic}.",
      "From before to after: {topic}.",
    ],
    ["A before photo and an after photo from the same spot", "A short clip that moves from the before to the after"],
    ["Before: [what it looked like].", "After: [what you did, shared with the customer's OK]."],
  ),
  angle(
    "mistake",
    ["problem", "howto", "decision"],
    "A mistake to avoid: {topic}",
    [
      "Here is an easy mistake to avoid with {topic}.",
      "Please skip this common mistake with {topic}.",
      "A mistake that is easy to make with {topic}, and what to do instead.",
      "Save yourself some trouble with {topic}.",
    ],
    ["You pointing to what the mistake looks like", "The wrong way and the right way side by side"],
    ["The mistake: [what people do].", "Do this instead: [the better way]."],
  ),
  angle(
    "checklist",
    ["problem", "howto", "decision"],
    "A short checklist: {topic}",
    [
      "Here is a short checklist for {topic}.",
      "Before you deal with {topic}, check these.",
      "Save this checklist for {topic}.",
      "A simple list to keep handy: {topic}.",
    ],
    ["A handwritten checklist on a clipboard", "A quick clip checking off each item"],
    ["Check: [the first thing to look at]", "Check: [the second thing to look at]", "Anything look off? Ask us."],
  ),
  angle(
    "this-or-that",
    ["decision"],
    "This or that: {topic}",
    [
      "This or that? Let's talk about {topic}.",
      "Trying to decide on {topic}? Here is how to think about it.",
      "A quick comparison: {topic}.",
      "Here is a simple way to choose: {topic}.",
    ],
    ["The two options side by side", "You holding up one option in each hand"],
    ["One way: [when it makes sense].", "The other way: [when it makes sense]."],
  ),
  angle(
    "day-on-job",
    ["work", "team"],
    "A day on the job: {topic}",
    [
      "A day on the job: {topic}.",
      "Come along for part of the day: {topic}.",
      "Today on the job: {topic}.",
      "Here is a slice of a normal day: {topic}.",
    ],
    ["A short clip from the start of the day", "A photo of the team or the shop at the start of the day"],
    ["[what happened today, in your words]"],
  ),
  angle(
    "meet-team",
    ["team"],
    "Meet the team: {topic}",
    [
      "Meet the team: {topic}.",
      "Say hello to {topic}.",
      "Here is someone you might meet: {topic}.",
      "The people behind the work: {topic}.",
    ],
    ["A friendly photo of the person, with their OK", "A short clip of them saying hello"],
    ["[their name and what they do, shared with their OK]", "[one thing they are happy to share about themselves]"],
  ),
  angle(
    "our-story",
    ["story"],
    "Our story: {topic}",
    [
      "A little of our story: {topic}.",
      "Here is something you might not know about us: {topic}.",
      "Our story, in one post: {topic}.",
      "A bit about us: {topic}.",
    ],
    ["An older photo from the early days, if you have one", "You telling the story to the camera"],
    ["[the story, in two or three true sentences]"],
  ),
  angle(
    "local-love",
    ["local"],
    "Local love: {topic}",
    [
      "Some local love today: {topic}.",
      "A shout out close to home: {topic}.",
      "Here is a little local love: {topic}.",
      "Close to home and worth a shout out: {topic}.",
    ],
    ["A photo at the local spot, with permission", "A short clip saying what you like about it"],
    ["[the place or event and why you like it]"],
  ),
  angle(
    "heads-up",
    ["problem", "howto"],
    "{Season} heads-up: {topic}",
    [
      "{Season} is a good time to think about {topic}.",
      "A {season} heads-up about {topic}.",
      "This {season}, keep an eye on {topic}.",
      "A quick {season} reminder about {topic}.",
    ],
    ["A seasonal photo near the thing you are talking about", "You giving the heads-up to the camera"],
    ["[what to watch for this time of year]"],
  ),
  angle(
    "what-to-expect",
    ["work", "decision"],
    "What to expect: {topic}",
    [
      "What to expect: {topic}.",
      "No surprises. Here is how it goes: {topic}.",
      "Thinking it over? Here is what to expect: {topic}.",
      "A plain walk through: {topic}.",
    ],
    ["A photo of each step, in order", "A short clip walking through the first step"],
    ["[the steps, in plain words]", "Questions first? Ask us."],
  ),
  angle(
    "tool-talk",
    ["work"],
    "Tool talk: {topic}",
    [
      "Tool talk: {topic}.",
      "Here is some gear that matters: {topic}.",
      "A closer look at the gear: {topic}.",
      "A quick look at the tools: {topic}.",
    ],
    ["A close-up of the tool", "A short clip of the tool in use"],
    ["[what the tool is and what it does for the job]"],
  ),
  angle(
    "warning-signs",
    ["problem"],
    "Warning signs: {topic}",
    [
      "Here is how to spot {topic} early.",
      "A few signs worth knowing about {topic}.",
      "Could it be {topic}? Here is what to look for.",
      "Catch it early: {topic}.",
    ],
    ["A photo of what the sign looks like", "You pointing out the sign on camera"],
    ["What to look for: [the signs, in plain words]", "Not sure what you are seeing? Ask us."],
  ),
  angle(
    "cost-factors",
    ["decision"],
    "What affects the cost: {topic}",
    [
      "What affects the cost of {topic}? Here is a plain answer.",
      "Wondering what goes into the price of {topic}?",
      "A few things change the price of {topic}.",
      "Here is why prices vary for {topic}.",
    ],
    ["You explaining the price factors at a job", "A photo of the parts or materials that change the price"],
    ["What changes the price: [the two or three things that matter most]", "Want a price for your job? Ask us."],
  ),
  angle(
    "thank-you",
    ["team"],
    "Thank you: {topic}",
    [
      "A big thank you to {topic}.",
      "Today we want to thank {topic}.",
      "Grateful today for {topic}.",
      "A quick thank you to {topic}.",
    ],
    ["A photo of the person or people you are thanking, with their OK", "A short clip saying thank you"],
    ["[what you are thankful for, in your words]"],
  ),
  angle(
    "your-turn",
    ALL_KINDS,
    "Your turn: {topic}",
    [
      "Your turn: what would you like to know about {topic}?",
      "Got a question about {topic}? Ask it below.",
      "Quick question for you about {topic}.",
      "We want to hear from you about {topic}.",
    ],
    ["A photo that sets up the question", "A short clip asking the question to the camera"],
    ["[the question you want people to answer]"],
  ),
  angle(
    "three-steps",
    ["problem", "howto"],
    "Three steps: {topic}",
    [
      "Three simple steps for {topic}.",
      "Keep it simple: three steps for {topic}.",
      "Three steps to keep in mind with {topic}.",
      "Here are three easy steps for {topic}.",
    ],
    ["Three quick photos, one per step", "A short clip showing each step"],
    ["Step one: [the first step]", "Step two: [the second step]", "Step three: ask us if anything looks wrong."],
  ),
];

const BY_ID = new Map<AngleId, Angle>(ANGLES.map((a) => [a.id, a]));

export function angleById(id: AngleId): Angle {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown Post Creator angle: ${id}`);
  return found;
}

/** The angles that fit a topic kind, in ANGLE_IDS order. */
export function anglesForKind(kind: TopicKind): readonly Angle[] {
  return ANGLES.filter((a) => a.kinds.includes(kind));
}
