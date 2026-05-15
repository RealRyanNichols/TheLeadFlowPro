export type GrowthOsStatus = "live" | "partial" | "missing" | "blocked";

export type GrowthLoopStage = {
  step: string;
  title: string;
  job: string;
  current: string;
  missing: string;
  nextBuild: string;
};

export type GrowthCapability = {
  name: string;
  status: GrowthOsStatus;
  role: string;
  exists: string[];
  gaps: string[];
  next: string;
};

export type GrowthBuild = {
  priority: string;
  title: string;
  why: string;
  ships: string[];
};

export type ReadinessItem = {
  label: string;
  state: GrowthOsStatus;
  note: string;
};

export const GROWTH_LOOP: GrowthLoopStage[] = [
  {
    step: "01",
    title: "Idea",
    job: "Find a painful business leak or dream tool worth selling.",
    current: "Blueprint intake, lead leak audit, chat memory, and local radar capture raw demand.",
    missing: "A scored idea bank that ranks ideas by pain, urgency, buyer, proof, and fulfillment effort.",
    nextBuild: "Create an Idea Bank that turns every intake, chat, audit, and call note into scored offer candidates.",
  },
  {
    step: "02",
    title: "Create",
    job: "Turn the idea into a productized offer, page angle, proof, and basic delivery plan.",
    current: "Stump Ryan, Blueprint Lab, offers, pricing, and proof pages give the first version.",
    missing: "A repeatable Offer Factory that writes the offer, objections, assets, scope, timeline, and handoff checklist.",
    nextBuild: "Wire Blueprint Lab output into reusable offer records and fulfillment templates.",
  },
  {
    step: "03",
    title: "Advertise",
    job: "Put the right message in front of the right person with tracking that proves what happened.",
    current: "Pixel-ready code, Pulse tracking, ad copy model, audience report model, and landing pages exist.",
    missing: "Verified Pixel, CAPI, UTM rules, creative tests, audience hypotheses, and winner/loser memory.",
    nextBuild: "Add an Ad Readiness panel that blocks launch until Pixel, Lead event, form backup, and UTMs pass.",
  },
  {
    step: "04",
    title: "Sell",
    job: "Convert cold traffic into a free blueprint, audit, call, checkout, or client office.",
    current: "Stump Ryan, lead audit, book call, Stripe checkout hooks, and public chatbot cover the entry points.",
    missing: "One shared sales record that connects visitor source, offer, chat, form, call, checkout, and close reason.",
    nextBuild: "Create a Sales Memory record for each serious visitor and connect it to every conversion event.",
  },
  {
    step: "05",
    title: "Follow up",
    job: "Keep working leads until they buy, book, say no, or become unresponsive.",
    current: "Lead, Message, Automation, chatbot memory, and missed-call concepts are in the data model.",
    missing: "Offer-specific sequences, channel ownership, reply classification, and next-best-action tasks.",
    nextBuild: "Build a Sequence Builder that creates follow-up steps from each offer and lead stage.",
  },
  {
    step: "06",
    title: "Ship",
    job: "Turn sold work into a work order, client account, deliverable, and handoff.",
    current: "Work orders, dashboard work pages, capacity, Stripe webhooks, and Cal webhooks are already started.",
    missing: "Production schema confidence, automatic work-order creation from every path, and delivery checklists.",
    nextBuild: "Harden WorkOrder schema in production, then make every paid or approved request create a shipping lane.",
  },
  {
    step: "07",
    title: "Learn",
    job: "Feed results back into the next idea, offer, ad, sequence, and delivery process.",
    current: "Pulse, audit reports, visitor memory, and admin pages store pieces of the truth.",
    missing: "A central learning memory that stores what worked, what failed, why, and what to do next.",
    nextBuild: "Create the Learning Core with memories for offers, audiences, creatives, funnels, sequences, and fulfillment.",
  },
];

