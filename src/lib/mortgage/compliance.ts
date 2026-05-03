// src/lib/mortgage/compliance.ts
// Compliance Guard — the scanner that runs on every outbound message,
// disclosure, and referral inside Mortgage OS. Returns a verdict (green /
// yellow / red) plus a human explanation and a list of violations.
//
// This file is intentionally STAND-ALONE — no DB, no fetch. Pure functions
// so it can be unit-tested, run in an Edge Function, or run client-side
// inside the LO's draft-message UI for a live "compliance meter."

import { ComplianceTag, complianceFlagsForLoan, LoanType } from "@/lib/mortgage";

// ──────────────────────────────────────────────────────────────────────────
// Verdict shape
// ──────────────────────────────────────────────────────────────────────────
export type Verdict = "green" | "yellow" | "red";

export type ComplianceFlag = {
  rule: ComplianceTag | "PROFANITY" | "PROMISSORY" | "PROTECTED_CLASS" | "DISCRIMINATORY";
  level: Verdict;
  message: string;
  /** Optional: span of offending text */
  excerpt?: string;
};

export type ScanContext = {
  channel: "sms" | "email" | "voice_script" | "social" | "letter" | "in_app";
  state?: string;
  loanType?: LoanType;
  /** ISO timestamps */
  applicationDate?: string;
  loanEstimateIssuedAt?: string;
  closingScheduledAt?: string;
  closingDisclosureIssuedAt?: string;
  /** TCPA-related */
  tcpaConsent?: { capturedAt: string; ip?: string; source: string } | null;
  /** SAFE Act — must appear on LO outbound */
  loNmlsId?: string;
  loStateLicenses?: string[]; // e.g. ["TX-12345", "CA-98765"]
  loDisplayName?: string;
  /** ECOA */
  decisionType?: "approved" | "denied" | "withdrawn" | "incomplete" | null;
  decisionAt?: string;
  /** Free-text body being scanned */
  body: string;
  /** True if this is a referral/payment-related message */
  isReferral?: boolean;
};

export type ScanResult = {
  verdict: Verdict;
  flags: ComplianceFlag[];
  /** A short explanation suitable for the LO UI */
  summary: string;
  /** Suggested rewrites, where applicable */
  suggestions: string[];
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
const businessDays = (a: Date, b: Date): number => {
  let d = 0;
  const cur = new Date(a);
  while (cur < b) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) d++;
  }
  return d;
};

const containsAny = (body: string, words: string[]): string | null => {
  const b = body.toLowerCase();
  for (const w of words) {
    if (b.includes(w.toLowerCase())) return w;
  }
  return null;
};

// Forbidden / risky language registries
const PROMISSORY_TERMS = [
  "guaranteed approval", "guarantee approval", "guaranteed rate",
  "no questions asked", "100% approval", "we will close you",
  "lowest rate in the country", "lowest rate, period",
];

const PROTECTED_CLASS_TRIGGERS = [
  // ECOA Reg B / Fair Housing — never reference these in solicitations
  "married", "single mother", "single father",
  "race", "religion", "national origin", "ancestry",
  "disabled", "disability", "wheelchair", "elderly only",
  "christian", "muslim", "jewish",
  "english only", "must speak",
  "pregnant", "expecting",
];

const DISCRIMINATORY_PHRASES = [
  "perfect for a young couple", "ideal for retirees only",
  "no children", "adults only", "no kids",
];

const PROFANITY_BASIC = [
  "damn", "hell", "shit", "fuck", "bitch", "ass",
];

// ──────────────────────────────────────────────────────────────────────────
// Individual rule scanners
// ──────────────────────────────────────────────────────────────────────────

/** TCPA: SMS or auto-call requires logged consent. */
function checkTcpa(ctx: ScanContext): ComplianceFlag[] {
  if (ctx.channel !== "sms" && ctx.channel !== "voice_script") return [];
  if (!ctx.tcpaConsent || !ctx.tcpaConsent.capturedAt) {
    return [{
      rule: "TCPA_CONSENT",
      level: "red",
      message: "No TCPA consent on file. Automated SMS or auto-dial is prohibited.",
    }];
  }
  // STOP language requirement on first SMS
  if (ctx.channel === "sms" && !/stop\s+to\s+opt\s+out|reply\s+stop|text\s+stop/i.test(ctx.body)) {
    return [{
      rule: "TCPA_CONSENT",
      level: "yellow",
      message: "First-touch SMS should include opt-out language ('Reply STOP to opt out').",
    }];
  }
  return [];
}

