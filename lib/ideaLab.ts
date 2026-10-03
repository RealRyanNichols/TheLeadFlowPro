// Reviewed inspiration for LeadFlow. Posts establish what an author said, not
// their revenue, model performance, or the availability of every named product.
// This module does no network I/O and grants no permission to send or spend.
import { TOOL_BUILDS, MONTHLY_MENU } from "./toolStudio.ts";

export type IdeaLane =
  | "concierge"
  | "design"
  | "preview"
  | "knowledge"
  | "workflows"
  | "marketing"
  | "interactive"
  | "education"
  | "voice"
  | "data-api"
  | "grants";

export type IdeaSource = {
  id: string;
  author: string;
  url: string;
  postedOn: string;
  reviewedOn: string | null;
  review: "post_text_reviewed" | "awaiting_review";
  title: string;
  lesson: string;
  application: string;
  caveat: string;
  lanes: IdeaLane[];
  primarySources: string[];
};

const source = (
  author: string,
  id: string,
  postedOn: string,
  title: string,
  lesson: string,
  application: string,
  caveat: string,
  lanes: IdeaLane[],
  primarySources: string[] = [],
): IdeaSource => ({
  id,
  author,
  url: `https://x.com/${author}/status/${id}`,
  postedOn,
  reviewedOn: "2026-09-30",
  review: "post_text_reviewed",
  title,
  lesson,
  application,
  caveat,
  lanes,
  primarySources,
});

