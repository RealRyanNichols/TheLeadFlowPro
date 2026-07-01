-- LeadFlow Pro marketplace request API grants.
-- Server-side Next.js routes write buyer requests through the Supabase Data API
-- with a service role key. Browser clients never receive this key.

grant usage on schema leadflow to service_role;

grant select, insert, update on leadflow.buyer_requests to service_role;
grant select on leadflow.marketplace_listings to service_role;
grant insert on leadflow.events to service_role;

comment on table leadflow.buyer_requests is
  'Buyer sample/access/build requests with filters, private buyer metadata, and use case. Public UI previews stay redacted and all releases remain review-gated.';