/** SAFE Act: every LO outbound must include name, NMLS#, and state license. */
function checkSafeAct(ctx: ScanContext): ComplianceFlag[] {
  if (ctx.channel === "in_app") return [];
  const out: ComplianceFlag[] = [];
  if (!ctx.loNmlsId || !ctx.body.includes(ctx.loNmlsId)) {
    out.push({
      rule: "SAFE_NMLS_DISCLOSURE",
      level: "red",
      message: "Missing NMLS ID on outbound. SAFE Act requires NMLS# on every consumer-facing message.",
    });
  }
  if (ctx.state && ctx.loStateLicenses && !ctx.loStateLicenses.some((l) => l.toUpperCase().startsWith(ctx.state!.toUpperCase()))) {
    out.push({
      rule: "SAFE_NMLS_DISCLOSURE",
      level: "red",
      message: `LO is not licensed in ${ctx.state}. Outbound to a borrower in this state is prohibited.`,
    });
  }
  return out;
}

/** TILA: Loan Estimate must be issued within 3 business days of completed application. */
function checkLeTiming(ctx: ScanContext): ComplianceFlag[] {
  if (!ctx.applicationDate) return [];
  if (!ctx.loanEstimateIssuedAt) {
    const days = businessDays(new Date(ctx.applicationDate), new Date());
    if (days >= 3) {
      return [{
        rule: "TILA_LE_3DAY",
        level: "red",
        message: `Loan Estimate is overdue (${days} business days since application). TILA requires issuance within 3 business days.`,
      }];
    }
    if (days === 2) {
      return [{
        rule: "TILA_LE_3DAY",
        level: "yellow",
        message: "LE is due tomorrow (TILA 3-business-day rule). Send today to be safe.",
      }];
    }
  }
  return [];
}

/** TILA: CD must be received at least 3 business days before closing. */
function checkCdTiming(ctx: ScanContext): ComplianceFlag[] {
  if (!ctx.closingScheduledAt) return [];
  const close = new Date(ctx.closingScheduledAt);
  if (!ctx.closingDisclosureIssuedAt) {
    const days = businessDays(new Date(), close);
    if (days < 3) {
      return [{
        rule: "TILA_CD_3DAY",
        level: "red",
        message: `Closing in ${days} business days but no CD has been issued. TILA requires CD ≥ 3 business days pre-close.`,
      }];
    }
  } else {
    const days = businessDays(new Date(ctx.closingDisclosureIssuedAt), close);
    if (days < 3) {
      return [{
        rule: "TILA_CD_3DAY",
        level: "red",
        message: `CD issued only ${days} business days before closing. Re-disclose and reset closing date.`,
      }];
    }
  }
  return [];
}

/** ECOA Reg B: Adverse Action Notice within 30 days of denial/withdrawal. */
function checkAan(ctx: ScanContext): ComplianceFlag[] {
  if (ctx.decisionType !== "denied" && ctx.decisionType !== "withdrawn") return [];
  if (!ctx.decisionAt) return [];
  const days = Math.floor((Date.now() - new Date(ctx.decisionAt).getTime()) / 86_400_000);
  if (days >= 30) {
    return [{
      rule: "ECOA_AAN_30DAY",
      level: "red",
      message: `Adverse Action Notice is ${days - 30} day(s) overdue. ECOA Reg B requires AAN within 30 days of decision.`,
    }];
  }
  if (days >= 25) {
    return [{
      rule: "ECOA_AAN_30DAY",
      level: "yellow",
      message: `AAN due in ${30 - days} day(s). Generate now.`,
    }];
  }
  return [];
}

/** RESPA §8: detect kickback / referral-payment language. */
function checkRespa(ctx: ScanContext): ComplianceFlag[] {
  const triggers = ["kickback", "referral fee", "we'll pay you", "spiff", "thank-you bonus", "send me deals and i'll"];
  const hit = containsAny(ctx.body, triggers);
  if (hit) {
    return [{
      rule: "RESPA_8",
      level: "red",
      message: `RESPA §8 trigger detected: "${hit}". Anti-kickback statute prohibits exchanging value for settlement-service referrals.`,
      excerpt: hit,
    }];
  }
  if (ctx.isReferral) {
    return [{
      rule: "RESPA_8",
      level: "yellow",
      message: "Referral-flow message — verify there is no thing of value (gift, fee, marketing credit) tied to this referral.",
    }];
  }
  return [];
}

/** Texas A6 overlay: 12-day cooling off, 3% fee cap, equity caps on cash-out. */
function checkTxA6(ctx: ScanContext): ComplianceFlag[] {
  if (ctx.state?.toUpperCase() !== "TX") return [];
  if (ctx.loanType !== "refi_cashout") return [];
  const out: ComplianceFlag[] = [];
  if (!/12.day/i.test(ctx.body) && !/cooling/i.test(ctx.body) && !/notice\s+concerning\s+extensions/i.test(ctx.body)) {
    out.push({
      rule: "TX_A6_HOMEEQUITY",
      level: "yellow",
      message: "TX cash-out refi: outbound should reference the 12-day cooling-off period when discussing closing timeline.",
    });
  }
  return out;
}

