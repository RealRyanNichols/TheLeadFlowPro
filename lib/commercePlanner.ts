export const COMMERCE_PATHS = {
  products: {
    label: "Physical products",
    example: "A customer buys a product for shipping or pickup.",
    steps: [
      [
        "Show the product",
        "Photos, condition, stock, price, and a clear shipping or pickup choice.",
      ],
      [
        "Confirm the payment",
        "Verify the charge before reducing stock or calling the order paid.",
      ],
      [
        "Complete the handoff",
        "Send the receipt, track delivery or pickup, and keep the order record.",
      ],
    ],
    tools: [
      ["Check my margin", "/tools/profit-margin-calculator"],
      ["Compare card fees", "/tools/credit-card-fee-calculator"],
    ],
    modules: ["commerce_hub", "payments_checkout", "customer_portal"],
  },
  services: {
    label: "Services & appointments",
    example: "A customer asks for a quote and approves the work.",
    steps: [
      [
        "Capture the right details",
        "Collect the job, contact details, and preferred appointment time.",
      ],
      [
        "Approve the scope & deposit",
        "Put the deliverable, payment stages, and responsibilities in writing.",
      ],
      [
        "Deliver & follow up",
        "Keep the appointment, approvals, balance, and next task with the customer.",
      ],
    ],
    tools: [
      ["Draft estimate terms", "/tools/estimate-terms-generator"],
      ["Build a payment plan", "/tools/payment-plan-calculator"],
    ],
    modules: [
      "forms_tools",
      "payments_checkout",
      "booking_routing",
      "crm_pipeline",
    ],
  },
  digital: {
    label: "Downloads & training",
    example: "A customer buys a document kit or learning resource.",
    steps: [
      [
        "Let them try the result",
        "Show a useful preview and exactly which files or lessons the purchase includes.",
      ],
      [
        "Verify the purchase",
        "Use the confirmed payment to unlock the correct product.",
      ],
      [
        "Make access easy",
        "Deliver the files or lessons, a receipt, and a way to recover purchased access.",
      ],
    ],
    tools: [
      ["Make a digital business card", "/tools/digital-business-card"],
      ["Try a paid kit preview", "/tools/pro"],
    ],
    modules: [
      "commerce_hub",
      "payments_checkout",
      "courses_training",
      "customer_portal",
    ],
  },
} as const;

export type CommercePath = keyof typeof COMMERCE_PATHS;

export function commercePlanText(path: CommercePath, existing: string[]) {
  const plan = COMMERCE_PATHS[path];
  return [
    "MY COMMERCE BUILD LIST",
    "Prepared with The LeadFlow Pro • https://www.theleadflowpro.com/commerce",
    "",
    `I sell: ${plan.label}`,
    `Already in place: ${existing.length ? existing.join(", ") : "Starting fresh"}`,
    "",
    ...plan.steps.map(
      ([title, body], index) => `${index + 1}. ${title}\n${body}`,
    ),
    "",
    "A planning outline, not a quote or an installed integration.",
    "Next: review the current accounts, agree the scope, and test a complete customer journey.",
    "Do not include passwords, customer lists, or card information in an inquiry.",
  ].join("\n");
}