export const IDEA_SOURCES: readonly IdeaSource[] = [
  source(
    "ErnestoSOFTWARE",
    "2099636810292838481",
    "2026-09-14",
    "Small game, large distribution claim",
    "A simple interaction can earn attention when distribution and retention work.",
    "Prototype original quote games, training challenges, and useful interactive lead magnets through Tool Studio.",
    "The $41M monthly figure and one-prompt production claim are unverified. A playable prototype does not establish retention or profitable distribution; do not copy another game's assets.",
    ["interactive"],
  ),
  source(
    "nutlope",
    "2099547343112564921",
    "2026-09-14",
    "Searchable design inspiration",
    "Ground coding work in captured screens and design systems.",
    "Attach credited desktop/mobile references to every design brief, then compare the rendered result with them.",
    "The repository was inspected. No MCP server was installed or granted access; reference artwork is not automatically licensed for reuse.",
    ["design"],
    ["https://github.com/nutlope/inspo"],
  ),
  source(
    "thejamescad",
    "2099909528108081352",
    "2026-09-15",
    "AI inside the marketing organization",
    "Marketing tools become more useful when they share business context and verifiable outputs.",
    "Combine content briefs, source checks, AI-search visibility checks, experiments, and commercial outcomes in the existing Content Engine.",
    "The funding announcement is an author claim, not LeadFlow's addressable market or evidence of customer demand.",
    ["marketing"],
  ),
  source(
    "coreyganim",
    "2099848332692623870",
    "2026-09-15",
    "Audit, simplify, automate",
    "Map owners, tools, data, interruptions, and acceptance criteria before building one bounded skill.",
    "Use FlowWorker discovery to produce a process map, a cleaned workflow, one versioned skill, and a measured pilot.",
    "Income and effective hourly-rate claims are unverified. Keep the client's authoritative data in one owned record and retain review around external actions.",
    ["concierge", "workflows"],
  ),
  source(
    "Manixh02",
    "2098985979067724192",
    "2026-09-12",
    "Production readiness beyond appearance",
    "Shipping requires metadata, mobile behavior, forms, failure states, privacy, and delivery verification.",
    "Use a release-evidence checklist for every tool and preview; include accessibility, metadata, contacts, and real provider results.",
    "A generic checklist is not a security audit or legal determination. Cookie controls must match the actual analytics and consent behavior.",
    ["design", "preview", "interactive"],
  ),
  source(
    "TristenPalori",
    "2098456523072537015",
    "2026-09-11",
    "Show a website preview before selling",
    "An actual preview can make an offer easier to evaluate.",
    "Create credited private redesign previews for selected businesses, with alternate layouts and an approval-ready handoff.",
    "The recurring-revenue figure is hypothetical and ignores churn, expenses, capacity, and permission. No unsolicited SMS pipeline was enabled.",
    ["preview"],
  ),
  source(
    "leonabboud",
    "2096265603820540069",
    "2026-09-05",
    "Research before compiling a skill",
    "Use reviewed learning sources and test examples to build better task-specific skills.",
    "Keep transcript/source references, disagreements, permissions, examples, and a real acceptance run with each skill version.",
    "Twenty videos and repeated advice do not establish correctness. No videos were watched or transcripts exported in this review.",
    ["education", "concierge"],
  ),
  source(
    "AnatoliKopadze",
    "2095948024765657288",
    "2026-09-04",
    "Agent loops and workflow graphs",
    "Represent repeatable work as explicit stages with checks and bounded retries.",
    "Use researched, specified, built, verified, and approval-queue states with evidence required at each transition.",
    "The Andrew Ng quote and lecture were not independently verified. Prompt engineering remains documented; graphs do not make prompts or human review obsolete.",
    ["workflows"],
    [
      "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview",
    ],
  ),
  source(
    "rvaniaaaa",
    "2095479553846108163",
    "2026-09-03",
    "Knowledge synthesis instead of endless filing",
    "Capture provenance and synthesize useful decisions rather than maintaining duplicated notes.",
    "Normalize and deduplicate saved post URLs, connect them to workstreams, and explicitly queue new content for review.",
    "The Karpathy attribution and personal productivity narrative are unverified. A synthesis needs freshness, contradiction handling, and review.",
    ["knowledge"],
  ),
  source(
    "isssa0x",
    "2095157847646437444",
    "2026-09-02",
    "Distinguish assumptions from observations",
    "Useful teaching explains whether a probability is theoretical, observed, or subjective.",
    "Label unit-economics scenarios as assumptions and measure actual activation, sales, retention, and costs separately.",
    "The channel statistics, prices, and quoted lecture were not checked. Do not resell the instructor's videos or convert view counts into demand.",
    ["education", "interactive"],
  ),
  source(
    "res1dualedge",
    "2093813971664961867",
    "2026-08-29",
    "Make review part of the workflow",
    "A workflow can reduce repeated supervision by routing checks and exceptions deliberately.",
    "Use one state record, named owners, proof requirements, bounded retry counts, and a final human release queue.",
    "The engineer quote and linked course were not verified. A diagram is not a running or reliable agent system.",
    ["workflows"],
  ),
  source(
    "shiqway92",
    "2093733556711243808",
    "2026-08-29",
    "Tools for supervising coding agents",
    "Isolation, persistent task state, and clear working/blocked statuses matter more than a large agent count.",
    "Connect specifications to OperatorOS worker roles and review artifacts; evaluate optional agent runtimes separately.",
    "Repository descriptions were inspected, but star counts and the operational claims in the post were not validated. No new runtime was installed.",
    ["workflows"],
    [
      "https://github.com/stablyai/orca",
      "https://github.com/PrimeIntellect-ai/prime-agent",
      "https://github.com/herdrdev/herdr",
    ],
  ),
  source(
    "notEgoyard",
    "2093775854593544397",
    "2026-08-29",
    "Research and brand context for decks",
    "A reusable brand brief and source-backed narrative can improve proposals and presentations.",
    "Generate a buyer brief, cited outline, deck specification, and format-specific QA instructions through Content Engine.",
    "One-prompt investor readiness is unverified. PPTX/PDF exports need inspection of typography, numbers, images, and editability.",
    ["marketing", "design"],
  ),
  source(
    "shmidtqq",
    "2093749412535144749",
    "2026-08-29",
    "Specialized reviewers and vetoes",
    "Separate discovery, validation, risk review, and decision support.",
    "Apply those roles to business opportunities and release reviews, with traceable rejection reasons.",
    "The trading profits, latency, and scores are unverified. This implementation does not connect wallets, trade, or make financial decisions.",
    ["workflows", "marketing"],
  ),
  source(
    "MonidHQ",
    "2100007120158834944",
    "2026-09-15",
    "Voice workflow connected to follow-up",
    "Scheduling, objections, outcome logs, and next steps should form one workflow.",
    "Design an approved inbound/permissioned voice pilot using existing Quo routing and OperatorOS draft handoffs.",
    "Calling, meeting, and cost figures are unverified. No calls, voicemails, or texts were sent; provider access, consent, disclosures, and costs need a pilot review.",
    ["voice", "concierge"],
  ),
  source(
    "FilipPanoski",
    "2099860906108731658",
    "2026-09-15",
    "Ship the core result before cosmetic extras",
    "Prioritize the job customers pay for and make its usefulness measurable.",
    "Gate new product versions on activation, accepted delivery, collected revenue, and continued use before expanding features.",
    "The product is unnamed in the post and the $10K/$13K MRR claims were not independently verified. No product identity or causal growth explanation is inferred.",
    ["interactive", "concierge"],
  ),
  source(
    "MAXdeg0",
    "2093743925164990648",
    "2026-08-29",
    "One question across several evidence feeds",
    "A shared evidence record can combine monitoring, research, and review.",
    "Build a business-signal research specification with source timestamps, deduplication, alerts, and reviewed opportunity briefs.",
    "Bloomberg-equivalence and the trading-terminal setup are unverified. Use this as an operating pattern for LeadFlow business intelligence.",
    ["marketing", "knowledge", "workflows"],
  ),
  source(
    "starmexxx",
    "2093745378231243049",
    "2026-08-29",
    "Provider flexibility and cost visibility",
    "Track execution budgets, context, and resumable work instead of relying on a provider's marketing.",
    "Use provider-independent task contracts, a maximum retry count, and explicit budget limits for future hosted workers.",
    "The 2,600-agent, zero-loss, $8, licensing, and product-comparison claims were not verified. Token and hosting costs are not interchangeable with subscription prices.",
    ["workflows"],
  ),
  source(
    "0xRicker",
    "2093740156998070423",
    "2026-08-29",
    "Coordinate toward one verified artifact",
    "Assign roles around one task and merge evidence into one reviewable deliverable.",
    "Produce one build packet per workstream with owner, inputs, outputs, next actions, and verification requirements.",
    "The 300-agent, token-window, and 4,000-step claims are unverified. Concurrency should follow available capacity and a measured benefit.",
    ["workflows"],
  ),
  source(
    "Argona0x",
    "2093350245027475797",
    "2026-08-28",
    "A durable private source library",
    "Retain source identifiers and connect reviewed material to useful work.",
    "Support manual bookmark ingestion now; specify an authenticated, permissioned Hub connector as a later integration.",
    "The five-minute setup, $0 cost, and compounding claims are unverified. No personal bookmarks were scraped and no recurring import was scheduled.",
    ["knowledge", "workflows"],
  ),
  source(
    "elirousso",
    "2079594911637094442",
    "2026-07-21",
    "Local voice notes with deliberate privacy",
    "Data minimization and on-device processing can be a product feature.",
    "Specify an optional private operator voice journal with explicit local/cloud modes, deletion, export, and device support checks.",
    "Slate's implementation and behavior were not audited. A DigitalOcean-hosted transcription service cannot truthfully claim that nothing leaves the phone.",
    ["voice"],
  ),
  source(
    "AnthropicAI",
    "2079256626771665098",
    "2026-07-20",
    "Research grants have narrow eligibility",
    "Programs can fund a qualified research partnership when its work fits the actual call.",
    "Keep an eligibility worksheet for a genuine research partner, program terms, current deadlines, data governance, and the proposed work.",
    "The official page specifies rare-disease research and a past August 2 deadline. These are Claude usage credits, not unrestricted startup cash or confirmed LeadFlow eligibility.",
    ["grants"],
    ["https://www.anthropic.com/news/rare-disease-research-grants"],
  ),
  source(
    "brian_armstrong",
    "2074519993107239080",
    "2026-07-07",
    "Charge for APIs, datasets, and tools",
    "Useful data can be sold through explicit access and metered usage.",
    "Start with the existing Stripe access model for reviewed business data; keep an x402 adapter as a separately reviewed experiment.",
    "Cloudflare's official announcement describes a waitlist. No gateway access, wallet, payment settlement, entitlement, or paid endpoint was configured.",
    ["data-api"],
    [
      "https://blog.cloudflare.com/monetization-gateway/",
      "https://docs.cdp.coinbase.com/x402/welcome",
    ],
  ),
];