/** Promissory & "guaranteed" language — UDAAP risk. */
function checkPromissory(body: string): ComplianceFlag[] {
  const hit = containsAny(body, PROMISSORY_TERMS);
  if (!hit) return [];
  return [{
    rule: "PROMISSORY",
    level: "red",
    message: `UDAAP risk: "${hit}" implies a guarantee. Mortgage terms cannot be guaranteed without underwriting.`,
    excerpt: hit,
  }];
}

/** Protected-class & discriminatory language — Fair Lending / Fair Housing. */
function checkProtectedClass(body: string): ComplianceFlag[] {
  const out: ComplianceFlag[] = [];
  const pcHit = containsAny(body, PROTECTED_CLASS_TRIGGERS);
  if (pcHit) {
    out.push({
      rule: "PROTECTED_CLASS",
      level: "yellow",
      message: `Protected-class reference detected: "${pcHit}". Avoid language that targets or excludes a protected class.`,
      excerpt: pcHit,
    });
  }
  const dHit = containsAny(body, DISCRIMINATORY_PHRASES);
  if (dHit) {
    out.push({
      rule: "DISCRIMINATORY",
      level: "red",
      message: `Fair Housing violation risk: "${dHit}". Re-write without demographic targeting.`,
      excerpt: dHit,
    });
  }
  return out;
}

/** Light profanity filter — yellow only, never blocks. */
function checkProfanity(body: string): ComplianceFlag[] {
  const hit = containsAny(body, PROFANITY_BASIC);
  if (!hit) return [];
  return [{
    rule: "PROFANITY",
    level: "yellow",
    message: `Casual language detected ("${hit}"). Consider rewording for a more professional tone.`,
    excerpt: hit,
  }];
}

// ──────────────────────────────────────────────────────────────────────────
// Public entry
// ──────────────────────────────────────────────────────────────────────────
export function scanOutbound(ctx: ScanContext): ScanResult {
  const flags: ComplianceFlag[] = [
    ...checkTcpa(ctx),
    ...checkSafeAct(ctx),
    ...checkLeTiming(ctx),
    ...checkCdTiming(ctx),
    ...checkAan(ctx),
    ...checkRespa(ctx),
    ...checkTxA6(ctx),
    ...checkPromissory(ctx.body),
    ...checkProtectedClass(ctx.body),
    ...checkProfanity(ctx.body),
  ];

  const verdict: Verdict = flags.some((f) => f.level === "red")
    ? "red"
    : flags.some((f) => f.level === "yellow")
    ? "yellow"
    : "green";

  const summary = verdict === "green"
    ? "Clean — clear to send."
    : verdict === "yellow"
    ? `${flags.filter((f) => f.level === "yellow").length} warning(s). Review before sending.`
    : `${flags.filter((f) => f.level === "red").length} blocker(s). Send is blocked until resolved.`;

  const suggestions = buildSuggestions(ctx, flags);

  return { verdict, flags, summary, suggestions };
}

function buildSuggestions(ctx: ScanContext, flags: ComplianceFlag[]): string[] {
  const out: string[] = [];
  if (flags.some((f) => f.rule === "SAFE_NMLS_DISCLOSURE" && f.message.includes("NMLS"))) {
    out.push(`Append your signature line including NMLS #${ctx.loNmlsId ?? "<your-nmls>"}.`);
  }
  if (flags.some((f) => f.rule === "TCPA_CONSENT" && f.level === "yellow")) {
    out.push('Add "Reply STOP to opt out. Standard rates may apply." to the end of the SMS.');
  }
  if (flags.some((f) => f.rule === "PROMISSORY")) {
    out.push('Replace "guaranteed" language with conditional ("estimated", "based on the information you provided").');
  }
  if (flags.some((f) => f.rule === "PROTECTED_CLASS" || f.rule === "DISCRIMINATORY")) {
    out.push("Re-write without references to age, family status, religion, race, national origin, or disability.");
  }
  if (flags.some((f) => f.rule === "TX_A6_HOMEEQUITY")) {
    out.push('Reference the 12-day cooling-off period: "Texas law requires a 12-day waiting period after application before closing."');
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Convenience: helper for the LO draft UI to surface what rules apply
// ──────────────────────────────────────────────────────────────────────────
export function applicableRulesForDraft(loanType: LoanType, state?: string): ComplianceTag[] {
  return complianceFlagsForLoan(loanType, state);
}

// ──────────────────────────────────────────────────────────────────────────
// HMDA / Fair Lending — strip protected-class data from free text exports
// ──────────────────────────────────────────────────────────────────────────
export function redactProtectedClassFromText(input: string): string {
  let out = input;
  for (const w of [...PROTECTED_CLASS_TRIGGERS, ...DISCRIMINATORY_PHRASES]) {
    out = out.replace(new RegExp(`\\b${w}\\b`, "ig"), "[REDACTED]");
  }
  return out;
}
