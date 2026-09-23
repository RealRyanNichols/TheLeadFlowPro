// Proposal generator: intake answers in, a scoped written proposal out.
//
// Everything with a price comes from lib/site/offers.ts. Everything with a
// deliverable comes from the offer's terms, the agency service registry,
// or the modules the intake itself selected. The client's own words are
// quoted, not paraphrased into claims. When something the proposal needs
// is missing (a TBD price, no business name), it is listed under
// `missing` so Ryan fixes it before sending. Nothing here sends anything.
//
// Two ways in. By default the offers come from the lead's interest or the
// agency intake's services. When Ryan picks offers with the lead on a call
// (the Call Closer's "Wants a proposal"), that selection replaces the
// interest mapping, because what they chose together beats what a form
// guessed. How the customer pays comes from lib/payDoors.ts, so the "To
// accept" lines print the same published link the Call Closer hands Ryan,
// and never promise an invoice for a build that costs nothing.
//
// This module must not import lib/callCloser.ts (which imports this one),
// and it imports no email, text, or messaging code.

import { AGENCY_SERVICES, OWNERSHIP_PROMISE, agencyOffer, agencyService, type AgencyService } from "../site/agency";
import { BUSINESS } from "../site/business";
import { TBD_PRICE_LABEL, offer, type Offer } from "../site/offers";
import { PRICES, usdPerMonth } from "../site/prices";
import {
  FREE_BUILD_ADD_ON_IDS,
  acceptanceLine,
  isCloserOfferId,
  payDoorFor,
  startsWithAcceptanceLine,
  type CloserOfferId,
  type PayDoor,
} from "../payDoors";
import { FREE_BUILD_HOSTING_LINE } from "../freeBuild";
import { LEAD_FOLLOW_UP } from "../leadFollowUp";

export type ProposalIntake = {
  leadId: string;
  createdAt: string;
  fullName: string;
  businessName: string | null;
  email: string | null;
  industry: string | null;
  websiteUrl: string | null;
  currentPlatform: string | null;
  interest: string | null;
  goals: string | null;
  budgetRange: string | null;
  timeline: string | null;
  desiredModules: string[] | null;
  diagnostic: Record<string, unknown> | null;
};

export type ProposalModule = { id: string; label: string };

export type Proposal = {
  preparedFor: { name: string; business: string | null };
  preparedBy: { name: string; operator: string; email: string; phone: string; legal: string };
  date: string;
  validUntil: string;
  /** The client's own words and the diagnostic's own labels. */
  problem: { quote: string | null; facts: string[] };
  recommended: { offerId: string; name: string; why: string }[];
  modules: ProposalModule[];
  deliverables: { source: string; items: string[] }[];
  clientOwns: string[];
  vendorCosts: string[];
  notIncluded: string[];
  price: { label: string; terms: string; status: Offer["status"]; offerId: string }[];
  acceptance: string[];
  /** Fix these before sending. Empty means ready for Ryan's review. */
  missing: string[];
  text: string;
};

const BUDGET_LABELS: Record<string, string> = {
  ads_0: "$0 right now",
  ads_under_500: "Under $500 a month",
  ads_500_1500: "$500 to $1,500 a month",
  ads_1500_5000: "$1,500 to $5,000 a month",
  ads_5000_plus: "$5,000 or more a month",
};

/** interest or package id → offer id. Unknown interests fall to the System Map. */
export function offerIdForInterest(interest: string | null): string | null {
  switch (interest) {
    case "launch_system":
    case "website_launch":
    case "launch":
      return "website_launch";
    case "blueprint":
    case "system_map":
      return "system_map";
    case "lead_engine":
      return "lead_engine";
    case "training_platform":
      return "training_platform";
    case "company_os":
    case "industry_os":
      return "company_os";
    case "custom_platform":
      return "custom_platform";
    case "free_website_program":
      return "free_website_program";
    case "done_for_you":
      return null; // agency: services decide
    default:
      return "system_map";
  }
}

