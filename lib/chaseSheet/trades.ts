// The trade library.
//
// This is the part of Chase Sheet that took the longest to write and is the
// part a copy cannot fake: every message the engine produces is built from the
// vocabulary, the honest reasons, the proof angles, and the seasonal hooks of
// the buyer's own trade. A roofer's day-15 text talks about the next storm
// line; a dentist's talks about the insurance year; a fence company's talks
// about the ground drying out. None of it is a statistic, a promise, or a
// guess about the customer. Each line is something the owner can say because
// it is true of the work.
//
// Rules for every line in here:
//   - No em dashes. No "guarantee". No invented numbers.
//   - "Reasons" are true of the trade, never of the customer's situation.
//   - Seasonal hooks name a season, not a date, so they stay true every year.
//   - Proof lines are templates the owner fills with a real job. The engine
//     never pretends a job happened.
//
// Leaf module: pure data, safe anywhere.

export type Season = "spring" | "summer" | "fall" | "winter";

export type Trade = {
  id: string;
  label: string;
  /** How a quote reads in a sentence: "the roof", "the remodel". Lowercase. */
  jobNoun: string;
  /** Who shows up: "crew", "tech", "team", "installer". */
  worker: string;
  /** Things that are true of the work and cost the customer when they wait. Plain, honest, no fear-selling. */
  reasons: string[];
  /** The kind of proof a customer in this trade actually wants to hear. The owner fills the bracket. */
  proof: string;
  /** One hook per season that is true of the trade every year. */
  seasonal: Record<Season, string>;
  /** Under this amount the sequence is short; above `large` it is long and patient. Cents. */
  bands: { small: number; large: number };
  /** Most quotes in this trade are planned work, need doing soon, or are urgent repairs. */
  urgency: "planned" | "soon" | "urgent";
  /** The objections that come up most in this trade, in the order the owner will hear them. */
  objections: ObjectionId[];
};

export type ObjectionId =
  | "price"
  | "cheaper_quote"
  | "thinking"
  | "spouse"
  | "insurance"
  | "financing"
  | "timing"
  | "diy"
  | "silence";

const ANY: Record<Season, string> = {
  spring: "the spring rush is starting and the calendar fills from the front",
  summer: "summer is the busiest stretch of the year and start dates move out fast",
  fall: "fall is when people get things done before the holidays",
  winter: "winter is the quietest time to get on the schedule quickly",
};

