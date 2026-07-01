-- LeadFlow Pro public tool signal intake table.
-- Run against Supabase Postgres before enabling live writes for /api/tools/signal-intake.
-- The app writes server-side through Prisma. Do not expose this table to anonymous client reads.

create table if not exists public."ToolSignalIntake" (
  id text primary key,
  "userId" text references public."User"(id) on delete set null,
  "toolId" text not null,
  "toolName" text not null,
  "sessionId" text not null,
  "sourcePath" text not null,
  "leadCategory" text not null,
  "dataCategory" text not null,
  "whoFor" text not null,
  "answerGives" text not null,
  "primaryAnswer" text not null,
  context text not null,
  "desiredOutcome" text not null,
  urgency text not null,
  answers jsonb not null,
  "leadScore" integer not null,
  "consentAccepted" boolean not null default false,
  "adultConfirmed" boolean not null default false,
  "sensitiveDataAcknowledged" boolean not null default false,
  "clientTimestamp" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "ToolSignalIntake_toolId_createdAt_idx"
  on public."ToolSignalIntake" ("toolId", "createdAt");

create index if not exists "ToolSignalIntake_sessionId_idx"
  on public."ToolSignalIntake" ("sessionId");

create index if not exists "ToolSignalIntake_leadCategory_createdAt_idx"
  on public."ToolSignalIntake" ("leadCategory", "createdAt");

create index if not exists "ToolSignalIntake_consentAccepted_createdAt_idx"
  on public."ToolSignalIntake" ("consentAccepted", "createdAt");

create index if not exists "ToolSignalIntake_userId_createdAt_idx"
  on public."ToolSignalIntake" ("userId", "createdAt");

alter table public."ToolSignalIntake" enable row level security;

revoke all on table public."ToolSignalIntake" from anon;
revoke all on table public."ToolSignalIntake" from authenticated;
grant select, insert, update, delete on table public."ToolSignalIntake" to service_role;

drop policy if exists "service role manages tool signal intakes" on public."ToolSignalIntake";
create policy "service role manages tool signal intakes"
  on public."ToolSignalIntake"
  for all
  to service_role
  using (true)
  with check (true);

comment on table public."ToolSignalIntake" is
  'Consent-aware first-party tool answers captured from /tools. Server-side only; no anonymous client read access.';

comment on column public."ToolSignalIntake"."sessionId" is
  'Browser-generated anonymous session id used to group tool answers before a user is known.';

comment on column public."ToolSignalIntake"."sourcePath" is
  'Route where the tool answer was submitted, usually /tools.';

comment on column public."ToolSignalIntake"."leadCategory" is
  'Lead category derived from the selected public tool.';