function humanize(id: string): string {
  return id.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

function localDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Offers chosen on a call: at most this many make it into one proposal. */
export const MAX_PROPOSAL_SELECTION = 3;

const CHOSEN_ON_CALL = "Chosen with you on the call.";

/** Closer offers only, deduped, never a retired one, first three in the order given. */
function cleanSelection(selection: readonly unknown[] | null | undefined): CloserOfferId[] {
  const out: CloserOfferId[] = [];
  for (const id of selection ?? []) {
    if (out.length >= MAX_PROPOSAL_SELECTION) break;
    if (!isCloserOfferId(id) || out.includes(id) || !payDoorFor(id)) continue;
    out.push(id);
  }
  return out;
}

export type BuildProposalOptions = {
  /** Offer ids chosen with the lead on a call. Valid closer ids replace the interest mapping. */
  selection?: string[];
};

/** The free build and its paid add-ons: the first months of managed hosting are included. */
const FREE_BUILD_IDS: ReadonlySet<string> = new Set<string>(["free_website_program", ...FREE_BUILD_ADD_ON_IDS]);

/** "A", "A and B", "A, B and C", from offer names in the registry. */
function namesOf(ids: string[]): string {
  const names = ids.map((id) => offer(id).name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function lowerFirst(text: string): string {
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : text;
}

export function buildProposal(intake: ProposalIntake, now: Date, options: BuildProposalOptions = {}): Proposal {
  const missing: string[] = [];
  const d = intake.diagnostic ?? {};
  const labels = (d.labels ?? {}) as Record<string, unknown>;
  const rec = (d.recommendation ?? {}) as Record<string, unknown>;
  const isAgency = intake.interest === "done_for_you" || d.source === "agency_intake";
  const selection = cleanSelection(options.selection);

  // Problem: the client's words, then the diagnostic's own labels. No paraphrase.
  const facts: string[] = [];
  if (intake.industry) facts.push(`Industry: ${str(labels.industry) ?? intake.industry}`);
  if (str(labels.goal)) facts.push(`Main goal chosen: ${str(labels.goal)}`);
  if (str(labels.presence)) facts.push(`Current web presence: ${str(labels.presence)}`);
  else if (intake.currentPlatform) facts.push(`Current platform: ${intake.currentPlatform}`);
  if (intake.websiteUrl) facts.push(`Website: ${intake.websiteUrl}`);
  for (const s of strList(labels.stages)) facts.push(`Stage: ${s}`);
  if (intake.timeline) facts.push(`Timeline given: ${intake.timeline}`);
  if (intake.budgetRange) facts.push(`Budget range given: ${BUDGET_LABELS[intake.budgetRange] ?? intake.budgetRange}`);
  if (str(d.ad_budget)) facts.push(`Monthly ad budget they are prepared to spend: ${BUDGET_LABELS[String(d.ad_budget)] ?? String(d.ad_budget)}`);
  if (!intake.goals?.trim()) missing.push("The intake has no goals text. Ask the client what they want in their own words before sending.");
  if (!intake.businessName) missing.push("No business name on the lead. Add it before sending.");

  // Recommended offers and everything that hangs off them.
  const recommended: Proposal["recommended"] = [];
  const deliverables: Proposal["deliverables"] = [];
  const clientOwns = new Set<string>();
  const vendorCosts = new Set<string>();
  const notIncluded = new Set<string>();
  const price: Proposal["price"] = [];

  const addOffer = (o: Offer, why: string) => {
    if (recommended.some((r) => r.offerId === o.id)) return;
    recommended.push({ offerId: o.id, name: o.name, why });
    price.push({ label: o.priceLabel, terms: o.terms, status: o.status, offerId: o.id });
    if (o.status !== "live") missing.push(`${o.name} has no confirmed price (${TBD_PRICE_LABEL}). Set it in lib/site/offers.ts or write the number on the call before sending.`);
  };

  // Which kinds of work are on the page decides the ownership and cost lines.
  // The System Map is its own lane: a written diagnosis builds nothing, so on
  // its own it promises no code, domain, or hosting.
  let agencyLane = false;
  let buildLane = false;
  let followUpLane = false;
  let mapLane = false;
  // The builds on the page, by offer id: the free build and its add-ons come
  // with included hosting, a paid build does not.
  const buildIds: string[] = [];

  const addAgencyService = (s: AgencyService, why: string) => {
    agencyLane = true;
    if (recommended.some((r) => r.offerId === s.offerId)) return;
    addOffer(agencyOffer(s), why);
    deliverables.push({ source: s.name, items: [...s.included] });
    s.clientOwns.forEach((x) => clientOwns.add(x));
    s.clientPaysDirectly.forEach((x) => vendorCosts.add(x));
    s.notIncluded.forEach((x) => notIncluded.add(x));
  };
  const addWork = (o: Offer, why: string) => {
    if (recommended.some((r) => r.offerId === o.id)) return;
    if (o.id === "lead_followup_campaign") followUpLane = true;
    else if (o.id === "system_map") mapLane = true;
    else {
      buildLane = true;
      buildIds.push(o.id);
    }
    addOffer(o, why);
    deliverables.push({ source: o.name, items: [o.terms] });
  };

  if (selection.length) {
    // Chosen on the call. An agency offer brings its service's scope; the
    // Website Launch stays a build even though the agency lane sells it too.
    for (const id of selection) {
      const o = offer(id);
      const service = o.category === "agency" ? AGENCY_SERVICES.find((s) => s.offerId === id) : undefined;
      if (service) addAgencyService(service, CHOSEN_ON_CALL);
      else addWork(o, CHOSEN_ON_CALL);
    }
  } else if (isAgency) {
    agencyLane = true;
    const slugs = strList(d.services);
    if (slugs.length === 0) missing.push("Agency intake lists no services. Pick at least one before sending.");
    for (const slug of slugs) {
      const s = agencyService(slug);
      if (!s) continue;
      addAgencyService(s, s.promise);
    }
  } else {
    const primaryId = str(rec.package) ? offerIdForInterest(String(rec.package)) : offerIdForInterest(intake.interest);
    const primary = offer(primaryId ?? "system_map");
    const why = str(rec.package_name) ? `The guided intake recommended ${rec.package_name}.` : `Chosen from the interest on the lead (${intake.interest ?? "unsure"}).`;
    addWork(primary, why);
  }

  // Every larger build begins with the System Map, credited toward the build (its own terms say so).
  if (recommended.some((r) => payDoorFor(r.offerId)?.kind === "starts_with")) {
    addWork(offer("system_map"), "The build starts with the paid System Map, credited toward the approved build.");
  }

  if (agencyLane) OWNERSHIP_PROMISE.points.forEach((p) => clientOwns.add(p));
  if (buildLane) {
    clientOwns.add("The code, the domain, the hosting account, and every record created for you.");
    clientOwns.add("Every account the build touches is created in your name or moved into it before launch.");
    // A free build includes its first months of hosting (lib/freeBuild.ts); a
    // paid build is billed from launch. With both on the page, each line says
    // which build it covers.
    const freeIds = buildIds.filter((id) => FREE_BUILD_IDS.has(id));
    const paidIds = buildIds.filter((id) => !FREE_BUILD_IDS.has(id));
    const paidHosting = `${usdPerMonth(PRICES.hostingManagedMonthly)} managed, or ${usdPerMonth(PRICES.hostingWithEditsMonthly)} with two edits a month, billed by The LeadFlow Pro; or your own Vercel account at Vercel's price.`;
    if (paidIds.length && freeIds.length) {
      vendorCosts.add(`Hosting after launch for ${namesOf(paidIds)}: ${paidHosting}`);
      vendorCosts.add(`Hosting for ${namesOf(freeIds)}: ${lowerFirst(FREE_BUILD_HOSTING_LINE)}`);
    } else if (freeIds.length) {
      vendorCosts.add(FREE_BUILD_HOSTING_LINE);
    } else {
      vendorCosts.add(`Hosting after launch: ${paidHosting}`);
    }
    vendorCosts.add("Domain registration, email, and any software subscriptions the build connects to, paid by you to the vendor.");
  }
  if (mapLane) {
    // The System Map's package page: "If you do not, you keep the map." Its terms credit it toward a larger build.
    clientOwns.add("The written System Map, yours to keep whether or not you build.");
    if (!buildLane) {
      notIncluded.add("The build itself. Any build is scoped and priced separately, and the System Map price is credited toward an approved larger build.");
    }
  }
  if (followUpLane) {
    // The Follow-Up Campaign's own page (lib/leadFollowUp.ts): a document you own, sent from your own phone and email.
    clientOwns.add("The written follow-up, delivered as a document you own.");
    notIncluded.add("Sending the messages for you. Having them sent for you is a separate build.");
    // Worded against what is already listed: "None required" beside real vendor costs would contradict them.
    vendorCosts.add(
      vendorCosts.size === 0
        ? "None required. Every message is written so you can send it from the phone and email you already use."
        : `The ${offer("lead_followup_campaign").name} itself needs no software. Every message is written so you can send it from the phone and email you already use.`,
    );
  }
  if (mapLane && vendorCosts.size === 0) vendorCosts.add("None required for the System Map.");
  if (buildLane || followUpLane || mapLane) {
    notIncluded.add("Ad spend, subscriptions, and anything not written in the deliverables above.");
    notIncluded.add("A promise of a number of leads, a ranking, or a revenue result.");
  }

  // The free build costs nothing. Its paid add-ons are optional, each with its
  // registry price, confirmed in writing before a separate secure checkout.
  if (recommended.some((r) => r.offerId === "free_website_program")) {
    const extras = FREE_BUILD_ADD_ON_IDS.filter((id) => !recommended.some((r) => r.offerId === id))
      .map((id) => payDoorFor(id))
      .filter((door): door is PayDoor => door !== null);
    if (extras.length) {
      notIncluded.add(
        `Optional, priced separately: ${extras.map((x) => `${x.offerName} (${x.priceLabel})`).join(", ")}. Any add-on is confirmed in writing before a separate secure checkout.`,
      );
    }
  }

  // Modules: the intake's own selection, with the intake's own labels. They
  // belong to the offer the intake recommended. When offers chosen on a call
  // leave that offer out, the modules are not in the price, so they move out
  // of the deliverables: quoted as what the lead asked about, and listed as
  // scoped separately.
  const moduleIds = strList(rec.modules).length ? strList(rec.modules) : (intake.desiredModules ?? []);
  const moduleLabels = strList(rec.module_labels);
  const intakeModules: ProposalModule[] = moduleIds.map((id, i) => ({ id, label: moduleLabels[i] ?? humanize(id) }));
  const intakeOfferId = offerIdForInterest(str(rec.package) ?? intake.interest);
  const modulesCovered = selection.length === 0 || (intakeOfferId !== null && (selection as string[]).includes(intakeOfferId));
  const modules = modulesCovered ? intakeModules : [];
  if (modules.length) deliverables.push({ source: "Modules selected in the intake", items: modules.map((m) => m.label) });
  else if (intakeModules.length) {
    facts.push(`Modules asked about in the intake: ${intakeModules.map((m) => m.label).join(", ")}`);
    notIncluded.add("The modules listed in the intake. Each is scoped separately.");
  }

  // How to pay: one line per published pay door. A larger build's line
  // already carries the System Map link and price, so the map's own line is
  // left out beside it, and two larger builds share one line: one System Map
  // covers both, so the page never reads as two map payments.
  const acceptance: string[] = ["Reply to this proposal with the word Approved, or sign the written agreement that follows it."];
  const doors = recommended.map((r) => payDoorFor(r.offerId)).filter((door): door is PayDoor => door !== null);
  const builds = doors.filter((door) => door.kind === "starts_with");
  const mapFirst = builds.length > 0;
  for (const door of doors) {
    if (door.offerId === "system_map" && mapFirst) continue;
    if (door.kind === "starts_with" && door !== builds[0]) continue;
    const line = door.kind === "starts_with" ? startsWithAcceptanceLine(builds) : acceptanceLine(door);
    if (!acceptance.includes(line)) acceptance.push(line);
  }
  if (doors.length === 0) acceptance.push("An invoice for the first payment follows approval. Work begins when it clears.");
  if (doors.length > 0 && doors.every((door) => door.kind === "no_payment")) {
    acceptance.push("Intake begins after your application is approved and the written scope is agreed.");
  } else {
    // The Follow-Up Campaign has no kickoff call: after payment the buyer
    // fills in a short intake and it is written from that (lib/leadFollowUp.ts).
    const followUp = doors.find((door) => door.offerId === "lead_followup_campaign");
    if (followUp) {
      acceptance.push(`The ${followUp.offerName} is written within ${LEAD_FOLLOW_UP.turnaroundDays} business days of your intake landing.`);
    }
    const kickoffDoors = doors.filter((door) => door.kind !== "no_payment" && door.offerId !== "lead_followup_campaign");
    if (kickoffDoors.length > 0 || doors.length === 0) {
      acceptance.push("A kickoff call is scheduled within five business days of payment.");
    }
  }

  const date = localDate(now);
  const validUntil = localDate(new Date(now.getTime() + 30 * 86_400_000));

  const proposal: Proposal = {
    preparedFor: { name: intake.fullName, business: intake.businessName },
    preparedBy: { name: BUSINESS.name, operator: BUSINESS.operator, email: BUSINESS.email.hello, phone: BUSINESS.phone.display, legal: BUSINESS.dbaLine },
    date,
    validUntil,
    problem: { quote: intake.goals?.trim() || null, facts },
    recommended,
    modules,
    deliverables,
    clientOwns: [...clientOwns],
    vendorCosts: [...vendorCosts],
    notIncluded: [...notIncluded],
    price,
    acceptance,
    missing,
    text: "",
  };
  proposal.text = proposalText(proposal);
  return proposal;
}

export function proposalText(p: Proposal): string {
  const lines: string[] = [];
  lines.push(`Proposal for ${p.preparedFor.business ?? p.preparedFor.name}`, `Prepared for ${p.preparedFor.name} by ${p.preparedBy.operator}, ${p.preparedBy.name}`, `Date ${p.date}. Valid until ${p.validUntil}.`, "");
  lines.push("WHAT YOU TOLD US");
  if (p.problem.quote) lines.push(`"${p.problem.quote}"`);
  for (const f of p.problem.facts) lines.push(`- ${f}`);
  lines.push("", "RECOMMENDED");
  for (const r of p.recommended) lines.push(`- ${r.name}: ${r.why}`);
  if (p.modules.length) lines.push("", "MODULES", ...p.modules.map((m) => `- ${m.label}`));
  lines.push("", "DELIVERABLES");
  for (const d of p.deliverables) {
    lines.push(`${d.source}:`);
    for (const i of d.items) lines.push(`- ${i}`);
  }
  lines.push("", "WHAT YOU OWN", ...p.clientOwns.map((x) => `- ${x}`));
  lines.push("", "COSTS YOU PAY VENDORS DIRECTLY", ...p.vendorCosts.map((x) => `- ${x}`));
  if (p.notIncluded.length) lines.push("", "NOT INCLUDED", ...p.notIncluded.map((x) => `- ${x}`));
  lines.push("", "PRICE");
  for (const pr of p.price) lines.push(`- ${offer(pr.offerId).name}: ${pr.label}. ${pr.terms}`);
  lines.push("", "TO ACCEPT", ...p.acceptance.map((a, i) => `${i + 1}. ${a}`));
  lines.push("", `${p.preparedBy.legal}. ${p.preparedBy.email}. ${p.preparedBy.phone}.`);
  return lines.join("\n");
}

/** Which services exist for the agency lane, for the sample and the docs. */
export const AGENCY_SERVICE_SLUGS = AGENCY_SERVICES.map((s) => s.slug);