export const TRADES: readonly Trade[] = [
  {
    id: "roofing",
    label: "Roofing",
    jobNoun: "the roof",
    worker: "crew",
    reasons: [
      "A roof that is already letting water in does more damage every time it rains, and the decking under it is the expensive part.",
      "Material prices move with the season and a quote can only hold its number for so long.",
      "Storm season fills every roofer's calendar at once, and the jobs already booked go first.",
    ],
    proof: "We finished a [size or type] roof on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring storms are the season that finds every weak spot in a roof",
      summer: "summer heat is hardest on shingles that are already past their life",
      fall: "fall is the last dry window before winter rain sits on a roof for months",
      winter: "winter is when crews have room on the calendar and can start quickly",
    },
    bands: { small: 150_000, large: 900_000 },
    urgency: "soon",
    objections: ["insurance", "price", "cheaper_quote", "financing", "spouse", "thinking", "silence"],
  },
  {
    id: "hvac",
    label: "HVAC",
    jobNoun: "the system",
    worker: "tech",
    reasons: [
      "A unit that is limping along costs more to run every month it stays in, and it usually quits on the hottest or coldest day.",
      "Equipment pricing and availability change by the season and the quote can only hold so long.",
      "Install slots go first to the people already on the board when the first heat wave or cold snap hits.",
    ],
    proof: "We put a [system type] in for a family on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is the last calm window before the first heat wave books every install slot",
      summer: "summer is when a struggling unit gives up, and the wait for a new one is longest",
      fall: "fall is the easiest time to change a system out, before the heat is needed",
      winter: "winter is when a weak heater shows itself, and installs are quicker to schedule",
    },
    bands: { small: 80_000, large: 800_000 },
    urgency: "soon",
    objections: ["price", "financing", "cheaper_quote", "thinking", "spouse", "timing", "silence"],
  },
  {
    id: "plumbing",
    label: "Plumbing",
    jobNoun: "the plumbing work",
    worker: "plumber",
    reasons: [
      "A slow leak does not stay slow, and the water damage costs more than the fix.",
      "A water heater on its last legs usually fails all at once, and then it is an emergency price instead of a planned one.",
      "Planned work gets a scheduled slot; emergency work gets whatever is left.",
    ],
    proof: "We did a [job type] for a home on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is when the ground shifts and old lines show their age",
      summer: "summer is when water use is highest and weak spots let go",
      fall: "fall is the right time to handle a water heater before the cold makes it work harder",
      winter: "winter freezes find the pipes that were already close to failing",
    },
    bands: { small: 40_000, large: 500_000 },
    urgency: "urgent",
    objections: ["price", "thinking", "cheaper_quote", "diy", "spouse", "timing", "silence"],
  },
  {
    id: "electrical",
    label: "Electrical",
    jobNoun: "the electrical work",
    worker: "electrician",
    reasons: [
      "A panel or a circuit that is already acting up is a safety question, not a convenience question.",
      "Permits and inspections take their own time, so the start date is always later than the yes.",
      "Planned electrical work is scheduled work; a failure is a weekend call at a weekend rate.",
    ],
    proof: "We finished a [panel, rewire, or install] on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is when people add the outdoor and shop circuits they wanted all winter",
      summer: "summer load is the hardest test an old panel gets all year",
      fall: "fall is the calm window to get a panel or a rewire done before the holidays",
      winter: "winter is when space heaters and lights find the weak circuits",
    },
    bands: { small: 40_000, large: 600_000 },
    urgency: "soon",
    objections: ["price", "thinking", "cheaper_quote", "timing", "spouse", "diy", "silence"],
  },
  {
    id: "landscaping",
    label: "Landscaping and lawn",
    jobNoun: "the yard work",
    worker: "crew",
    reasons: [
      "Plant and sod material has a season, and outside of it the work either waits or costs more.",
      "Every week a bed sits unfinished the weeds do more of the work for free.",
      "The calendar fills from the front once the weather turns, and the jobs already booked go first.",
    ],
    proof: "We finished a [beds, sod, drainage, or install] job on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is planting season and the calendar fills the moment the weather breaks",
      summer: "summer heat is hard on new plantings, so the earlier a job starts the better it takes",
      fall: "fall is the best planting window of the year for anything that has to root before summer",
      winter: "winter is when the design and hardscape work gets done ahead of spring",
    },
    bands: { small: 50_000, large: 800_000 },
    urgency: "planned",
    objections: ["price", "thinking", "spouse", "timing", "cheaper_quote", "diy", "silence"],
  },
  {
    id: "fencing",
    label: "Fencing",
    jobNoun: "the fence",
    worker: "crew",
    reasons: [
      "Lumber and post pricing move with the market and a quote can only hold its number for so long.",
      "Wet ground stops fence work cold, so the dry weeks on the calendar are the ones that go first.",
      "A fence that is already leaning is a neighbor conversation and a pet problem waiting to happen.",
    ],
    proof: "We set a [length or type] fence on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is when the ground dries out enough to set posts and everybody wants a fence at once",
      summer: "summer is prime fence season and the calendar runs weeks out",
      fall: "fall is a great time for fence work, with firm ground and cooler days",
      winter: "winter has the shortest wait of the year for a fence crew",
    },
    bands: { small: 150_000, large: 1_000_000 },
    urgency: "planned",
    objections: ["price", "cheaper_quote", "spouse", "thinking", "timing", "diy", "silence"],
  },
  {
    id: "pressure_washing",
    label: "Pressure washing and exterior cleaning",
    jobNoun: "the wash",
    worker: "crew",
    reasons: [
      "Mildew and algae keep growing on a surface until it is cleaned, and the longer it sits the harder it comes off.",
      "A clean exterior is the cheapest curb appeal there is, and it is the first thing a buyer or a guest sees.",
      "Wash days depend on the weather, so the good days fill up first.",
    ],
    proof: "We washed a [house, driveway, or roof] on [street or neighborhood] last week. [One honest sentence about how it looked after.]",
    seasonal: {
      spring: "spring pollen and a winter of grime are exactly what a wash takes off",
      summer: "summer is when the driveway, the patio, and the siding get used and seen the most",
      fall: "fall is the last easy window to clean before the leaves and the wet set in",
      winter: "winter is the quietest time on the wash calendar and the easiest to book",
    },
    bands: { small: 25_000, large: 150_000 },
    urgency: "planned",
    objections: ["price", "thinking", "timing", "diy", "cheaper_quote", "spouse", "silence"],
  },
  {
    id: "remodeling",
    label: "Remodeling and general contracting",
    jobNoun: "the remodel",
    worker: "crew",
    reasons: [
      "Material and cabinet lead times start the day the order is placed, not the day the decision is made.",
      "A remodel calendar is booked in blocks, and a block that goes to another job is gone for weeks.",
      "Every quote is priced on today's material costs, which is why it can only hold its number so long.",
    ],
    proof: "We wrapped a [kitchen, bath, or addition] on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is when most people start a project they want done before summer company",
      summer: "summer is the busiest remodel season and blocks on the calendar go quickly",
      fall: "fall is the window to finish a kitchen or bath before the holidays fill the house",
      winter: "winter is the easiest season to get an interior project scheduled quickly",
    },
    bands: { small: 500_000, large: 3_000_000 },
    urgency: "planned",
    objections: ["price", "financing", "spouse", "thinking", "cheaper_quote", "timing", "silence"],
  },
  {
    id: "painting",
    label: "Painting",
    jobNoun: "the paint job",
    worker: "crew",
    reasons: [
      "Exterior paint that is already failing lets water at the wood underneath, and the wood repair costs more than the paint.",
      "Exterior work needs dry, mild days, so those weeks on the calendar fill first.",
      "A quote is priced on today's material costs and can only hold its number so long.",
    ],
    proof: "We painted a [house exterior or interior] on [street or neighborhood] last week. [One honest sentence about how it turned out.]",
    seasonal: {
      spring: "spring is the start of exterior season and the dry weeks book fast",
      summer: "summer is prime exterior painting weather and the calendar runs long",
      fall: "fall is the last dry stretch for exterior work before winter",
      winter: "winter is interior season, and the quickest time to get a room or a whole house done",
    },
    bands: { small: 60_000, large: 700_000 },
    urgency: "planned",
    objections: ["price", "cheaper_quote", "thinking", "spouse", "timing", "diy", "silence"],
  },
  {
    id: "tree_service",
    label: "Tree service",
    jobNoun: "the tree work",
    worker: "crew",
    reasons: [
      "A dead or leaning tree does not get safer with time, and the next storm decides when it comes down.",
      "Removal after a fall is an emergency price with a crane; removal before is a planned price.",
      "Storm season fills every tree crew's calendar at once, and the jobs already booked go first.",
    ],
    proof: "We took down a [size or type] tree on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring storms are what bring down the trees that were already weak",
      summer: "summer storms and full canopies are the hardest season on a leaning tree",
      fall: "fall is the safest, cleanest season to take a tree down before winter weather",
      winter: "winter is dormant season, the best time for trimming and the easiest to schedule",
    },
    bands: { small: 50_000, large: 400_000 },
    urgency: "soon",
    objections: ["price", "cheaper_quote", "thinking", "spouse", "insurance", "timing", "silence"],
  },
  {
    id: "pest_control",
    label: "Pest control",
    jobNoun: "the treatment",
    worker: "tech",
    reasons: [
      "A pest problem that is visible is already bigger than what is visible, and it grows every week it goes untreated.",
      "Termite and rodent damage is the expensive part; the treatment is the cheap part.",
      "Seasonal surges fill the schedule, and the customers already on the plan get served first.",
    ],
    proof: "We cleared a [pest type] problem for a home on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is swarm season, when termites and ants show up all at once",
      summer: "summer is peak season for everything that bites, stings, and gets in",
      fall: "fall is when rodents look for a warm place, and that place is a house",
      winter: "winter is the season to seal and treat before spring brings everything back",
    },
    bands: { small: 15_000, large: 200_000 },
    urgency: "soon",
    objections: ["price", "thinking", "diy", "cheaper_quote", "spouse", "timing", "silence"],
  },
  {
    id: "cleaning",
    label: "Cleaning services",
    jobNoun: "the cleaning",
    worker: "team",
    reasons: [
      "A first deep clean is what makes every regular visit after it quick, so waiting only makes the first one bigger.",
      "Recurring slots are set by the week, and the good days and times go to the customers already on the schedule.",
      "The quote holds for the scope you described; a bigger mess later is a bigger job later.",
    ],
    proof: "We did a [deep clean, move-out, or recurring] job for a home on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring cleaning season is the busiest stretch of the year for a cleaning schedule",
      summer: "summer is when guests, kids at home, and travel make a clean house hardest to keep",
      fall: "fall is when people get the house ready for the holidays and the schedule fills",
      winter: "winter is the easiest time to get a standing slot on the calendar",
    },
    bands: { small: 15_000, large: 100_000 },
    urgency: "planned",
    objections: ["price", "thinking", "timing", "cheaper_quote", "spouse", "diy", "silence"],
  },
  {
    id: "flooring",
    label: "Flooring",
    jobNoun: "the flooring",
    worker: "installer",
    reasons: [
      "Material orders have lead times, so the floor goes in weeks after the yes, not days.",
      "Flooring prices and availability change by product line, and a quote can only hold so long.",
      "Install blocks are booked in whole days, and a block that goes elsewhere is gone for a while.",
    ],
    proof: "We laid [product or room] flooring for a home on [street or neighborhood] last week. [One honest sentence about how it turned out.]",
    seasonal: {
      spring: "spring is when most flooring projects start, ahead of summer company",
      summer: "summer is the busiest install season and lead times stretch",
      fall: "fall is the window to get floors done before holiday traffic",
      winter: "winter is the quickest season to get an install date",
    },
    bands: { small: 150_000, large: 1_200_000 },
    urgency: "planned",
    objections: ["price", "cheaper_quote", "spouse", "thinking", "financing", "timing", "silence"],
  },
  {
    id: "concrete",
    label: "Concrete and hardscape",
    jobNoun: "the concrete work",
    worker: "crew",
    reasons: [
      "Concrete needs the right weather to pour and cure, so the good weeks on the calendar go first.",
      "Material pricing moves with the season and a quote can only hold its number so long.",
      "A cracked or heaving slab keeps moving, and the repair grows with it.",
    ],
    proof: "We poured a [driveway, patio, or slab] on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is the first good pouring weather and everybody wants in at once",
      summer: "summer is prime pouring season, with early starts to beat the heat",
      fall: "fall is the last dependable pouring window before winter",
      winter: "winter is when the planning happens and the first spring slots get claimed",
    },
    bands: { small: 200_000, large: 1_500_000 },
    urgency: "planned",
    objections: ["price", "cheaper_quote", "spouse", "thinking", "timing", "financing", "silence"],
  },
  {
    id: "garage_doors",
    label: "Garage doors",
    jobNoun: "the door",
    worker: "tech",
    reasons: [
      "A spring or opener that is already failing usually quits with the car inside, and that is a same-day call at a same-day rate.",
      "Door and opener pricing changes by model and the quote can only hold so long.",
      "Install slots are short and get booked quickly.",
    ],
    proof: "We replaced a [door or opener] for a home on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: ANY,
    bands: { small: 40_000, large: 400_000 },
    urgency: "soon",
    objections: ["price", "thinking", "cheaper_quote", "spouse", "diy", "timing", "silence"],
  },
  {
    id: "pool",
    label: "Pool and spa",
    jobNoun: "the pool work",
    worker: "tech",
    reasons: [
      "Equipment that is already struggling costs more to run every month and tends to fail in the heat.",
      "Pool season is short, and the work either gets done before it or during it.",
      "Parts and equipment pricing move with the season and a quote can only hold so long.",
    ],
    proof: "We finished a [pump, heater, resurface, or build] for a home on [street or neighborhood] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is opening season and every pool needs attention at once",
      summer: "summer is when equipment works hardest and a weak part gives up",
      fall: "fall is closing season and the right time for repairs before the cold",
      winter: "winter is when builds and resurfacing get scheduled for a spring finish",
    },
    bands: { small: 60_000, large: 1_500_000 },
    urgency: "planned",
    objections: ["price", "thinking", "financing", "spouse", "cheaper_quote", "timing", "silence"],
  },
  {
    id: "auto_detailing",
    label: "Auto detailing and tint",
    jobNoun: "the detail",
    worker: "team",
    reasons: [
      "Paint damage and interior stains set the longer they sit, and a correction later costs more than a protect now.",
      "Weekend slots go first, and the calendar fills from the front.",
      "A quote holds for the vehicle as described; a rougher car later is a bigger job later.",
    ],
    proof: "We finished a [detail, ceramic, or tint] on a [vehicle] last week. [One honest sentence about how it looked after.]",
    seasonal: {
      spring: "spring is when winter grime comes off and protection goes on before the sun",
      summer: "summer sun is the hardest thing paint and interiors face all year",
      fall: "fall is the right time to protect a vehicle before the wet season",
      winter: "winter is the quietest season on the detail calendar and the easiest to book",
    },
    bands: { small: 15_000, large: 150_000 },
    urgency: "planned",
    objections: ["price", "thinking", "timing", "cheaper_quote", "diy", "spouse", "silence"],
  },
  {
    id: "dental",
    label: "Dental office",
    jobNoun: "the treatment plan",
    worker: "team",
    reasons: [
      "Dental problems do not stay the same size; a small fix today is a bigger one later.",
      "Insurance benefits reset on a calendar, and unused benefits do not carry over.",
      "Appointment blocks for longer treatment are limited and fill first.",
    ],
    proof: "We finished a [crown, implant, or similar case] for a patient last week. [One honest sentence about how it went, with no names.]",
    seasonal: {
      spring: "spring is a good time to use benefits early in the year instead of rushing in December",
      summer: "summer is when schedules are flexible and longer appointments are easier to fit",
      fall: "fall is the last stretch to use this year's benefits before they reset",
      winter: "winter brings a fresh set of benefits and the most open schedule of the year",
    },
    bands: { small: 30_000, large: 500_000 },
    urgency: "soon",
    objections: ["price", "insurance", "financing", "thinking", "spouse", "timing", "silence"],
  },
  {
    id: "med_spa",
    label: "Med spa and aesthetics",
    jobNoun: "the treatment plan",
    worker: "team",
    reasons: [
      "Most treatments work in a series, and the series takes time, so the result date is set by the start date.",
      "Appointment blocks with the provider are limited and fill first.",
      "Package pricing is held for the plan as quoted and can only hold so long.",
    ],
    proof: "We finished a [treatment series] for a client last week. [One honest sentence about how it went, with no names.]",
    seasonal: {
      spring: "spring is when people start a series to be finished by summer",
      summer: "summer is the busiest season and the provider's calendar runs long",
      fall: "fall is the season to start a series to be done by the holidays",
      winter: "winter is the easiest time to get a series scheduled without a wait",
    },
    bands: { small: 30_000, large: 400_000 },
    urgency: "planned",
    objections: ["price", "financing", "thinking", "timing", "spouse", "cheaper_quote", "silence"],
  },
  {
    id: "real_estate",
    label: "Real estate",
    jobNoun: "the listing plan",
    worker: "team",
    reasons: [
      "The market moves every month, and a listing plan priced on today's comparables can only hold so long.",
      "The best listing photos need the best light and the best season for the property.",
      "Buyer demand comes in waves, and a home that is ready for the wave sells; one that is not, waits for the next one.",
    ],
    proof: "We listed a home in [neighborhood] last month. [One honest sentence about how the process went, with no private details.]",
    seasonal: {
      spring: "spring is the strongest listing season of the year and the calendar fills early",
      summer: "summer is when families want to move before school starts",
      fall: "fall buyers are serious buyers, and there is less competition on the market",
      winter: "winter listings face the fewest competing homes of the year",
    },
    bands: { small: 100_000, large: 2_000_000 },
    urgency: "planned",
    objections: ["thinking", "spouse", "timing", "price", "cheaper_quote", "silence", "diy"],
  },
  {
    id: "insurance",
    label: "Insurance agency",
    jobNoun: "the policy quote",
    worker: "team",
    reasons: [
      "A quote is based on today's rates, and rates and eligibility change.",
      "Coverage starts on the effective date, not the decision date, and a gap is a gap.",
      "The application takes its own time to bind, so the yes has to come before the deadline, not on it.",
    ],
    proof: "We moved a family in [town] onto a better-fitting policy last week. [One honest sentence about how it went, with no private details.]",
    seasonal: {
      spring: "spring is storm season, when coverage questions become real",
      summer: "summer is when people buy homes and cars and the coverage has to follow",
      fall: "fall is open enrollment season and rates for the new year are set",
      winter: "winter is when renewals land and the best time to compare before they auto-renew",
    },
    bands: { small: 50_000, large: 500_000 },
    urgency: "soon",
    objections: ["price", "thinking", "spouse", "timing", "cheaper_quote", "silence", "diy"],
  },
  {
    id: "photography",
    label: "Photography and video",
    jobNoun: "the shoot",
    worker: "team",
    reasons: [
      "Dates are the product: once a date is booked by someone else it is gone.",
      "Outdoor work depends on the season and the light, and the best dates go first.",
      "Editing and delivery take their own time after the shoot, so the deadline sets the shoot date.",
    ],
    proof: "We shot a [wedding, brand, or event] in [town] last week. [One honest sentence about how it went.]",
    seasonal: {
      spring: "spring is the start of outdoor season and the best light of the year",
      summer: "summer is the busiest booking season and dates fill months out",
      fall: "fall light and color are what everybody wants and those weekends go first",
      winter: "winter has the most open dates of the year and the shortest wait",
    },
    bands: { small: 50_000, large: 500_000 },
    urgency: "planned",
    objections: ["price", "thinking", "spouse", "timing", "cheaper_quote", "silence", "diy"],
  },
  {
    id: "signs_printing",
    label: "Signs and printing",
    jobNoun: "the signage",
    worker: "team",
    reasons: [
      "Production and permitting have lead times, so the install date is set by the approval date.",
      "Material pricing moves with the market and a quote can only hold its number so long.",
      "A business without its sign up is losing walk-in traffic every day it waits.",
    ],
    proof: "We installed a [sign type] for a business in [town] last week. [One honest sentence about how it went.]",
    seasonal: ANY,
    bands: { small: 50_000, large: 800_000 },
    urgency: "planned",
    objections: ["price", "thinking", "cheaper_quote", "timing", "spouse", "silence", "diy"],
  },
  {
    id: "it_services",
    label: "IT and computer services",
    jobNoun: "the IT work",
    worker: "team",
    reasons: [
      "A system that is already showing problems does not fix itself, and the outage always comes at the worst time.",
      "Hardware and license pricing change, and the quote can only hold so long.",
      "Planned work is scheduled around your business hours; an outage is fixed during them.",
    ],
    proof: "We finished a [migration, network, or backup] project for a business in [town] last week. [One honest sentence about how it went.]",
    seasonal: ANY,
    bands: { small: 50_000, large: 1_000_000 },
    urgency: "soon",
    objections: ["price", "thinking", "timing", "cheaper_quote", "spouse", "diy", "silence"],
  },
  {
    id: "general",
    label: "Other service business",
    jobNoun: "the work",
    worker: "team",
    reasons: [
      "A quote is priced on today's costs and can only hold its number so long.",
      "The calendar fills from the front, and the jobs already booked go first.",
      "The problem the quote solves does not get smaller by waiting.",
    ],
    proof: "We finished a similar job for a customer in [town] last week. [One honest sentence about how it went.]",
    seasonal: ANY,
    bands: { small: 50_000, large: 500_000 },
    urgency: "planned",
    objections: ["price", "thinking", "cheaper_quote", "spouse", "timing", "silence", "diy"],
  },
] as const;

const BY_ID = new Map(TRADES.map((t) => [t.id, t]));

export function getTrade(id: string | null | undefined): Trade {
  return (id && BY_ID.get(id)) || BY_ID.get("general")!;
}

export function isTradeId(id: unknown): id is string {
  return typeof id === "string" && BY_ID.has(id);
}

export const TRADE_OPTIONS = TRADES.map((t) => ({ value: t.id, label: t.label }));

/** Meteorological seasons for the northern hemisphere. Month is 1 to 12. */
export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}
