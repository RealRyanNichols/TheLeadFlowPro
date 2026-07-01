-- LeadFlow Pro consent event capture ledger for the Next.js API route.
-- This table stores canonical consent text plus hashed request context.
-- It is intentionally not exposed for direct browser reads or writes.

create table if not exists public."LeadFlowConsentEvent" (
  id text primary key,
  "userId" text references public."User"(id) on delete set null,
  "identityId" text,
  "anonymousSessionId" text,
  "consentType" text not null,
  "consentText" text not null,
  "consentVersion" text not null,
  "sellerId" text,
  "capturedAt" timestamptz not null default now(),
  "ipHash" text,
  "sourceUrl" text not null,
  "sourcePath" text,
  "toolSlug" text,
  "userAgentHash" text,
  metadata jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "LeadFlowConsentEvent_identity_or_session_check"
    check ("identityId" is not null or "anonymousSessionId" is not null),
  constraint "LeadFlowConsentEvent_consent_type_check"
    check ("consentType" in (
      'tool_answers_only',
      'contact_me_about_result',
      'share_one_named_seller',
      'share_selected_sellers',
      'submit_lead_source_marketplace_review',
      'buyer_request_access',
      'do_not_contact',
      'delete_my_data'
    ))
);

comment on table public."LeadFlowConsentEvent" is
  'Server-written LeadFlow consent ledger. Stores canonical consent text, consent version, seller scope when applicable, source URL, tool slug, timestamp, and hashed IP/user-agent context.';
comment on column public."LeadFlowConsentEvent"."identityId" is
  'Optional known identity reference. May be null when only anonymous session consent exists.';
comment on column public."LeadFlowConsentEvent"."anonymousSessionId" is
  'Anonymous session identifier when identity is not yet captured.';
comment on column public."LeadFlowConsentEvent"."consentType" is
  'Specific permission mode. Never use blanket consent for phone/text seller routing.';
comment on column public."LeadFlowConsentEvent"."consentText" is
  'Canonical text the user accepted, including seller scope when applicable.';
comment on column public."LeadFlowConsentEvent"."sellerId" is
  'Named seller for one-seller consent, or primary selected seller for multi-seller consent. Full selected list is stored in metadata.';
comment on column public."LeadFlowConsentEvent"."ipHash" is
  'Salted hash of request IP when available. Raw IP addresses are not stored here.';
comment on column public."LeadFlowConsentEvent"."userAgentHash" is
  'Salted hash of user agent when available. Raw user agent strings are not stored here.';

create index if not exists "LeadFlowConsentEvent_identity_capturedAt_idx"
  on public."LeadFlowConsentEvent" ("identityId", "capturedAt" desc);
create index if not exists "LeadFlowConsentEvent_anonymousSession_capturedAt_idx"
  on public."LeadFlowConsentEvent" ("anonymousSessionId", "capturedAt" desc);
create index if not exists "LeadFlowConsentEvent_consentType_capturedAt_idx"
  on public."LeadFlowConsentEvent" ("consentType", "capturedAt" desc);
create index if not exists "LeadFlowConsentEvent_sellerId_capturedAt_idx"
  on public."LeadFlowConsentEvent" ("sellerId", "capturedAt" desc);
create index if not exists "LeadFlowConsentEvent_toolSlug_capturedAt_idx"
  on public."LeadFlowConsentEvent" ("toolSlug", "capturedAt" desc);

alter table public."LeadFlowConsentEvent" enable row level security;

revoke all on table public."LeadFlowConsentEvent" from anon;
revoke all on table public."LeadFlowConsentEvent" from authenticated;
grant select, insert, update, delete on table public."LeadFlowConsentEvent" to service_role;

drop policy if exists "leadflow_consent_events_no_anon_access" on public."LeadFlowConsentEvent";
create policy "leadflow_consent_events_no_anon_access"
  on public."LeadFlowConsentEvent"
  for all
  to anon, authenticated
  using (false)
  with check (false);