export type IdeaWorkstream = {
  id: IdeaLane;
  name: string;
  priority: "first" | "next" | "research";
  buyer: string;
  outcome: string;
  owner: string;
  existingTarget: string;
  commercialPath: string;
  requiredInputs: string[];
  deliverables: string[];
  acceptance: string[];
  nextMoves: [string, string, string];
};

export const IDEA_WORKSTREAMS: readonly IdeaWorkstream[] = [
  {
    id: "concierge",
    name: "Business AI Concierge",
    priority: "first",
    buyer: "An owner with one recurring administrative or sales task",
    outcome: "One accepted workflow that saves measurable owner time.",
    owner: "Chief + Forge",
    existingTarget: "app/admin/operator",
    commercialPath:
      "Use existing FlowWorker discovery and written scope; quote from actual delivery effort.",
    requiredInputs: [
      "Recorded process walkthrough or approved written process",
      "Step owner, tool, data home, and consent rules",
      "A baseline completion time and a representative test record",
    ],
    deliverables: [
      "Process audit and simplified map",
      "One bounded, versioned skill and reference examples",
      "Pilot run, exceptions, and a client handoff",
    ],
    acceptance: [
      "Client confirms the map and result",
      "A real permitted test passes without changing the source record unexpectedly",
      "Time saved exceeds ongoing review and maintenance time",
    ],
    nextMoves: [
      "Select one owner-approved task",
      "Measure the current run and simplify it",
      "Build and test one skill before quoting expansion",
    ],
  },
  {
    id: "interactive",
    name: "Original tools and small interactive products",
    priority: "first",
    buyer: "A business that can answer a useful buyer question with a tool",
    outcome:
      "A working calculator, quiz, estimator, or training challenge with a clear next step.",
    owner: "Forge + Lens",
    existingTarget: "app/go/tools",
    commercialPath:
      "Use the existing Tool Blueprint, Quick Tool, and Tool Funnel scopes and prices.",
    requiredInputs: [
      "One buyer question",
      "Verified inputs and result logic",
      "Owned or licensed artwork and brand references",
    ],
    deliverables: [
      "Bounded input/output contract",
      "Original mobile interaction",
      "Result screen and event specification",
    ],
    acceptance: [
      "Result logic passes boundary cases",
      "The intended user can complete the task on mobile",
      "Permissioned leads and paid outcomes can be attributed separately",
    ],
    nextMoves: [
      "Pick one frequent customer question",
      "Test its formula with real examples",
      "Build the smallest original interaction and measure completion",
    ],
  },
  {
    id: "preview",
    name: "Private Website Preview Studio",
    priority: "first",
    buyer: "A selected business evaluating a website improvement",
    outcome: "A reviewable preview and written conversion recommendation.",
    owner: "Scout + Forge",
    existingTarget: "app/services and app/packages/launch",
    commercialPath:
      "Attach to existing website and Tool Funnel scopes; keep recurring care optional and bounded.",
    requiredInputs: [
      "Verified business and current public site",
      "A concrete conversion problem",
      "Approved references, recipient, and preview access",
    ],
    deliverables: [
      "Current-state findings",
      "Private preview with selected layout alternatives",
      "A draft handoff and readiness evidence",
    ],
    acceptance: [
      "Links and forms behave as stated",
      "Unsigned access cannot expose neighboring private previews",
      "Business identity and preview status are clear",
    ],
    nextMoves: [
      "Select one business and confirm the problem",
      "Create a private preview with a concrete improvement",
      "Review the handoff before any outreach",
    ],
  },
  {
    id: "knowledge",
    name: "Bookmark to Build Library",
    priority: "first",
    buyer: "Ryan and the internal delivery team",
    outcome:
      "Saved ideas become deduplicated, attributable work with a known review state.",
    owner: "Catcher + Chief",
    existingTarget: "app/admin/operator",
    commercialPath:
      "Internal capability first; package only after an accepted customer workflow exists.",
    requiredInputs: [
      "User-provided post URLs or an authorized export",
      "Reviewed source summary",
      "A workstream, owner, and freshness note",
    ],
    deliverables: [
      "Canonical source ledger",
      "Claim caveats and linked workstreams",
      "Generated build packets with source links",
    ],
    acceptance: [
      "Tracking variants deduplicate by post ID",
      "New imports remain awaiting review",
      "Unknown content never becomes a verified claim automatically",
    ],
    nextMoves: [
      "Import additional saved links",
      "Read each source and resolve claims",
      "Attach useful sources to one owned build packet",
    ],
  },
  {
    id: "workflows",
    name: "Bounded Operator Workflows",
    priority: "first",
    buyer: "The internal team and approved automation clients",
    outcome:
      "A resumable job reaches one verified artifact with explicit failure and review states.",
    owner: "Chief + Forge + Lens",
    existingTarget: "lib/operatoros/engine.ts",
    commercialPath:
      "Use existing OperatorOS workspaces, jobs, approvals, and worker roles.",
    requiredInputs: [
      "A single task contract",
      "Source and specification evidence",
      "Budget, retry limit, reviewer, and release boundaries",
    ],
    deliverables: [
      "Deterministic state transitions",
      "Evidence and bounded-attempt ledger",
      "Approval-queue packet and blocked-state reasons",
    ],
    acceptance: [
      "Skipped states and missing evidence are rejected",
      "A blocked job resumes only through an explicit retry",
      "Release review never executes deployment or sending",
    ],
    nextMoves: [
      "Map one existing job to the state contract",
      "Verify a complete local dry run",
      "Review hosted persistence and provider adapters separately",
    ],
  },
  {
    id: "design",
    name: "Reference-led Product Design",
    priority: "first",
    buyer: "LeadFlow buyers and the internal build team",
    outcome:
      "Approved design references translate into usable, visually verified interfaces.",
    owner: "Forge + Lens",
    existingTarget: "docs/leadflow-figma-product-system.md",
    commercialPath:
      "Include reference selection and QA in existing scoped builds.",
    requiredInputs: [
      "Credited desktop and mobile screenshots",
      "Current LeadFlow tokens and owned brand assets",
      "A selected visual target",
    ],
    deliverables: [
      "Visual brief and source provenance",
      "Three reviewable directions when a new visual target is needed",
      "Implementation comparison and mobile QA",
    ],
    acceptance: [
      "Reference licensing is checked",
      "The selected target is recorded",
      "Visual matching and accessibility are tested after implementation",
    ],
    nextMoves: [
      "Capture the relevant existing screen and brand",
      "Select the intended layout",
      "Build and compare at the same viewport",
    ],
  },
  {
    id: "marketing",
    name: "Marketing Intelligence and Proposal Studio",
    priority: "next",
    buyer: "An owner who needs a credible campaign or proposal",
    outcome:
      "A source-backed campaign, presentation, or opportunity brief tied to a real business decision.",
    owner: "Signal + Scout + Lens",
    existingTarget: "app/admin/content-engine",
    commercialPath:
      "Use bounded Content Refresh and Funnel Test services; validate interest before adding a subscription.",
    requiredInputs: [
      "Approved business and audience brief",
      "Current cited research",
      "Brand references and output format",
    ],
    deliverables: [
      "Research and AI-visibility question set",
      "Campaign or proposal outline and asset brief",
      "Measured experiment and export QA checklist",
    ],
    acceptance: [
      "Numbers and claims link to controlling sources",
      "Draft copy matches the approved business",
      "Final exports and collected outcomes are inspected",
    ],
    nextMoves: [
      "Pick one live business question",
      "Create a cited brief and format-specific draft",
      "Run an approved test and record the result",
    ],
  },
  {
    id: "education",
    name: "Source-backed Skill and Training Kits",
    priority: "next",
    buyer: "An owner learning a practical repeatable task",
    outcome:
      "A useful lesson and tested skill built from reviewed, permitted sources.",
    owner: "Forge + Lens",
    existingTarget: "lib/operatorAcademyCatalog.ts",
    commercialPath:
      "Extend existing Operator Academy delivery with original materials and bounded coaching.",
    requiredInputs: [
      "One learning outcome",
      "Reviewed primary documentation and permitted transcripts",
      "Representative examples and a rubric",
    ],
    deliverables: [
      "Original lesson and source notes",
      "Versioned skill contract",
      "Worked examples and acceptance run",
    ],
    acceptance: [
      "Repeated advice is not treated as authority",
      "Third-party course content is not copied for resale",
      "A learner can produce the intended artifact",
    ],
    nextMoves: [
      "Choose one common owner question",
      "Review a small strong source set",
      "Teach and test an original version",
    ],
  },
  {
    id: "voice",
    name: "Permissioned Voice Workflows",
    priority: "research",
    buyer: "An owner with approved intake or a private note-taking need",
    outcome:
      "A deliberately scoped voice workflow with truthful storage and privacy behavior.",
    owner: "Catcher + Drip",
    existingTarget: "app/api/quo-inbound",
    commercialPath:
      "Separate inbound voice operations from an optional native local-journal product.",
    requiredInputs: [
      "Intended inbound or permissioned use",
      "Provider, consent, disclosure, retention, and cost review",
      "Explicit local/cloud choice and device support",
    ],
    deliverables: [
      "Voice pilot contract and outcome schema",
      "Draft follow-up and escalation behavior",
      "Local-only journal feasibility brief",
    ],
    acceptance: [
      "No unapproved calls or messages occur",
      "Storage and deletion match the claim",
      "Local-only claims pass network-off testing on supported devices",
    ],
    nextMoves: [
      "Select inbound operations or local journaling",
      "Validate provider/device support and costs",
      "Approve one bounded test before enabling any external actions",
    ],
  },
  {
    id: "data-api",
    name: "Paid Business Data and Tools API",
    priority: "research",
    buyer: "An authorized buyer of reviewed business intelligence",
    outcome:
      "A buyer can access only the paid, licensed data or computation they purchased.",
    owner: "Cash + Lens",
    existingTarget:
      "supabase/migrations/20260701260000_leadflow_product_factory.sql",
    commercialPath:
      "Keep existing Stripe entitlement verification; evaluate x402 as a separate optional adapter.",
    requiredInputs: [
      "Allowed-use and source-rights review",
      "A useful sanitized sample",
      "Metering, entitlement, refund, and price review",
    ],
    deliverables: [
      "Endpoint and access contract",
      "Safe sample and usage-event schema",
      "Payment-provider feasibility and acceptance plan",
    ],
    acceptance: [
      "Unsigned/unpaid callers receive no protected records",
      "Payment is independently verified before access",
      "Provider access and settlement are confirmed in a permitted test",
    ],
    nextMoves: [
      "Choose a reviewed business-data product",
      "Define buyer rights and entitlement behavior",
      "Validate payment adapters before publishing an endpoint",
    ],
  },
  {
    id: "grants",
    name: "Research Partnership Eligibility",
    priority: "research",
    buyer: "A qualified research organization, if a genuine partner exists",
    outcome:
      "A clear eligible/ineligible/unknown decision using current program terms.",
    owner: "Scout + Lens",
    existingTarget: "docs/IDEA_LAB.md",
    commercialPath:
      "Research-only until a qualified partner and active call are documented.",
    requiredInputs: [
      "Current official program page and deadline",
      "Partner's qualifications and research purpose",
      "Data governance and permitted project scope",
    ],
    deliverables: [
      "Eligibility worksheet",
      "Current deadline and credit restrictions",
      "Partner and governance questions",
    ],
    acceptance: [
      "Credits are not described as cash",
      "Expired calls do not appear actionable",
      "No affiliation, scientific result, or eligibility is invented",
    ],
    nextMoves: [
      "Check for a current official call",
      "Identify a genuine qualified partner",
      "Decide whether the fit justifies an application",
    ],
  },
];

