// Per-tool artwork metadata for the free tool library.
//
// Every published tool gets one entry here: what the picture is, which visual
// family it belongs to, where the exported assets live, and how the OG card is
// composed. Card and hero art come from the art pipeline (npm run art). The OG
// share card design system is authored in the Figma file "LeadFlow Tools — OG
// Cards" (https://www.figma.com/design/da2xDWeTFFd9HGfcplPAcI) and rendered to
// /public/og/tools by npm run og. scripts/validate-visuals.ts enforces this
// map: every published slug has an entry, no entry points at a missing slug,
// each OG layout family is used at least 5 and at most 13 times, all six
// accents are used near-evenly, and every referenced asset file exists.
//
// Entries are listed in the default directory order. colorAccent is assigned
// per tool from the fixed six-gradient family — deliberate, never randomized —
// and layouts lean toward the tool's subject (device for phone tools,
// document for writers), so the set never reads as one template.

import type { OgLayout, ToolVisual } from "./types";

/** The ten OG composition families, in the order types.ts declares them. */
export const OG_LAYOUTS: OgLayout[] = [
  "scene-right",
  "scene-left",
  "panel-over-scene",
  "band-bottom",
  "split-compare",
  "device",
  "document",
  "big-number",
  "centered",
  "diagram",
];

/**
 * The fixed asset convention plus provenance shared by every entry. Card alt
 * text stays empty on purpose: the card next to the art already carries the
 * tool name and description, so the picture is decorative there.
 */
const art = (slug: string) => ({
  cardImage: `/tools-art/card/${slug}.svg`,
  cardImageAlt: "",
  heroImage: `/tools-art/hero/${slug}.svg`,
  ogImage: `/og/tools/${slug}.jpg`,
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-08-12",
  visualReviewStatus: "review" as const,
});

