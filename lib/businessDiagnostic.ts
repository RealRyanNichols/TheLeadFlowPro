export const BUSINESS_DIAGNOSTIC_VERSION = 1;
export const BUSINESS_DIAGNOSTIC_SOURCE = "business_growth_diagnostic";
export const BUSINESS_DIAGNOSTIC_CAMPAIGN = "business_growth_diagnostic_7d";

export type DiagnosticAnswer = string | string[] | boolean;
export type DiagnosticAnswers = Record<string, DiagnosticAnswer | undefined>;

export type DiagnosticOption = {
  value: string;
  label: string;
};

export type DiagnosticField = {
  id: string;
  label: string;
  help?: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "url"
    | "textarea"
    | "select"
    | "multi"
    | "checkbox";
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  options?: DiagnosticOption[];
  showIf?: (answers: DiagnosticAnswers) => boolean;
};

export type DiagnosticSection = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  core?: boolean;
  fields: DiagnosticField[];
};

const option = (value: string, label: string): DiagnosticOption => ({ value, label });

const yesNoUnknown = [
  option("yes", "Yes"),
  option("no", "No"),
  option("unknown", "I am not sure"),
];

const presenceOptions = [
  option("active_with_access", "Active and I control it"),
  option("active_without_access", "Active, but I do not control it"),
  option("not_created", "Not created yet"),
  option("inactive", "Inactive"),
  option("unknown", "I am not sure"),
];

export function answerString(answers: DiagnosticAnswers, id: string): string {
  const value = answers[id];
  return typeof value === "string" ? value.trim() : "";
}