export function canonicalPostUrl(
  value: string,
): { id: string; author: string; url: string } | null {
  if (value.length > 2048) return null;
  try {
    const parsed = new URL(value.trim());
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port
    )
      return null;
    if (
      !["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
        parsed.hostname,
      )
    )
      return null;
    const match =
      /^\/([A-Za-z0-9_]{1,15})\/status\/(\d{15,22})(?:\/(?:photo|video)\/\d+)?\/?$/.exec(
        parsed.pathname,
      );
    if (!match) return null;
    return {
      author: match[1],
      id: match[2],
      url: `https://x.com/${match[1]}/status/${match[2]}`,
    };
  } catch {
    return null;
  }
}

export function importIdeaLinks(
  text: string,
  existing: readonly IdeaSource[] = IDEA_SOURCES,
) {
  if (text.length > 100_000)
    throw new Error("Import at most 100,000 characters per batch.");
  const known = new Set(existing.map((item) => item.id));
  const added: IdeaSource[] = [];
  const rejected: string[] = [];
  let duplicates = 0;
  for (const line of text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    const parsed = canonicalPostUrl(line);
    if (!parsed) {
      rejected.push(line);
      continue;
    }
    if (known.has(parsed.id)) {
      duplicates += 1;
      continue;
    }
    known.add(parsed.id);
    added.push({
      ...parsed,
      postedOn: "",
      reviewedOn: null,
      review: "awaiting_review",
      title: "Source review needed",
      lesson: "",
      application: "",
      caveat:
        "Content, attachments, claims, and workstream assignment need review.",
      lanes: [],
      primarySources: [],
    });
  }
  return { added, duplicates, rejectedCount: rejected.length };
}

