// The taxonomy behind the tool library.
//
// Five independent dimensions. A tool has exactly one domain and one tool type,
// and any number of goals, industries and audiences. Keeping them independent is
// what lets one missed-call calculator serve a dentist, a roofer and a law firm
// without becoming three near-identical pages.
//
// Nothing here knows about a specific tool. lib/tools/meta.ts does the mapping.

/* ------------------------------- A. Domain -------------------------------- */

export const DOMAIN_IDS = [
  "business-money",
  "sales-marketing",
  "websites-digital",
  "professional-services",
  "local-services",
  "public-service",
  "medical-ops",
  "education-career",
  "home-family",
  "faith-community",
  "technology-apps",
  "creators-media",
  "outdoors-travel",
] as const;

export type Domain = (typeof DOMAIN_IDS)[number];

export type DomainMeta = {
  label: string;
  /** Plain sentence for the collection page and the filter tooltip. */
  blurb: string;
  /** Ink colour used for the label chip. Must hit 4.5:1 on the tint below. */
  ink: string;
  /** Very light wash behind the chip. */
  tint: string;
  /** Hairline around the chip. */
  line: string;
};

// Every ink value below was checked against its own tint at 4.5:1 or better.
// Restrained, editorial, no neon. See docs/TOOLS_ACCESSIBILITY.md.
export const DOMAINS: Record<Domain, DomainMeta> = {
  "business-money": {
    label: "Business and Money",
    blurb: "Pricing, margin, cash flow and the numbers that decide whether the work was worth doing.",
    ink: "#0B5A33",
    tint: "#0b5a330f",
    line: "#0b5a3330",
  },
  "sales-marketing": {
    label: "Sales and Marketing",
    blurb: "Leads, follow-up, ad spend and the gap between interest and a booked job.",
    ink: "#1240E8",
    tint: "#1240e80f",
    line: "#1240e830",
  },
  "websites-digital": {
    label: "Websites and Digital",
    blurb: "What your site is doing, what it should be doing, and the code to make it do it.",
    ink: "#0E6F96",
    tint: "#0e6f960f",
    line: "#0e6f9630",
  },
  "professional-services": {
    label: "Professional Services",
    blurb: "Billable work, intake, retainers and the admin that surrounds a professional practice.",
    ink: "#5B3BC4",
    tint: "#5b3bc40f",
    line: "#5b3bc430",
  },
  "local-services": {
    label: "Local Services",
    blurb: "Quoting, scheduling and running crews for trades, home services and mobile work.",
    ink: "#9A4A12",
    tint: "#9a4a120f",
    line: "#9a4a1230",
  },
  "public-service": {
    label: "Public Service and Government",
    blurb: "Staffing, planning, readiness and documentation for agencies and public bodies.",
    ink: "#1F4E79",
    tint: "#1f4e790f",
    line: "#1f4e7930",
  },
  "medical-ops": {
    label: "Medical and Healthcare Operations",
    blurb: "Scheduling, capacity, recall and front-office operations. Never diagnosis or treatment.",
    ink: "#0F6E63",
    tint: "#0f6e630f",
    line: "#0f6e6330",
  },
  "education-career": {
    label: "Education and Career",
    blurb: "Classrooms, coursework, applications and the money side of getting qualified.",
    ink: "#8A5A00",
    tint: "#8a5a000f",
    line: "#8a5a0030",
  },
  "home-family": {
    label: "Home and Family",
    blurb: "Household budgets, schedules, care and the planning that keeps a home running.",
    ink: "#A02257",
    tint: "#a022570f",
    line: "#a0225730",
  },
  "faith-community": {
    label: "Faith and Community",
    blurb: "Giving, volunteers, events and follow-up for churches, ministries and nonprofits.",
    ink: "#6B3FA0",
    tint: "#6b3fa00f",
    line: "#6b3fa030",
  },
  "technology-apps": {
    label: "Technology and Applications",
    blurb: "Scope, pricing, retention and release planning for software and app teams.",
    ink: "#155E75",
    tint: "#155e750f",
    line: "#155e7530",
  },
  "creators-media": {
    label: "Creators and Media",
    blurb: "Rates, reach, sponsorships and turning attention into a business.",
    ink: "#B03060",
    tint: "#b030600f",
    line: "#b0306030",
  },
  "outdoors-travel": {
    label: "Outdoors and Travel",
    blurb: "Trips, gear, mileage, yields and the planning that happens before you leave.",
    ink: "#2F6B2F",
    tint: "#2f6b2f0f",
    line: "#2f6b2f30",
  },
};

