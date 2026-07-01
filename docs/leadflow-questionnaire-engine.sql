-- LeadFlow Pro reusable questionnaire engine tables.
-- Server-side Next.js API writes through Prisma. Keep direct Data API access locked down.
-- Supabase docs recommend enabling RLS on public-schema tables and treating grants + RLS together.

create table if not exists public."QuestionnaireResponse" (
  id text primary key,
  "userId" text references public."User"(id) on delete set null,
  "anonymousUserId" text not null,
  "identityId" text,
  "identityPayload" jsonb,
  "toolSlug" text not null,
  "toolType" text not null,
  vertical text not null,
  "sourceUrl" text not null,
  "sourcePath" text not null,
  "utmSource" text,
  "utmMedium" text,
  "utmCampaign" text,
  "utmContent" text,
  "utmTerm" text,
  status text not null default 'partial',
  "currentStep" integer not null default 0,
  tags text[] not null default '{}',
  score integer not null default 0,
  confidence text not null default 'low',
  "consentStatus" text not null default 'not_requested',
  "suppressionStatus" text not null default 'unchecked',
  "recommendedNextAction" text not null default 'show_value_first',
  "exportProfile" jsonb not null,
  metadata jsonb,
  "startedAt" timestamptz not null default now(),
  "completedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."QuestionnaireAnswer" (
  id text primary key,
  "responseId" text not null references public."QuestionnaireResponse"(id) on delete cascade,
  "questionId" text not null,
  "questionType" text not null,
  "questionLabel" text not null,
  answer jsonb not null,
  "answerText" text,
  tags text[] not null default '{}',
  "scoreContribution" integer not null default 0,
  "sourcePage" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "QuestionnaireAnswer_responseId_questionId_key" unique ("responseId", "questionId")
);

create index if not exists "QuestionnaireResponse_anonymousUserId_createdAt_idx"
  on public."QuestionnaireResponse" ("anonymousUserId", "createdAt");

create index if not exists "QuestionnaireResponse_identityId_createdAt_idx"
  on public."QuestionnaireResponse" ("identityId", "createdAt");

create index if not exists "QuestionnaireResponse_toolSlug_status_createdAt_idx"
  on public."QuestionnaireResponse" ("toolSlug", status, "createdAt");

create index if not exists "QuestionnaireResponse_vertical_createdAt_idx"
  on public."QuestionnaireResponse" (vertical, "createdAt");

create index if not exists "QuestionnaireResponse_score_createdAt_idx"
  on public."QuestionnaireResponse" (score, "createdAt");

create index if not exists "QuestionnaireResponse_consentStatus_suppressionStatus_createdAt_idx"
  on public."QuestionnaireResponse" ("consentStatus", "suppressionStatus", "createdAt");

create index if not exists "QuestionnaireResponse_userId_createdAt_idx"
  on public."QuestionnaireResponse" ("userId", "createdAt");

create index if not exists "QuestionnaireAnswer_questionId_createdAt_idx"
  on public."QuestionnaireAnswer" ("questionId", "createdAt");

create index if not exists "QuestionnaireAnswer_questionType_createdAt_idx"
  on public."QuestionnaireAnswer" ("questionType", "createdAt");

create index if not exists "QuestionnaireAnswer_responseId_idx"
  on public."QuestionnaireAnswer" ("responseId");

alter table public."QuestionnaireResponse" enable row level security;
alter table public."QuestionnaireAnswer" enable row level security;

revoke all on table public."QuestionnaireResponse" from anon;
revoke all on table public."QuestionnaireResponse" from authenticated;
revoke all on table public."QuestionnaireAnswer" from anon;
revoke all on table public."QuestionnaireAnswer" from authenticated;

grant select, insert, update, delete on table public."QuestionnaireResponse" to service_role;
grant select, insert, update, delete on table public."QuestionnaireAnswer" to service_role;

drop policy if exists "service role manages questionnaire responses" on public."QuestionnaireResponse";
create policy "service role manages questionnaire responses"
  on public."QuestionnaireResponse"
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages questionnaire answers" on public."QuestionnaireAnswer";
create policy "service role manages questionnaire answers"
  on public."QuestionnaireAnswer"
  for all
  to service_role
  using (true)
  with check (true);

comment on table public."QuestionnaireResponse" is
  'Reusable questionnaire response records. Stores partial/completed status, anonymous user id, optional identity id, consent, suppression, scoring, source attribution, UTM fields, and export-ready profile object.';

comment on table public."QuestionnaireAnswer" is
  'Question-level answer records for QuestionnaireResponse. Stores tagged answers and score contribution for auditing and export review.';

comment on column public."QuestionnaireResponse"."exportProfile" is
  'Export-ready object containing response_id, anonymous_user_id, identity_id, tool_slug, vertical, tags, score, confidence, source_url, consent_status, suppression_status, and recommended_next_action.';

comment on column public."QuestionnaireResponse"."suppressionStatus" is
  'clear, needs_review, suppressed, or unchecked. Suppressed records must not route or export.';