export const RELEASE_CHECKS = [
  "source_rights",
  "scope",
  "mobile",
  "accessibility",
  "metadata",
  "performance",
  "form_success",
  "form_failure",
  "privacy",
  "auth",
  "provider_delivery",
  "payment_entitlement",
  "analytics_consent",
  "rollback",
  "human_review",
] as const;
export type ReleaseCheck = (typeof RELEASE_CHECKS)[number];
export type CheckEvidence = {
  status: "pass" | "fail" | "not_applicable";
  evidence: string;
};

export function releaseReadiness(
  checks: Partial<Record<ReleaseCheck, CheckEvidence>>,
) {
  const blockers = RELEASE_CHECKS.filter((key) => {
    const check = checks[key];
    return (
      !check ||
      !["pass", "not_applicable"].includes(check.status) ||
      !check.evidence?.trim()
    );
  });
  return {
    readyForHumanReview: blockers.length === 0,
    blockers,
    destination: "approval_queue" as const,
  };
}

export type IdeaStage =
  | "captured"
  | "researched"
  | "specified"
  | "built"
  | "verified"
  | "approval_queue"
  | "blocked";
export type StageEvidence = {
  kind:
    | "source_review"
    | "scope"
    | "artifact"
    | "verification"
    | "release_checks";
  reference: string;
};
export type IdeaRun = {
  workstream: IdeaLane;
  stage: IdeaStage;
  resumeStage?: Exclude<IdeaStage, "blocked">;
  attempts: number;
  maxAttempts: number;
  budgetUsd: number;
  spentUsd: number;
  evidence: StageEvidence[];
  history: { from: IdeaStage; to: IdeaStage; reason: string }[];
};
const NEXT_STAGE: Partial<Record<IdeaStage, IdeaStage>> = {
  captured: "researched",
  researched: "specified",
  specified: "built",
  built: "verified",
  verified: "approval_queue",
};
const STAGE_PROOF: Partial<Record<IdeaStage, StageEvidence["kind"]>> = {
  researched: "source_review",
  specified: "scope",
  built: "artifact",
  verified: "verification",
  approval_queue: "release_checks",
};