export const DOMAIN_LIST = DOMAIN_IDS.map((id) => ({ id, ...DOMAINS[id] }));

/* ------------------------------ B. Tool type ------------------------------ */

export const TOOL_TYPE_IDS = [
  "calculator",
  "estimator",
  "generator",
  "planner",
  "builder",
  "checker",
  "scorecard",
  "converter",
  "checklist",
  "template",
  "qr",
  "link",
  "social-preview",
] as const;

export type ToolType = (typeof TOOL_TYPE_IDS)[number];

export const TOOL_TYPES: Record<ToolType, { label: string; blurb: string; verb: string }> = {
  calculator: { label: "Calculator", blurb: "Numbers in, a number out.", verb: "Calculate" },
  estimator: { label: "Estimator", blurb: "A defensible range when the exact figure is not knowable yet.", verb: "Estimate" },
  generator: { label: "Generator", blurb: "Your details in, finished text or code out.", verb: "Generate" },
  planner: { label: "Planner", blurb: "Turns a goal into a schedule you can work.", verb: "Plan" },
  builder: { label: "Builder", blurb: "Assembles a document or page from what you enter.", verb: "Build" },
  checker: { label: "Checker", blurb: "Looks at what you have and tells you what is wrong.", verb: "Check" },
  scorecard: { label: "Scorecard", blurb: "Scores options against each other so you can pick.", verb: "Score" },
  converter: { label: "Converter", blurb: "Turns one unit or format into another.", verb: "Convert" },
  checklist: { label: "Interactive checklist", blurb: "Tick items, get a readiness score and a printable list.", verb: "Work through" },
  template: { label: "Template", blurb: "A starting document you fill in and keep.", verb: "Fill in" },
  qr: { label: "QR tool", blurb: "Makes a scannable code you can print or post.", verb: "Make" },
  link: { label: "Link tool", blurb: "Builds a link that does something when tapped.", verb: "Build" },
  "social-preview": { label: "Image and social preview", blurb: "Controls what people see when your page is shared.", verb: "Preview" },
};

export const TOOL_TYPE_LIST = TOOL_TYPE_IDS.map((id) => ({ id, ...TOOL_TYPES[id] }));

/* -------------------------------- C. Goal --------------------------------- */

export const GOAL_IDS = [
  "make-money",
  "save-money",
  "save-time",
  "price-a-service",
  "quote-a-job",
  "plan-a-project",
  "generate-a-document",
  "create-marketing",
  "capture-leads",
  "improve-follow-up",
  "check-a-website",
  "make-a-decision",
  "prepare-for-an-event",
  "organize-information",
  "share-information",
  "safety-readiness",
] as const;

export type Goal = (typeof GOAL_IDS)[number];

export const GOALS: Record<Goal, { label: string; question: string }> = {
  "make-money": { label: "Make money", question: "Find revenue I am not capturing" },
  "save-money": { label: "Save money", question: "Find money leaving quietly" },
  "save-time": { label: "Save time", question: "Get hours back" },
  "price-a-service": { label: "Price a service", question: "Set a price I can defend" },
  "quote-a-job": { label: "Quote a job", question: "Put a number on a specific job" },
  "plan-a-project": { label: "Plan a project", question: "Turn a goal into a plan" },
  "generate-a-document": { label: "Generate a document", question: "Produce a document I can send" },
  "create-marketing": { label: "Create marketing material", question: "Write or build something to publish" },
  "capture-leads": { label: "Capture leads", question: "Catch more of the people already interested" },
  "improve-follow-up": { label: "Improve follow-up", question: "Stop losing people after first contact" },
  "check-a-website": { label: "Check a website", question: "Find what is broken online" },
  "make-a-decision": { label: "Make a decision", question: "Compare options and pick one" },
  "prepare-for-an-event": { label: "Prepare for an event", question: "Get ready for something on the calendar" },
  "organize-information": { label: "Organize information", question: "Get scattered information into order" },
  "share-information": { label: "Share information", question: "Hand information to other people cleanly" },
  "safety-readiness": { label: "Improve safety and readiness", question: "Be ready before it matters" },
};

