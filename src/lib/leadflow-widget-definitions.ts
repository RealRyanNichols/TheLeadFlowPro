import type { QuestionnaireDefinition } from "@/lib/questionnaire-engine";

export const LEADFLOW_WIDGET_EVENT_NAMES = [
  "widget_loaded",
  "widget_started",
  "widget_step_completed",
  "widget_completed",
  "widget_result_viewed",
  "widget_contact_submitted",
] as const;

export const LEADFLOW_WIDGET_TYPES = [
  "lead_leak_audit",
  "website_money_leak_checker",
  "ai_automation_readiness",
  "lead_type_finder",
  "local_demand_finder",
  "ecommerce_growth_finder",
  "mortgage_lead_readiness",
  "buyer_personality_signal",
  "contact_router",
  "custom_questionnaire",
] as const;

export type LeadFlowWidgetEventName = (typeof LEADFLOW_WIDGET_EVENT_NAMES)[number];
export type LeadFlowWidgetType = (typeof LEADFLOW_WIDGET_TYPES)[number];
export type WidgetStatus = "draft" | "active" | "paused" | "archived" | "deleted";

export type LeadFlowWidgetTheme = {
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  button?: string;
};

export type LeadFlowWidgetPublicConfig = {
  id: string;
  slug: string;
  widget_type: LeadFlowWidgetType;
  name: string;
  status: WidgetStatus;
  allowed_domains: string[];
  theme: LeadFlowWidgetTheme;
  questionnaire_id: string | null;
  redirect_url: string | null;
  completion_message: string;
  consent_required: boolean;
  definition: QuestionnaireDefinition;
};

export const WIDGET_CONSENT_VERSION = "leadflow-widget-consent-v1";

const commonRecommendedActions = [
  { minScore: 84, action: "route_to_reviewed_buyer_or_sales_follow_up" },
  { minScore: 64, action: "show_plan_and_capture_contact_permission" },
  { minScore: 42, action: "show_gap_report_and_next_best_tool" },
];

