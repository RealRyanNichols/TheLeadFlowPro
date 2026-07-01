-- LeadFlow Pro operating dashboard query support.
-- This migration is intentionally defensive because some live environments may
-- have only part of the Phase 3 schema applied. It adds indexes only when the
-- target table already exists.

create schema if not exists leadflow;

do $$
begin
  if to_regclass('leadflow.events') is not null then
    execute 'create index if not exists events_ops_time_name_idx on leadflow.events(created_at desc, event_name)';
    execute 'create index if not exists events_ops_vertical_category_idx on leadflow.events(vertical, category, created_at desc)';
    execute 'create index if not exists events_ops_properties_gin_idx on leadflow.events using gin(properties)';
    execute 'comment on table leadflow.events is ''Privacy-safe event stream for LeadFlow funnels, dashboards, and operating metrics. Do not store raw PII, raw answers, hidden notes, or sensitive attributes.''';
  end if;

  if to_regclass('leadflow.lead_profiles') is not null then
    execute 'create index if not exists lead_profiles_ops_status_idx on leadflow.lead_profiles(review_status, suppression_status, source_proof_status, created_at desc)';
    execute 'create index if not exists lead_profiles_ops_vertical_idx on leadflow.lead_profiles(vertical, category, created_at desc)';
  end if;

  if to_regclass('leadflow.marketplace_listings') is not null then
    execute 'create index if not exists marketplace_listings_ops_status_idx on leadflow.marketplace_listings(listing_status, review_status, updated_at desc)';
    execute 'create index if not exists marketplace_listings_ops_vertical_idx on leadflow.marketplace_listings(vertical, category, updated_at desc)';
  end if;

  if to_regclass('leadflow.responses') is not null then
    execute 'create index if not exists responses_ops_tool_idx on leadflow.responses(tool_slug, created_at desc)';
    execute 'create index if not exists responses_ops_vertical_idx on leadflow.responses(vertical, category, created_at desc)';
  end if;

  if to_regclass('leadflow.buyer_requests') is not null then
    execute 'create index if not exists buyer_requests_ops_status_idx on leadflow.buyer_requests(status, review_status, created_at desc)';
    execute 'create index if not exists buyer_requests_ops_vertical_idx on leadflow.buyer_requests(vertical, category, created_at desc)';
  end if;

  if to_regclass('leadflow.submitted_sources') is not null then
    execute 'create index if not exists submitted_sources_ops_risk_idx on leadflow.submitted_sources(review_status, risk_level, created_at desc)';
    execute 'create index if not exists submitted_sources_ops_vertical_idx on leadflow.submitted_sources(vertical, source_type, created_at desc)';
  end if;

  if to_regclass('leadflow.samples') is not null then
    execute 'create index if not exists samples_ops_listing_idx on leadflow.samples(listing_id, status, created_at desc)';
  end if;

  if to_regclass('leadflow.orders') is not null then
    execute 'create index if not exists orders_ops_type_status_idx on leadflow.orders(order_type, status, created_at desc)';
    execute 'create index if not exists orders_ops_listing_idx on leadflow.orders(listing_id, created_at desc)';
  end if;

  if to_regclass('leadflow.exports') is not null then
    execute 'create index if not exists exports_ops_status_idx on leadflow.exports(export_status, created_at desc)';
  end if;

  if to_regclass('leadflow.suppression_requests') is not null then
    execute 'create index if not exists suppression_requests_ops_status_idx on leadflow.suppression_requests(status, created_at desc)';
  end if;

  if to_regclass('leadflow.partner_earnings') is not null then
    execute 'create index if not exists partner_earnings_ops_status_idx on leadflow.partner_earnings(status, earning_type, created_at desc)';
  end if;

  if to_regclass('leadflow.custom_sourcing_requests') is not null then
    execute 'create index if not exists custom_sourcing_ops_status_idx on leadflow.custom_sourcing_requests(status, vertical, created_at desc)';
    execute 'create index if not exists custom_sourcing_ops_budget_idx on leadflow.custom_sourcing_requests(budget_range, created_at desc)';
  end if;

  if to_regclass('leadflow.buyer_match_results') is not null then
    execute 'create index if not exists buyer_match_results_ops_entity_idx on leadflow.buyer_match_results(matched_entity_type, matched_entity_id, created_at desc)';
    execute 'create index if not exists buyer_match_results_ops_listing_idx on leadflow.buyer_match_results(listing_id, created_at desc)';
  end if;
end $$;
