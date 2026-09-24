// Post Creator idea engine: what a post can be about.
//
// Every named trade has sixteen topics of its own (five problems, four how-tos,
// three decisions, four looks at the work). The universal topics are the team,
// the story, the town, and how the work goes; the few that assume a service
// trade (hiring a pro, describing the problem) are tagged "trade" and left out
// for "Something else", which could be a bakery. Each service the owner adds
// becomes six more topics through SERVICE_TEMPLATES.
//
// A topic's notes say what else is true of it, so an angle only lands where it
// reads right (types.ts TopicTag): a before and after needs a change you can
// photograph, tool talk needs gear, a seasonal heads-up needs the seasons the
// topic matters in, and so on. A note for a noun that is not in the list
// throws when this module loads, so a typo can never drop a tag quietly.
//
// Topics are plain nouns that read well after "about" or a colon. None names
// a price, a number, or a claim. A topic id is its noun as a slug, so a card
// key stays the same for as long as the wording does.
// Pure data, browser-safe.

import type { TradeId } from "../options";
import type { Season, Topic, TopicKind, TopicTag } from "./types";

/** A noun as an id: lowercase, spaces to "-", only a-z, 0-9, and "-". */
export function topicId(noun: string): string {
  return noun
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

type Note = { tags?: readonly TopicTag[]; seasons?: readonly Season[] };
type Notes = Readonly<Record<string, Note>>;

/** A note: the topic's tags, and the seasons it is worth a heads-up in. */
function n(tags: readonly TopicTag[], seasons?: readonly Season[]): Note {
  return seasons ? { tags, seasons } : { tags };
}

/** A note with seasons only. */
function s(...seasons: Season[]): Note {
  return { seasons };
}

function topics(kind: TopicKind, nouns: readonly string[], notes: Notes): Topic[] {
  return nouns.map((noun) => {
    const note = notes[noun];
    const topic: Topic = { id: topicId(noun), kind, noun };
    if (note?.tags?.length) topic.tags = note.tags;
    if (note?.seasons?.length) topic.seasons = note.seasons;
    return topic;
  });
}

function checked(list: readonly Topic[], notes: Notes, where: string): readonly Topic[] {
  const nouns = new Set(list.map((t) => t.noun));
  for (const noun of Object.keys(notes)) {
    if (!nouns.has(noun)) throw new Error(`Post Creator topic note for "${noun}" in ${where} names no topic`);
  }
  return list;
}

function trade(
  where: string,
  problem: readonly string[],
  howto: readonly string[],
  decision: readonly string[],
  work: readonly string[],
  notes: Notes,
): readonly Topic[] {
  return checked(
    [...topics("problem", problem, notes), ...topics("howto", howto, notes), ...topics("decision", decision, notes), ...topics("work", work, notes)],
    notes,
    where,
  );
}

export const TRADE_TOPICS: Record<Exclude<TradeId, "other">, readonly Topic[]> = {
  roofing: trade(
    "roofing",
    ["missing shingles", "a leak after heavy rain", "granules in the gutters", "sagging gutters", "damage after a hail storm"],
    ["looking over your roof from the ground", "keeping gutters clear", "what to do after a storm", "attic ventilation"],
    ["repairing or replacing a roof", "metal or shingle roofing", "roof inspections"],
    ["what a roof inspection looks like", "tearing off an old roof", "protecting the yard during a job", "the safety gear on a roof"],
    {
      "missing shingles": n(["visible", "early"], ["spring", "fall"]),
      "a leak after heavy rain": n(["visible", "early"], ["spring", "fall"]),
      "granules in the gutters": s("fall"),
      "sagging gutters": n(["visible", "early"], ["fall", "winter"]),
      "damage after a hail storm": n(["visible", "early"], ["spring", "summer"]),
      "looking over your roof from the ground": s("spring", "fall"),
      "keeping gutters clear": s("fall", "spring"),
      "what to do after a storm": s("spring", "summer"),
      "attic ventilation": s("summer", "winter"),
      "repairing or replacing a roof": n(["choice"]),
      "metal or shingle roofing": n(["choice"]),
      "what a roof inspection looks like": n(["visit"]),
      "tearing off an old roof": n(["visit", "visible"]),
      "protecting the yard during a job": n(["visit"]),
      "the safety gear on a roof": n(["gear"]),
    },
  ),
  hvac: trade(
    "hvac",
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
    {
      "an AC that runs but does not cool": n(["early"], ["summer"]),
      "weak airflow from the vents": n(["early"], ["summer", "winter"]),
      "a furnace that will not start": s("fall", "winter"),
      "strange noises from the outdoor unit": n(["early"], ["summer"]),
      "high humidity indoors": n(["early"], ["summer"]),
      "changing an air filter": s("winter", "spring", "summer", "fall"),
      "keeping the outdoor unit clear": s("spring", "fall"),
      "thermostat settings for comfort": s("summer", "winter"),
      "sealing drafts around doors": s("fall", "winter"),
      "repairing or replacing an AC unit": n(["choice"]),
      "what happens during a tune up": n(["visit"]),
      "checking refrigerant lines": n(["visit"]),
      "cleaning a condenser coil": n(["visit", "visible"]),
      "what is in an HVAC tech's truck": n(["gear"]),
    },
  ),
  plumbing: trade(
    "plumbing",
    ["slow drains", "a running toilet", "low water pressure", "water heater noises", "a dripping faucet"],
    [
      "finding your main water shutoff",
      "drain care between cleanings",
      "checking a toilet for a silent leak",
      "protecting pipes in cold weather",
    ],
    ["tank or tankless water heaters", "repairing or replacing a water heater", "water softeners"],
    ["what is in a plumber's truck", "a camera look inside a sewer line", "protecting floors during a job", "how a service call goes"],
    {
      "slow drains": n(["early"]),
      "a running toilet": n(["early"]),
      "low water pressure": n(["early"]),
      "water heater noises": n(["early"], ["fall", "winter"]),
      "a dripping faucet": n(["visible"]),
      "finding your main water shutoff": s("fall", "winter"),
      "protecting pipes in cold weather": s("fall", "winter"),
      "tank or tankless water heaters": n(["choice"]),
      "repairing or replacing a water heater": n(["choice"]),
      "what is in a plumber's truck": n(["gear"]),
      "a camera look inside a sewer line": n(["gear", "visit", "visible"]),
      "protecting floors during a job": n(["visit"]),
      "how a service call goes": n(["visit"]),
    },
  ),
  electrical: trade(
    "electrical",
    ["flickering lights", "a breaker that keeps tripping", "outlets that feel warm", "dead outlets", "a buzzing light switch"],
    ["finding your breaker panel", "testing a GFCI outlet", "surge protection at home", "getting ready for a power outage"],
    ["panel upgrades", "whole home generators", "adding outlets or circuits"],
    [
      "what happens during an electrical inspection",
      "labeling a breaker panel",
      "the tools in an electrician's bag",
      "cleaning up after wiring work",
    ],
    {
      "flickering lights": n(["early"]),
      "a breaker that keeps tripping": s("summer", "winter"),
      "outlets that feel warm": n(["early"]),
      "a buzzing light switch": n(["early"]),
      "surge protection at home": s("spring", "summer"),
      "getting ready for a power outage": s("summer", "winter"),
      "adding outlets or circuits": n(["choice"]),
      "what happens during an electrical inspection": n(["visit"]),
      "labeling a breaker panel": n(["visit", "visible"]),
      "the tools in an electrician's bag": n(["gear"]),
      "cleaning up after wiring work": n(["visit", "visible"]),
    },
  ),
  lawn: trade(
    "lawn",
    ["brown patches in the lawn", "weeds in flower beds", "standing water in the yard", "thin grass under trees", "overgrown shrubs"],
    ["mowing height", "watering the lawn", "mulching flower beds", "leaf cleanup"],
    ["sod or seed", "a sprinkler system", "weekly or every other week mowing"],
    ["what a first visit looks like", "edging a lawn", "the equipment on the trailer", "cleaning up after a job"],
    {
      "brown patches in the lawn": n(["visible", "early"], ["summer"]),
      "weeds in flower beds": n(["visible", "early"], ["spring", "summer"]),
      "standing water in the yard": n(["visible"], ["spring"]),
      "thin grass under trees": n(["visible"], ["spring", "fall"]),
      "overgrown shrubs": n(["visible"], ["spring", "summer"]),
      "mowing height": s("spring", "summer"),
      "watering the lawn": s("summer"),
      "mulching flower beds": s("spring", "fall"),
      "leaf cleanup": s("fall"),
      "sod or seed": n(["choice"]),
      "weekly or every other week mowing": n(["choice"]),
      "what a first visit looks like": n(["visit"]),
      "edging a lawn": n(["visit", "visible"]),
      "the equipment on the trailer": n(["gear"]),
      "cleaning up after a job": n(["visit", "visible"]),
    },
  ),
  cleaning: trade(
    "cleaning",
    ["soap scum in the shower", "dust that keeps coming back", "stained grout", "a greasy stovetop", "pet hair on furniture"],
    ["a weekly cleaning routine", "getting ready for a deep clean", "keeping an entryway tidy", "cleaning a microwave"],
    ["deep cleaning or regular cleaning", "move out cleaning", "how often to book a cleaning"],
    ["what is in the cleaning caddy", "the order a room gets cleaned", "a deep clean from start to finish", "what happens on a first visit"],
    {
      "soap scum in the shower": n(["visible"]),
      "dust that keeps coming back": s("spring"),
      "stained grout": n(["visible"]),
      "a greasy stovetop": n(["visible"]),
      "pet hair on furniture": n(["visible"]),
      "getting ready for a deep clean": s("spring"),
      "keeping an entryway tidy": s("fall", "winter"),
      "deep cleaning or regular cleaning": n(["choice"]),
      "what is in the cleaning caddy": n(["gear"]),
      "the order a room gets cleaned": n(["visit"]),
      "a deep clean from start to finish": n(["visit", "visible"]),
      "what happens on a first visit": n(["visit"]),
    },
  ),
  pest: trade(
    "pest",
    ["ants in the kitchen", "roaches after dark", "signs of termites", "mice in the attic", "wasp nests near the door"],
    ["sealing small gaps around the house", "storing food to keep pests out", "yard habits that draw pests", "getting ready for a treatment"],
    ["a one time treatment or ongoing service", "termite inspections", "treatment options with pets at home"],
    ["what happens during an inspection", "checking a crawl space", "the gear in a pest tech's truck", "follow up visits"],
    {
      "ants in the kitchen": n(["early"], ["spring", "summer"]),
      "roaches after dark": s("summer"),
      "signs of termites": s("spring"),
      "mice in the attic": n(["early"], ["fall", "winter"]),
      "wasp nests near the door": n(["visible", "early"], ["spring", "summer"]),
      "sealing small gaps around the house": s("fall"),
      "yard habits that draw pests": s("spring", "summer"),
      "a one time treatment or ongoing service": n(["choice"]),
      "what happens during an inspection": n(["visit"]),
      "checking a crawl space": n(["visit"]),
      "the gear in a pest tech's truck": n(["gear"]),
      "follow up visits": n(["visit"]),
    },
  ),
  painting: trade(
    "painting",
    ["peeling paint", "cracks in drywall", "stains that bleed through paint", "faded siding", "brush marks on trim"],
    ["choosing a paint sheen", "getting a room ready for painters", "touching up scuffs", "picking paint colors"],
    ["interior or exterior painting first", "paint quality", "cabinet painting"],
    ["the prep work before painting", "taping and covering floors", "cutting in a straight line", "the final walkthrough"],
    {
      "peeling paint": n(["visible", "early"], ["spring", "summer"]),
      "cracks in drywall": n(["visible", "early"]),
      "stains that bleed through paint": n(["visible"]),
      "faded siding": n(["visible"], ["summer"]),
      "brush marks on trim": n(["visible"]),
      "interior or exterior painting first": n(["choice"]),
      "the prep work before painting": n(["visit", "visible"]),
      "taping and covering floors": n(["visit"]),
      "cutting in a straight line": n(["visible"]),
      "the final walkthrough": n(["visit"]),
    },
  ),
  remodeling: trade(
    "remodeling",
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
    {
      "a kitchen that does not work for you": n(["visible"]),
      "a bathroom that feels dated": n(["visible"]),
      "not enough storage": n(["visible"]),
      "soft spots in the floor": n(["early"]),
      "drafty windows": n(["visible"], ["fall", "winter"]),
      "planning a remodel": s("winter"),
      "remodeling or moving": n(["choice"]),
      "demo day": n(["visit", "visible"]),
      "what happens behind the walls": n(["visit"]),
      "keeping dust contained": n(["visit"]),
      "the last look before you move back in": n(["visit", "visible"]),
    },
  ),
  handyman: trade(
    "handyman",
    ["a door that sticks", "loose cabinet hinges", "a wobbly ceiling fan", "small holes in drywall", "cracked caulk around the tub"],
    ["a home maintenance list", "hanging heavy pictures", "weatherstripping a door", "testing smoke alarms"],
    ["fixing it yourself or hiring a handyman", "bundling small jobs", "a honey do list"],
    ["what is in the tool bag", "a day of small repairs", "cleaning up after a job", "how a visit gets scheduled"],
    {
      "small holes in drywall": n(["visible"]),
      "cracked caulk around the tub": n(["visible", "early"]),
      "a home maintenance list": s("spring", "fall"),
      "weatherstripping a door": s("fall", "winter"),
      "testing smoke alarms": s("spring", "fall"),
      "fixing it yourself or hiring a handyman": n(["choice"]),
      "what is in the tool bag": n(["gear"]),
      "a day of small repairs": n(["visit"]),
      "cleaning up after a job": n(["visit", "visible"]),
      "how a visit gets scheduled": n(["visit"]),
    },
  ),
  auto: trade(
    "auto",
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
    {
      "squeaky brakes": n(["visible", "early"]),
      "a car that pulls to one side": n(["early"]),
      "a battery that keeps dying": s("winter"),
      "checking tire pressure": s("fall", "winter"),
      "getting a car ready for a road trip": s("spring", "summer"),
      "repairing or replacing an older car": n(["choice"]),
      "what happens during an inspection": n(["visit"]),
      "a look under the car": n(["visit"]),
      "the tools in the bay": n(["gear"]),
      "how a repair estimate comes together": n(["visit"]),
    },
  ),
  salon: trade(
    "salon",
    ["dry, brittle hair", "a haircut that grew out wrong", "frizz on humid days", "color that fades fast", "split ends"],
    ["washing color treated hair", "styling at home", "getting ready for your appointment", "keeping a cut sharp between visits"],
    ["a big change or a small change", "color or highlights", "booking a regular visit"],
    [
      "what happens during a consultation",
      "cleaning tools between clients",
      "the products at the station",
      "a cut from start to finish",
    ],
    {
      "dry, brittle hair": n(["visible"], ["winter"]),
      "a haircut that grew out wrong": n(["visible"]),
      "frizz on humid days": n(["visible"], ["summer"]),
      "color that fades fast": n(["visible"], ["summer"]),
      "split ends": n(["visible", "early"]),
      "a big change or a small change": n(["choice"]),
      "color or highlights": n(["choice"]),
      "what happens during a consultation": n(["visit"]),
      "the products at the station": n(["gear"]),
      "a cut from start to finish": n(["visit", "visible"]),
    },
  ),
};

const UNIVERSAL_NOTES: Notes = {
  "the owner": n(["self"]),
  "what happens after you reach out": n(["visit"]),
  "how we keep the work area clean": n(["visit"]),
  "what we check before we call it done": n(["visit"]),
  "hiring a pro in our trade": n(["trade"]),
  "doing it yourself or calling a pro": n(["trade", "choice"]),
  "getting a second opinion": n(["trade"]),
  "getting ready before an appointment": n(["trade"]),
  "describing the problem when you reach out": n(["trade"]),
  "keeping records of work done": n(["trade"]),
};

/** Topics every business shares. The ones tagged "trade" are for the named trades only. */
export const UNIVERSAL_TOPICS: readonly Topic[] = checked(
  [
    ...topics(
      "team",
      [
        "the owner",
        "the crew",
        "the newest person on the team",
        "the person who answers the phone",
        "the person who keeps the schedule",
        "the people who keep the office running",
      ],
      UNIVERSAL_NOTES,
    ),
    ...topics("story", ["why we started", "the first job we ever did", "what we care about on every job", "how the business got its name"], UNIVERSAL_NOTES),
    ...topics("local", ["a local spot we love", "a local event coming up", "a local business we admire", "a favorite place to eat in town"], UNIVERSAL_NOTES),
    ...topics(
      "work",
      [
        "what happens after you reach out",
        "how we keep the work area clean",
        "the prep work nobody sees",
        "how we plan a busy day",
        "how we train new people",
        "what we check before we call it done",
      ],
      UNIVERSAL_NOTES,
    ),
    ...topics("decision", ["hiring a pro in our trade", "doing it yourself or calling a pro", "getting a second opinion"], UNIVERSAL_NOTES),
    ...topics(
      "howto",
      ["getting ready before an appointment", "describing the problem when you reach out", "keeping records of work done"],
      UNIVERSAL_NOTES,
    ),
  ],
  UNIVERSAL_NOTES,
  "universal",
);

/**
 * Six topics for each service the owner adds. `{s}` is the service as the
 * owner typed it. The index in this list is part of every service core key,
 * so a template never moves. What a service looks like is not known, so a
 * service topic never gets a before and after, tool talk, or a heads-up; the
 * two looks at the work are steps the customer goes through.
 */
export const SERVICE_TEMPLATES: readonly { kind: TopicKind; template: string; tags?: readonly TopicTag[] }[] = [
  { kind: "problem", template: "signs it is time for {s}" },
  { kind: "howto", template: "getting ready for {s}" },
  { kind: "decision", template: "{s}" },
  { kind: "decision", template: "hiring someone for {s}" },
  { kind: "work", template: "{s}, start to finish", tags: ["visit"] },
  { kind: "work", template: "what {s} includes", tags: ["visit"] },
];