export const GOAL_LIST = GOAL_IDS.map((id) => ({ id, ...GOALS[id] }));

/* ------------------------------ D. Industry ------------------------------- */

export const INDUSTRY_IDS = [
  // property and money
  "real-estate",
  "mortgage-lending",
  "insurance",
  "accounting",
  "financial-services",
  // professional
  "legal",
  "consulting",
  "marketing-agency",
  "staffing",
  // health
  "medical-practice",
  "dental-practice",
  "veterinary",
  "home-health",
  "behavioral-health",
  // trades and home services
  "general-contracting",
  "roofing",
  "plumbing",
  "electrical",
  "hvac",
  "landscaping",
  "pest-control",
  "cleaning",
  "remodeling",
  "painting",
  "flooring",
  "concrete",
  "pool-service",
  "handyman",
  // food
  "restaurant",
  "food-truck",
  "catering",
  "bar",
  "coffee-shop",
  // beauty and wellness
  "hair-salon",
  "nail-salon",
  "barbershop",
  "spa",
  "fitness",
  "massage",
  // auto and transport
  "auto-dealership",
  "auto-repair",
  "towing",
  "trucking",
  "moving",
  "logistics",
  // hospitality and travel
  "vacation-rental",
  "hotel",
  "tourism",
  "event-venue",
  "wedding-services",
  // public
  "public-safety",
  "government",
  "fire-ems",
  "law-enforcement",
  "search-rescue",
  "military-veteran",
  // security
  "private-security",
  // education
  "k12-school",
  "higher-education",
  "tutoring",
  "childcare",
  // faith and cause
  "church",
  "nonprofit",
  // commerce and media
  "ecommerce",
  "retail",
  "photography",
  "creator-media",
  "printing",
  // tech
  "saas",
  "it-services",
  "app-development",
  // other trades of business
  "agriculture",
  "ranching",
  "manufacturing",
  "warehousing",
  "construction-supply",
  "pet-services",
  "funeral-services",
  "storage",
  "coworking",
  "franchise",
  "chamber-business-org",
  // personal
  "household",
  "personal-finance",
  "outdoor-recreation",
  "hunting-fishing",
] as const;

export type Industry = (typeof INDUSTRY_IDS)[number];

export type IndustryMeta = {
  label: string;
  /** Extra words people actually type when they mean this industry. */
  aliases: string[];
  domain: Domain;
};

