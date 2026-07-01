export type LeadFlowComplianceCopyKey =
  | "notice_at_collection"
  | "one_seller_consent"
  | "multiple_named_sellers_consent"
  | "no_sale_no_sharing_footer"
  | "do_not_contact"
  | "delete_my_data"
  | "admt_access"
  | "admt_opt_out"
  | "email_marketing_footer"
  | "email_transactional_footer"
  | "mortgage_refi_disclaimer"
  | "age_gate";

export type LeadFlowComplianceCopyBlock = {
  key: LeadFlowComplianceCopyKey;
  label: string;
  placement: readonly string[];
  headline?: string;
  body: readonly string[];
  cta?: string;
  checkboxLabel?: string;
  shortFooter?: string;
};

export const LEADFLOW_COMPLIANCE_COPY_VERSION = "leadflow-compliance-copy-2026-07-01";

export const LEADFLOW_COMPLIANCE_COPY = [
  {
    key: "notice_at_collection",
    label: "Notice at Collection",
    placement: ["privacy center", "intake start", "seller selection", "account signup"],
    headline: "What we collect and why",
    body: [
      "We collect the answers, preferences, contact details, seller choices, and site actions you choose to give us.",
      "We use that information to build your preference map, score fit and urgency, route your request to the seller or sellers you select, prevent duplicates, honor privacy choices, and create anonymous or aggregated market insights.",
      "We do not ask for Social Security numbers, driver's license numbers, financial-account logins, biometrics, health information, race or ethnicity, religion, sexual orientation, political opinions, or information about children.",
      "If you choose a seller-routing option, we may share your identified request with the named seller or sellers shown to you. If you choose aggregate-only mode, we use your answers only in group-level insights that do not identify you.",
      "You can ask us to stop contact, opt out of sale or sharing, opt out of automated decisionmaking used for routing, or delete your data through the privacy controls.",
    ],
    cta: "Continue",
  },
  {
    key: "one_seller_consent",
    label: "Consent Copy for One Seller",
    placement: ["single-seller route", "exclusive lead checkout", "vertical intake"],
    headline: "Send this request to one seller",
    body: [
      "You are asking LeadFlow Pro to send your request to the seller named on this screen.",
      "That seller may contact you about this request using the contact methods you select.",
      "LeadFlow Pro may be paid for routing this request. We do not route identified leads by highest bidder alone. Routing must match the purpose you selected, the seller shown, your consent, and our eligibility rules.",
      "This is not a purchase, approval, quote, loan offer, or guarantee that the seller can help.",
      "You can revoke contact permission or ask us to delete your data later.",
    ],
    checkboxLabel:
      "I agree to send my request to the seller named here and allow that seller to contact me about this request.",
    cta: "Send to this seller",
  },
  {
    key: "multiple_named_sellers_consent",
    label: "Consent Copy for Multiple Named Sellers",
    placement: ["multi-seller route", "seller picker", "comparison flow"],
    headline: "Send this request to the sellers I selected",
    body: [
      "You are asking LeadFlow Pro to send your request to the sellers selected on this screen.",
      "Only the named sellers you select or clearly approve may receive your identified request.",
      "Those sellers may contact you about this request using the contact methods you select.",
      "LeadFlow Pro may be paid for routing requests. Payment can never override your seller choices, consent, eligibility rules, suppression settings, or our fairness rules.",
      "You can revoke contact permission, remove a seller, opt out of sale or sharing, or ask us to delete your data later.",
    ],
    checkboxLabel:
      "I agree to send my request to the named sellers I selected and allow those sellers to contact me about this request.",
    cta: "Send to selected sellers",
  },
  {
    key: "no_sale_no_sharing_footer",
    label: "No-Sale / No-Sharing Footer",
    placement: ["footer", "privacy center", "intake footer", "seller route footer"],
    body: [
      "No hidden sale. No hidden sharing.",
      "We do not sell or share your identified request unless you choose a seller-routing option and give permission for the named seller or sellers shown to you.",
      "Aggregate insight products are group-level reports. They must not include your name, contact details, raw answers, profile id, exact address, or any field designed to identify you.",
    ],
    shortFooter: "No hidden sale or sharing. Identified routing requires your seller choice and permission.",
  },
  {
    key: "do_not_contact",
    label: "Do-Not-Contact Language",
    placement: ["privacy center", "unsubscribe page", "seller contact preferences"],
    headline: "Stop contact",
    body: [
      "Use this if you do not want LeadFlow Pro or routed sellers to contact you about your request.",
      "After you submit this, we will stop marketing and lead follow-up contact tied to the information we can match.",
      "We may still send required transactional, security, privacy, or legal messages.",
      "We keep a limited suppression record so we can honor your request and avoid adding you back by mistake.",
    ],
    cta: "Stop contact",
  },
  {
    key: "delete_my_data",
    label: "Delete-My-Data Flow Copy",
    placement: ["privacy center", "account settings", "post-intake privacy link"],
    headline: "Delete my data",
    body: [
      "Tell us what email, phone number, or request you want us to find.",
      "We will verify the request, stop new routing while we review it, and delete or de-identify personal data we are not required to keep.",
      "Some records may be kept for a limited time when needed for security, fraud prevention, audit logs, legal obligations, refunds, or proof that we honored your privacy choices.",
      "Deleting your data does not automatically remove records already sent to a seller before your request, but we will record your suppression choice and, where available, notify routed sellers of the change.",
    ],
    cta: "Request deletion",
  },
  {
    key: "admt_access",
    label: "ADMT Access Copy",
    placement: ["privacy center", "score explanation", "data export"],
    headline: "How automated scoring may be used",
    body: [
      "LeadFlow Pro may use automated scoring to estimate lead quality, urgency, channel preference, likely objection, and partner fit.",
      "These scores are built from disclosed questionnaire answers, onsite first-party events, historical conversion outcomes, and partner eligibility rules.",
      "We do not use race, ethnicity, religion, health information, sexual orientation, political opinions, precise location, biometrics, government id numbers, financial-account access data, or proxies designed to infer those traits.",
      "You can ask for information about the score types used for your profile, the general factors that affected them, and whether a score affected routing, prioritization, eligibility, price, or outreach cadence.",
    ],
    cta: "Request score access",
  },
  {
    key: "admt_opt_out",
    label: "ADMT Opt-Out Copy",
    placement: ["privacy center", "score explanation", "routing consent"],
    headline: "Opt out of automated decisionmaking",
    body: [
      "Use this if you do not want automated scores to be used for decisions that affect routing, prioritization, eligibility, price, or outreach cadence.",
      "After you opt out, we will exclude matched profiles from scoring jobs used for those decisions and mark existing decision scores as stale or unavailable for routing.",
      "We may still use non-personal analytics, fraud prevention checks, manual review, and rules needed to honor your request.",
      "If a seller route still needs a decision, we will use consent, eligibility rules, your seller choice, and human review instead of predictive scoring.",
    ],
    cta: "Opt out of automated scoring decisions",
  },
  {
    key: "email_marketing_footer",
    label: "Email Footer for Marketing Messages",
    placement: ["marketing email", "newsletter", "seller marketplace email"],
    body: [
      "You are receiving this because you asked for LeadFlow Pro updates, submitted a LeadFlow Pro request, or interacted with a LeadFlow Pro page.",
      "LeadFlow Pro may send commercial emails about tools, data products, seller routes, and related services.",
      "Unsubscribe from marketing: {{unsubscribe_url}}",
      "Manage preferences: {{preferences_url}}",
      "REAL RYAN NICHOLS LLC / The LeadFlow Pro, {{physical_postal_address}}",
      "We honor marketing opt-out requests within 10 business days. You may still receive transactional, security, privacy, or legal messages.",
    ],
    shortFooter:
      "Unsubscribe: {{unsubscribe_url}} | Preferences: {{preferences_url}} | REAL RYAN NICHOLS LLC / The LeadFlow Pro, {{physical_postal_address}}",
  },
  {
    key: "email_transactional_footer",
    label: "Email Footer for Transactional Messages",
    placement: ["receipt", "privacy request", "security notice", "seller route confirmation"],
    body: [
      "This message is about a LeadFlow Pro request, account, privacy action, transaction, or security event.",
      "If this message also includes marketing content, you can opt out of marketing here: {{unsubscribe_url}}",
      "REAL RYAN NICHOLS LLC / The LeadFlow Pro, {{physical_postal_address}}",
    ],
    shortFooter:
      "Transactional notice from The LeadFlow Pro. Marketing opt-out: {{unsubscribe_url}}. Address: {{physical_postal_address}}",
  },
  {
    key: "mortgage_refi_disclaimer",
    label: "Mortgage / Refi Vertical Disclaimer",
    placement: ["mortgage intake", "mortgage result", "seller route confirmation", "email footer"],
    headline: "Mortgage and refinance requests",
    body: [
      "LeadFlow Pro is not making a loan offer, credit decision, preapproval, rate quote, or refinance recommendation.",
      "Unless a page clearly says otherwise, LeadFlow Pro is not acting as your lender, mortgage broker, loan originator, financial adviser, or credit counselor.",
      "If you choose a mortgage or refinance seller route, your request may be sent only to the named provider or providers you select or clearly approve.",
      "Rates, payments, APR, fees, terms, approval, and eligibility must be confirmed directly with a properly licensed mortgage professional.",
      "LeadFlow Pro may be paid for routing a permissioned request, but compensation cannot override your selected purpose, named-seller consent, eligibility rules, or fairness rules.",
      "Do not submit Social Security numbers, bank logins, full account numbers, driver's license numbers, or sensitive documents through a general LeadFlow intake unless a secure, lender-approved upload flow specifically asks for them.",
    ],
  },
  {
    key: "age_gate",
    label: "Child-Safety / Age Gating Copy",
    placement: ["first visit modal", "intake start", "privacy notice", "account signup"],
    headline: "Adults only",
    body: [
      "LeadFlow Pro is for adults 18 and older.",
      "Do not use this site if you are under 18.",
      "Do not submit information about a child, including a child's name, contact details, school, precise location, photos, account handles, or preferences.",
      "If we learn that child information was submitted through a general intake, we will stop routing it and delete or suppress it according to our child-safety workflow.",
      "A parent or guardian can contact us to request deletion of child information.",
    ],
    checkboxLabel: "I confirm I am 18 or older and will not submit information about a child.",
    cta: "I am 18 or older",
  },
] as const satisfies readonly LeadFlowComplianceCopyBlock[];

export function getLeadFlowComplianceCopy(key: LeadFlowComplianceCopyKey) {
  return LEADFLOW_COMPLIANCE_COPY.find((block) => block.key === key);
}
