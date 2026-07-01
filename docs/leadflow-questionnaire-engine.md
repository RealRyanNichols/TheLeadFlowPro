# LeadFlow Pro Questionnaire Engine

The reusable questionnaire engine lives in:

- `src/components/questionnaire/QuestionnaireEngine.tsx`
- `src/lib/questionnaire-engine.ts`
- `src/app/api/questionnaires/responses/route.ts`

It supports:

- multi-step forms
- conditional logic
- progress indicator
- save partial response
- mobile-first layout
- anonymous session support
- identity capture only after value is shown
- consent module before selling or routing data
- source page tracking
- UTM tracking
- tool type tracking
- answer tagging
- lead scoring
- suppression check
- export-ready profile object

## Question Types

Supported `type` values:

- `single_select`
- `multi_select`
- `short_text`
- `long_text`
- `number_range`
- `budget_range`
- `location`
- `industry`
- `url`
- `file_upload`
- `consent_checkbox`
- `seller_selection_checkbox`
- `rating_scale`
- `priority_ranking`

File upload currently stores file metadata only. Actual file storage should be added through a separate private bucket workflow.

## Data Output

Every completed response returns and stores:

- `response_id`
- `anonymous_user_id`
- `identity_id`
- `tool_slug`
- `vertical`
- `tags`
- `score`
- `confidence`
- `source_url`
- `consent_status`
- `suppression_status`
- `recommended_next_action`
- `lead_scores` with intent, urgency, source proof, freshness, buyer fit, contactability, compliance readiness, and revenue potential explanations

## Usage

```tsx
import { QuestionnaireEngine } from "@/components/questionnaire";
import type { QuestionnaireDefinition } from "@/lib/questionnaire-engine";

const definition: QuestionnaireDefinition = {
  toolSlug: "lead-leak-audit",
  toolType: "diagnostic_tool",
  vertical: "local_business",
  title: "Lead Leak Audit",
  description: "Find where leads are leaking before buying more traffic.",
  valuePreview: "You get a signal score, confidence label, and next action before identity is requested.",
  defaultTags: ["lead_leak", "first_party_signal"],
  recommendedActions: [
    { minScore: 80, action: "request_buyer_or_system_review" },
    { minScore: 55, action: "show_fix_order" },
    { minScore: 0, action: "educate_and_save_anonymous_profile" }
  ],
  steps: [
    {
      id: "problem",
      title: "Where is attention leaking?",
      questions: [
        {
          id: "industry",
          type: "industry",
          label: "What industry are you in?",
          required: true,
          tags: ["industry"],
          options: [
            { id: "home_services", label: "Home services", tags: ["home_services"], score: 8 },
            { id: "ecommerce", label: "Ecommerce", tags: ["ecommerce"], score: 8 },
            { id: "professional_services", label: "Professional services", tags: ["professional_services"], score: 6 }
          ]
        },
        {
          id: "leak",
          type: "multi_select",
          label: "Where are leads leaking?",
          required: true,
          options: [
            { id: "missed_calls", label: "Missed calls", tags: ["missed_calls"], score: 12 },
            { id: "slow_followup", label: "Slow follow-up", tags: ["slow_followup"], score: 10 },
            { id: "weak_website", label: "Weak website", tags: ["website_leak"], score: 9 }
          ]
        }
      ]
    }
  ]
};

export function LeadLeakAuditTool() {
  return <QuestionnaireEngine definition={definition} sourcePage="/tools/lead-leak-audit" />;
}
```

## Supabase

Apply `docs/leadflow-questionnaire-engine.sql` before using the endpoint in production. The SQL enables RLS, revokes direct `anon` and `authenticated` access, and grants only `service_role` table access for server-side writes.

The app API route is:

`POST /api/questionnaires/responses`

Use it for both partial and completed responses.