export const INDUSTRIES: Record<Industry, IndustryMeta> = {
  "real-estate": { label: "Real estate", domain: "professional-services", aliases: ["realtor", "realtors", "real estate agent", "broker", "listing", "listings", "home seller", "buyer agent", "property", "mls", "open house"] },
  "mortgage-lending": { label: "Mortgage lending", domain: "professional-services", aliases: ["mortgage", "mortgages", "loan officer", "lender", "lending", "home loan", "refinance", "refi", "piti", "underwriting", "escrow", "fha", "va loan"] },
  insurance: { label: "Insurance", domain: "professional-services", aliases: ["insurance agent", "agency", "policy", "premium", "underwriter", "claims"] },
  accounting: { label: "Accounting and bookkeeping", domain: "business-money", aliases: ["accountant", "bookkeeper", "bookkeeping", "cpa", "payroll", "tax preparer"] },
  "financial-services": { label: "Financial services", domain: "business-money", aliases: ["financial advisor", "wealth", "planner", "investment"] },
  legal: { label: "Legal", domain: "professional-services", aliases: ["lawyer", "lawyers", "attorney", "attorneys", "law firm", "law office", "paralegal", "counsel", "litigation", "case", "client intake"] },
  consulting: { label: "Coaching and consulting", domain: "professional-services", aliases: ["consultant", "coach", "coaching", "advisor", "freelance", "freelancer"] },
  "marketing-agency": { label: "Marketing agency", domain: "sales-marketing", aliases: ["agency", "marketer", "ad agency", "media buyer"] },
  staffing: { label: "Staffing and recruiting", domain: "professional-services", aliases: ["recruiter", "recruiting", "headhunter", "temp agency"] },
  "medical-practice": { label: "Medical practice", domain: "medical-ops", aliases: ["doctor", "doctors", "physician", "clinic", "medical office", "practice", "patient", "patients", "healthcare", "provider", "md", "primary care", "urgent care"] },
  "dental-practice": { label: "Dental practice", domain: "medical-ops", aliases: ["dentist", "dental", "orthodontist", "hygienist", "oral surgeon"] },
  veterinary: { label: "Veterinary", domain: "medical-ops", aliases: ["vet", "veterinarian", "animal hospital"] },
  "home-health": { label: "Home health and care", domain: "medical-ops", aliases: ["home care", "caregiver", "caregiving", "in home care", "hospice", "assisted living"] },
  "behavioral-health": { label: "Behavioral health", domain: "medical-ops", aliases: ["therapist", "counselor", "counseling", "psychologist", "mental health practice"] },
  "general-contracting": { label: "General contracting", domain: "local-services", aliases: ["contractor", "contractors", "gc", "builder", "construction", "job site", "jobsite", "subcontractor"] },
  roofing: { label: "Roofing", domain: "local-services", aliases: ["roofer", "roofers", "roof", "shingle", "shingles", "square", "squares"] },
  plumbing: { label: "Plumbing", domain: "local-services", aliases: ["plumber", "plumbers", "drain", "water heater"] },
  electrical: { label: "Electrical", domain: "local-services", aliases: ["electrician", "electricians", "panel", "wiring"] },
  hvac: { label: "HVAC", domain: "local-services", aliases: ["heating", "air conditioning", "ac", "furnace", "hvac company", "hvac tech"] },
  landscaping: { label: "Landscaping and lawn", domain: "local-services", aliases: ["landscaper", "lawn care", "mowing", "yard", "irrigation", "tree service"] },
  "pest-control": { label: "Pest control", domain: "local-services", aliases: ["exterminator", "termite", "pest"] },
  cleaning: { label: "Cleaning", domain: "local-services", aliases: ["cleaner", "janitorial", "maid", "housekeeping", "commercial cleaning"] },
  remodeling: { label: "Remodeling", domain: "local-services", aliases: ["remodeler", "renovation", "kitchen remodel", "bath remodel"] },
  painting: { label: "Painting", domain: "local-services", aliases: ["painter", "painters", "paint"] },
  flooring: { label: "Flooring", domain: "local-services", aliases: ["floor", "tile", "carpet", "hardwood", "lvp"] },
  concrete: { label: "Concrete", domain: "local-services", aliases: ["slab", "driveway", "foundation", "cubic yard"] },
  "pool-service": { label: "Pool service", domain: "local-services", aliases: ["pool", "pool cleaning", "spa service"] },
  handyman: { label: "Handyman", domain: "local-services", aliases: ["handyman services", "odd jobs", "repairs"] },
  restaurant: { label: "Restaurant", domain: "local-services", aliases: ["restaurants", "diner", "cafe", "kitchen", "menu", "food cost", "server", "front of house", "boh", "foh"] },
  "food-truck": { label: "Food truck", domain: "local-services", aliases: ["food trailer", "mobile food", "concession"] },
  catering: { label: "Catering", domain: "local-services", aliases: ["caterer", "catered event", "banquet"] },
  bar: { label: "Bar and taproom", domain: "local-services", aliases: ["pub", "tavern", "brewery", "pour cost"] },
  "coffee-shop": { label: "Coffee shop", domain: "local-services", aliases: ["cafe", "espresso", "coffee"] },
  "hair-salon": { label: "Hair salon", domain: "local-services", aliases: ["salon", "stylist", "hairdresser", "hair", "colorist"] },
  "nail-salon": { label: "Nail salon", domain: "local-services", aliases: ["nails", "manicure", "pedicure", "nail tech"] },
  barbershop: { label: "Barbershop", domain: "local-services", aliases: ["barber", "barbers", "fade", "haircut"] },
  spa: { label: "Spa and esthetics", domain: "local-services", aliases: ["esthetician", "facial", "med spa", "lashes", "waxing"] },
  fitness: { label: "Gym and fitness", domain: "local-services", aliases: ["gym", "personal trainer", "trainer", "crossfit", "studio", "yoga", "pilates"] },
  massage: { label: "Massage therapy", domain: "local-services", aliases: ["massage therapist", "lmt", "bodywork"] },
  "auto-dealership": { label: "Auto dealership", domain: "local-services", aliases: ["dealer", "dealership", "car lot", "car sales", "f and i"] },
  "auto-repair": { label: "Auto repair", domain: "local-services", aliases: ["mechanic", "shop", "body shop", "tire shop", "oil change", "auto shop"] },
  towing: { label: "Towing and recovery", domain: "local-services", aliases: ["tow truck", "wrecker", "roadside"] },
  trucking: { label: "Trucking", domain: "local-services", aliases: ["truck driver", "owner operator", "cdl", "freight", "per mile"] },
  moving: { label: "Moving", domain: "local-services", aliases: ["movers", "moving company", "relocation"] },
  logistics: { label: "Transportation and logistics", domain: "business-money", aliases: ["dispatch", "fleet", "delivery", "last mile", "courier"] },
  "vacation-rental": { label: "Vacation rental", domain: "outdoors-travel", aliases: ["airbnb", "air bnb", "vrbo", "short term rental", "str", "host", "hosting", "guest", "nightly rate", "turnover"] },
  hotel: { label: "Hotel and lodging", domain: "outdoors-travel", aliases: ["motel", "inn", "bnb", "bed and breakfast", "occupancy", "adr", "revpar"] },
  tourism: { label: "Tourism and attractions", domain: "outdoors-travel", aliases: ["attraction", "tour", "tours", "tour operator", "visitor", "museum", "guide", "excursion", "ticketing"] },
  "event-venue": { label: "Events and venues", domain: "creators-media", aliases: ["venue", "event planner", "conference", "festival", "banquet hall"] },
  "wedding-services": { label: "Wedding services", domain: "creators-media", aliases: ["wedding", "bridal", "wedding planner", "florist", "officiant"] },
  "public-safety": { label: "Public safety", domain: "public-service", aliases: ["first responder", "responder", "emergency services", "911", "dispatch center", "mutual aid"] },
  government: { label: "Government and public administration", domain: "public-service", aliases: ["city", "county", "municipal", "township", "public works", "council", "clerk", "constituent", "public records", "civil service", "agency"] },
  "fire-ems": { label: "Fire and EMS", domain: "public-service", aliases: ["fire department", "firefighter", "ems", "paramedic", "emt", "ambulance", "fire station"] },
  "law-enforcement": { label: "Law enforcement", domain: "public-service", aliases: ["police", "police department", "sheriff", "deputy", "officer", "patrol", "pd", "constable", "trooper"] },
  "search-rescue": { label: "Search and rescue", domain: "public-service", aliases: ["sar", "rescue team", "search team", "ground search", "swiftwater"] },
  "military-veteran": { label: "Military and veteran", domain: "public-service", aliases: ["veteran", "va", "national guard", "reserve", "service member"] },
  "private-security": { label: "Private security", domain: "professional-services", aliases: ["security guard", "guard", "security company", "patrol service", "post orders", "cctv"] },
  "k12-school": { label: "Schools and teachers", domain: "education-career", aliases: ["teacher", "teachers", "school", "classroom", "principal", "district", "pta", "grading", "lesson"] },
  "higher-education": { label: "College and university", domain: "education-career", aliases: ["college", "university", "campus", "professor", "gpa", "tuition", "dorm"] },
  tutoring: { label: "Tutoring and test prep", domain: "education-career", aliases: ["tutor", "test prep", "sat", "act"] },
  childcare: { label: "Childcare and daycare", domain: "home-family", aliases: ["daycare", "preschool", "nanny", "babysitter", "child care"] },
  church: { label: "Churches and ministries", domain: "faith-community", aliases: ["church", "ministry", "pastor", "congregation", "worship", "small group", "youth group", "missions", "tithe", "giving", "sermon"] },
  nonprofit: { label: "Nonprofits", domain: "faith-community", aliases: ["non profit", "501c3", "charity", "donor", "donation", "fundraising", "grant", "volunteer"] },
  ecommerce: { label: "Ecommerce", domain: "business-money", aliases: ["online store", "shopify", "etsy", "amazon seller", "dropship", "sku", "fulfillment"] },
  retail: { label: "Retail", domain: "business-money", aliases: ["store", "shop", "boutique", "gift shop", "point of sale", "pos", "inventory"] },
  photography: { label: "Photography and video", domain: "creators-media", aliases: ["photographer", "videographer", "shoot", "session", "editing", "gallery"] },
  "creator-media": { label: "Creators and media", domain: "creators-media", aliases: ["creator", "influencer", "youtuber", "podcast", "podcaster", "streamer", "content", "sponsorship", "brand deal"] },
  printing: { label: "Print and signage", domain: "creators-media", aliases: ["print shop", "signs", "banner", "vinyl", "embroidery", "screen printing"] },
  saas: { label: "SaaS and software", domain: "technology-apps", aliases: ["software", "subscription business", "arr", "mrr", "churn", "seats", "per seat"] },
  "it-services": { label: "IT services and MSP", domain: "technology-apps", aliases: ["msp", "managed services", "it support", "helpdesk", "sysadmin"] },
  "app-development": { label: "App and product development", domain: "technology-apps", aliases: ["app", "mobile app", "developer", "product manager", "mvp", "sprint", "backlog", "api"] },
  agriculture: { label: "Agriculture", domain: "outdoors-travel", aliases: ["farm", "farmer", "farming", "crop", "acre", "harvest"] },
  ranching: { label: "Ranching and livestock", domain: "outdoors-travel", aliases: ["ranch", "rancher", "cattle", "herd", "hay", "pasture"] },
  manufacturing: { label: "Manufacturing", domain: "business-money", aliases: ["factory", "plant", "production line", "machine shop", "fabrication"] },
  warehousing: { label: "Warehousing", domain: "business-money", aliases: ["warehouse", "distribution", "pick pack", "3pl"] },
  "construction-supply": { label: "Building supply", domain: "business-money", aliases: ["lumber yard", "supply house", "materials"] },
  "pet-services": { label: "Pet services", domain: "local-services", aliases: ["groomer", "grooming", "dog walker", "boarding", "kennel", "pet sitter"] },
  "funeral-services": { label: "Funeral services", domain: "professional-services", aliases: ["funeral home", "mortuary", "cemetery"] },
  storage: { label: "Self storage", domain: "business-money", aliases: ["storage units", "mini storage"] },
  coworking: { label: "Coworking", domain: "business-money", aliases: ["shared office", "flex space", "desk rental"] },
  franchise: { label: "Franchise", domain: "business-money", aliases: ["franchisee", "franchisor", "multi unit"] },
  "chamber-business-org": { label: "Chambers and business groups", domain: "business-money", aliases: ["chamber of commerce", "bni", "networking group", "trade association"] },
  household: { label: "Home and household", domain: "home-family", aliases: ["home", "family", "mom", "moms", "dad", "dads", "parent", "parents", "stay at home", "housewife", "househusband", "homemaker", "kids", "chores", "groceries", "meal", "household budget"] },
  "personal-finance": { label: "Personal finance", domain: "home-family", aliases: ["budget", "budgeting", "debt", "savings", "emergency fund", "paycheck", "credit", "retirement", "student loan"] },
  "outdoor-recreation": { label: "Outdoor recreation", domain: "outdoors-travel", aliases: ["camping", "camp", "hiking", "boating", "boat", "rv", "atv", "trail", "kayak"] },
  "hunting-fishing": { label: "Hunting and fishing", domain: "outdoors-travel", aliases: ["hunter", "hunting", "hunt", "deer", "elk", "angler", "fishing", "fisherman", "tag", "game", "moa", "rifle", "public land"] },
};