export const LEADFLOW_WIDGET_CATALOG: Array<{
  type: LeadFlowWidgetType;
  slug: string;
  name: string;
  label: string;
  shortDescription: string;
  targetUser: string;
  resultPromise: string;
  dataCategory: string;
  estimatedTime: string;
  definition: QuestionnaireDefinition;
}> = [
  {
    type: "lead_leak_audit",
    slug: "lead-leak-audit",
    name: "Lead Leak Audit",
    label: "Find missed revenue paths",
    shortDescription: "Shows where calls, texts, DMs, forms, and follow-up are slipping.",
    targetUser: "Local operators and service businesses",
    resultPromise: "A scored leak map with the next follow-up move.",
    dataCategory: "Business pain, follow-up speed, channel gaps",
    estimatedTime: "3 minutes",
    definition: {
      toolSlug: "lead-leak-audit",
      toolType: "widget",
      vertical: "local_business",
      title: "Lead Leak Audit",
      description: "Find the places your current demand is leaking before you buy more attention.",
      valuePreview: "A leak score, the weakest follow-up path, and the next move.",
      defaultTags: ["lead_leak", "follow_up_gap"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "demand",
          title: "Where does demand show up?",
          questions: [
            {
              id: "primary_channel",
              type: "single_select",
              label: "Where do most serious leads first reach you?",
              required: true,
              options: [
                { id: "calls", label: "Phone calls", tags: ["calls"], score: 10 },
                { id: "forms", label: "Website forms", tags: ["forms"], score: 8 },
                { id: "dm", label: "DMs or comments", tags: ["social_dm"], score: 8 },
                { id: "referrals", label: "Referrals", tags: ["referrals"], score: 6 },
              ],
            },
            {
              id: "missed_followup",
              type: "single_select",
              label: "What gets missed the most?",
              required: true,
              options: [
                { id: "after_hours", label: "After-hours calls", tags: ["after_hours"], score: 14 },
                { id: "slow_response", label: "Slow follow-up", tags: ["speed_gap"], score: 12 },
                { id: "no_owner", label: "Nobody owns the lead", tags: ["routing_gap"], score: 13 },
                { id: "unknown", label: "I do not know", tags: ["visibility_gap"], score: 8 },
              ],
            },
          ],
        },
        {
          id: "impact",
          title: "What is it costing?",
          questions: [
            {
              id: "monthly_leads",
              type: "number_range",
              label: "About how many leads come in each month?",
              required: true,
              min: 0,
              max: 500,
              scoreWeight: 8,
              tags: ["lead_volume"],
            },
            {
              id: "urgency",
              type: "single_select",
              label: "How urgent is the fix?",
              required: true,
              options: [
                { id: "this_week", label: "This week", tags: ["urgent"], score: 18 },
                { id: "this_month", label: "This month", tags: ["active_project"], score: 12 },
                { id: "planning", label: "Planning ahead", tags: ["research"], score: 5 },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    type: "website_money_leak_checker",
    slug: "website-money-leak-checker",
    name: "Website Money Leak Checker",
    label: "Score the website path",
    shortDescription: "Finds broken CTAs, unclear offers, weak forms, and missing trust points.",
    targetUser: "Businesses with traffic but weak conversion",
    resultPromise: "A website leak score and the first page to fix.",
    dataCategory: "Website URL, funnel weakness, conversion path",
    estimatedTime: "4 minutes",
    definition: {
      toolSlug: "website-money-leak-checker",
      toolType: "widget",
      vertical: "local_business",
      title: "Website Money Leak Checker",
      description: "Check whether the website gives serious people a clear next step.",
      valuePreview: "A practical score and the fastest website fix.",
      defaultTags: ["website_funnel", "conversion_gap"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "site",
          title: "Website path",
          questions: [
            { id: "website_url", type: "url", label: "What website should we check?", required: true, tags: ["website_url"], scoreWeight: 6 },
            {
              id: "cta_clarity",
              type: "rating_scale",
              label: "How clear is the next step on the homepage?",
              required: true,
              min: 1,
              max: 5,
              scoreWeight: 8,
              tags: ["cta_clarity"],
            },
            {
              id: "weakest_area",
              type: "single_select",
              label: "What feels weakest right now?",
              required: true,
              options: [
                { id: "offer", label: "The offer is unclear", tags: ["offer_gap"], score: 10 },
                { id: "trust", label: "Not enough proof", tags: ["proof_gap"], score: 11 },
                { id: "form", label: "Forms are weak", tags: ["form_gap"], score: 12 },
                { id: "speed", label: "Slow or clunky", tags: ["site_speed_gap"], score: 8 },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    type: "ai_automation_readiness",
    slug: "ai-automation-readiness",
    name: "AI Automation Readiness Score",
    label: "Find what AI should handle first",
    shortDescription: "Prioritizes receptionist, routing, follow-up, CRM, and reporting automation.",
    targetUser: "Owners with repeat questions, missed follow-up, or manual intake",
    resultPromise: "An automation readiness score and first automation to build.",
    dataCategory: "Tasks, volume, timing, budget range",
    estimatedTime: "3 minutes",
    definition: {
      toolSlug: "ai-automation-readiness",
      toolType: "widget",
      vertical: "b2b_saas",
      title: "AI Automation Readiness Score",
      description: "Find the first repeatable task worth automating.",
      valuePreview: "A readiness score and first build recommendation.",
      defaultTags: ["ai_automation", "workflow_gap"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "workload",
          title: "Repeat work",
          questions: [
            {
              id: "repeat_task",
              type: "single_select",
              label: "Which task repeats every week?",
              required: true,
              options: [
                { id: "answer_calls", label: "Answering calls or texts", tags: ["ai_receptionist"], score: 14 },
                { id: "qualify", label: "Qualifying leads", tags: ["lead_scoring"], score: 13 },
                { id: "followup", label: "Follow-up sequences", tags: ["follow_up"], score: 12 },
                { id: "reports", label: "Reports and dashboards", tags: ["reporting"], score: 8 },
              ],
            },
            {
              id: "weekly_volume",
              type: "single_select",
              label: "How many times does it happen weekly?",
              required: true,
              options: [
                { id: "under_20", label: "Under 20", tags: ["low_volume"], score: 4 },
                { id: "20_100", label: "20 to 100", tags: ["automation_ready"], score: 12 },
                { id: "100_plus", label: "100+", tags: ["high_volume"], score: 18 },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    type: "lead_type_finder",
    slug: "what-type-of-leads-should-you-buy",
    name: "What Type of Leads Should You Buy?",
    label: "Stop buying the wrong list",
    shortDescription: "Matches buyer need to source-backed signals, samples, or custom sourcing.",
    targetUser: "Lead buyers, agencies, and operators",
    resultPromise: "A recommended lead product type and access path.",
    dataCategory: "Buyer type, niche, geography, urgency",
    estimatedTime: "3 minutes",
    definition: {
      toolSlug: "what-type-of-leads-should-you-buy",
      toolType: "widget",
      vertical: "general",
      title: "What Type of Leads Should You Buy?",
      description: "Match your use case to the signal product that actually fits.",
      valuePreview: "A lead signal recommendation with next click.",
      defaultTags: ["buyer_intent", "lead_product_fit"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "fit",
          title: "Buyer fit",
          questions: [
            { id: "industry", type: "industry", label: "What industry are you targeting?", required: true, tags: ["industry"], scoreWeight: 8 },
            { id: "geography", type: "location", label: "What geography matters?", required: true, tags: ["geo"], scoreWeight: 6 },
            {
              id: "access_preference",
              type: "single_select",
              label: "What access style do you want?",
              required: true,
              options: [
                { id: "sample_first", label: "Sample first", tags: ["sample_intent"], score: 10 },
                { id: "shared", label: "Shared access", tags: ["shared_access"], score: 8 },
                { id: "exclusive", label: "Exclusive access", tags: ["exclusive_intent"], score: 16 },
                { id: "custom", label: "Custom sourcing", tags: ["custom_sourcing"], score: 14 },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    type: "local_demand_finder",
    slug: "local-demand-finder",
    name: "Local Demand Finder",
    label: "Map local demand",
    shortDescription: "Captures city, category, service need, and timing to shape local lead routes.",
    targetUser: "Local service buyers and neighborhood operators",
    resultPromise: "A local demand score and route idea.",
    dataCategory: "City, service category, timing, need",
    estimatedTime: "2 minutes",
    definition: {
      toolSlug: "local-demand-finder",
      toolType: "widget",
      vertical: "local_business",
      title: "Local Demand Finder",
      description: "Find whether a local category has enough pain to package.",
      valuePreview: "A local demand score and route recommendation.",
      defaultTags: ["local_demand"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "local",
          title: "Local demand",
          questions: [
            { id: "city", type: "location", label: "What city or area?", required: true, tags: ["city"], scoreWeight: 6 },
            { id: "service_need", type: "short_text", label: "What service do people keep needing?", required: true, tags: ["service_need"], scoreWeight: 8 },
            {
              id: "seasonality",
              type: "single_select",
              label: "When does this need spike?",
              required: true,
              options: [
                { id: "now", label: "Right now", tags: ["fresh_demand"], score: 16 },
                { id: "seasonal", label: "Seasonally", tags: ["seasonal"], score: 10 },
                { id: "always", label: "All year", tags: ["evergreen"], score: 12 },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    type: "ecommerce_growth_finder",
    slug: "ecommerce-growth-finder",
    name: "Ecommerce Growth Finder",
    label: "Find product and offer gaps",
    shortDescription: "Captures store platform, product category, supplier pain, and growth constraint.",
    targetUser: "Ecommerce brands, agencies, and sourcers",
    resultPromise: "A growth bottleneck score and product-signal angle.",
    dataCategory: "Platform, product type, pain, revenue range",
    estimatedTime: "3 minutes",
    definition: {
      toolSlug: "ecommerce-growth-finder",
      toolType: "widget",
      vertical: "ecommerce",
      title: "Ecommerce Growth Finder",
      description: "Find the ecommerce signal worth acting on first.",
      valuePreview: "A growth bottleneck score and next source path.",
      defaultTags: ["ecommerce", "growth_gap"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "store",
          title: "Store signal",
          questions: [
            { id: "platform", type: "single_select", label: "What platform is involved?", required: true, options: [
              { id: "shopify", label: "Shopify", tags: ["shopify"], score: 10 },
              { id: "amazon", label: "Amazon", tags: ["amazon"], score: 10 },
              { id: "marketplace", label: "Marketplace", tags: ["marketplace"], score: 8 },
              { id: "mixed", label: "Mixed stack", tags: ["mixed_stack"], score: 9 },
            ] },
            { id: "product_type", type: "short_text", label: "What product category?", required: true, tags: ["product_category"], scoreWeight: 7 },
            { id: "growth_pain", type: "single_select", label: "What is slowing growth?", required: true, options: [
              { id: "traffic", label: "Traffic quality", tags: ["traffic_gap"], score: 10 },
              { id: "supplier", label: "Supplier or sourcing", tags: ["supplier_gap"], score: 12 },
              { id: "offer", label: "Weak offer", tags: ["offer_gap"], score: 10 },
              { id: "fulfillment", label: "Fulfillment pain", tags: ["fulfillment_gap"], score: 8 },
            ] },
          ],
        },
      ],
    },
  },
  {
    type: "mortgage_lead_readiness",
    slug: "mortgage-lead-readiness",
    name: "Mortgage Lead Readiness Tool",
    label: "Qualify mortgage interest safely",
    shortDescription: "Captures consented education interest and readiness without private account data.",
    targetUser: "Mortgage education and refi interest workflows",
    resultPromise: "A readiness category and next education step.",
    dataCategory: "Loan interest, timing, contact permission",
    estimatedTime: "3 minutes",
    definition: {
      toolSlug: "mortgage-lead-readiness",
      toolType: "widget",
      vertical: "mortgage_refi",
      title: "Mortgage Lead Readiness Tool",
      description: "Understand mortgage education interest without collecting private account access data.",
      valuePreview: "A readiness score and next education path.",
      defaultTags: ["mortgage_education", "consented_interest"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "readiness",
          title: "Mortgage interest",
          questions: [
            { id: "loan_interest", type: "single_select", label: "What are you trying to understand?", required: true, options: [
              { id: "refi", label: "Refinance options", tags: ["refi_interest"], score: 12 },
              { id: "va", label: "VA loan education", tags: ["va_education"], score: 12 },
              { id: "purchase", label: "Buying a home", tags: ["purchase_interest"], score: 10 },
              { id: "payment_review", label: "Payment review", tags: ["payment_review_interest"], score: 10 },
            ] },
            { id: "timeline", type: "single_select", label: "What timeline feels realistic?", required: true, options: [
              { id: "now", label: "Now", tags: ["urgent"], score: 16 },
              { id: "30_90", label: "30 to 90 days", tags: ["active_project"], score: 12 },
              { id: "learning", label: "Just learning", tags: ["education"], score: 5 },
            ] },
          ],
        },
      ],
    },
  },
  {
    type: "buyer_personality_signal",
    slug: "buyer-personality-signal",
    name: "Buyer Personality Signal Quiz",
    label: "Capture buying style",
    shortDescription: "Shows how someone compares, chooses, budgets, and commits.",
    targetUser: "General preference and offer-fit capture",
    resultPromise: "A buying-style profile and next offer path.",
    dataCategory: "Buying style, categories, budget range",
    estimatedTime: "3 minutes",
    definition: {
      toolSlug: "buyer-personality-signal",
      toolType: "widget",
      vertical: "consumer_shopping",
      title: "Buyer Personality Signal Quiz",
      description: "Find the buying style behind the click.",
      valuePreview: "A buying-style signal profile.",
      defaultTags: ["buyer_personality"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "style",
          title: "Buying style",
          questions: [
            { id: "decision_style", type: "single_select", label: "How do you usually make a bigger purchase?", required: true, options: [
              { id: "research", label: "I research hard", tags: ["researcher"], score: 10 },
              { id: "fast", label: "I move fast when it fits", tags: ["fast_mover"], score: 14 },
              { id: "compare", label: "I compare options", tags: ["comparison_buyer"], score: 9 },
              { id: "referral", label: "I trust referrals", tags: ["trust_buyer"], score: 8 },
            ] },
            { id: "budget_range", type: "budget_range", label: "What budget range are you comfortable sharing?", required: false, tags: ["budget_range"], scoreWeight: 6 },
          ],
        },
      ],
    },
  },
  {
    type: "contact_router",
    slug: "contact-router",
    name: "Contact Router",
    label: "Route people to the right next step",
    shortDescription: "Finds whether a visitor needs sales, support, scheduling, pricing, or a custom build.",
    targetUser: "Businesses with more than one inbound path",
    resultPromise: "A routed next step with clear intent.",
    dataCategory: "Need, urgency, department, contact permission",
    estimatedTime: "2 minutes",
    definition: {
      toolSlug: "contact-router",
      toolType: "widget",
      vertical: "general",
      title: "Contact Router",
      description: "Route the visitor to the next step that matches what they need.",
      valuePreview: "A routing recommendation and contact path.",
      defaultTags: ["contact_router"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "route",
          title: "Route request",
          questions: [
            { id: "need", type: "single_select", label: "What do you need right now?", required: true, options: [
              { id: "pricing", label: "Pricing or package info", tags: ["pricing_intent"], score: 10 },
              { id: "book", label: "Book a call", tags: ["booking_intent"], score: 14 },
              { id: "support", label: "Support or help", tags: ["support"], score: 5 },
              { id: "custom", label: "Custom project", tags: ["custom_project"], score: 13 },
            ] },
            { id: "urgency", type: "single_select", label: "How soon do you want an answer?", required: true, options: [
              { id: "today", label: "Today", tags: ["urgent"], score: 14 },
              { id: "week", label: "This week", tags: ["active_project"], score: 10 },
              { id: "later", label: "Later", tags: ["research"], score: 4 },
            ] },
          ],
        },
      ],
    },
  },
  {
    type: "custom_questionnaire",
    slug: "custom-questionnaire",
    name: "Custom Questionnaire",
    label: "Build a custom signal tool",
    shortDescription: "A flexible placeholder for branded vertical questionnaires.",
    targetUser: "Clients, partners, campaigns, and niche operators",
    resultPromise: "A scored custom signal profile.",
    dataCategory: "Custom first-party answers and consent",
    estimatedTime: "Varies",
    definition: {
      toolSlug: "custom-questionnaire",
      toolType: "widget",
      vertical: "general",
      title: "Custom Questionnaire",
      description: "Capture a useful signal profile around a specific buyer or audience question.",
      valuePreview: "A custom score and tagged response profile.",
      defaultTags: ["custom_questionnaire"],
      recommendedActions: commonRecommendedActions,
      steps: [
        {
          id: "custom",
          title: "Custom signal",
          questions: [
            { id: "problem", type: "long_text", label: "What problem are you trying to solve?", required: true, tags: ["problem_signal"], scoreWeight: 10 },
            { id: "next_step", type: "single_select", label: "What would help most right now?", required: true, options: [
              { id: "plan", label: "A clear plan", tags: ["plan_needed"], score: 8 },
              { id: "provider", label: "A provider or vendor", tags: ["provider_needed"], score: 12 },
              { id: "pricing", label: "Pricing clarity", tags: ["pricing_needed"], score: 9 },
              { id: "data", label: "Better data", tags: ["data_needed"], score: 11 },
            ] },
          ],
        },
      ],
    },
  },
];

export function getWidgetCatalogItem(slugOrType: string) {
  const normalized = slugOrType.replace(/\.js$/i, "").replace(/_/g, "-").toLowerCase();
  return LEADFLOW_WIDGET_CATALOG.find((item) => item.slug === normalized || item.type.replace(/_/g, "-") === normalized);
}

export function defaultWidgetConfig(slugOrType: string): LeadFlowWidgetPublicConfig | null {
  const item = getWidgetCatalogItem(slugOrType);
  if (!item) return null;
  return {
    id: item.slug,
    slug: item.slug,
    widget_type: item.type,
    name: item.name,
    status: "active",
    allowed_domains: ["*"],
    theme: {},
    questionnaire_id: null,
    redirect_url: null,
    completion_message: "Your signal score is ready. Use the result to decide the next move.",
    consent_required: true,
    definition: item.definition,
  };
}