export function newIdeaRun(
  workstream: IdeaLane,
  budgetUsd = 0,
  maxAttempts = 2,
): IdeaRun {
  if (!IDEA_WORKSTREAMS.some((item) => item.id === workstream))
    throw new Error("Unknown workstream.");
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0)
    throw new Error("Budget must be finite and nonnegative.");
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5)
    throw new Error("Use one to five attempts.");
  return {
    workstream,
    stage: "captured",
    attempts: 1,
    maxAttempts,
    budgetUsd,
    spentUsd: 0,
    evidence: [],
    history: [],
  };
}

export function advanceIdeaRun(
  run: IdeaRun,
  next: IdeaStage,
  evidence: StageEvidence[],
  reason: string,
  checks?: Partial<Record<ReleaseCheck, CheckEvidence>>,
): IdeaRun {
  if (
    !reason.trim() ||
    !Number.isFinite(run.spentUsd) ||
    run.spentUsd < 0 ||
    run.spentUsd > run.budgetUsd
  )
    throw new Error("A reason and valid budget are required.");
  if (next === "blocked") {
    if (run.stage === "blocked" || run.stage === "approval_queue")
      throw new Error("This run cannot be blocked again.");
    return {
      ...run,
      stage: next,
      resumeStage: run.stage,
      history: [...run.history, { from: run.stage, to: next, reason }],
    };
  }
  if (NEXT_STAGE[run.stage] !== next)
    throw new Error(
      "Stages cannot be skipped; blocked jobs need an explicit retry.",
    );
  const required = STAGE_PROOF[next];
  if (!evidence.some((item) => item.kind === required && item.reference.trim()))
    throw new Error(`Missing ${required} evidence.`);
  if (
    next === "approval_queue" &&
    !releaseReadiness(checks ?? {}).readyForHumanReview
  )
    throw new Error("Release checks are incomplete.");
  return {
    ...run,
    stage: next,
    evidence: [...run.evidence, ...evidence],
    history: [...run.history, { from: run.stage, to: next, reason }],
  };
}