export const TOOL_VISUALS: Record<string, ToolVisual> = {
  "missed-call-calculator": {
    ...art("missed-call-calculator"),
    visualConcept:
      "A phone stacking up missed business calls while the owner is occupied on a real job, with the missed demand as the subject.",
    visualFamily: "phone-comms",
    primarySubject: "phone full of missed calls",
    supportingSubjects: ["owner busy on a job", "missed call badges"],
    sceneType: "scene",
    composition: "phone right two-thirds, owner small at left, negative space upper left",
    colorAccent: 1,
    ogLayout: "scene-right",
    ogHook: "See what missed calls actually cost you.",
    heroImageAlt:
      "A phone showing several missed business calls while the owner works a job in the background.",
    focalPoint: { x: 0.66, y: 0.5 },
    mobileFocalPoint: { x: 0.58, y: 0.5 },
  },
  "qr-code-maker": {
    ...art("qr-code-maker"),
    visualConcept:
      "A phone scanning a crisp QR code on a storefront counter card, the scan moment caught mid frame.",
    visualFamily: "qr-scan",
    primarySubject: "phone scanning a QR code",
    supportingSubjects: ["counter card", "storefront counter"],
    sceneType: "device",
    composition: "phone and counter card center right, negative space left",
    colorAccent: 2,
    ogLayout: "device",
    ogHook: "Any link, printable in ten seconds.",
    heroImageAlt:
      "A hand holds a phone scanning a QR code printed on a small card standing on a shop counter.",
    focalPoint: { x: 0.6, y: 0.5 },
  },
  "google-review-link": {
    ...art("google-review-link"),
    visualConcept:
      "A customer scanning a review card right after service, with a restrained five star cue above the card.",
    visualFamily: "review-stars",
    primarySubject: "customer scanning a review card",
    supportingSubjects: ["five star row", "service counter"],
    sceneType: "scene",
    composition: "subject right two-thirds, negative space left",
    colorAccent: 3,
    ogLayout: "scene-right",
    ogHook: "One tap takes customers to your review page.",
    heroImageAlt:
      "A customer at a counter scans a small review card with a phone while a row of five stars floats above it.",
    focalPoint: { x: 0.66, y: 0.5 },
    mobileFocalPoint: { x: 0.58, y: 0.5 },
  },
  "rent-receipt": {
    ...art("rent-receipt"),
    visualConcept:
      "A stack of recurring software bills and platform charges feeding into one long annual receipt.",
    visualFamily: "receipt-billing",
    primarySubject: "one long annual receipt",
    supportingSubjects: ["stacked monthly bills", "platform logos as plain chips"],
    sceneType: "still-life",
    composition: "receipt tall at center left, bill stack lower right, headline space upper right",
    colorAccent: 4,
    ogLayout: "document",
    ogHook: "Add up what you pay just to exist online.",
    heroImageAlt:
      "A tall printed receipt lists many recurring software charges while a stack of monthly bills sits beside it.",
    focalPoint: { x: 0.4, y: 0.5 },
  },
  "digital-business-card": {
    ...art("digital-business-card"),
    visualConcept:
      "Two people exchanging contact details through a QR contact card shown on one phone and scanned by the other.",
    visualFamily: "people-scene",
    primarySubject: "two people exchanging contacts",
    supportingSubjects: ["QR contact card on a phone", "saved contact screen"],
    sceneType: "scene",
    composition: "two figures centered, phones meeting in the middle, negative space top",
    colorAccent: 5,
    ogLayout: "device",
    ogHook: "They scan it, you are in their phone.",
    heroImageAlt:
      "Two people hold their phones together while one scans a QR contact card from the other's screen.",
    focalPoint: { x: 0.5, y: 0.55 },
  },
  "hourly-rate-calculator": {
    ...art("hourly-rate-calculator"),
    visualConcept:
      "A working owner weighing billable hours, operating expenses and an invoice beside a wall clock.",
    visualFamily: "money-flow",
    primarySubject: "owner weighing hours and expenses",
    supportingSubjects: ["invoice", "wall clock", "expense slips"],
    sceneType: "scene",
    composition: "owner and desk left third, negative space right",
    colorAccent: 6,
    ogLayout: "scene-left",
    ogHook: "What you actually have to charge per hour.",
    heroImageAlt:
      "A business owner at a desk compares an invoice and expense slips under a wall clock.",
    focalPoint: { x: 0.34, y: 0.5 },
    mobileFocalPoint: { x: 0.42, y: 0.5 },
  },
  "lead-response-time": {
    ...art("lead-response-time"),
    visualConcept:
      "A stopwatch racing incoming lead notifications, with one business answering before the other even looks.",
    visualFamily: "clock-time",
    primarySubject: "stopwatch racing lead notifications",
    supportingSubjects: ["fast responder", "slow responder", "notification cards"],
    sceneType: "comparison",
    composition: "two halves, fast side lit at left, stopwatch center seam",
    colorAccent: 1,
    ogLayout: "split-compare",
    ogHook: "Slow replies are why leads go cold.",
    heroImageAlt:
      "A stopwatch sits between two businesses as one answers a new lead notification and the other lets it wait.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "job-price-calculator": {
    ...art("job-price-calculator"),
    visualConcept:
      "An estimate clipboard laid out beside material samples, a tape measure and handwritten job notes.",
    visualFamily: "toolbox-trade",
    primarySubject: "estimate clipboard",
    supportingSubjects: ["material samples", "tape measure", "job notes"],
    sceneType: "still-life",
    composition: "top-down desk, clipboard center, tools around the edges",
    colorAccent: 2,
    ogLayout: "document",
    ogHook: "Quote a job without guessing.",
    heroImageAlt:
      "A top-down view of an estimate clipboard surrounded by material samples, a tape measure and job notes.",
    focalPoint: { x: 0.5, y: 0.45 },
  },
  "lead-value-calculator": {
    ...art("lead-value-calculator"),
    visualConcept:
      "One lead card moving left to right through quote, sale and repeat customer stages, gaining value at each step.",
    visualFamily: "money-flow",
    primarySubject: "lead card moving through stages",
    supportingSubjects: ["quote stage", "sale stage", "repeat customer stage"],
    sceneType: "diagram",
    composition: "left to right flow, stages evenly spaced, headline space top",
    colorAccent: 3,
    ogLayout: "diagram",
    ogHook: "The number that sets your whole marketing budget.",
    heroImageAlt:
      "A single lead card travels through quote, sale and repeat customer stages, growing in value along the way.",
    focalPoint: { x: 0.5, y: 0.55 },
  },
  "profit-margin-calculator": {
    ...art("profit-margin-calculator"),
    visualConcept:
      "A sale price divided into cost, overhead and actual profit segments on real paperwork.",
    visualFamily: "chart-compare",
    primarySubject: "sale price split into segments",
    supportingSubjects: ["cost block", "overhead block", "profit sliver"],
    sceneType: "still-life",
    composition: "segmented bar on paperwork left third, negative space right",
    colorAccent: 4,
    ogLayout: "scene-left",
    ogHook: "See where every dollar of the sale price goes.",
    heroImageAlt:
      "A printed sale price is divided into labeled cost, overhead and profit segments on a work desk.",
    focalPoint: { x: 0.34, y: 0.5 },
    mobileFocalPoint: { x: 0.42, y: 0.5 },
  },
  "loan-payment-calculator": {
    ...art("loan-payment-calculator"),
    visualConcept:
      "A work truck purchase set beside its payment schedule and the total interest paperwork.",
    visualFamily: "receipt-billing",
    primarySubject: "payment schedule beside a truck",
    supportingSubjects: ["work truck", "total interest line", "signed loan papers"],
    sceneType: "document",
    composition: "schedule document center right, truck small at left, space top",
    colorAccent: 5,
    ogLayout: "document",
    ogTitle: "Loan Payment Calculator",
    ogHook: "The real cost of that truck, machine or loan.",
    heroImageAlt:
      "A loan payment schedule and total interest paperwork sit in front of a parked work truck.",
    focalPoint: { x: 0.6, y: 0.5 },
  },
  "household-budget-planner": {
    ...art("household-budget-planner"),
    visualConcept:
      "A family kitchen table with housing, food, utility and savings categories laid out in tidy stacks.",
    visualFamily: "household",
    primarySubject: "kitchen table budget stacks",
    supportingSubjects: ["housing envelope", "grocery envelope", "savings jar"],
    sceneType: "scene",
    composition: "table scene upper two-thirds, title band bottom",
    colorAccent: 6,
    ogLayout: "band-bottom",
    ogHook: "Where the money actually goes each month.",
    heroImageAlt:
      "A kitchen table holds tidy labeled stacks for housing, food, utilities and savings.",
    focalPoint: { x: 0.5, y: 0.42 },
  },
  "wifi-qr-code": {
    ...art("wifi-qr-code"),
    visualConcept:
      "A guest phone scanning a Wi-Fi QR card standing beside a router on a cafe counter.",
    visualFamily: "qr-scan",
    primarySubject: "phone scanning a Wi-Fi card",
    supportingSubjects: ["router", "cafe counter", "connected checkmark"],
    sceneType: "device",
    composition: "phone and card center right, router at left, space upper left",
    colorAccent: 1,
    ogLayout: "device",
    ogHook: "Stop reading your password out loud.",
    heroImageAlt:
      "A guest scans a Wi-Fi QR card with a phone next to a small router on a cafe counter.",
    focalPoint: { x: 0.6, y: 0.5 },
  },
  "debt-payoff-planner": {
    ...art("debt-payoff-planner"),
    visualConcept:
      "A debt balance shrinking step by step across a payment timeline toward a clear finish line.",
    visualFamily: "money-flow",
    primarySubject: "shrinking debt balance timeline",
    supportingSubjects: ["extra payment marker", "finish line flag"],
    sceneType: "diagram",
    composition: "timeline descending left to right, finish flag right, space top left",
    colorAccent: 2,
    ogLayout: "diagram",
    ogHook: "What paying a little extra actually does.",
    heroImageAlt:
      "A debt balance steps down along a payment timeline until it reaches a finish line flag.",
    focalPoint: { x: 0.55, y: 0.55 },
  },
  "missed-call-textback-script": {
    ...art("missed-call-textback-script"),
    visualConcept:
      "A missed call on a phone answered seconds later by a professional automatic text-back.",
    visualFamily: "phone-comms",
    primarySubject: "missed call turning into a text",
    supportingSubjects: ["missed call banner", "outgoing message bubble"],
    sceneType: "device",
    composition: "phone center, missed call top of screen, reply bubble below",
    colorAccent: 3,
    ogLayout: "device",
    ogTitle: "Text-Back Script Writer",
    ogHook: "The text that saves the call you missed.",
    heroImageAlt:
      "A phone screen shows a missed call banner followed immediately by a professional automatic text reply.",
    focalPoint: { x: 0.5, y: 0.45 },
  },
  "emergency-fund-calculator": {
    ...art("emergency-fund-calculator"),
    visualConcept:
      "A protected home standing behind a visible financial buffer while an unexpected expense arrives.",
    visualFamily: "household",
    primarySubject: "home behind a savings buffer",
    supportingSubjects: ["cushion of stacked months", "storm cloud expense"],
    sceneType: "scene",
    composition: "full-bleed scene, home upper half, headline panel lower half",
    colorAccent: 4,
    ogLayout: "panel-over-scene",
    ogHook: "How much cushion you need, and when.",
    heroImageAlt:
      "A small house stands safely behind a stacked buffer of savings while a storm cloud looms outside it.",
    focalPoint: { x: 0.5, y: 0.35 },
  },
  "markup-vs-margin": {
    ...art("markup-vs-margin"),
    visualConcept:
      "One job priced twice in a clear side by side, markup math on one panel and margin math on the other.",
    visualFamily: "chart-compare",
    primarySubject: "markup and margin side by side",
    supportingSubjects: ["same job ticket", "two price tags"],
    sceneType: "comparison",
    composition: "two equal panels, shared job ticket at center seam",
    colorAccent: 5,
    ogLayout: "split-compare",
    ogHook: "The mix-up that quietly eats your profit.",
    heroImageAlt:
      "The same job ticket is priced two ways side by side, once with markup math and once with margin math.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "website-grader": {
    ...art("website-grader"),
    visualConcept:
      "A laptop and a phone showing the same business website while an inspection checklist grades it.",
    visualFamily: "website-ui",
    primarySubject: "website under inspection",
    supportingSubjects: ["laptop", "phone", "inspection checklist"],
    sceneType: "device",
    composition: "devices left third, checklist overlapping, negative space right",
    colorAccent: 6,
    ogLayout: "scene-left",
    ogHook: "Score your site in two minutes.",
    heroImageAlt:
      "A laptop and phone display the same business website beside a checklist with graded checkmarks.",
    focalPoint: { x: 0.34, y: 0.5 },
    mobileFocalPoint: { x: 0.42, y: 0.5 },
  },
  "roas-calculator": {
    ...art("roas-calculator"),
    visualConcept:
      "An ad creative producing orders and profit, with revenue clearly separated from actual profit at the end of the flow.",
    visualFamily: "money-flow",
    primarySubject: "ad producing orders and profit",
    supportingSubjects: ["ad creative", "order stream", "profit split"],
    sceneType: "diagram",
    composition: "flow left to right, ad at left, split outcome right",
    colorAccent: 1,
    ogLayout: "diagram",
    ogHook: "Find out if the ad money is coming back.",
    heroImageAlt:
      "An ad flows into a stream of orders that splits into revenue and a smaller band of actual profit.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "break-even-calculator": {
    ...art("break-even-calculator"),
    visualConcept:
      "A shop crossing from red operating loss into green break-even territory as sales climb.",
    visualFamily: "storefront",
    primarySubject: "shop crossing into the green",
    supportingSubjects: ["red loss zone", "green zone", "climbing sales line"],
    sceneType: "scene",
    composition: "storefront scene upper two-thirds, title band bottom",
    colorAccent: 2,
    ogLayout: "band-bottom",
    ogHook: "What you have to sell to keep the doors open.",
    heroImageAlt:
      "A small storefront moves along a rising sales line out of a red loss zone into a green zone.",
    focalPoint: { x: 0.5, y: 0.4 },
  },
  "cost-per-lead-calculator": {
    ...art("cost-per-lead-calculator"),
    visualConcept:
      "Advertising spend flowing into leads and then paying customers, with the drop-off visible at each stage.",
    visualFamily: "money-flow",
    primarySubject: "spend narrowing into customers",
    supportingSubjects: ["ad budget", "lead stage", "customer stage"],
    sceneType: "diagram",
    composition: "funnel flow left to right, narrowing steps, space top right",
    colorAccent: 3,
    ogLayout: "diagram",
    ogHook: "What you really pay to win a customer.",
    heroImageAlt:
      "Ad spend flows into a wide group of leads that narrows into a small group of paying customers.",
    focalPoint: { x: 0.5, y: 0.55 },
  },
  "customer-lifetime-value": {
    ...art("customer-lifetime-value"),
    visualConcept:
      "One customer's journey from first sale to repeat purchase, referral and long-term value.",
    visualFamily: "people-scene",
    primarySubject: "customer journey over years",
    supportingSubjects: ["first sale", "repeat visits", "referral friend"],
    sceneType: "scene",
    composition: "subject right two-thirds, journey trail from left",
    colorAccent: 4,
    ogLayout: "scene-right",
    ogHook: "What a customer is worth before they leave.",
    heroImageAlt:
      "A returning customer walks a path marked by a first sale, repeat purchases and a referred friend.",
    focalPoint: { x: 0.66, y: 0.5 },
    mobileFocalPoint: { x: 0.58, y: 0.5 },
  },
  "google-business-profile-scorecard": {
    ...art("google-business-profile-scorecard"),
    visualConcept:
      "A local map listing on a phone showing calls, directions, hours and reviews all in one place.",
    visualFamily: "map-local",
    primarySubject: "local listing on a phone",
    supportingSubjects: ["map pin", "call button", "review stars", "hours row"],
    sceneType: "device",
    composition: "phone center right over a soft map, negative space left",
    colorAccent: 5,
    ogLayout: "device",
    ogHook: "The free listing that outranks your website.",
    heroImageAlt:
      "A phone shows a local business listing with call and directions buttons, opening hours and review stars.",
    focalPoint: { x: 0.62, y: 0.48 },
  },
  "review-request-script": {
    ...art("review-request-script"),
    visualConcept:
      "A customer receiving a short thank-you and review request on their phone right after service.",
    visualFamily: "review-stars",
    primarySubject: "customer reading a review request",
    supportingSubjects: ["thank-you message", "star prompt", "finished job"],
    sceneType: "scene",
    composition: "subject right two-thirds, negative space left",
    colorAccent: 6,
    ogLayout: "scene-right",
    ogHook: "Ask in a way people actually answer.",
    heroImageAlt:
      "A customer reads a friendly thank-you message with a review request on a phone just after a finished job.",
    focalPoint: { x: 0.66, y: 0.5 },
    mobileFocalPoint: { x: 0.58, y: 0.5 },
  },
  "subscription-audit": {
    ...art("subscription-audit"),
    visualConcept:
      "A credit card statement with its recurring charges highlighted and the unnecessary ones pulled out into the open.",
    visualFamily: "receipt-billing",
    primarySubject: "statement with highlighted charges",
    supportingSubjects: ["recurring charge rows", "flagged subscriptions"],
    sceneType: "still-life",
    composition: "statement center, flagged rows lifted right, total large above",
    colorAccent: 1,
    ogLayout: "big-number",
    ogHook: "Everything charging your card every month.",
    heroImageAlt:
      "A card statement shows recurring charges highlighted, with a few flagged subscriptions lifted out beside a large total.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "ad-budget-planner": {
    ...art("ad-budget-planner"),
    visualConcept:
      "A campaign calendar divided into creative testing, learning and scaling phases, each with its own budget share.",
    visualFamily: "schedule-calendar",
    primarySubject: "campaign calendar in phases",
    supportingSubjects: ["testing block", "learning block", "scaling block"],
    sceneType: "scene",
    composition: "calendar scene upper two-thirds, title band bottom",
    colorAccent: 2,
    ogLayout: "band-bottom",
    ogHook: "Work backward from the jobs you want.",
    heroImageAlt:
      "A campaign calendar is divided into testing, learning and scaling phases with a budget share on each.",
    focalPoint: { x: 0.5, y: 0.42 },
  },
  "price-increase-impact": {
    ...art("price-increase-impact"),
    visualConcept:
      "An old and a new price tag balanced against customer volume on one side and increased profit on the other.",
    visualFamily: "chart-compare",
    primarySubject: "old and new price tags",
    supportingSubjects: ["customer count", "profit stack", "balance beam"],
    sceneType: "comparison",
    composition: "two halves, old price left, new price right, beam at center",
    colorAccent: 3,
    ogLayout: "split-compare",
    ogHook: "What raising prices really does.",
    heroImageAlt:
      "An old price tag and a new higher price tag sit on a balance with customer volume and profit stacked beneath them.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "utm-link-builder": {
    ...art("utm-link-builder"),
    visualConcept:
      "Tagged links from social, email, QR and ads converging into one clear analytics view on screen.",
    visualFamily: "website-ui",
    primarySubject: "tagged links converging",
    supportingSubjects: ["social source", "email source", "analytics panel"],
    sceneType: "device",
    composition: "sources fan in from left, analytics screen right two-thirds",
    colorAccent: 4,
    ogLayout: "device",
    ogHook: "Know which ad actually worked.",
    heroImageAlt:
      "Tagged links from social, email, QR and ads flow into a single analytics view on a screen.",
    focalPoint: { x: 0.62, y: 0.5 },
  },
  "childcare-vs-work-calculator": {
    ...art("childcare-vs-work-calculator"),
    visualConcept:
      "A respectful split scene weighing work income and commuting against childcare expense and family time.",
    visualFamily: "household",
    primarySubject: "work and family on two sides",
    supportingSubjects: ["paycheck and commute", "childcare bill", "family time"],
    sceneType: "comparison",
    composition: "two calm halves, home left, workplace right, child at center seam",
    colorAccent: 5,
    ogLayout: "split-compare",
    ogHook: "What a second income is worth after childcare.",
    heroImageAlt:
      "A calm split scene weighs a paycheck and commute on one side against childcare costs and family time on the other.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "lead-goal-planner": {
    ...art("lead-goal-planner"),
    visualConcept:
      "A revenue goal reverse-engineered down into weekly jobs, quotes, conversations and leads.",
    visualFamily: "money-flow",
    primarySubject: "goal breaking into weekly steps",
    supportingSubjects: ["revenue target", "quote count", "lead count"],
    sceneType: "diagram",
    composition: "goal at top right, cascade stepping down to the left",
    colorAccent: 6,
    ogLayout: "diagram",
    ogHook: "Work backward from the number you want.",
    heroImageAlt:
      "A revenue goal at the top cascades down into weekly jobs, quotes, conversations and leads.",
    focalPoint: { x: 0.55, y: 0.45 },
  },
  "review-response-writer": {
    ...art("review-response-writer"),
    visualConcept:
      "An owner calmly drafting a thoughtful public response to a difficult customer review.",
    visualFamily: "review-stars",
    primarySubject: "owner drafting a review reply",
    supportingSubjects: ["one star review card", "measured reply draft"],
    sceneType: "document",
    composition: "reply draft center left, review card pinned above, space right",
    colorAccent: 1,
    ogLayout: "document",
    ogHook: "Answer every review without sounding like a robot.",
    heroImageAlt:
      "An owner writes a calm public reply beneath a difficult one star customer review.",
    focalPoint: { x: 0.42, y: 0.5 },
  },
  "employee-true-cost": {
    ...art("employee-true-cost"),
    visualConcept:
      "An employee's cost layered outward beyond wages with payroll taxes, benefits, equipment and management time.",
    visualFamily: "people-scene",
    primarySubject: "employee cost in layers",
    supportingSubjects: ["wage core", "tax and benefits rings", "equipment"],
    sceneType: "diagram",
    composition: "layered figure centered, labels ringed around, space at corners",
    colorAccent: 2,
    ogLayout: "centered",
    ogHook: "What a hire actually costs you.",
    heroImageAlt:
      "An employee stands at the center of expanding rings labeled wages, payroll taxes, benefits, equipment and management time.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "click-to-call-button": {
    ...art("click-to-call-button"),
    visualConcept:
      "A customer's thumb tapping a large clear call button on a mobile business website.",
    visualFamily: "phone-comms",
    primarySubject: "thumb tapping a call button",
    supportingSubjects: ["mobile business site", "ringing phone icon"],
    sceneType: "device",
    composition: "phone center right, thumb entering from bottom, space left",
    colorAccent: 3,
    ogLayout: "device",
    ogHook: "One tap to your phone, on any website.",
    heroImageAlt:
      "A thumb taps a prominent call button on a small business website shown on a phone.",
    focalPoint: { x: 0.62, y: 0.55 },
  },
  "quarterly-tax-estimator": {
    ...art("quarterly-tax-estimator"),
    visualConcept:
      "An owner moving a slice of each deposit into a separate quarterly tax savings account.",
    visualFamily: "money-flow",
    primarySubject: "deposit slice moving to savings",
    supportingSubjects: ["incoming deposits", "tax savings jar", "quarter markers"],
    sceneType: "scene",
    composition: "full-bleed scene, transfer upper half, headline panel lower half",
    colorAccent: 4,
    ogLayout: "panel-over-scene",
    ogHook: "Stop getting surprised in April.",
    heroImageAlt:
      "A slice of each incoming deposit is set aside into a separate tax savings jar marked by quarters.",
    focalPoint: { x: 0.5, y: 0.35 },
  },
  "salary-to-hourly-converter": {
    ...art("salary-to-hourly-converter"),
    visualConcept:
      "An offer letter placed beside a time clock and the actual weekly hours the job really takes.",
    visualFamily: "clock-time",
    primarySubject: "offer letter beside a time clock",
    supportingSubjects: ["weekly hours tally", "punch cards"],
    sceneType: "still-life",
    composition: "letter and clock centered, hours tally between them",
    colorAccent: 5,
    ogLayout: "centered",
    ogHook: "What a salary is really worth per hour.",
    heroImageAlt:
      "A job offer letter sits beside a time clock and a tally of the real hours worked each week.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "discount-damage-calculator": {
    ...art("discount-damage-calculator"),
    visualConcept:
      "A discount tag visibly cutting into the thin profit portion of a sale.",
    visualFamily: "money-flow",
    primarySubject: "discount tag cutting profit",
    supportingSubjects: ["sale price bar", "thin profit sliver"],
    sceneType: "diagram",
    composition: "price bar center, tag slicing the profit end, big figure above",
    colorAccent: 6,
    ogLayout: "big-number",
    ogHook: "What that 10 percent off really costs.",
    heroImageAlt:
      "A discount tag slices into the small profit portion at the end of a sale price bar.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "no-show-calculator": {
    ...art("no-show-calculator"),
    visualConcept:
      "An empty appointment chair beside a reserved sign while the clock keeps running.",
    visualFamily: "schedule-calendar",
    primarySubject: "empty appointment chair",
    supportingSubjects: ["reserved sign", "running wall clock", "open slot"],
    sceneType: "scene",
    composition: "full-bleed scene, chair upper left of center, headline panel lower half",
    colorAccent: 1,
    ogLayout: "panel-over-scene",
    ogHook: "Empty chairs are not free.",
    heroImageAlt:
      "An empty appointment chair with a reserved sign waits under a wall clock that keeps running.",
    focalPoint: { x: 0.45, y: 0.35 },
  },
  "rent-affordability-estimator": {
    ...art("rent-affordability-estimator"),
    visualConcept:
      "Apartment keys beside take-home income, monthly obligations and a simple rent affordability gauge.",
    visualFamily: "household",
    primarySubject: "apartment keys and rent gauge",
    supportingSubjects: ["take-home pay", "monthly bills", "gauge needle"],
    sceneType: "still-life",
    composition: "keys and gauge centered, income and bills flanking, space top",
    colorAccent: 2,
    ogLayout: "centered",
    ogHook: "What you can actually carry each month.",
    heroImageAlt:
      "Apartment keys rest beside a paycheck, a small stack of bills and a gauge showing an affordable rent range.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "website-speed-money": {
    ...art("website-speed-money"),
    visualConcept:
      "A slow-loading mobile website with visitors walking away while a stopwatch keeps counting.",
    visualFamily: "website-ui",
    primarySubject: "slow site losing visitors",
    supportingSubjects: ["loading spinner", "departing visitors", "stopwatch"],
    sceneType: "scene",
    composition: "full-bleed scene, phone upper left, leavers drifting right, panel lower half",
    colorAccent: 3,
    ogLayout: "panel-over-scene",
    ogHook: "Every extra second costs you customers.",
    heroImageAlt:
      "Visitors walk away from a phone stuck on a loading spinner while a stopwatch counts the seconds.",
    focalPoint: { x: 0.4, y: 0.35 },
  },
  "owner-hourly-worth": {
    ...art("owner-hourly-worth"),
    visualConcept:
      "An owner weighing low-value admin work against high-value selling and leadership work.",
    visualFamily: "clock-time",
    primarySubject: "owner between two kinds of work",
    supportingSubjects: ["admin paperwork pile", "handshake sale", "hour price tags"],
    sceneType: "comparison",
    composition: "two halves, admin left, high-value right, owner at center seam",
    colorAccent: 4,
    ogLayout: "split-compare",
    ogHook: "The number that tells you what to stop doing.",
    heroImageAlt:
      "An owner stands between a pile of admin paperwork and a high-value sales handshake, each with an hourly price tag.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "cash-runway-calculator": {
    ...art("cash-runway-calculator"),
    visualConcept:
      "Cash reserves stretching month by month along a runway toward the horizon.",
    visualFamily: "money-flow",
    primarySubject: "cash stretching down a runway",
    supportingSubjects: ["month markers", "horizon line", "reserve stack"],
    sceneType: "scene",
    composition: "runway scene upper two-thirds receding right, title band bottom",
    colorAccent: 5,
    ogLayout: "band-bottom",
    ogHook: "How many months you can survive.",
    heroImageAlt:
      "A runway marked with months stretches toward the horizon as a stack of cash thins along the way.",
    focalPoint: { x: 0.5, y: 0.4 },
  },
  "grocery-unit-price-calculator": {
    ...art("grocery-unit-price-calculator"),
    visualConcept:
      "Two grocery package sizes side by side with an honest shelf unit-price comparison between them.",
    visualFamily: "kitchen-food",
    primarySubject: "two package sizes compared",
    supportingSubjects: ["shelf unit-price tags", "grocery shelf"],
    sceneType: "comparison",
    composition: "two packages on a shelf, unit tags below, seam at center",
    colorAccent: 6,
    ogLayout: "split-compare",
    ogHook: "Which size is actually the better deal.",
    heroImageAlt:
      "A small and a large grocery package sit side by side on a shelf with unit-price tags beneath each.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "platform-fee-calculator": {
    ...art("platform-fee-calculator"),
    visualConcept:
      "A marketplace payout with the platform's percentage visibly removed before the seller is paid.",
    visualFamily: "receipt-billing",
    primarySubject: "payout minus platform cut",
    supportingSubjects: ["gross sale", "fee slice", "seller deposit"],
    sceneType: "diagram",
    composition: "payout flow left to right, fee slice lifted out, big figure right",
    colorAccent: 1,
    ogLayout: "big-number",
    ogTitle: "Platform Fee Calculator",
    ogHook: "What the middleman takes off every job.",
    heroImageAlt:
      "A marketplace payout moves toward a seller while a percentage slice is lifted out along the way.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "sms-link-generator": {
    ...art("sms-link-generator"),
    visualConcept:
      "A single tap opening a text message that is already correctly prefilled on the phone.",
    visualFamily: "phone-comms",
    primarySubject: "prefilled text opening",
    supportingSubjects: ["tapped link", "ready-to-send message"],
    sceneType: "device",
    composition: "phone center right with open message, tap ripple left of it",
    colorAccent: 2,
    ogLayout: "device",
    ogHook: "A link that opens a text, already written.",
    heroImageAlt:
      "A tapped link opens a phone messaging app with the text message already written and ready to send.",
    focalPoint: { x: 0.62, y: 0.48 },
  },
  "email-signature-generator": {
    ...art("email-signature-generator"),
    visualConcept:
      "A professional email signature rendered cleanly in an email on both a desktop and a phone.",
    visualFamily: "document-draft",
    primarySubject: "email signature on two screens",
    supportingSubjects: ["desktop email window", "phone email view"],
    sceneType: "device",
    composition: "screens right two-thirds, signature highlighted, space left",
    colorAccent: 3,
    ogLayout: "scene-right",
    ogHook: "Every email you send is an ad.",
    heroImageAlt:
      "The same professional email signature appears at the bottom of an email on a desktop monitor and a phone.",
    focalPoint: { x: 0.66, y: 0.5 },
    mobileFocalPoint: { x: 0.58, y: 0.5 },
  },
  "overtime-cost-calculator": {
    ...art("overtime-cost-calculator"),
    visualConcept:
      "A night shift time clock and payroll sheet showing what recurring overtime really costs.",
    visualFamily: "clock-time",
    primarySubject: "night shift time clock",
    supportingSubjects: ["payroll sheet", "time and a half rows", "dark window"],
    sceneType: "still-life",
    composition: "clock and payroll sheet left of center, big figure right",
    colorAccent: 4,
    ogLayout: "big-number",
    ogHook: "What time and a half is really doing to you.",
    heroImageAlt:
      "A time clock punched late at night sits beside a payroll sheet with overtime rows adding up.",
    focalPoint: { x: 0.45, y: 0.5 },
  },
  "review-goal-calculator": {
    ...art("review-goal-calculator"),
    visualConcept:
      "A business star rating climbing from its current average toward a target, with the review count doing the lifting.",
    visualFamily: "review-stars",
    primarySubject: "star rating climbing to target",
    supportingSubjects: ["current average", "target marker", "new review cards"],
    sceneType: "diagram",
    composition: "rating dial centered, review cards stacking beneath it",
    colorAccent: 5,
    ogLayout: "centered",
    ogHook: "How many reviews it takes to move your stars.",
    heroImageAlt:
      "A star rating dial climbs from its current average toward a target as new review cards stack up beneath it.",
    focalPoint: { x: 0.5, y: 0.45 },
  },
  "quote-follow-up-calculator": {
    ...art("quote-follow-up-calculator"),
    visualConcept:
      "A pile of sent estimates waiting for follow-up, with the unclosed revenue plainly visible on top.",
    visualFamily: "document-draft",
    primarySubject: "pile of waiting estimates",
    supportingSubjects: ["sent stamps", "unclosed revenue figure", "quiet phone"],
    sceneType: "still-life",
    composition: "estimate pile lower left, large unclosed figure upper right",
    colorAccent: 6,
    ogLayout: "big-number",
    ogHook: "The money already sitting on your desk.",
    heroImageAlt:
      "A pile of sent estimates sits untouched on a desk beneath a large figure of unclosed revenue.",
    focalPoint: { x: 0.4, y: 0.55 },
  },
  "cancellation-policy-generator": {
    ...art("cancellation-policy-generator"),
    visualConcept:
      "An appointment calendar protected by a clearly marked cancellation window and deposit policy.",
    visualFamily: "schedule-calendar",
    primarySubject: "calendar behind a policy",
    supportingSubjects: ["cancellation window", "deposit stamp", "policy sheet"],
    sceneType: "document",
    composition: "policy sheet center left over a calendar, space right",
    colorAccent: 1,
    ogLayout: "document",
    ogTitle: "Cancellation Policy Writer",
    ogHook: "Protect the time you set aside.",
    heroImageAlt:
      "A written cancellation policy with a deposit stamp shields an appointment calendar behind it.",
    focalPoint: { x: 0.42, y: 0.5 },
  },
  "conversion-lift-calculator": {
    ...art("conversion-lift-calculator"),
    visualConcept:
      "The same stream of traffic producing more customers after the conversion path is improved.",
    visualFamily: "chart-compare",
    primarySubject: "same traffic, more customers",
    supportingSubjects: ["before funnel", "after funnel", "visitor stream"],
    sceneType: "comparison",
    composition: "two funnels side by side, identical inflow, wider outflow right",
    colorAccent: 2,
    ogLayout: "split-compare",
    ogHook: "What one more percent is worth.",
    heroImageAlt:
      "Two funnels receive the same stream of visitors, and the improved one on the right lets more customers through.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "commission-calculator": {
    ...art("commission-calculator"),
    visualConcept:
      "A sale's revenue split transparently into cost, company profit and the salesperson's commission.",
    visualFamily: "money-flow",
    primarySubject: "revenue split three ways",
    supportingSubjects: ["cost share", "company share", "commission share"],
    sceneType: "diagram",
    composition: "single sale at left branching into three labeled streams right",
    colorAccent: 3,
    ogLayout: "diagram",
    ogHook: "Build a commission plan that keeps your margin.",
    heroImageAlt:
      "Revenue from one sale branches into three labeled streams for cost, company profit and commission.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "sales-tax-calculator": {
    ...art("sales-tax-calculator"),
    visualConcept:
      "A printed receipt showing subtotal, tax and total, with a restrained Texas cue in the corner.",
    visualFamily: "receipt-billing",
    primarySubject: "receipt with tax line",
    supportingSubjects: ["subtotal line", "tax line", "small Texas outline"],
    sceneType: "document",
    composition: "receipt center left, tax line highlighted, space right",
    colorAccent: 4,
    ogLayout: "document",
    ogHook: "Add it, back it out, or split the invoice.",
    heroImageAlt:
      "A printed receipt lists subtotal, sales tax and total, with a small Texas outline in the corner.",
    focalPoint: { x: 0.42, y: 0.5 },
  },
  "bad-review-impact": {
    ...art("bad-review-impact"),
    visualConcept:
      "A single one star review dragging down a whole field of positive reviews around it.",
    visualFamily: "review-stars",
    primarySubject: "one star dragging the average",
    supportingSubjects: ["field of positive reviews", "falling average figure"],
    sceneType: "diagram",
    composition: "dark review card center left, bright field behind, figure right",
    colorAccent: 5,
    ogLayout: "big-number",
    ogHook: "What one angry customer costs you.",
    heroImageAlt:
      "A single one star review card pulls the rating down amid a field of positive reviews.",
    focalPoint: { x: 0.42, y: 0.5 },
  },
  "credit-card-fee-calculator": {
    ...art("credit-card-fee-calculator"),
    visualConcept:
      "A card transaction at a terminal with a small percentage quietly shaved off every sale.",
    visualFamily: "receipt-billing",
    primarySubject: "card tap losing a sliver",
    supportingSubjects: ["payment terminal", "fee sliver", "sales stream"],
    sceneType: "device",
    composition: "terminal and card center right, fee slivers drifting left",
    colorAccent: 6,
    ogLayout: "device",
    ogHook: "The 3 percent nobody puts on a spreadsheet.",
    heroImageAlt:
      "A customer taps a card on a payment terminal while a thin sliver of each sale drifts away as a fee.",
    focalPoint: { x: 0.6, y: 0.5 },
  },
  "close-rate-calculator": {
    ...art("close-rate-calculator"),
    visualConcept:
      "The same volume of leads producing noticeably more won jobs once the close rate improves.",
    visualFamily: "chart-compare",
    primarySubject: "same leads, more wins",
    supportingSubjects: ["lead column", "before wins", "after wins"],
    sceneType: "comparison",
    composition: "two panels, equal lead stacks, taller win stack right",
    colorAccent: 1,
    ogLayout: "split-compare",
    ogHook: "What five more points is worth.",
    heroImageAlt:
      "Two panels show the same stack of leads, with the right panel converting visibly more of them into won jobs.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "estimate-terms-generator": {
    ...art("estimate-terms-generator"),
    visualConcept:
      "A signed estimate with deposit, scope, validity and change-order clauses laid out in order.",
    visualFamily: "document-draft",
    primarySubject: "signed estimate with clauses",
    supportingSubjects: ["deposit clause", "scope section", "signature line"],
    sceneType: "document",
    composition: "estimate document center left, clause tabs down its edge, space right",
    colorAccent: 2,
    ogLayout: "document",
    ogHook: "The paragraph that prevents the argument.",
    heroImageAlt:
      "A signed estimate displays neat sections for deposit, scope, validity and change orders.",
    focalPoint: { x: 0.42, y: 0.5 },
  },
  "payment-plan-calculator": {
    ...art("payment-plan-calculator"),
    visualConcept:
      "One large invoice broken into a deposit and a row of clear monthly payments.",
    visualFamily: "money-flow",
    primarySubject: "invoice split into payments",
    supportingSubjects: ["deposit block", "monthly payment row", "calendar ticks"],
    sceneType: "diagram",
    composition: "large invoice left, steps breaking off to the right",
    colorAccent: 3,
    ogLayout: "diagram",
    ogHook: "Turn a scary price into a yes.",
    heroImageAlt:
      "A large invoice breaks apart into a deposit and a row of equal monthly payments marching to the right.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "form-friction-calculator": {
    ...art("form-friction-calculator"),
    visualConcept:
      "A long form losing visitors at every extra field while a short form completes beside it.",
    visualFamily: "website-ui",
    primarySubject: "long form versus short form",
    supportingSubjects: ["abandoning visitors", "completed short form"],
    sceneType: "comparison",
    composition: "two forms side by side, drop-offs left, checkmark right",
    colorAccent: 4,
    ogLayout: "split-compare",
    ogHook: "Every extra field costs you leads.",
    heroImageAlt:
      "Visitors abandon a long form field by field while a short form beside it gets completed.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "meeting-cost-calculator": {
    ...art("meeting-cost-calculator"),
    visualConcept:
      "A conference room clock with a live cost meter climbing while the meeting keeps running.",
    visualFamily: "clock-time",
    primarySubject: "meeting cost meter climbing",
    supportingSubjects: ["conference table", "wall clock", "attendees"],
    sceneType: "scene",
    composition: "meter large upper right, meeting scene lower left",
    colorAccent: 5,
    ogLayout: "big-number",
    ogHook: "What that recurring meeting really costs.",
    heroImageAlt:
      "A cost meter climbs above a conference table of attendees as the wall clock moves on.",
    focalPoint: { x: 0.6, y: 0.42 },
  },
  "mileage-deduction-calculator": {
    ...art("mileage-deduction-calculator"),
    visualConcept:
      "A work vehicle's route across town with the business miles properly logged along the way.",
    visualFamily: "route-vehicle",
    primarySubject: "logged business route",
    supportingSubjects: ["work vehicle", "route line", "mileage log"],
    sceneType: "diagram",
    composition: "route winding left to right, log sheet lower right corner",
    colorAccent: 6,
    ogLayout: "diagram",
    ogHook: "The deduction most owners under-claim.",
    heroImageAlt:
      "A work vehicle travels a marked route across town while a mileage log records each business trip.",
    focalPoint: { x: 0.5, y: 0.45 },
  },
  "meta-title-description-writer": {
    ...art("meta-title-description-writer"),
    visualConcept:
      "An accurate search result preview with its title and description lengths measured against the limits.",
    visualFamily: "search-seo",
    primarySubject: "measured search result preview",
    supportingSubjects: ["title length ruler", "description snippet", "cursor"],
    sceneType: "document",
    composition: "result preview center left, length rulers beneath, space right",
    colorAccent: 1,
    ogLayout: "document",
    ogHook: "The line Google shows before anybody clicks.",
    heroImageAlt:
      "A search result preview shows a page title and description with small rulers measuring their length.",
    focalPoint: { x: 0.42, y: 0.5 },
  },
  "after-hours-lead-calculator": {
    ...art("after-hours-lead-calculator"),
    visualConcept:
      "An incoming customer inquiry lighting up a phone beside a business that is closed for the night.",
    visualFamily: "phone-comms",
    primarySubject: "phone lighting up at night",
    supportingSubjects: ["closed sign", "dark storefront", "inquiry bubble"],
    sceneType: "scene",
    composition: "bright phone center right, dark storefront left, closed sign visible",
    colorAccent: 2,
    ogLayout: "device",
    ogHook: "Most people shop when you are closed.",
    heroImageAlt:
      "A phone glows with a new customer inquiry outside a dark storefront with a closed sign in the window.",
    focalPoint: { x: 0.62, y: 0.5 },
  },
  "late-payment-language": {
    ...art("late-payment-language"),
    visualConcept:
      "An overdue invoice paired with a short professional reminder sequence ready to send.",
    visualFamily: "document-draft",
    primarySubject: "overdue invoice and reminders",
    supportingSubjects: ["overdue stamp", "reminder letters in sequence"],
    sceneType: "document",
    composition: "invoice at left, three reminder notes stepping right",
    colorAccent: 3,
    ogLayout: "document",
    ogHook: "Get paid without the awkward phone call.",
    heroImageAlt:
      "An overdue invoice sits beside a sequence of three short, polite payment reminder letters.",
    focalPoint: { x: 0.45, y: 0.5 },
  },
  "late-invoice-calculator": {
    ...art("late-invoice-calculator"),
    visualConcept:
      "Aging invoices opening a visible cash gap across the weeks of a calendar.",
    visualFamily: "receipt-billing",
    primarySubject: "aging invoices and cash gap",
    supportingSubjects: ["calendar weeks", "unpaid stack", "gap figure"],
    sceneType: "still-life",
    composition: "invoice stack left, widening gap across calendar, figure right",
    colorAccent: 4,
    ogLayout: "big-number",
    ogHook: "What people owing you money actually costs.",
    heroImageAlt:
      "A stack of aging invoices sits over a calendar as a cash gap widens week by week.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "cost-per-mile-calculator": {
    ...art("cost-per-mile-calculator"),
    visualConcept:
      "A work truck ringed by fuel, insurance, repairs, tires and depreciation, all pointing at the odometer.",
    visualFamily: "route-vehicle",
    primarySubject: "truck ringed by costs",
    supportingSubjects: ["odometer", "fuel pump", "tire and wrench"],
    sceneType: "still-life",
    composition: "truck centered, cost icons ringed around, odometer forward",
    colorAccent: 5,
    ogLayout: "centered",
    ogHook: "What your truck really costs to run.",
    heroImageAlt:
      "A work truck sits at the center of a ring of fuel, insurance, repair, tire and depreciation icons around its odometer.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "seo-traffic-value": {
    ...art("seo-traffic-value"),
    visualConcept:
      "Search results steering a stream of earned visitors straight into a local business storefront.",
    visualFamily: "search-seo",
    primarySubject: "search traffic entering a storefront",
    supportingSubjects: ["result listings", "visitor stream", "open door"],
    sceneType: "scene",
    composition: "storefront right two-thirds, stream arriving from results at left",
    colorAccent: 6,
    ogLayout: "scene-right",
    ogTitle: "What Your Rankings Are Worth",
    ogHook: "Put a price on showing up in search.",
    heroImageAlt:
      "A stream of visitors flows from a page of search results into the open door of a local storefront.",
    focalPoint: { x: 0.66, y: 0.5 },
    mobileFocalPoint: { x: 0.58, y: 0.5 },
  },
  "admin-time-audit": {
    ...art("admin-time-audit"),
    visualConcept:
      "An owner buried in quoting, invoicing and scheduling paperwork while the clock runs on.",
    visualFamily: "people-scene",
    primarySubject: "owner buried in paperwork",
    supportingSubjects: ["quote pile", "invoice pile", "running clock"],
    sceneType: "scene",
    composition: "full-bleed scene, owner upper half amid piles, headline panel lower half",
    colorAccent: 1,
    ogLayout: "panel-over-scene",
    ogHook: "What paperwork is costing you.",
    heroImageAlt:
      "An owner sits surrounded by piles of quotes, invoices and schedules while a clock ticks overhead.",
    focalPoint: { x: 0.5, y: 0.35 },
  },
  "job-post-writer": {
    ...art("job-post-writer"),
    visualConcept:
      "An owner publishing a clear hiring ad and watching qualified applicants come back in reply.",
    visualFamily: "document-draft",
    primarySubject: "hiring ad drawing applicants",
    supportingSubjects: ["posted ad", "applicant cards", "owner at desk"],
    sceneType: "scene",
    composition: "owner and posted ad left third, applicant cards arriving from right",
    colorAccent: 2,
    ogLayout: "scene-left",
    ogHook: "Write a hiring ad people actually answer.",
    heroImageAlt:
      "An owner posts a clear hiring ad as a handful of qualified applicant cards arrive in response.",
    focalPoint: { x: 0.34, y: 0.5 },
    mobileFocalPoint: { x: 0.42, y: 0.5 },
  },
  "mobile-traffic-loss": {
    ...art("mobile-traffic-loss"),
    visualConcept:
      "A broken mobile website turning visitors away one after another before they ever call.",
    visualFamily: "website-ui",
    primarySubject: "broken site turning visitors away",
    supportingSubjects: ["misrendered page", "departing visitors", "tiny tap targets"],
    sceneType: "device",
    composition: "phone with broken layout center right, leavers drifting left",
    colorAccent: 3,
    ogLayout: "device",
    ogHook: "Most of your visitors are on a phone.",
    heroImageAlt:
      "A phone shows a broken, misrendered business website as visitors turn and walk away from it.",
    focalPoint: { x: 0.62, y: 0.5 },
  },
  "task-automation-savings": {
    ...art("task-automation-savings"),
    visualConcept:
      "One repeated manual task transformed into a connected workflow that runs on its own.",
    visualFamily: "clock-time",
    primarySubject: "manual task becoming a workflow",
    supportingSubjects: ["repeated task cards", "connected steps", "reclaimed hours"],
    sceneType: "diagram",
    composition: "repeating cards left, arrow through, linked flow right",
    colorAccent: 4,
    ogLayout: "diagram",
    ogHook: "Find out if this task is worth automating.",
    heroImageAlt:
      "A stack of identical manual task cards feeds into a connected workflow that runs the steps automatically.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "hire-vs-automate": {
    ...art("hire-vs-automate"),
    visualConcept:
      "A respectful side by side of hiring a person and automating the same repetitive process.",
    visualFamily: "people-scene",
    primarySubject: "person versus automated process",
    supportingSubjects: ["new hire at work", "automated flow", "shared task list"],
    sceneType: "comparison",
    composition: "two equal halves, hire left, automation right, task list at seam",
    colorAccent: 5,
    ogLayout: "split-compare",
    ogHook: "Decide between a person and a system.",
    heroImageAlt:
      "The same task list is handled by a new hire on one side and an automated workflow on the other.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "localbusiness-schema-generator": {
    ...art("localbusiness-schema-generator"),
    visualConcept:
      "A storefront's name, hours and location mapped cleanly into search-readable business data.",
    visualFamily: "search-seo",
    primarySubject: "storefront mapped into data",
    supportingSubjects: ["storefront facade", "structured data card", "mapping lines"],
    sceneType: "diagram",
    composition: "storefront left, tidy data card right, mapping lines between",
    colorAccent: 6,
    ogLayout: "document",
    ogHook: "Tell Google exactly who you are.",
    heroImageAlt:
      "Lines connect a small storefront's sign, hours and address into a tidy structured data card.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "equipment-buy-vs-rent": {
    ...art("equipment-buy-vs-rent"),
    visualConcept:
      "The same machine weighed across rental days on one side and full ownership cost on the other.",
    visualFamily: "toolbox-trade",
    primarySubject: "same machine, two paths",
    supportingSubjects: ["rental day tickets", "ownership ledger", "crossover point"],
    sceneType: "comparison",
    composition: "machine mirrored on both halves, costs beneath each, seam center",
    colorAccent: 1,
    ogLayout: "split-compare",
    ogHook: "When renting stops making sense.",
    heroImageAlt:
      "The same machine appears twice, once with a stack of rental day tickets and once with an ownership cost ledger.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "google-maps-link-generator": {
    ...art("google-maps-link-generator"),
    visualConcept:
      "A turn-by-turn route unrolling from a dropped map pin to the front door of the business.",
    visualFamily: "map-local",
    primarySubject: "route from pin to door",
    supportingSubjects: ["map pin", "turn arrows", "business entrance"],
    sceneType: "diagram",
    composition: "route winding lower left to upper right, entrance at end",
    colorAccent: 2,
    ogLayout: "diagram",
    ogHook: "One tap and they are driving to you.",
    heroImageAlt:
      "A turn-by-turn route winds from a dropped map pin across town to the front entrance of a business.",
    focalPoint: { x: 0.6, y: 0.42 },
  },
  "google-post-writer": {
    ...art("google-post-writer"),
    visualConcept:
      "A local business post composer with a month of planned posts arranged on a content calendar.",
    visualFamily: "document-draft",
    primarySubject: "post composer over a calendar",
    supportingSubjects: ["draft post card", "monthly calendar grid", "photo slot"],
    sceneType: "document",
    composition: "composer card center left, calendar grid behind, space right",
    colorAccent: 3,
    ogLayout: "document",
    ogHook: "Free real estate most businesses never use.",
    heroImageAlt:
      "A drafted local business post sits over a monthly calendar dotted with planned posts.",
    focalPoint: { x: 0.42, y: 0.5 },
  },
  "add-to-calendar-link": {
    ...art("add-to-calendar-link"),
    visualConcept:
      "An appointment traveling from a tapped link straight into its slot on a phone calendar.",
    visualFamily: "phone-comms",
    primarySubject: "event landing on a calendar",
    supportingSubjects: ["tapped link", "phone calendar", "confirmed slot"],
    sceneType: "device",
    composition: "phone calendar center right, event card flying in from left",
    colorAccent: 4,
    ogLayout: "device",
    ogHook: "Put your event on their calendar in one tap.",
    heroImageAlt:
      "An appointment card flies from a tapped link into its confirmed slot on a phone calendar.",
    focalPoint: { x: 0.62, y: 0.48 },
  },
  "capacity-calculator": {
    ...art("capacity-calculator"),
    visualConcept:
      "A weekly job schedule filling to its real operational limit without spilling into overbooking.",
    visualFamily: "schedule-calendar",
    primarySubject: "week filling to its limit",
    supportingSubjects: ["job blocks", "capacity line", "protected buffer"],
    sceneType: "scene",
    composition: "week grid upper two-thirds, capacity line marked, title band bottom",
    colorAccent: 5,
    ogLayout: "band-bottom",
    ogHook: "How much work you can actually take on.",
    heroImageAlt:
      "A weekly schedule fills with job blocks up to a marked capacity line, leaving a small protected buffer.",
    focalPoint: { x: 0.5, y: 0.4 },
  },
  "per-seat-cost-calculator": {
    ...art("per-seat-cost-calculator"),
    visualConcept:
      "Team seats multiplying across an office while the software bill climbs with every new head.",
    visualFamily: "receipt-billing",
    primarySubject: "seats multiplying, bill climbing",
    supportingSubjects: ["desk chairs in rows", "climbing invoice", "seat price tags"],
    sceneType: "scene",
    composition: "seat rows lower left, climbing bill and figure upper right",
    colorAccent: 6,
    ogLayout: "big-number",
    ogHook: "The pricing model that punishes growth.",
    heroImageAlt:
      "Rows of team seats multiply while a software invoice climbs higher with each seat added.",
    focalPoint: { x: 0.55, y: 0.45 },
  },
  "voicemail-script-generator": {
    ...art("voicemail-script-generator"),
    visualConcept:
      "An owner recording a concise voicemail greeting, with a clean audio waveform and the script in hand.",
    visualFamily: "audio-voice",
    primarySubject: "owner recording a greeting",
    supportingSubjects: ["audio waveform", "script card", "microphone"],
    sceneType: "scene",
    composition: "owner and microphone left third, waveform trailing right",
    colorAccent: 1,
    ogLayout: "scene-left",
    ogHook: "The greeting that does not lose the caller.",
    heroImageAlt:
      "An owner reads a short script into a microphone while a clean audio waveform trails across the frame.",
    focalPoint: { x: 0.34, y: 0.5 },
    mobileFocalPoint: { x: 0.42, y: 0.5 },
  },
  "cac-payback-calculator": {
    ...art("cac-payback-calculator"),
    visualConcept:
      "A customer's acquisition cost being repaid month by month across their first several bills.",
    visualFamily: "money-flow",
    primarySubject: "acquisition cost repaid monthly",
    supportingSubjects: ["upfront cost block", "monthly repayments", "break-even tick"],
    sceneType: "diagram",
    composition: "cost block left, repayment steps rising right to a marked tick",
    colorAccent: 2,
    ogLayout: "diagram",
    ogHook: "How long until a customer pays you back.",
    heroImageAlt:
      "An upfront acquisition cost is repaid by a row of monthly payments that reach a marked break-even point.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "downtime-cost-calculator": {
    ...art("downtime-cost-calculator"),
    visualConcept:
      "A dead website and payment terminal with a timer tallying what every offline minute costs.",
    visualFamily: "website-ui",
    primarySubject: "dead screens with a cost timer",
    supportingSubjects: ["error screen", "dark terminal", "climbing timer"],
    sceneType: "still-life",
    composition: "dark screens lower left, timer and figure upper right",
    colorAccent: 3,
    ogLayout: "big-number",
    ogHook: "What an hour of dead website costs.",
    heroImageAlt:
      "A website error screen and a dark payment terminal sit beneath a timer tallying the cost of downtime.",
    focalPoint: { x: 0.55, y: 0.45 },
  },
  "faq-schema-generator": {
    ...art("faq-schema-generator"),
    visualConcept:
      "Real customer questions being turned into structured answer cards that search can display.",
    visualFamily: "search-seo",
    primarySubject: "questions becoming answer cards",
    supportingSubjects: ["question bubbles", "structured answer cards", "result page"],
    sceneType: "document",
    composition: "question bubbles left, tidy answer cards stacked right",
    colorAccent: 4,
    ogLayout: "document",
    ogHook: "Answer the questions people already search.",
    heroImageAlt:
      "Scattered customer question bubbles line up into structured answer cards ready for a search results page.",
    focalPoint: { x: 0.55, y: 0.5 },
  },
  "drive-time-cost": {
    ...art("drive-time-cost"),
    visualConcept:
      "A service vehicle on a long route between jobs while non-billable hours pile up behind the windshield.",
    visualFamily: "route-vehicle",
    primarySubject: "service vehicle on a long route",
    supportingSubjects: ["route line between jobs", "unbillable hour markers"],
    sceneType: "diagram",
    composition: "route stretching left to right, van mid route, hour markers trailing",
    colorAccent: 5,
    ogLayout: "diagram",
    ogHook: "Hours in the truck are hours you cannot bill.",
    heroImageAlt:
      "A service van travels a long route between two jobs as unbillable hour markers trail behind it.",
    focalPoint: { x: 0.5, y: 0.45 },
  },
  "ad-character-counter": {
    ...art("ad-character-counter"),
    visualConcept:
      "One ad adapted across several platform frames, each with its character limit plainly visible.",
    visualFamily: "website-ui",
    primarySubject: "one ad in many frames",
    supportingSubjects: ["platform frames", "character limit meters"],
    sceneType: "device",
    composition: "frames fanned center right, limit meters under each, space left",
    colorAccent: 6,
    ogLayout: "device",
    ogHook: "Write it once, fit it everywhere.",
    heroImageAlt:
      "The same ad text appears in several platform frames, each with a small meter showing its character limit.",
    focalPoint: { x: 0.6, y: 0.5 },
  },
  "ad-test-budget-calculator": {
    ...art("ad-test-budget-calculator"),
    visualConcept:
      "Two ad creatives tested side by side with enough time and budget to reach a real conclusion.",
    visualFamily: "chart-compare",
    primarySubject: "two creatives under test",
    supportingSubjects: ["budget split", "test timeline", "confidence marker"],
    sceneType: "comparison",
    composition: "creative A left, creative B right, shared timeline underneath",
    colorAccent: 1,
    ogLayout: "split-compare",
    ogHook: "How much you need to spend to actually know.",
    heroImageAlt:
      "Two ad creatives run side by side over a shared timeline with the budget split evenly between them.",
    focalPoint: { x: 0.5, y: 0.5 },
  },
  "robots-txt-generator": {
    ...art("robots-txt-generator"),
    visualConcept:
      "A search crawler at a website gate where the allowed paths and blocked paths are clearly separated.",
    visualFamily: "search-seo",
    primarySubject: "crawler at a website gate",
    supportingSubjects: ["open path", "blocked path", "rules file"],
    sceneType: "document",
    composition: "rules file left of center, gate and paths to the right",
    colorAccent: 2,
    ogLayout: "document",
    ogHook: "Tell search engines what to read.",
    heroImageAlt:
      "A friendly search crawler stands at a gate where a rules file separates open paths from blocked ones.",
    focalPoint: { x: 0.45, y: 0.5 },
  },
};
