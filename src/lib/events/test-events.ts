export const LEADFLOW_SAFE_TEST_EVENTS = [
  {
    eventName: "hero_cta_clicked",
    properties: {
      route: "/",
      cta: "Buy Lead Signals",
      status: "clicked",
    },
  },
  {
    eventName: "sample_request_submitted",
    properties: {
      route: "/marketplace",
      listing_id: "test-listing",
      request_type: "sample",
      vertical: "Ecommerce",
      category: "Vendor signals",
      confidence: "high",
    },
  },
  {
    eventName: "questionnaire_completed",
    properties: {
      route: "/tools",
      tool_slug: "lead-leak-audit",
      step_number: 4,
      score_range: "high",
      status: "completed",
    },
  },
] as const;

export const LEADFLOW_BLOCKED_TEST_EVENT = {
  eventName: "questionnaire_completed",
  properties: {
    route: "/tools",
    email: "blocked@example.test",
    phone: "555-123-4567",
    raw_answer: "This raw answer should never be sent to analytics.",
    notes: "Internal note should be stripped.",
    tool_slug: "lead-leak-audit",
  },
} as const;
