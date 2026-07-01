-- Public-schema Data API views for server-side LeadFlow REST fallback.
-- The preferred API schema is leadflow. These views exist so service-role
-- route handlers can still persist data when the hosted Data API has not yet
-- exposed the leadflow schema. Do not grant browser roles direct write access.

create or replace view public.custom_sourcing_requests as
  select * from leadflow.custom_sourcing_requests;
create or replace view public.buyer_requests as
  select * from leadflow.buyer_requests;
create or replace view public.buyer_accounts as
  select * from leadflow.buyer_accounts;
create or replace view public.events as
  select * from leadflow.events;
create or replace view public.audit_log as
  select * from leadflow.audit_log;
create or replace view public.product_factory_runs as
  select * from leadflow.product_factory_runs;
create or replace view public.marketplace_listings as
  select * from leadflow.marketplace_listings;
create or replace view public.segments as
  select * from leadflow.segments;

revoke all on public.custom_sourcing_requests from anon, authenticated;
revoke all on public.buyer_requests from anon, authenticated;
revoke all on public.buyer_accounts from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;
revoke all on public.product_factory_runs from anon, authenticated;
revoke all on public.marketplace_listings from anon, authenticated;
revoke all on public.segments from anon, authenticated;

grant select, insert, update, delete on public.custom_sourcing_requests to service_role;
grant select, insert, update on public.buyer_requests to service_role;
grant select, insert, update on public.buyer_accounts to service_role;
grant select, insert on public.events to service_role;
grant select, insert on public.audit_log to service_role;
grant select, insert, update on public.product_factory_runs to service_role;
grant select, insert, update on public.marketplace_listings to service_role;
grant select, insert, update on public.segments to service_role;
