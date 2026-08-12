// Taxonomy, presets and disclosures for the ten lead tools.
//
// This file is the pattern the other meta files follow. Read it before adding a
// tool. docs/TOOLS_ARCHITECTURE.md explains each field.

import type { ToolMeta } from "../types";
import { ANY_BUSINESS, APPOINTMENT_DRIVEN, PHONE_DRIVEN, QUOTE_DRIVEN, merge } from "./shared";

export const LEAD_META: Record<string, ToolMeta> = {
  "missed-call-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["make-money", "capture-leads", "improve-follow-up"],
    industries: PHONE_DRIVEN,
    audiences: ["owners", "managers", "administrators"],
    keywords: [
      "missed calls", "unanswered calls", "phone", "voicemail", "call log", "text back",
      "lost revenue", "answering service", "after hours", "receptionist",
    ],
    synonyms: ["phone call money", "lost call calculator", "call answer rate"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 98,
    seoTitle: "Missed Call Money Calculator: what unanswered calls cost you",
    seoDescription:
      "Enter the calls you miss in a week and what a customer is worth. See the yearly number, and what an instant text-back would recover.",
    assumptions: [
      "Every missed call is treated as a real buying enquiry, at the close rate you enter.",
      "A week is 52 weeks a year, with no seasonal slowdown.",
      "Repeat value is counted at the same average sale, not discounted for time.",
    ],
    relatedSlugs: [
      "missed-call-textback-script",
      "after-hours-lead-calculator",
      "lead-response-time",
      "lead-value-calculator",
    ],
    // One formula, fifteen industries. Presets move the starting numbers and the
    // example, never the math.
    presets: [
      { id: "law", label: "Law firm", industry: "legal", blurb: "Fewer calls, much larger matters, and almost no repeat work in the first year.", values: { missed: 6, closeRate: 25, ticket: 3500, repeats: 1 }, example: "Six missed intake calls a week at a 3,500 dollar average matter." },
      { id: "dental", label: "Dental office", industry: "dental-practice", blurb: "Steady call volume and a patient who comes back twice a year for years.", values: { missed: 8, closeRate: 40, ticket: 450, repeats: 6 }, example: "Eight missed calls a week, 450 dollar average visit, six visits over the relationship." },
      { id: "medical", label: "Medical practice", industry: "medical-practice", blurb: "High call volume, moderate visit value, long patient relationships.", values: { missed: 10, closeRate: 45, ticket: 250, repeats: 8 }, example: "Ten missed calls a week at a 250 dollar average visit." },
      { id: "realtor", label: "Realtor", industry: "real-estate", blurb: "Low volume, high commission, and the first agent to answer usually gets the client.", values: { missed: 5, closeRate: 15, ticket: 7500, repeats: 1 }, example: "Five missed calls a week at a 7,500 dollar average commission." },
      { id: "mortgage", label: "Mortgage lender", industry: "mortgage-lending", blurb: "Rate shoppers call several lenders in one sitting and take the first callback.", values: { missed: 6, closeRate: 20, ticket: 4200, repeats: 1 }, example: "Six missed application calls a week at 4,200 dollars of commission per funded loan." },
      { id: "hvac", label: "HVAC company", industry: "hvac", blurb: "Summer and winter spikes, service calls that turn into replacements.", values: { missed: 9, closeRate: 35, ticket: 450, repeats: 4 }, example: "Nine missed calls a week in season at a 450 dollar average ticket." },
      { id: "plumbing", label: "Plumber", industry: "plumbing", blurb: "Emergency work where the caller does not wait for a callback.", values: { missed: 10, closeRate: 40, ticket: 350, repeats: 3 }, example: "Ten missed calls a week at a 350 dollar average call." },
      { id: "electrical", label: "Electrician", industry: "electrical", blurb: "A mix of small service calls and much larger panel and rewire work.", values: { missed: 7, closeRate: 35, ticket: 400, repeats: 3 } },
      { id: "roofing", label: "Roofer", industry: "roofing", blurb: "Low call volume, very large jobs, and almost never a repeat customer.", values: { missed: 6, closeRate: 20, ticket: 9500, repeats: 1 }, example: "Six missed calls a week at a 9,500 dollar average roof." },
      { id: "restaurant", label: "Restaurant", industry: "restaurant", blurb: "Small tickets, huge repeat value, and a phone that rings during the rush.", values: { missed: 15, closeRate: 55, ticket: 60, repeats: 12 } },
      { id: "salon", label: "Salon", industry: "hair-salon", blurb: "Booking calls during services, with clients who come back every six weeks.", values: { missed: 12, closeRate: 50, ticket: 85, repeats: 8 } },
      { id: "barber", label: "Barbershop", industry: "barbershop", blurb: "Small ticket, very high repeat rate.", values: { missed: 10, closeRate: 55, ticket: 35, repeats: 14 } },
      { id: "security", label: "Security company", industry: "private-security", blurb: "Few enquiries, long contracts, and a slow sales cycle.", values: { missed: 4, closeRate: 25, ticket: 1800, repeats: 2 } },
      { id: "dealership", label: "Auto dealership", industry: "auto-dealership", blurb: "High inbound volume where the caller is already shopping three lots.", values: { missed: 12, closeRate: 20, ticket: 2200, repeats: 2 }, example: "Twelve missed calls a week at 2,200 dollars of front and back gross." },
      { id: "tourism", label: "Tour or attraction", industry: "tourism", blurb: "Seasonal booking calls, party-sized tickets, some repeat visits.", values: { missed: 10, closeRate: 45, ticket: 180, repeats: 2 } },
    ],
  },

  "lead-response-time": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["make-money", "improve-follow-up", "capture-leads"],
    industries: merge(PHONE_DRIVEN, ["saas", "consulting", "marketing-agency", "ecommerce"]),
    audiences: ["owners", "salespeople", "managers"],
    keywords: [
      "response time", "speed to lead", "reply fast", "follow up speed", "first responder",
      "lead decay", "callback", "five minute rule", "inbound leads",
    ],
    synonyms: ["speed to lead calculator", "reply time calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 92,
    seoTitle: "Lead Response Time Calculator: what slow replies cost",
    seoDescription:
      "Compare your real reply time against a five minute reply and see the revenue difference over a year.",
    assumptions: [
      "Contact odds fall on an exponential curve after the first hour, which is the shape the published research shows.",
      "The floor is set at 12 percent, because some leads still convert days later.",
      "Your close rate on the calls you do reach stays the same at every speed.",
    ],
    relatedSlugs: ["missed-call-calculator", "quote-follow-up-calculator", "after-hours-lead-calculator", "missed-call-textback-script"],
    presets: [
      { id: "realtor", label: "Realtor", industry: "real-estate", blurb: "Portal leads go to several agents at once, so minutes decide it.", values: { leads: 60, hours: 6, ticket: 7500, baseClose: 15 } },
      { id: "mortgage", label: "Mortgage lender", industry: "mortgage-lending", blurb: "Rate enquiries are shopped hard and go cold within the hour.", values: { leads: 45, hours: 4, ticket: 4200, baseClose: 20 } },
      { id: "law", label: "Law firm", industry: "legal", blurb: "An injured or arrested caller retains whoever picks up first.", values: { leads: 30, hours: 5, ticket: 3500, baseClose: 25 } },
      { id: "home-services", label: "Home services", industry: "hvac", blurb: "Website forms that sit until the end of the day.", values: { leads: 40, hours: 8, ticket: 850, baseClose: 40 } },
      { id: "b2b", label: "B2B and consulting", industry: "consulting", blurb: "Longer cycle, but the first useful reply still anchors the deal.", values: { leads: 25, hours: 12, ticket: 6000, baseClose: 25 } },
    ],
  },

  "lead-value-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["make-money", "price-a-service", "make-a-decision"],
    industries: merge(PHONE_DRIVEN, ["ecommerce", "saas", "marketing-agency", "consulting", "auto-dealership", "vacation-rental"]),
    audiences: ["owners", "salespeople", "managers"],
    keywords: [
      "lead value", "what is a lead worth", "cost per lead ceiling", "bid cap",
      "marketing budget", "lead economics", "acquisition", "max cpl",
    ],
    synonyms: ["value of a lead", "lead worth calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 90,
    seoTitle: "What Is a Lead Worth? Set the number your ad budget depends on",
    seoDescription:
      "Work out what one lead is worth to your business, and the most you can pay for one and still make money.",
    assumptions: [
      "Lead value is gross profit per lead, not revenue per lead.",
      "Repeat purchases are counted at the same margin as the first sale.",
    ],
    relatedSlugs: ["cost-per-lead-calculator", "customer-lifetime-value", "roas-calculator", "ad-budget-planner"],
    presets: [
      { id: "mortgage", label: "Mortgage lender", industry: "mortgage-lending", blurb: "A funded loan is worth a lot, but most rate enquiries never fund.", values: { closeRate: 15, ticket: 4200, margin: 90, repeat: 0, referral: 0.5, paying: 120 } },
      { id: "realtor", label: "Realtor", industry: "real-estate", blurb: "Low conversion, high commission, and referrals that matter more than repeats.", values: { closeRate: 8, ticket: 7500, margin: 85, repeat: 0, referral: 1, paying: 150 } },
      { id: "roofing", label: "Roofer", industry: "roofing", blurb: "Big jobs, thin margins, and heavy competition on every estimate.", values: { closeRate: 25, ticket: 9500, margin: 30, repeat: 0, referral: 0.5, paying: 90 } },
      { id: "dental", label: "Dental practice", industry: "dental-practice", blurb: "A new patient is worth years of visits, not one appointment.", values: { closeRate: 40, ticket: 450, margin: 60, repeat: 6, referral: 0.5, paying: 70 } },
      { id: "home-services", label: "Home services", industry: "hvac", blurb: "Moderate close rate, real repeat work, and word of mouth that compounds.", values: { closeRate: 35, ticket: 850, margin: 45, repeat: 3, referral: 1, paying: 60 } },
    ],
  },

  "cost-per-lead-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["save-money", "make-a-decision", "capture-leads"],
    industries: merge(PHONE_DRIVEN, ["ecommerce", "saas", "marketing-agency", "auto-dealership", "vacation-rental", "fitness"]),
    audiences: ["owners", "managers", "salespeople"],
    keywords: ["cost per lead", "cpl", "cost per acquisition", "cpa", "ad spend", "marketing cost", "customer acquisition cost", "cac"],
    synonyms: ["cpl calculator", "cost per customer calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 84,
    assumptions: ["Spend covers only the money you paid for the channel, not your own time."],
    relatedSlugs: ["lead-value-calculator", "roas-calculator", "cac-payback-calculator", "ad-budget-planner"],
  },

  "no-show-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["save-money", "improve-follow-up", "make-money"],
    industries: merge(APPOINTMENT_DRIVEN, ["restaurant", "tourism", "auto-repair"]),
    audiences: ["owners", "managers", "administrators", "professionals"],
    keywords: ["no show", "missed appointment", "empty chair", "cancellation", "reminder", "double booking", "schedule gap"],
    synonyms: ["no show cost", "missed appointment calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 80,
    assumptions: ["A no-show slot is treated as fully lost, since it is rarely filled at short notice."],
    relatedSlugs: ["cancellation-policy-generator", "capacity-calculator", "missed-call-calculator", "lead-response-time"],
    presets: [
      { id: "dental", label: "Dental office", industry: "dental-practice", blurb: "Hygiene slots that go empty are the classic version of this problem.", values: { appts: 120, noShow: 12, value: 220, wasted: 1, hourly: 140, reminderLift: 60 } },
      { id: "medical", label: "Medical practice", industry: "medical-practice", blurb: "High volume, and every empty slot still pays the staff.", values: { appts: 300, noShow: 15, value: 160, wasted: 0.5, hourly: 120, reminderLift: 55 } },
      { id: "salon", label: "Salon or barber", industry: "hair-salon", blurb: "A cancelled colour appointment is hours nobody can rebook at short notice.", values: { appts: 160, noShow: 10, value: 95, wasted: 1.5, hourly: 60, reminderLift: 65 } },
      { id: "law", label: "Law firm consult", industry: "legal", blurb: "A missed consultation is an hour of an attorney's day.", values: { appts: 40, noShow: 20, value: 400, wasted: 1, hourly: 250, reminderLift: 50 } },
      { id: "auto", label: "Auto repair", industry: "auto-repair", blurb: "A booked bay with no car in it still costs you the technician.", values: { appts: 80, noShow: 12, value: 320, wasted: 1, hourly: 110, reminderLift: 60 } },
    ],
  },

  "quote-follow-up-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["make-money", "improve-follow-up"],
    // An open loan application and an open insurance quote are the same problem
    // as an open roofing estimate: work sitting on a desk waiting on a call.
    industries: merge(QUOTE_DRIVEN, ["mortgage-lending", "real-estate", "insurance", "auto-dealership", "consulting"]),
    audiences: ["owners", "salespeople", "contractors"],
    keywords: ["unclosed quotes", "open estimates", "follow up", "proposal", "bid", "pipeline", "stale quotes"],
    synonyms: ["estimate follow up calculator", "open quote calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 78,
    assumptions: ["Assumes quoted work is still winnable, which stops being true after a few weeks."],
    relatedSlugs: ["close-rate-calculator", "lead-response-time", "job-price-calculator", "estimate-terms-generator"],
  },

  "close-rate-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["make-money", "make-a-decision"],
    industries: merge(QUOTE_DRIVEN, ["real-estate", "mortgage-lending", "insurance", "auto-dealership", "saas", "consulting"]),
    audiences: ["owners", "salespeople", "managers"],
    keywords: ["close rate", "conversion rate", "win rate", "sales training", "closing ratio", "quote to job"],
    synonyms: ["win rate calculator", "closing ratio calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 76,
    relatedSlugs: ["quote-follow-up-calculator", "lead-value-calculator", "commission-calculator", "job-price-calculator"],
  },

  "lead-goal-planner": {
    domain: "sales-marketing",
    toolType: "planner",
    goals: ["plan-a-project", "make-money", "capture-leads"],
    industries: ANY_BUSINESS,
    audiences: ["owners", "managers", "salespeople"],
    keywords: ["revenue goal", "sales target", "work backward", "quota", "pipeline math", "lead goal", "annual plan"],
    synonyms: ["revenue goal calculator", "sales target planner"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 82,
    assumptions: ["Assumes your close rate and average sale hold as volume goes up, which is optimistic at the top end."],
    relatedSlugs: ["lead-value-calculator", "ad-budget-planner", "capacity-calculator", "break-even-calculator"],
  },

  "capacity-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["plan-a-project", "make-a-decision", "make-money"],
    industries: merge(QUOTE_DRIVEN, APPOINTMENT_DRIVEN, ["trucking", "moving", "logistics"]),
    audiences: ["owners", "managers", "contractors"],
    keywords: ["capacity", "how many jobs", "crew hours", "utilization", "booked out", "workload", "throughput"],
    synonyms: ["job capacity calculator", "crew capacity"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 70,
    relatedSlugs: ["lead-goal-planner", "no-show-calculator", "hire-vs-automate", "employee-true-cost"],
  },

  "after-hours-lead-calculator": {
    domain: "sales-marketing",
    toolType: "calculator",
    goals: ["capture-leads", "make-money", "improve-follow-up"],
    industries: PHONE_DRIVEN,
    audiences: ["owners", "managers"],
    keywords: ["after hours", "nights and weekends", "closed", "answering service", "auto reply", "24 7", "evening leads"],
    synonyms: ["out of hours leads", "weekend leads calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 74,
    relatedSlugs: ["missed-call-calculator", "missed-call-textback-script", "lead-response-time", "voicemail-script-generator"],
  },
};
