// Post Creator idea engine: what a post can be about.
//
// Every named trade has sixteen topics of its own (five problems, four how-tos,
// three decisions, four looks at the work). Every business, "Something else"
// included, shares the universal topics: the team, the story, the town, and
// how the work goes. Each service the owner adds becomes six more topics
// through SERVICE_TEMPLATES.
//
// Topics are plain nouns that read well after "about" or a colon. None names
// a price, a number, or a claim. A topic id is its noun as a slug, so a card
// key stays the same for as long as the wording does.
// Pure data, browser-safe.

import type { TradeId } from "../options";
import type { Topic, TopicKind } from "./types";

/** A noun as an id: lowercase, spaces to "-", only a-z, 0-9, and "-". */
export function topicId(noun: string): string {
  return noun
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function topics(kind: TopicKind, nouns: readonly string[]): Topic[] {
  return nouns.map((noun) => ({ id: topicId(noun), kind, noun }));
}

function trade(
  problem: readonly string[],
  howto: readonly string[],
  decision: readonly string[],
  work: readonly string[],
): readonly Topic[] {
  return [...topics("problem", problem), ...topics("howto", howto), ...topics("decision", decision), ...topics("work", work)];
}

export const TRADE_TOPICS: Record<Exclude<TradeId, "other">, readonly Topic[]> = {
  roofing: trade(
    ["missing shingles", "a leak after heavy rain", "granules in the gutters", "sagging gutters", "damage after a hail storm"],
    ["looking over your roof from the ground", "keeping gutters clear", "what to do after a storm", "attic ventilation"],
    ["repairing or replacing a roof", "metal or shingle roofing", "roof inspections"],
    ["what a roof inspection looks like", "tearing off an old roof", "protecting the yard during a job", "the safety gear on a roof"],
  ),
  hvac: trade(
    [
      "an AC that runs but does not cool",
      "weak airflow from the vents",
      "a furnace that will not start",
      "strange noises from the outdoor unit",
      "high humidity indoors",
    ],
    ["changing an air filter", "keeping the outdoor unit clear", "thermostat settings for comfort", "sealing drafts around doors"],
    ["repairing or replacing an AC unit", "heat pumps", "maintenance plans"],
    ["what happens during a tune up", "checking refrigerant lines", "cleaning a condenser coil", "what is in an HVAC tech's truck"],
  ),
  plumbing: trade(
    ["slow drains", "a running toilet", "low water pressure", "water heater noises", "a dripping faucet"],
    [
      "finding your main water shutoff",
      "drain care between cleanings",
      "checking a toilet for a silent leak",
      "protecting pipes in cold weather",
    ],
    ["tank or tankless water heaters", "repairing or replacing a water heater", "water softeners"],
    ["what is in a plumber's truck", "a camera look inside a sewer line", "protecting floors during a job", "how a service call goes"],
  ),
  electrical: trade(
    ["flickering lights", "a breaker that keeps tripping", "outlets that feel warm", "dead outlets", "a buzzing light switch"],
    ["finding your breaker panel", "testing a GFCI outlet", "surge protection at home", "getting ready for a power outage"],
    ["panel upgrades", "whole home generators", "adding outlets or circuits"],
    [
      "what happens during an electrical inspection",
      "labeling a breaker panel",
      "the tools in an electrician's bag",
      "cleaning up after wiring work",
    ],
  ),
  lawn: trade(
    ["brown patches in the lawn", "weeds in flower beds", "standing water in the yard", "thin grass under trees", "overgrown shrubs"],
    ["mowing height", "watering the lawn", "mulching flower beds", "leaf cleanup"],
    ["sod or seed", "a sprinkler system", "weekly or every other week mowing"],
    ["what a first visit looks like", "edging a lawn", "the equipment on the trailer", "cleaning up after a job"],
  ),
  cleaning: trade(
    ["soap scum in the shower", "dust that keeps coming back", "stained grout", "a greasy stovetop", "pet hair on furniture"],
    ["a weekly cleaning routine", "getting ready for a deep clean", "keeping an entryway tidy", "cleaning a microwave"],
    ["deep cleaning or regular cleaning", "move out cleaning", "how often to book a cleaning"],
    ["what is in the cleaning caddy", "the order a room gets cleaned", "a deep clean from start to finish", "what happens on a first visit"],
  ),
  pest: trade(
    ["ants in the kitchen", "roaches after dark", "signs of termites", "mice in the attic", "wasp nests near the door"],
    ["sealing small gaps around the house", "storing food to keep pests out", "yard habits that draw pests", "getting ready for a treatment"],
    ["a one time treatment or ongoing service", "termite inspections", "treatment options with pets at home"],
    ["what happens during an inspection", "checking a crawl space", "the gear in a pest tech's truck", "follow up visits"],
  ),
  painting: trade(
    ["peeling paint", "cracks in drywall", "stains that bleed through paint", "faded siding", "brush marks on trim"],
    ["choosing a paint sheen", "getting a room ready for painters", "touching up scuffs", "picking paint colors"],
    ["interior or exterior painting first", "paint quality", "cabinet painting"],
    ["the prep work before painting", "taping and covering floors", "cutting in a straight line", "the final walkthrough"],
  ),
  remodeling: trade(
    [
      "a kitchen that does not work for you",
      "a bathroom that feels dated",
      "not enough storage",
      "soft spots in the floor",
      "drafty windows",
    ],
    ["planning a remodel", "living at home during a remodel", "setting a remodel budget", "picking finishes"],
    ["remodeling or moving", "bathroom remodels", "open floor plans"],
    ["demo day", "what happens behind the walls", "keeping dust contained", "the last look before you move back in"],
  ),
  handyman: trade(
    ["a door that sticks", "loose cabinet hinges", "a wobbly ceiling fan", "small holes in drywall", "cracked caulk around the tub"],
    ["a home maintenance list", "hanging heavy pictures", "weatherstripping a door", "testing smoke alarms"],
    ["fixing it yourself or hiring a handyman", "bundling small jobs", "a honey do list"],
    ["what is in the tool bag", "a day of small repairs", "cleaning up after a job", "how a visit gets scheduled"],
  ),
  auto: trade(
    [
      "a check engine light",
      "squeaky brakes",
      "a car that pulls to one side",
      "a battery that keeps dying",
      "strange smells from the vents",
    ],
    ["checking tire pressure", "checking your oil", "getting a car ready for a road trip", "what a dashboard light means"],
    ["repairing or replacing an older car", "new tires", "brake jobs"],
    ["what happens during an inspection", "a look under the car", "the tools in the bay", "how a repair estimate comes together"],
  ),
  salon: trade(
    ["dry, brittle hair", "a haircut that grew out wrong", "frizz on humid days", "color that fades fast", "split ends"],
    ["washing color treated hair", "styling at home", "getting ready for your appointment", "keeping a cut sharp between visits"],
    ["a big change or a small change", "color or highlights", "booking a regular visit"],
    [
      "what happens during a consultation",
      "cleaning tools between clients",
      "the products at the station",
      "a cut from start to finish",
    ],
  ),
};

/** Topics every business shares, "Something else" included. */
export const UNIVERSAL_TOPICS: readonly Topic[] = [
  ...topics("team", [
    "the owner",
    "the crew",
    "the newest person on the team",
    "the person who answers the phone",
    "the person who keeps the schedule",
    "the people who keep the office running",
  ]),
  ...topics("story", ["why we started", "the first job we ever did", "what we care about on every job", "how the business got its name"]),
  ...topics("local", ["a local spot we love", "a local event coming up", "a local business we admire", "a favorite place to eat in town"]),
  ...topics("work", [
    "what happens after you reach out",
    "how we keep the work area clean",
    "the prep work nobody sees",
    "how we plan a busy day",
    "how we train new people",
    "what we check before we call it done",
  ]),
  ...topics("decision", ["hiring a pro in our trade", "doing it yourself or calling a pro", "getting a second opinion"]),
  ...topics("howto", ["getting ready before an appointment", "describing the problem when you reach out", "keeping records of work done"]),
];

/**
 * Six topics for each service the owner adds. `{s}` is the service as the
 * owner typed it. The index in this list is part of every service core key,
 * so a template never moves.
 */
export const SERVICE_TEMPLATES: readonly { kind: TopicKind; template: string }[] = [
  { kind: "problem", template: "problems that call for {s}" },
  { kind: "howto", template: "getting ready for {s}" },
  { kind: "decision", template: "{s}" },
  { kind: "decision", template: "hiring someone for {s}" },
  { kind: "work", template: "{s}, start to finish" },
  { kind: "work", template: "what {s} includes" },
];