export function answerList(answers: DiagnosticAnswers, id: string): string[] {
  const value = answers[id];
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function isAnswered(value: DiagnosticAnswer | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().length > 0;
  return Array.isArray(value) && value.length > 0;
}

function hasAny(answers: DiagnosticAnswers, id: string, values: string[]) {
  const current = answerList(answers, id);
  return values.some((value) => current.includes(value));
}

function websiteNeedsDetail(answers: DiagnosticAnswers) {
  return ["needs_improvement", "partly_broken", "locked", "under_construction"].includes(
    answerString(answers, "website_state"),
  );
}

function isShopify(answers: DiagnosticAnswers) {
  return (
    answerString(answers, "website_platform") === "shopify" ||
    hasAny(answers, "help_categories", ["shopify_ecommerce"])
  );
}

function hasWebsite(answers: DiagnosticAnswers) {
  const state = answerString(answers, "website_state");
  return state !== "" && state !== "no_site";
}

export const BUSINESS_DIAGNOSTIC_SECTIONS: DiagnosticSection[] = [
  {
    id: "business",
    shortTitle: "Business",
    title: "You and your business",
    description:
      "Start with the basics so we know who you serve, what you offer, and who should be part of the conversation.",
    core: true,
    fields: [
      {
        id: "full_name",
        label: "Your full name",
        type: "text",
        required: true,
        maxLength: 200,
        placeholder: "First and last name",
      },
      {
        id: "email",
        label: "Best email for this request",
        type: "email",
        required: true,
        maxLength: 200,
        placeholder: "you@business.com",
      },
      {
        id: "phone",
        label: "Best phone number",
        type: "tel",
        maxLength: 50,
        placeholder: "Optional unless you prefer a call or text",
      },
      {
        id: "preferred_contact_method",
        label: "How should we contact you?",
        type: "select",
        required: true,
        options: [option("email", "Email"), option("call", "Phone call"), option("text", "Text")],
      },
      {
        id: "best_contact_window",
        label: "Best days and times to reach you",
        type: "text",
        maxLength: 300,
        placeholder: "Example: weekdays after 3 PM Central",
      },
      {
        id: "business_name",
        label: "Business or organization name",
        type: "text",
        required: true,
        maxLength: 200,
      },
      {
        id: "job_title",
        label: "Your role in the business",
        type: "text",
        required: true,
        maxLength: 150,
        placeholder: "Owner, manager, marketing director, etc.",
      },
      {
        id: "decision_role",
        label: "What role do you have in approving this project?",
        type: "select",
        required: true,
        options: [
          option("decision_maker", "I can approve it"),
          option("co_decision_maker", "I approve it with someone else"),
          option("researcher", "I am gathering options"),
          option("employee", "I am bringing this to the decision maker"),
        ],
      },
      {
        id: "other_decision_makers",
        label: "Who else should be involved?",
        type: "text",
        maxLength: 500,
        placeholder: "Names, roles, and the best time to include them",
        showIf: (answers) => answerString(answers, "decision_role") !== "decision_maker",
      },
      {
        id: "industry",
        label: "What industry are you in?",
        type: "select",
        required: true,
        options: [
          option("local_service", "Local or home services"),
          option("professional_services", "Professional services"),
          option("ecommerce", "Ecommerce or product brand"),
          option("retail", "Retail"),
          option("real_estate", "Real estate, mortgage, title, or insurance"),
          option("education", "Education, training, or coaching"),
          option("health_dental", "Health, dental, or medical"),
          option("events_hospitality", "Events, venue, or hospitality"),
          option("media_nonprofit", "Media, publishing, nonprofit, or ministry"),
          option("software", "Software or digital platform"),
          option("other", "Something else"),
        ],
      },
      {
        id: "business_model",
        label: "How does the business sell?",
        type: "multi",
        required: true,
        options: [
          option("local_service", "Local services"),
          option("b2b", "Business to business"),
          option("b2c", "Business to consumer"),
          option("ecommerce", "Online store"),
          option("appointments", "Appointments or bookings"),
          option("education", "Courses or training"),
          option("membership", "Membership or subscription"),
          option("other", "Other"),
        ],
      },
      {
        id: "city_state",
        label: "Where is the business based?",
        type: "text",
        required: true,
        maxLength: 200,
        placeholder: "City and state",
      },
      {
        id: "service_area",
        label: "Where do you serve customers?",
        type: "text",
        maxLength: 500,
        placeholder: "Cities, counties, states, or countries",
      },
      {
        id: "employee_count",
        label: "Approximate team size",
        type: "select",
        options: [
          option("solo", "Just me"),
          option("2_5", "2 to 5"),
          option("6_15", "6 to 15"),
          option("16_50", "16 to 50"),
          option("51_plus", "51 or more"),
        ],
      },
      {
        id: "website_url",
        label: "Website, store, or main selling profile",
        type: "url",
        maxLength: 500,
        placeholder: "https://",
      },
    ],
  },
  {
    id: "goals",
    shortTitle: "Goals",
    title: "What needs to change",
    description:
      "Tell us what is broken, stuck, or costing you opportunities and what a real win would look like.",
    core: true,
    fields: [
      {
        id: "help_categories",
        label: "What would you like help with?",
        type: "multi",
        required: true,
        options: [
          option("website_repair", "Repair or improve an existing website"),
          option("new_website", "Build a new website"),
          option("shopify_ecommerce", "Shopify or ecommerce"),
          option("lead_generation", "Lead generation"),
          option("crm", "CRM and lead tracking"),
          option("follow_up", "Follow-up automation"),
          option("ai_agents", "AI agents"),
          option("ads", "Paid advertising"),
          option("social_media", "Social media foundation"),
          option("content", "Content and visibility"),
          option("analytics", "Analytics and reporting"),
          option("operations", "Operations and connected systems"),
          option("other", "Something else"),
        ],
      },
      {
        id: "situation_summary",
        label: "In your own words, what is happening right now?",
        type: "textarea",
        required: true,
        maxLength: 3000,
        rows: 5,
        placeholder: "What changed, what is not working, and how it affects the business",
      },
      {
        id: "primary_problem",
        label: "What is the single biggest problem to solve first?",
        type: "textarea",
        required: true,
        maxLength: 2000,
        rows: 4,
      },
      {
        id: "desired_outcome",
        label: "What result do you want from this project?",
        type: "textarea",
        required: true,
        maxLength: 2000,
        rows: 4,
      },
      {
        id: "goal_types",
        label: "Which outcomes matter most? Choose up to three.",
        type: "multi",
        required: true,
        options: [
          option("more_revenue", "More revenue"),
          option("more_leads", "More qualified leads"),
          option("better_conversion", "Better conversion"),
          option("more_visibility", "More visibility"),
          option("less_manual_work", "Less manual work"),
          option("faster_response", "Faster response"),
          option("repair_systems", "Repair broken systems"),
          option("time_freedom", "More time freedom"),
        ],
      },
      {
        id: "success_definition",
        label: "Ninety days from now, what would make you say this worked?",
        type: "textarea",
        required: true,
        maxLength: 2000,
        rows: 4,
      },
      {
        id: "why_now",
        label: "Why are you addressing this now?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
      },
      {
        id: "timeframe",
        label: "When do you need progress to begin?",
        type: "select",
        required: true,
        options: [
          option("emergency", "This is affecting the business right now"),
          option("7_days", "Within 7 days"),
          option("30_days", "Within 30 days"),
          option("60_90_days", "Within 60 to 90 days"),
          option("exploring", "I am exploring options"),
        ],
      },
      {
        id: "fixed_deadline",
        label: "Is there a launch, event, promotion, or hard deadline?",
        type: "text",
        maxLength: 500,
        placeholder: "Date and what must be ready",
      },
      {
        id: "estimated_problem_cost",
        label: "What is this problem costing in lost time, leads, or revenue?",
        type: "select",
        options: [
          option("unknown", "I do not know yet"),
          option("under_500", "Under $500 per month"),
          option("500_2500", "$500 to $2,500 per month"),
          option("2500_10000", "$2,500 to $10,000 per month"),
          option("10000_plus", "$10,000 or more per month"),
          option("business_critical", "It is business critical, but hard to price"),
        ],
      },
      {
        id: "previous_attempts",
        label: "What have you already tried? What worked or failed?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
      },
    ],
  },
  {
    id: "offer",
    shortTitle: "Offer",
    title: "Your customers and offer",
    description:
      "Give us enough business context to recommend a system around what you actually sell, not a generic template.",
    core: true,
    fields: [
      {
        id: "main_offer",
        label: "What do you sell, and what does it help customers achieve?",
        type: "textarea",
        required: true,
        maxLength: 2500,
        rows: 4,
      },
      {
        id: "ideal_customer",
        label: "Who is your best-fit customer?",
        type: "textarea",
        required: true,
        maxLength: 2000,
        rows: 4,
      },
      {
        id: "customer_geography",
        label: "Where are those customers located?",
        type: "text",
        required: true,
        maxLength: 500,
      },
      {
        id: "revenue_model",
        label: "How do customers pay you?",
        type: "multi",
        required: true,
        options: [
          option("one_time", "One-time purchase"),
          option("project", "Project or contract"),
          option("recurring", "Recurring or membership"),
          option("ecommerce", "Ecommerce checkout"),
          option("financing", "Financing or payment plan"),
          option("other", "Other"),
        ],
      },
      {
        id: "average_sale_value",
        label: "Approximate average sale or customer value",
        type: "select",
        options: [
          option("under_100", "Under $100"),
          option("100_500", "$100 to $500"),
          option("500_2500", "$500 to $2,500"),
          option("2500_10000", "$2,500 to $10,000"),
          option("10000_plus", "$10,000 or more"),
          option("prefer_not", "Prefer not to say"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "monthly_revenue_range",
        label: "Approximate monthly revenue",
        help: "Optional. This helps us size the recommendation, but declining does not lower your fit.",
        type: "select",
        options: [
          option("pre_revenue", "Pre-revenue"),
          option("under_5000", "Under $5,000"),
          option("5000_25000", "$5,000 to $25,000"),
          option("25000_100000", "$25,000 to $100,000"),
          option("100000_plus", "$100,000 or more"),
          option("prefer_not", "Prefer not to say"),
        ],
      },
      {
        id: "capacity_status",
        label: "Could you currently handle more customers?",
        type: "select",
        options: [
          option("yes", "Yes"),
          option("somewhat", "Somewhat"),
          option("no", "Not without changing operations"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "highest_value_offers",
        label: "Which products or services are most profitable or important?",
        type: "textarea",
        maxLength: 2000,
        rows: 3,
      },
      {
        id: "seasonality",
        label: "Are there busy seasons or timing constraints?",
        type: "textarea",
        maxLength: 1000,
        rows: 3,
      },
    ],
  },
  {
    id: "website",
    shortTitle: "Website",
    title: "Website and ecommerce",
    description:
      "Tell us what you own, what you can access, and what is broken. Never put a password or access key in this form.",
    fields: [
      {
        id: "website_state",
        label: "Which best describes your website?",
        type: "select",
        options: [
          option("no_site", "We do not have one"),
          option("working", "Working well"),
          option("needs_improvement", "Working, but needs improvement"),
          option("partly_broken", "Partly broken"),
          option("locked", "Locked or inaccessible"),
          option("under_construction", "Under construction"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "website_platform",
        label: "What platform is it built on?",
        type: "select",
        showIf: hasWebsite,
        options: [
          option("shopify", "Shopify"),
          option("wordpress", "WordPress"),
          option("wix", "Wix"),
          option("squarespace", "Squarespace"),
          option("webflow", "Webflow"),
          option("custom", "Custom code"),
          option("other", "Other"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "website_purpose",
        label: "What should the website do for the business?",
        type: "multi",
        options: [
          option("leads", "Generate leads"),
          option("calls", "Drive phone calls"),
          option("bookings", "Book appointments"),
          option("ecommerce", "Sell products"),
          option("applications", "Collect applications"),
          option("education", "Deliver education"),
          option("membership", "Serve members or customers"),
        ],
      },
      {
        id: "website_issue_types",
        label: "What is currently wrong?",
        type: "multi",
        showIf: websiteNeedsDetail,
        options: [
          option("homepage", "Homepage"),
          option("mobile", "Mobile experience"),
          option("speed", "Speed"),
          option("design", "Design"),
          option("navigation", "Navigation"),
          option("forms", "Forms"),
          option("checkout", "Cart or checkout"),
          option("content", "Content"),
          option("seo", "Search visibility"),
          option("tracking", "Analytics or tracking"),
          option("admin_access", "Admin access"),
          option("custom_code", "Custom code"),
          option("other", "Other"),
        ],
      },
      {
        id: "website_issue_detail",
        label: "Describe what is broken, locked, or underperforming",
        type: "textarea",
        maxLength: 3500,
        rows: 5,
        showIf: websiteNeedsDetail,
      },
      {
        id: "domain_control",
        label: "Do you control the domain and DNS account?",
        type: "select",
        showIf: hasWebsite,
        options: [
          option("full", "Yes, fully"),
          option("partial", "Partly"),
          option("no", "No"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "admin_access_status",
        label: "Do you have owner or administrator access?",
        type: "select",
        showIf: hasWebsite,
        options: [
          option("full", "Full owner or admin access"),
          option("partial", "Partial or staff access"),
          option("none", "No access"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "previous_provider_context",
        label: "Was an employee, developer, or agency previously managing it?",
        type: "textarea",
        maxLength: 2000,
        rows: 3,
        showIf: hasWebsite,
        placeholder: "Who changed it, what they controlled, and what happened when they left",
      },
      {
        id: "backup_repository_status",
        label: "Are there backups, theme copies, or a source-code repository?",
        type: "select",
        showIf: hasWebsite,
        options: yesNoUnknown,
      },
      {
        id: "shopify_store_status",
        label: "Is the Shopify storefront currently usable?",
        type: "select",
        showIf: isShopify,
        options: [
          option("working", "Fully working"),
          option("partial", "Partly working"),
          option("unavailable", "Unavailable"),
          option("password_locked", "Password locked"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "shopify_owner_access",
        label: "Do you have Shopify store-owner access?",
        type: "select",
        showIf: isShopify,
        options: [
          option("owner", "Yes, store owner"),
          option("staff", "Staff access only"),
          option("none", "No access"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "authorized_to_modify",
        label: "I am authorized to approve changes to this store",
        type: "checkbox",
        showIf: isShopify,
      },
      {
        id: "former_developer_code",
        label: "What did the former employee or developer change?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
        showIf: isShopify,
      },
      {
        id: "broken_store_areas",
        label: "Which areas are affected?",
        type: "multi",
        showIf: isShopify,
        options: [
          option("homepage", "Homepage"),
          option("navigation", "Navigation"),
          option("products", "Product pages"),
          option("cart", "Cart"),
          option("checkout", "Checkout"),
          option("payments", "Payments"),
          option("apps", "Apps and integrations"),
          option("mobile", "Mobile"),
          option("admin", "Admin area"),
          option("other", "Other"),
        ],
      },
      {
        id: "checkout_status",
        label: "Can customers place and pay for orders right now?",
        type: "select",
        showIf: isShopify,
        options: [
          option("yes", "Yes"),
          option("partial", "Sometimes or with problems"),
          option("no", "No"),
          option("unknown", "I am not sure"),
        ],
      },
      {
        id: "theme_backup_status",
        label: "Is there a clean theme backup or last-known-good copy?",
        type: "select",
        showIf: isShopify,
        options: yesNoUnknown,
      },
      {
        id: "shopify_rescue_priorities",
        label: "What must be fixed first, and what improvements come next?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
        showIf: isShopify,
      },
    ],
  },
  {
    id: "presence",
    shortTitle: "Visibility",
    title: "Online presence and content",
    description:
      "Show us where customers can currently find you and which business pages you actually control.",
    fields: [
      {
        id: "facebook_page_status",
        label: "Facebook business Page",
        type: "select",
        options: presenceOptions,
      },
      {
        id: "facebook_url",
        label: "Facebook Page link",
        type: "url",
        maxLength: 500,
        showIf: (answers) => answerString(answers, "facebook_page_status").startsWith("active"),
      },
      {
        id: "youtube_status",
        label: "YouTube channel",
        type: "select",
        options: presenceOptions,
      },
      {
        id: "youtube_url",
        label: "YouTube channel link",
        type: "url",
        maxLength: 500,
        showIf: (answers) => answerString(answers, "youtube_status").startsWith("active"),
      },
      {
        id: "google_business_status",
        label: "Google Business Profile",
        type: "select",
        options: presenceOptions,
      },
      {
        id: "instagram_status",
        label: "Instagram",
        type: "select",
        options: presenceOptions,
      },
      {
        id: "tiktok_status",
        label: "TikTok",
        type: "select",
        options: presenceOptions,
      },
      {
        id: "posting_frequency",
        label: "How often are you currently posting?",
        type: "select",
        options: [
          option("never", "Never"),
          option("occasionally", "Occasionally"),
          option("weekly", "A few times a week"),
          option("daily", "Daily"),
          option("multiple_daily", "Multiple times a day"),
        ],
      },
      {
        id: "content_assets_status",
        label: "Which usable assets already exist?",
        type: "multi",
        options: [
          option("logo", "Logo"),
          option("photos", "Real business photos"),
          option("videos", "Video"),
          option("testimonials", "Testimonials"),
          option("brand_guide", "Brand guide"),
          option("case_studies", "Case studies"),
          option("none", "None yet"),
        ],
      },
      {
        id: "email_list_status",
        label: "Do you have an email list?",
        type: "text",
        maxLength: 300,
        placeholder: "No, unknown, or approximate size and platform",
      },
      {
        id: "active_ads",
        label: "Are you currently running paid ads?",
        type: "select",
        options: yesNoUnknown,
      },
      {
        id: "ad_details",
        label: "Where are the ads running and what results are you seeing?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
        showIf: (answers) => answerString(answers, "active_ads") === "yes",
        placeholder: "Platforms, monthly spend, leads, cost per lead, and what is being tracked",
      },
      {
        id: "best_marketing_sources",
        label: "Where do your best customers currently find you?",
        type: "multi",
        options: [
          option("referrals", "Referrals"),
          option("google", "Google"),
          option("facebook", "Facebook"),
          option("youtube", "YouTube"),
          option("tiktok", "TikTok"),
          option("paid_ads", "Paid ads"),
          option("events", "Events or networking"),
          option("marketplaces", "Marketplaces or directories"),
          option("unknown", "I do not know"),
        ],
      },
    ],
  },
  {
    id: "leads",
    shortTitle: "Leads",
    title: "Leads, sales, and follow-up",
    description:
      "Walk us through what happens from the first call, form, or message until somebody becomes a customer.",
    fields: [
      {
        id: "lead_channels",
        label: "How do leads contact you?",
        type: "multi",
        options: [
          option("calls", "Phone calls"),
          option("texts", "Text messages"),
          option("email", "Email"),
          option("website_forms", "Website forms"),
          option("messenger", "Facebook Messenger"),
          option("social_dms", "Social DMs"),
          option("walk_ins", "Walk-ins"),
          option("referrals", "Referrals"),
          option("other", "Other"),
        ],
      },
      {
        id: "monthly_lead_volume",
        label: "Approximate leads per month",
        type: "select",
        options: [
          option("0_10", "0 to 10"),
          option("11_30", "11 to 30"),
          option("31_100", "31 to 100"),
          option("101_plus", "More than 100"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "lead_response_time",
        label: "How quickly does someone usually respond?",
        type: "select",
        options: [
          option("immediate", "Within a few minutes"),
          option("15_minutes", "Within 15 minutes"),
          option("1_hour", "Within an hour"),
          option("same_day", "Same day"),
          option("next_day", "The next day or later"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "missed_lead_frequency",
        label: "How often are calls, messages, or forms missed?",
        type: "select",
        options: [
          option("never", "Almost never"),
          option("sometimes", "Sometimes"),
          option("often", "Often"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "crm_status",
        label: "Where are leads tracked?",
        type: "select",
        options: [
          option("crm", "A CRM"),
          option("spreadsheet", "A spreadsheet"),
          option("inboxes", "Separate inboxes"),
          option("paper", "Paper or handwritten notes"),
          option("nowhere", "Nowhere consistently"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "crm_platform",
        label: "Which CRM do you use?",
        type: "text",
        maxLength: 300,
        showIf: (answers) => answerString(answers, "crm_status") === "crm",
      },
      {
        id: "lead_capture_process",
        label: "Do all lead sources enter one system automatically?",
        type: "select",
        options: [
          option("yes", "Yes"),
          option("partial", "Some do"),
          option("no", "No"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "follow_up_process",
        label: "What happens after a new lead comes in?",
        type: "textarea",
        maxLength: 3000,
        rows: 5,
      },
      {
        id: "sales_owner",
        label: "Who follows up and closes business?",
        type: "select",
        options: [
          option("owner", "Owner"),
          option("employee", "One employee"),
          option("team", "Sales or office team"),
          option("unassigned", "Nobody is consistently assigned"),
        ],
      },
      {
        id: "biggest_lead_leak",
        label: "Where do you believe the largest lead leak is today?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
        placeholder: "If you do not know, tell us that. Finding it is part of the review.",
      },
    ],
  },
  {
    id: "operations",
    shortTitle: "Operations",
    title: "Systems, operations, and automation",
    description:
      "Show us where software, repetitive work, and handoffs are consuming more time than they should.",
    fields: [
      {
        id: "current_tools",
        label: "What software does the business currently rely on?",
        type: "textarea",
        maxLength: 3000,
        rows: 4,
        placeholder: "Tool name and what it is used for",
      },
      {
        id: "manual_tasks",
        label: "Which repetitive tasks take the most time?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
      },
      {
        id: "estimated_wasted_hours",
        label: "Approximate hours lost each week",
        type: "select",
        options: [
          option("under_5", "Under 5 hours"),
          option("5_10", "5 to 10 hours"),
          option("11_25", "11 to 25 hours"),
          option("26_plus", "26 or more hours"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "handoff_problems",
        label: "Where do people, data, or tasks fall through the cracks?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
      },
      {
        id: "automation_goals",
        label: "What would you most like to happen automatically?",
        type: "multi",
        options: [
          option("lead_reply", "Reply to new leads"),
          option("lead_routing", "Qualify and route leads"),
          option("appointments", "Book appointments"),
          option("follow_up", "Follow up over time"),
          option("content", "Prepare or publish content"),
          option("customer_updates", "Send customer updates"),
          option("payments", "Collect payments"),
          option("reporting", "Build reports"),
          option("team_tasks", "Create team tasks"),
          option("other", "Other"),
        ],
      },
      {
        id: "required_integrations",
        label: "Which systems must connect?",
        type: "textarea",
        maxLength: 2000,
        rows: 3,
      },
      {
        id: "must_keep_tools",
        label: "Are there tools that cannot be replaced?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
      },
      {
        id: "team_workflow",
        label: "Who needs to use or approve the new system?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
      },
      {
        id: "data_locations",
        label: "Where do customer and business records currently live?",
        type: "multi",
        options: [
          option("crm", "CRM"),
          option("spreadsheets", "Spreadsheets"),
          option("email", "Email"),
          option("phones", "Phones and text threads"),
          option("paper", "Paper"),
          option("platforms", "Separate online platforms"),
          option("unknown", "I do not know"),
        ],
      },
      {
        id: "compliance_requirements",
        label: "Are there privacy, legal, or industry requirements we should know?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
        placeholder: "Do not include private customer, patient, banking, or case information",
      },
      {
        id: "access_readiness",
        label: "Could you provide authorized admin or collaborator access after scope approval?",
        type: "select",
        options: [
          option("yes", "Yes"),
          option("partial", "For some systems"),
          option("no", "Not currently"),
          option("unknown", "I need help determining that"),
        ],
      },
    ],
  },
  {
    id: "customers",
    shortTitle: "Message",
    title: "Messaging, proof, and assets",
    description:
      "Help us understand why customers choose you and what material already exists to support the build.",
    fields: [
      {
        id: "customer_problem",
        label: "What problem brings customers to you?",
        type: "textarea",
        maxLength: 2000,
        rows: 3,
      },
      {
        id: "customer_objections",
        label: "What concerns stop people from buying?",
        type: "textarea",
        maxLength: 2000,
        rows: 3,
      },
      {
        id: "differentiator",
        label: "Why should someone choose you instead of a competitor?",
        type: "textarea",
        maxLength: 2000,
        rows: 4,
      },
      {
        id: "competitors",
        label: "Competitors or examples we should review",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
        placeholder: "Names or links, one per line",
      },
      {
        id: "preferred_examples",
        label: "Websites, brands, or experiences you like",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
        placeholder: "Links and what you like about each one",
      },
      {
        id: "brand_voice",
        label: "How should the business sound and feel?",
        type: "multi",
        options: [
          option("direct", "Direct"),
          option("professional", "Professional"),
          option("friendly", "Friendly"),
          option("premium", "Premium"),
          option("bold", "Bold"),
          option("technical", "Technical"),
          option("local", "Local and personal"),
          option("faith_centered", "Faith-centered"),
        ],
      },
      {
        id: "brand_assets",
        label: "Which brand assets already exist?",
        type: "multi",
        options: [
          option("logo", "Logo"),
          option("colors", "Colors"),
          option("fonts", "Fonts"),
          option("photos", "Photos"),
          option("video", "Video"),
          option("copy", "Written copy"),
          option("testimonials", "Testimonials"),
          option("case_studies", "Case studies"),
        ],
      },
      {
        id: "asset_links",
        label: "Links to non-sensitive files, folders, or examples",
        type: "textarea",
        maxLength: 2000,
        rows: 3,
        placeholder: "Google Drive, Dropbox, Loom, or public links. Do not paste passwords.",
      },
      {
        id: "claims_restrictions",
        label: "Anything we must never say, show, or promise?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
      },
    ],
  },
  {
    id: "scope",
    shortTitle: "Scope",
    title: "Scope, timing, and investment",
    description:
      "This does not commit you to buying anything. It helps us recommend a realistic first phase instead of guessing.",
    fields: [
      {
        id: "requested_services",
        label: "Which deliverables should be considered?",
        type: "multi",
        options: [
          option("website", "Website or landing pages"),
          option("ecommerce", "Ecommerce or Shopify repair"),
          option("crm", "CRM"),
          option("automation", "Automation"),
          option("ai_agent", "AI agent"),
          option("social_setup", "Social page setup"),
          option("content", "Content system"),
          option("ads", "Advertising"),
          option("analytics", "Analytics"),
          option("portal", "Customer or team portal"),
          option("training", "Course or training system"),
          option("strategy", "Strategy and system map"),
        ],
      },
      {
        id: "must_have_scope",
        label: "What must be included in the first phase?",
        type: "textarea",
        maxLength: 2500,
        rows: 4,
      },
      {
        id: "future_scope",
        label: "What could wait for a later phase?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
      },
      {
        id: "launch_timeframe",
        label: "When would you like the first phase live?",
        type: "text",
        maxLength: 500,
        placeholder: "A date, range, or no fixed date",
      },
      {
        id: "ready_to_start",
        label: "If the plan makes business sense, when are you prepared to begin?",
        type: "select",
        options: [
          option("now", "Now"),
          option("30_days", "Within 30 days"),
          option("60_90_days", "Within 60 to 90 days"),
          option("later", "Later"),
        ],
      },
      {
        id: "initial_investment_range",
        label: "What initial investment range are you comfortable considering?",
        type: "select",
        options: [
          option("under_500", "Under $500"),
          option("500_999", "$500 to $999"),
          option("1000_2499", "$1,000 to $2,499"),
          option("2500_4999", "$2,500 to $4,999"),
          option("5000_9999", "$5,000 to $9,999"),
          option("10000_plus", "$10,000 or more"),
          option("recommend", "I need a recommendation first"),
        ],
      },
      {
        id: "ongoing_budget",
        label: "Is there an ongoing budget for software, ads, support, or content?",
        type: "text",
        maxLength: 500,
      },
      {
        id: "approval_process",
        label: "How will the project be approved?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
      },
      {
        id: "stakeholders",
        label: "Who else should review the recommendation?",
        type: "textarea",
        maxLength: 1000,
        rows: 3,
      },
      {
        id: "discovery_availability",
        label: "Preferred days and times for a strategy call",
        type: "text",
        maxLength: 500,
      },
      {
        id: "project_constraints",
        label: "Any technical, contractual, budget, or timing constraints?",
        type: "textarea",
        maxLength: 1500,
        rows: 3,
      },
    ],
  },
  {
    id: "final",
    shortTitle: "Finish",
    title: "Final context and permissions",
    description:
      "Add anything we missed, confirm the information, and choose which follow-up you want.",
    fields: [
      {
        id: "additional_context",
        label: "What have we not asked that would help us understand the business?",
        type: "textarea",
        maxLength: 3500,
        rows: 5,
      },
      {
        id: "walkthrough_url",
        label: "Optional Loom or video walkthrough",
        type: "url",
        maxLength: 500,
        placeholder: "https://",
      },
      {
        id: "accuracy_confirmation",
        label: "I provided accurate information to the best of my knowledge",
        type: "checkbox",
        required: true,
      },
      {
        id: "authority_confirmation",
        label: "I am authorized to request recommendations for this business",
        type: "checkbox",
        required: true,
      },
      {
        id: "privacy_terms_acceptance",
        label: "I agree to the Privacy Policy and Terms",
        type: "checkbox",
        required: true,
      },
      {
        id: "seven_day_email_consent",
        label:
          "Send me the free 7-Day Business Visibility Jumpstart and practical follow-up tips by email. I can unsubscribe at any time.",
        type: "checkbox",
      },
      {
        id: "ongoing_marketing_consent",
        label:
          "After the seven-day series, send me occasional LeadFlow articles, tools, and launch updates. I can unsubscribe at any time.",
        type: "checkbox",
      },
      {
        id: "sms_consent",
        label:
          "If I provided a mobile number, The LeadFlow Pro may call or text me about this request. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out.",
        type: "checkbox",
      },
    ],
  },
];

export const BUSINESS_DIAGNOSTIC_FIELDS = BUSINESS_DIAGNOSTIC_SECTIONS.flatMap(
  (section) => section.fields,
);

const FIELD_BY_ID = new Map(BUSINESS_DIAGNOSTIC_FIELDS.map((field) => [field.id, field]));

export function fieldVisible(field: DiagnosticField, answers: DiagnosticAnswers): boolean {
  return field.showIf ? field.showIf(answers) : true;
}

export function missingRequiredFields(answers: DiagnosticAnswers): DiagnosticField[] {
  return BUSINESS_DIAGNOSTIC_FIELDS.filter(
    (field) => field.required && fieldVisible(field, answers) && !isAnswered(answers[field.id]),
  );
}

export function cleanDiagnosticAnswers(input: unknown): DiagnosticAnswers {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const clean: DiagnosticAnswers = {};

  for (const [id, field] of FIELD_BY_ID) {
    const value = source[id];
    if (field.type === "checkbox") {
      if (typeof value === "boolean") clean[id] = value;
      continue;
    }
    if (field.type === "multi") {
      if (!Array.isArray(value)) continue;
      const allowed = new Set((field.options ?? []).map((item) => item.value));
      const items = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && item.length <= 100 && allowed.has(item))
        .slice(0, field.id === "goal_types" ? 3 : 20);
      if (items.length) clean[id] = [...new Set(items)];
      continue;
    }
    if (typeof value !== "string") continue;
    const maxLength = field.maxLength ?? 500;
    const trimmed = value.trim().slice(0, maxLength);
    if (trimmed) clean[id] = trimmed;
  }

  return clean;
}

const SCORE_GROUPS: Array<{ weight: number; ids: string[] }> = [
  {
    weight: 10,
    ids: ["full_name", "email", "business_name", "job_title", "industry", "business_model"],
  },
  {
    weight: 20,
    ids: ["situation_summary", "primary_problem", "desired_outcome", "success_definition", "timeframe"],
  },
  {
    weight: 15,
    ids: ["main_offer", "ideal_customer", "revenue_model", "average_sale_value", "capacity_status"],
  },
  {
    weight: 15,
    ids: ["website_state", "website_platform", "website_issue_detail", "facebook_page_status", "youtube_status", "best_marketing_sources"],
  },
  {
    weight: 15,
    ids: ["lead_channels", "lead_response_time", "crm_status", "follow_up_process", "biggest_lead_leak"],
  },
  {
    weight: 10,
    ids: ["domain_control", "admin_access_status", "access_readiness", "required_integrations"],
  },
  {
    weight: 15,
    ids: ["requested_services", "must_have_scope", "ready_to_start", "initial_investment_range", "approval_process"],
  },
];

export function scoreDiagnosticCompleteness(answers: DiagnosticAnswers): number {
  return Math.min(
    100,
    Math.round(
      SCORE_GROUPS.reduce((total, group) => {
        const answered = group.ids.filter((id) => isAnswered(answers[id])).length;
        return total + group.weight * (answered / group.ids.length);
      }, 0),
    ),
  );
}

export function diagnosticReadinessLabel(score: number): string {
  if (score >= 80) return "Proposal-ready detail";
  if (score >= 55) return "Strong diagnostic";
  return "Enough for an initial review";
}

export function scoreDiagnosticOpportunity(answers: DiagnosticAnswers): number {
  let score = 0;
  const help = answerList(answers, "help_categories");
  if (help.length) score += Math.min(20, 8 + help.length * 3);

  const severityText = [
    answerString(answers, "situation_summary"),
    answerString(answers, "primary_problem"),
    answerString(answers, "website_issue_detail"),
  ]
    .join(" ")
    .toLowerCase();
  if (/broken|locked|down|cannot|can't|lost|missed|stuck|checkout|payment/.test(severityText)) {
    score += 15;
  } else if (severityText.length > 80) {
    score += 10;
  }
  if (["emergency", "7_days", "30_days"].includes(answerString(answers, "timeframe"))) score += 15;
  else if (answerString(answers, "timeframe")) score += 7;

  const authority = answerString(answers, "decision_role");
  if (authority === "decision_maker") score += 15;
  else if (authority === "co_decision_maker") score += 11;
  else if (authority) score += 5;

  const access = answerString(answers, "access_readiness");
  const adminAccess = answerString(answers, "admin_access_status");
  if (access === "yes" || adminAccess === "full") score += 15;
  else if (access || adminAccess) score += 7;

  const investment = answerString(answers, "initial_investment_range");
  if (["2500_4999", "5000_9999", "10000_plus"].includes(investment)) score += 10;
  else if (investment) score += 6;

  const completeness = scoreDiagnosticCompleteness(answers);
  score += completeness >= 80 ? 5 : completeness >= 55 ? 3 : 1;
  return Math.min(100, score);
}

export function diagnosticPriority(score: number, answers: DiagnosticAnswers): "normal" | "high" | "hot" {
  const checkout = answerString(answers, "checkout_status");
  const store = answerString(answers, "shopify_store_status");
  if (["no", "unavailable"].includes(checkout) || ["unavailable"].includes(store)) return "hot";
  if (score >= 75) return "hot";
  if (score >= 50) return "high";
  return "normal";
}

export function deriveDiagnosticTags(answers: DiagnosticAnswers, sourceChannel: string): string[] {
  const tags = new Set<string>([
    `source:${sourceChannel.replace(/[^a-z0-9_-]/gi, "_").toLowerCase()}`,
    "form:growth-diagnostic-v1",
  ]);
  for (const help of answerList(answers, "help_categories")) tags.add(`service:${help}`);

  const platform = answerString(answers, "website_platform");
  if (platform) tags.add(`platform:${platform}`);
  if (answerString(answers, "website_state") === "locked") tags.add("issue:website-locked");
  if (answerString(answers, "admin_access_status") === "none") tags.add("issue:no-admin-access");
  if (answerString(answers, "previous_provider_context")) tags.add("issue:former-provider");
  if (answerString(answers, "facebook_page_status") === "not_created") {
    tags.add("presence:facebook-missing");
  }
  if (answerString(answers, "youtube_status") === "not_created") {
    tags.add("presence:youtube-missing");
  }
  if (["nowhere", "inboxes"].includes(answerString(answers, "crm_status"))) {
    tags.add("leak:no-connected-crm");
  }
  if (["same_day", "next_day"].includes(answerString(answers, "lead_response_time"))) {
    tags.add("leak:slow-response");
  }
  const timeframe = answerString(answers, "timeframe");
  if (timeframe) tags.add(`urgency:${timeframe}`);
  const authority = answerString(answers, "decision_role");
  if (authority) tags.add(`authority:${authority}`);
  if (answers.seven_day_email_consent === true) tags.add("sequence:diagnostic-7d");

  return [...tags].slice(0, 40);
}

export function diagnosticInterest(answers: DiagnosticAnswers): string {
  const help = answerList(answers, "help_categories");
  if (help.includes("operations") || help.includes("ai_agents")) return "operations";
  if (help.includes("new_website") || help.includes("website_repair") || help.includes("shopify_ecommerce")) {
    return "launch_system";
  }
  if (help.includes("crm") || help.includes("follow_up") || help.includes("lead_generation")) {
    return "custom_platform";
  }
  return "unsure";
}

export function diagnosticSummary(answers: DiagnosticAnswers): string {
  const pieces = [
    `Problem: ${answerString(answers, "primary_problem") || answerString(answers, "situation_summary")}`,
    `Desired result: ${answerString(answers, "desired_outcome")}`,
    `90-day win: ${answerString(answers, "success_definition")}`,
    `Timeline: ${answerString(answers, "timeframe") || "not specified"}`,
  ];
  return pieces.filter((piece) => !piece.endsWith(": ")).join(" ").slice(0, 2000);
}