export function retryIdeaRun(run: IdeaRun, reason: string): IdeaRun {
  if (run.stage !== "blocked" || !run.resumeStage || !reason.trim())
    throw new Error("Only a blocked job with a reason can retry.");
  if (run.attempts >= run.maxAttempts)
    throw new Error("Retry limit reached; review the task contract.");
  return {
    ...run,
    stage: run.resumeStage,
    resumeStage: undefined,
    attempts: run.attempts + 1,
    history: [...run.history, { from: "blocked", to: run.resumeStage, reason }],
  };
}

export type EconomicsInput = {
  months: number;
  startingCustomers: number;
  newCustomersPerMonth: number;
  monthlyPriceUsd: number;
  monthlyChurnRate: number;
  variableCostPerCustomerUsd: number;
  supportHoursPerCustomer: number;
  hourlyCostUsd: number;
  fixedCostUsd: number;
  acquisitionCostPerCustomerUsd: number;
};

export function modelIdeaEconomics(input: EconomicsInput) {
  for (const value of Object.values(input))
    if (!Number.isFinite(value) || value < 0)
      throw new Error("Scenario inputs must be finite and nonnegative.");
  if (
    !Number.isInteger(input.months) ||
    input.months < 1 ||
    input.months > 60 ||
    input.monthlyChurnRate > 1
  )
    throw new Error("Use 1–60 months and churn between 0 and 1.");
  let customers = input.startingCustomers;
  const rows = [];
  for (let month = 1; month <= input.months; month += 1) {
    const churned = customers * input.monthlyChurnRate;
    customers = customers - churned + input.newCustomersPerMonth;
    const grossRevenueUsd = customers * input.monthlyPriceUsd;
    const supportHours = customers * input.supportHoursPerCustomer;
    const operatingCostUsd =
      customers * input.variableCostPerCustomerUsd +
      supportHours * input.hourlyCostUsd +
      input.fixedCostUsd +
      input.newCustomersPerMonth * input.acquisitionCostPerCustomerUsd;
    rows.push({
      month,
      expectedCustomers: customers,
      churned,
      grossRevenueUsd,
      supportHours,
      operatingCostUsd,
      contributionUsd: grossRevenueUsd - operatingCostUsd,
    });
  }
  return {
    kind: "assumption_based_scenario" as const,
    rows,
    caveat:
      "Expected customer counts may be fractional. This is a scenario, not observed revenue or a forecast. Taxes, refunds, failed payments, and capacity constraints require separate inputs.",
  };
}

