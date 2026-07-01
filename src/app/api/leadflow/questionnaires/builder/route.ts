import { NextResponse } from "next/server";
import { z } from "zod";
import { saveQuestionnaireBuilder } from "@/lib/questionnaire-builder";

export const runtime = "nodejs";

const QuestionTypeSchema = z.enum([
  "single_select",
  "multi_select",
  "short_text",
  "long_text",
  "number",
  "range",
  "number_range",
  "budget_range",
  "industry",
  "location",
  "url",
  "phone",
  "email",
  "rating_scale",
  "ranking",
  "priority_ranking",
  "yes_no",
  "file_upload",
  "consent_checkbox",
  "seller_selection",
  "seller_selection_checkbox",
  "calendar_intent",
  "custom_hidden",
]);

const OptionSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(180),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  score: z.number().min(-100).max(100).optional(),
});

const QuestionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: QuestionTypeSchema,
  label: z.string().trim().min(1).max(260),
  helperText: z.string().trim().max(700).optional(),
  required: z.boolean().optional(),
  options: z.array(OptionSchema).max(30).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  placeholder: z.string().trim().max(240).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
  scoreWeight: z.number().min(-100).max(100).optional(),
  showIf: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(120),
        operator: z.enum(["equals", "not_equals", "includes", "not_includes", "exists", "gt", "gte", "lt", "lte"]),
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      }),
    )
    .max(16)
    .optional(),
});

const DefinitionSchema = z.object({
  toolSlug: z.string().trim().min(1).max(140),
  toolType: z.string().trim().min(1).max(120),
  vertical: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(220),
  description: z.string().trim().min(1).max(900),
  valuePreview: z.string().trim().min(1).max(900),
  defaultTags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  recommendedActions: z
    .array(
      z.object({
        minScore: z.number().int().min(0).max(100),
        action: z.string().trim().min(1).max(140),
      }),
    )
    .max(10)
    .optional(),
  steps: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        title: z.string().trim().min(1).max(220),
        description: z.string().trim().max(700).optional(),
        questions: z.array(QuestionSchema).min(1).max(30),
      }),
    )
    .min(1)
    .max(20),
});

const ResultPageSchema = z.object({
  resultKey: z.string().trim().min(1).max(80),
  minScore: z.number().int().min(0).max(100),
  maxScore: z.number().int().min(0).max(100),
  title: z.string().trim().min(1).max(220),
  summary: z.string().trim().min(1).max(1000),
  recommendedNextAction: z.string().trim().min(1).max(320),
  ctaLabel: z.string().trim().min(1).max(90),
  ctaUrl: z.string().trim().min(1).max(500),
});

const ConsentModuleSchema = z.object({
  moduleType: z.enum([
    "tool_answers_only",
    "contact_me",
    "single_seller",
    "selected_sellers",
    "anonymous_insights",
    "submit_source_review",
    "buyer_request_access",
    "do_not_contact",
    "delete_my_data",
  ]),
  label: z.string().trim().min(1).max(220),
  body: z.string().trim().min(1).max(900),
  required: z.boolean(),
  consentScope: z.string().trim().min(1).max(120),
});

const DraftSchema = z.object({
  id: z.string().optional(),
  templateSlug: z.string().optional(),
  title: z.string().trim().min(1).max(220),
  slug: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(900),
  vertical: z.string().trim().min(1).max(120),
  status: z.enum(["draft", "review", "published", "archived"]),
  visibility: z.enum(["internal", "private", "unlisted", "public"]),
  definition: DefinitionSchema,
  resultPages: z.array(ResultPageSchema).min(1).max(10),
  consentModules: z.array(ConsentModuleSchema).min(1).max(10),
  theme: z.object({
    accent: z.string().trim().min(1).max(40),
    background: z.string().trim().min(1).max(40),
    surface: z.string().trim().min(1).max(40),
    button: z.string().trim().min(1).max(40),
  }),
  publishedRoute: z.string().nullable().optional(),
  shareUrl: z.string().nullable().optional(),
  embedWidgetId: z.string().nullable().optional(),
});

const PayloadSchema = z.object({
  action: z.enum(["create", "save_draft", "publish", "clone", "archive"]),
  questionnaireId: z.string().trim().min(1).max(120).nullable().optional(),
  templateSlug: z.string().trim().min(1).max(120).nullable().optional(),
  draft: DraftSchema.optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid builder request." }, { status: 400 });
  }

  const result = await saveQuestionnaireBuilder(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