export const GROWTH_CAPABILITIES: GrowthCapability[] = [
  {
    name: "Capture and tracking",
    status: "partial",
    role: "Know exactly who came in, what they wanted, what they clicked, and what converted.",
    exists: ["Pulse events", "Public intakes", "Chat memory", "Audit submissions"],
    gaps: ["Meta Pixel not verified live", "CAPI not wired", "Silent form fallback risk", "No required UTM discipline"],
    next: "Verify Pixel and Lead event, then add a launch checklist that blocks paid traffic until tracking is clean.",
  },
  {
    name: "Learning memory core",
    status: "missing",
    role: "Remember the business logic so the system gets stronger instead of starting over every day.",
    exists: ["Public visitor memory", "Chat messages", "Audit reports", "Pulse summaries"],
    gaps: ["No shared memory for offers", "No audience winner file", "No creative winner file", "No close/loss reason loop"],
    next: "Add typed memory records for offer, audience, creative, funnel, sequence, and fulfillment learnings.",
  },
  {
    name: "Audience intelligence",
    status: "partial",
    role: "Find who needs the offer, what they believe, what they fear, and where they can be reached.",
    exists: ["AudienceReport model", "Local radar", "Lead intelligence", "Organic plan copy"],
    gaps: ["No buyer-persona scoring", "No target/exclusion rules", "No objection library", "No channel-specific angles"],
    next: "Turn audits and intakes into audience hypotheses with pain, promise, proof, objection, and targeting notes.",
  },
  {
    name: "Offer factory",
    status: "partial",
    role: "Turn raw ideas into a clear promise, scope, price path, page, proof, and delivery checklist.",
    exists: ["Stump Ryan page", "Blueprint Lab", "$250 continuation path", "Pricing pages"],
    gaps: ["No offer record generator", "No automated scope guardrails", "No reusable handoff plan per offer"],
    next: "Store each offer as an object with promise, buyer, proof, price path, assets, sequence, and ship checklist.",
  },
  {
    name: "Creative and ad engine",
    status: "partial",
    role: "Generate hooks, posts, ads, landing angles, and tests without losing what worked.",
    exists: ["AdCopy model", "Proof factory", "Weekly teaser sections", "Lead intelligence copy"],
    gaps: ["No creative library", "No variant testing ledger", "No winning-hook memory", "No compliance review stage"],
    next: "Create a Creative Library that saves hook, format, audience, landing page, result, and next test.",
  },
  {
    name: "Follow-up machine",
    status: "partial",
    role: "Move every lead to the next honest step without Ryan manually remembering everything.",
    exists: ["Lead statuses", "Message model", "Automation model", "Chatbot CTA buttons"],
    gaps: ["No sequence builder", "No reply classifier", "No channel-specific follow-up rules", "No task SLA"],
    next: "Build offer-specific follow-up sequences with triggers for new lead, no reply, booked call, and lost deal.",
  },
  {
    name: "Shipping system",
    status: "partial",
    role: "Make sold work become a client office, work order, checklist, and handoff asset automatically.",
    exists: ["WorkOrder model", "Capacity admin", "Client work dashboard", "Stripe and Cal webhook hooks"],
    gaps: ["Production schema needs confirmation", "Some work orders are best-effort", "No universal delivery template"],
    next: "Make schema migration a deployment gate and create a default delivery kit for every paid path.",
  },
  {
    name: "Research and search layer",
    status: "missing",
    role: "Continuously find better offers, ads, audiences, competitors, software patterns, and client build ideas.",
    exists: ["Manual research through Codex", "Local radar", "Saved project direction"],
    gaps: ["No scheduled research jobs", "No source library", "No competitor swipe file", "No framework memory"],
    next: "Add a research queue that stores sources, summaries, reusable frameworks, and recommended actions.",
  },
];

export const GROWTH_BUILD_ORDER: GrowthBuild[] = [
  {
    priority: "Now",
    title: "Harden capture before traffic",
    why: "No funnel machine works if leads, events, emails, and checkouts cannot be trusted.",
    ships: [
      "Pixel and Lead verification panel",
      "Form backup notification health check",
      "UTM/source capture rules",
      "Ad launch blocked until required checks pass",
    ],
  },
  {
    priority: "Next",
    title: "Learning Core v1",
    why: "This is the brain. Every ad, offer, lead, objection, and outcome needs to become reusable memory.",
    ships: [
      "Offer memory",
      "Audience memory",
      "Creative memory",
      "Sequence memory",
      "Fulfillment memory",
    ],
  },
  {
    priority: "After",
    title: "Offer Factory",
    why: "Ryan needs to create and test products fast without rebuilding the sales logic from scratch.",
    ships: [
      "Idea scorecard",
      "Offer object",
      "Landing-page checklist",
      "Proof checklist",
      "Scope and handoff checklist",
    ],
  },
  {
    priority: "Then",
    title: "Sequence Builder",
    why: "Cold traffic rarely buys on the first touch. The system needs to follow up by offer, urgency, and channel.",
    ships: [
      "New-lead sequence",
      "No-reply sequence",
      "Booked-call sequence",
      "Post-blueprint sequence",
      "Lost-deal reason capture",
    ],
  },
  {
    priority: "Scale",
    title: "Automated shipping lane",
    why: "The machine cannot only sell. It has to create the account, work order, deliverable, update, and handoff.",
    ships: [
      "Checkout to WorkOrder",
      "Blueprint to delivery checklist",
      "Client office activation",
      "Ryan update templates",
      "Final ownership handoff record",
    ],
  },
];

export const TONIGHT_READINESS: ReadinessItem[] = [
  {
    label: "One cold-traffic offer",
    state: "live",
    note: "Stump Ryan and the free blueprint are the right lead magnet.",
  },
  {
    label: "Landing page clarity",
    state: "partial",
    note: "The page is much stronger, but it still needs more proof examples and fewer secondary paths above the fold.",
  },
  {
    label: "Meta Pixel",
    state: "blocked",
    note: "Do not run ads until NEXT_PUBLIC_META_PIXEL_ID is installed and PageView plus Lead are verified.",
  },
  {
    label: "Lead event",
    state: "blocked",
    note: "Lead must fire on blueprint and audit submission before traffic starts.",
  },
  {
    label: "Lead backup",
    state: "partial",
    note: "Forms exist, but notification and database health need to be verified so no buyer disappears.",
  },
  {
    label: "Follow-up sequence",
    state: "missing",
    note: "A submitted blueprint needs automatic next messages, not only a one-time form record.",
  },
  {
    label: "Shipping lane",
    state: "partial",
    note: "Work orders exist, but production schema and universal work-order creation need hard verification.",
  },
];