export const INDUSTRY_LIST = INDUSTRY_IDS.map((id) => ({ id, ...INDUSTRIES[id] }));

/* ------------------------------ E. Audience ------------------------------- */

export const AUDIENCE_IDS = [
  "owners",
  "managers",
  "salespeople",
  "administrators",
  "contractors",
  "professionals",
  "public-servants",
  "volunteers",
  "teachers",
  "students",
  "parents",
  "caregivers",
  "young-adults",
  "midlife-adults",
  "older-adults",
  "creators",
  "travelers",
  "outdoorspeople",
  "job-seekers",
  "freelancers",
] as const;

export type Audience = (typeof AUDIENCE_IDS)[number];

// Audiences describe the job someone is doing, never an assumed trait. A tool is
// tagged "parents" because it solves a household scheduling problem, not because
// of anything inferred about the person using it.
export const AUDIENCES: Record<Audience, { label: string; aliases: string[] }> = {
  owners: { label: "Business owners", aliases: ["owner", "founder", "self employed", "small business", "entrepreneur", "boss"] },
  managers: { label: "Managers", aliases: ["manager", "supervisor", "team lead", "operations manager", "gm"] },
  salespeople: { label: "Salespeople", aliases: ["sales rep", "sales", "account executive", "closer", "commission"] },
  administrators: { label: "Administrators", aliases: ["admin", "office manager", "assistant", "coordinator", "front desk", "receptionist", "hr"] },
  contractors: { label: "Contractors and trades", aliases: ["tradesman", "crew", "installer", "technician", "subcontractor"] },
  professionals: { label: "Licensed professionals", aliases: ["practitioner", "practice owner", "licensed", "consultant"] },
  "public-servants": { label: "Public servants", aliases: ["civil servant", "first responder", "officer", "official", "public employee"] },
  volunteers: { label: "Volunteers", aliases: ["volunteer", "committee", "board member", "unpaid"] },
  teachers: { label: "Teachers and educators", aliases: ["teacher", "educator", "instructor", "professor", "tutor"] },
  students: { label: "Students", aliases: ["student", "college student", "high school", "undergrad", "grad student", "school"] },
  parents: { label: "Parents and guardians", aliases: ["parent", "mom", "mother", "dad", "father", "guardian", "stay at home parent", "homeschool"] },
  caregivers: { label: "Caregivers", aliases: ["caregiver", "caretaker", "family caregiver", "elder care"] },
  "young-adults": { label: "Young adults", aliases: ["first job", "first apartment", "starting out", "20s", "early career"] },
  "midlife-adults": { label: "Midlife adults", aliases: ["midlife", "40s", "50s", "mid career", "sandwich generation"] },
  "older-adults": { label: "Older adults", aliases: ["retirement", "retired", "senior", "60s", "fixed income"] },
  creators: { label: "Creators", aliases: ["creator", "influencer", "content creator", "streamer", "podcaster"] },
  travelers: { label: "Travelers", aliases: ["traveler", "trip", "vacation", "road trip"] },
  outdoorspeople: { label: "Hunters and outdoorspeople", aliases: ["hunter", "angler", "camper", "outdoorsman", "sportsman"] },
  "job-seekers": { label: "Job seekers", aliases: ["job seeker", "applicant", "resume", "interview", "hiring"] },
  freelancers: { label: "Freelancers", aliases: ["freelance", "solo", "1099", "independent", "side hustle", "gig"] },
};