export const IDEA_KPIS = [
  {
    id: "paid_delivery",
    name: "Accepted paid deliveries",
    definition:
      "Unique orders with independently confirmed collected payment and buyer-accepted delivery, less canceled/refunded orders.",
    source: "Stripe payment status + service-order acceptance",
    measuredValue: null,
  },
  {
    id: "contribution",
    name: "Contribution after delivery",
    definition:
      "Collected revenue less refunds, payment fees, acquisition cost, API/vendor usage, and delivery/support labor for the same orders and period.",
    source: "Reconciled payment, cost, and time records",
    measuredValue: null,
  },
  {
    id: "retention",
    name: "Month-two paid retention",
    definition:
      "Eligible month-one paying customers with a successfully collected second-month payment divided by the eligible month-one cohort.",
    source: "Stripe invoice reconciliation by customer and cohort",
    measuredValue: null,
  },
] as const;

export function buildIdeaPacket(id: IdeaLane) {
  const workstream = IDEA_WORKSTREAMS.find((item) => item.id === id);
  if (!workstream) throw new Error("Unknown workstream.");
  const sources = IDEA_SOURCES.filter((item) => item.lanes.includes(id));
  return {
    schemaVersion: 1,
    createdOn: "2026-09-30",
    status: "specification_ready" as const,
    productStatus: "not_built" as const,
    workstream,
    sources,
    requiredReleaseChecks: RELEASE_CHECKS,
    run: newIdeaRun(id),
    currentToolScopes:
      id === "interactive" || id === "preview" ? TOOL_BUILDS : [],
    currentCareOptions:
      id === "interactive" || id === "marketing" ? MONTHLY_MENU : [],
    execution: {
      mode: "dry_run",
      maxConcurrentWorkers: 2,
      maxAttempts: 2,
      budgetUsd: 0,
      externalActionsEnabled: false,
    },
  };
}
