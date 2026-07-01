export const LEADFLOW_CONSENT_VERSION = "leadflow-consent-2026-07-01";

export const leadFlowConsentTypes = [
  "tool_answers_only",
  "contact_me_about_result",
  "share_one_named_seller",
  "share_selected_sellers",
  "submit_lead_source_marketplace_review",
  "buyer_request_access",
  "do_not_contact",
  "delete_my_data",
] as const;

export type LeadFlowConsentType = (typeof leadFlowConsentTypes)[number];

export type LeadFlowConsentModuleDefinition = {
  type: LeadFlowConsentType;
  title: string;
  eyebrow: string;
  body: string;
  checkboxLabel: string;
  ctaLabel: string;
  mode: "analytics" | "contact" | "seller" | "source" | "buyer" | "suppression" | "deletion";
  requiresSellerId?: boolean;
  requiresSelectedSellerIds?: boolean;
  toolSlug?: string;
  guardrails: string[];
};

export const leadFlowConsentModules = [
  {
    type: "tool_answers_only",
    eyebrow: "Tool answers only",
    title: "Use my answers to show this result.",
    body:
      "LeadFlow Pro may use these answers to generate the result on this page, improve anonymous analytics, and build aggregate signal insight. This does not allow seller contact or identified routing.",
    checkboxLabel:
      "I agree to let LeadFlow Pro use these answers for this tool result and anonymous or aggregate insight only.",
    ctaLabel: "Save tool-only consent",
    mode: "analytics",
    toolSlug: "privacy-center",
    guardrails: [
      "No seller contact.",
      "No named seller routing.",
      "No raw answer release to buyers.",
    ],
  },
  {
    type: "contact_me_about_result",
    eyebrow: "Contact about result",
    title: "Contact me about this result.",
    body:
      "LeadFlow Pro may contact me about the result I requested, the problem I described, and the next step connected to this result. This does not allow third-party seller routing by itself.",
    checkboxLabel:
      "I agree that LeadFlow Pro may contact me about this specific result and the next step connected to it.",
    ctaLabel: "Save contact consent",
    mode: "contact",
    toolSlug: "privacy-center",
    guardrails: [
      "LeadFlow Pro contact only.",
      "No third-party seller contact from this module.",
      "Contact is tied to the result shown.",
    ],
  },
  {
    type: "share_one_named_seller",
    eyebrow: "One named seller",
    title: "Share this request with one named seller.",
    body:
      "LeadFlow Pro may share this identified request with the single seller named on the screen where this permission is requested. That seller may contact me about this request using the contact methods I selected.",
    checkboxLabel:
      "I agree to send this request to the one named seller shown here and allow that seller to contact me about this request.",
    ctaLabel: "Save one-seller consent",
    mode: "seller",
    requiresSellerId: true,
    toolSlug: "privacy-center",
    guardrails: [
      "Seller must be named before consent.",
      "No blanket phone or text routing.",
      "Highest bidder cannot override this selection.",
    ],
  },
  {
    type: "share_selected_sellers",
    eyebrow: "Selected sellers",
    title: "Share this request with selected sellers.",
    body:
      "LeadFlow Pro may share this identified request only with the sellers I selected or clearly approved on the seller-selection screen. Those sellers may contact me about this request using the contact methods I selected.",
    checkboxLabel:
      "I agree to send this request to the selected sellers shown here and allow those sellers to contact me about this request.",
    ctaLabel: "Save selected-seller consent",
    mode: "seller",
    requiresSelectedSellerIds: true,
    toolSlug: "privacy-center",
    guardrails: [
      "Selected sellers must be visible.",
      "No unnamed seller pool.",
      "Payment cannot override the user selection.",
    ],
  },
  {
    type: "submit_lead_source_marketplace_review",
    eyebrow: "Submit source",
    title: "Submit a lead source for marketplace review.",
    body:
      "LeadFlow Pro may review the source, label its provenance, score its usefulness, check suppression and compliance status, and decide whether it belongs in a sample, marketplace listing, or internal review queue.",
    checkboxLabel:
      "I confirm I have permission or lawful authority to submit this source for LeadFlow Pro marketplace review.",
    ctaLabel: "Save source-review consent",
    mode: "source",
    toolSlug: "submit-source",
    guardrails: [
      "No hacked or leaked data.",
      "No minors or protected-trait targeting.",
      "Review-gated before buyer release.",
    ],
  },
  {
    type: "buyer_request_access",
    eyebrow: "Buyer access",
    title: "Request access to a lead signal product.",
    body:
      "LeadFlow Pro may review my buyer request, verify the intended use, check eligibility, price access, and decide whether to provide a sample, aggregate insight, shared access, or exclusive access.",
    checkboxLabel:
      "I agree that LeadFlow Pro may review this buyer request and contact me about access to the selected signal product.",
    ctaLabel: "Save buyer-access consent",
    mode: "buyer",
    toolSlug: "marketplace",
    guardrails: [
      "No raw private answers by default.",
      "Buyer use case must match the release mode.",
      "Suppressed or deleted profiles stay blocked.",
    ],
  },
  {
    type: "do_not_contact",
    eyebrow: "Do not contact",
    title: "Do not contact me.",
    body:
      "LeadFlow Pro will record a suppression request for the information it can match and stop marketing or lead follow-up contact tied to that match. Required transactional, security, privacy, or legal messages may still be sent.",
    checkboxLabel:
      "I want LeadFlow Pro to record a do-not-contact request for the information it can match.",
    ctaLabel: "Save do-not-contact request",
    mode: "suppression",
    toolSlug: "privacy-center",
    guardrails: [
      "Creates a suppression record.",
      "Stops matched marketing or lead follow-up.",
      "Kept long enough to honor the request.",
    ],
  },
  {
    type: "delete_my_data",
    eyebrow: "Delete my data",
    title: "Delete my data.",
    body:
      "LeadFlow Pro will record a deletion request, pause new routing where a match is found, verify the request, and delete or de-identify personal data that is not required for security, legal, audit, fraud-prevention, suppression, or transaction records.",
    checkboxLabel:
      "I want LeadFlow Pro to record a deletion request for the information it can match.",
    ctaLabel: "Save deletion request",
    mode: "deletion",
    toolSlug: "privacy-center",
    guardrails: [
      "Stops new routing after a match.",
      "Verification may be required.",
      "Suppression proof may be retained.",
    ],
  },
] as const satisfies readonly LeadFlowConsentModuleDefinition[];

export function getLeadFlowConsentModule(
  type: LeadFlowConsentType,
): LeadFlowConsentModuleDefinition | undefined {
  return leadFlowConsentModules.find((module) => module.type === type);
}

export function leadFlowConsentText(module: LeadFlowConsentModuleDefinition) {
  return [
    module.title,
    module.body,
    module.checkboxLabel,
    `Version: ${LEADFLOW_CONSENT_VERSION}`,
  ].join("\n\n");
}