export const AUDIENCE_LIST = AUDIENCE_IDS.map((id) => ({ id, ...AUDIENCES[id] }));

/* ---------------------------- F. Disclaimers ------------------------------ */

export const DISCLAIMER_IDS = [
  "general-estimate",
  "draft-document",
  "financial",
  "mortgage",
  "tax",
  "legal",
  "medical-ops",
  "public-safety",
  "government",
  "construction",
  "vehicle-towing",
  "hunting-regulations",
] as const;

export type DisclaimerType = (typeof DISCLAIMER_IDS)[number];

export type DisclaimerMeta = {
  label: string;
  body: string;
  /** Shown when a result depends on rules that change. */
  official?: { label: string; url: string }[];
  /** True when the page must stamp the date the user ran it. */
  dateStamp?: boolean;
};

export const DISCLAIMERS: Record<DisclaimerType, DisclaimerMeta> = {
  "general-estimate": {
    label: "This is an estimate",
    body: "This tool returns an estimate based on the numbers you entered. Your real result depends on your own costs, rates and conditions. Check it against your own records before you make a decision with it.",
  },
  "draft-document": {
    label: "A draft, not a final document",
    body: "This tool assembles a working draft from what you entered. Read it once before you send or post it, and change anything that does not sound like you. You are responsible for what you publish.",
  },
  financial: {
    label: "Not financial advice",
    body: "This is an illustration, not personalized financial advice. It does not account for your full financial picture, and nobody here is your financial advisor. Talk to a licensed professional before acting on a number from a free calculator.",
    dateStamp: true,
  },
  mortgage: {
    label: "Not a loan offer",
    body: "This is an estimate, not a quote, pre-approval or commitment to lend. Real terms come from a licensed lender after underwriting, and rates, insurance, taxes and fees change. Confirm every figure with your loan officer.",
    dateStamp: true,
    official: [{ label: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/owning-a-home/" }],
  },
  tax: {
    label: "Not tax advice",
    body: "Tax rules change and vary by state, county and situation. This tool does not know your filing status, deductions or local rates. Confirm anything you plan to file with a tax professional or the current official guidance.",
    dateStamp: true,
    official: [{ label: "IRS", url: "https://www.irs.gov/" }],
  },
  legal: {
    label: "Not legal advice",
    body: "This tool produces a working draft or an organizational aid. It is not legal advice, it does not create an attorney-client relationship, and it does not account for your jurisdiction's rules or deadlines. A licensed attorney in your jurisdiction has to review anything that matters.",
    dateStamp: true,
  },
  "medical-ops": {
    label: "Operations only, not clinical",
    body: "This is a practice operations tool. It does not diagnose, treat, or advise on care, and it must never be used for a clinical decision. Do not enter patient names, dates of birth, record numbers or any other protected health information. Everything you type stays in your browser.",
  },
  "public-safety": {
    label: "Planning aid only",
    body: "This is an administrative planning aid. It does not replace your agency's standard operating procedures, dispatch systems, incident command, medical direction, or official forms. Follow your agency's policy and your chain of command. Do not enter operational details you would not put in an email.",
  },
  government: {
    label: "Planning aid only",
    body: "This is a planning and drafting aid for public bodies. It does not determine legal notice requirements, open meeting compliance, records retention, or procurement rules. Confirm every requirement with your jurisdiction's counsel and current statute.",
    dateStamp: true,
  },
  construction: {
    label: "Verify before you order",
    body: "Material estimates here are planning figures. They do not account for site conditions, code requirements, engineering, or the way your supplier packages product. Measure the actual job and confirm quantities with your supplier before you order or cut.",
  },
  "vehicle-towing": {
    label: "Check your real ratings",
    body: "This worksheet organizes numbers you provide. It does not certify that a load is safe or legal. Use the ratings on your own vehicle door jamb, trailer plate and hitch, and follow your state's towing laws. When the math is close, do not tow.",
    dateStamp: true,
  },
  "hunting-regulations": {
    label: "Regulations change, check the agency",
    body: "This tool does not contain seasons, bag limits, tags or legal methods, and it never guesses them. Those are set by your state or federal agency and change every year. Confirm the current rules with the official agency before you go.",
    dateStamp: true,
  },
};

export const DISCLAIMER_LIST = DISCLAIMER_IDS.map((id) => ({ id, ...DISCLAIMERS[id] }));

/* --------------------------- G. Data sensitivity -------------------------- */

export type DataSensitivity =
  /** Nothing personal. Business numbers only. */
  | "none"
  /** Personal but not regulated: a household budget, a family schedule. */
  | "personal"
  /** Never leaves the browser and must never appear in a shareable URL. */
  | "sensitive";

export const SENSITIVITY_NOTE: Record<DataSensitivity, string> = {
  none: "Runs in your browser. Nothing you type is sent anywhere.",
  personal: "Runs in your browser. Your entries are never uploaded, never saved on our servers, and never put in a shareable link.",
  sensitive: "Runs entirely in your browser. Nothing you type is transmitted, stored, logged or placed in a link. Close the tab and it is gone.",
};

/* ------------------------------- helpers ---------------------------------- */

export const isDomain = (v: string): v is Domain => (DOMAIN_IDS as readonly string[]).includes(v);
export const isToolType = (v: string): v is ToolType => (TOOL_TYPE_IDS as readonly string[]).includes(v);
export const isGoal = (v: string): v is Goal => (GOAL_IDS as readonly string[]).includes(v);
export const isIndustry = (v: string): v is Industry => (INDUSTRY_IDS as readonly string[]).includes(v);
export const isAudience = (v: string): v is Audience => (AUDIENCE_IDS as readonly string[]).includes(v);

export const domainLabel = (d: Domain) => DOMAINS[d].label;
export const industryLabel = (i: Industry) => INDUSTRIES[i].label;
export const audienceLabel = (a: Audience) => AUDIENCES[a].label;
export const goalLabel = (g: Goal) => GOALS[g].label;
export const toolTypeLabel = (t: ToolType) => TOOL_TYPES[t].label;
