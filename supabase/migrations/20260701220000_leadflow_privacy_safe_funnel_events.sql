-- Privacy-safe funnel analytics additions for The LeadFlow Pro.
-- Keeps detailed event data in leadflow.events with RLS and explicit grants.

alter table if exists leadflow.events
  add column if not exists route text,
  add column if not exists auth_user_id text,
  add column if not exists user_role text;

comment on column leadflow.events.route is
  'Sanitized route path with only approved attribution query parameters. Do not store raw PII or raw answers.';
comment on column leadflow.events.auth_user_id is
  'Optional auth user id for server-resolved buyer/admin events. Stored as text because auth providers may differ.';
comment on column leadflow.events.user_role is
  'Resolved event actor role: anonymous, buyer, admin, or system.';

create index if not exists events_route_time_idx on leadflow.events(route, created_at desc);
create index if not exists events_user_role_time_idx on leadflow.events(user_role, created_at desc);
create index if not exists events_properties_gin_idx on leadflow.events using gin(properties);

drop policy if exists events_public_insert on leadflow.events;
create policy events_public_insert on leadflow.events
  for insert to anon, authenticated
  with check (
    event_type = 'anonymous'
    and event_name ~ '^[a-z0-9][a-z0-9_.:-]{1,95}$'
    and coalesce(route, source_path, '/') !~* '(email|phone|token|password|credit|ssn|dob)'
    and not (
      properties ?| array[
        'email',
        'phone',
        'name',
        'first_name',
        'last_name',
        'address',
        'street',
        'ssn',
        'dob',
        'raw_answer',
        'message',
        'notes',
        'medical',
        'health',
        'race',
        'religion',
        'sexual_orientation',
        'exact_income',
        'bank_account',
        'credit_card',
        'password',
        'token'
      ]
    )
  );

grant usage on schema leadflow to anon, authenticated, service_role;
grant insert on leadflow.events to anon, authenticated;
grant select on leadflow.events to authenticated;
grant select, insert, update on leadflow.events to service_role;

grant insert on leadflow.anonymous_sessions to anon, authenticated;
grant select, insert, update on leadflow.anonymous_sessions to service_role;
