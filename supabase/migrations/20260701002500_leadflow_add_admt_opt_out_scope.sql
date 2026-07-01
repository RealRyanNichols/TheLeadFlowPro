-- Add an explicit ADMT opt-out scope before the RLS hardening migration uses it.
-- Keep this separate because Postgres enum values added inside a transaction
-- cannot be used until that transaction commits.

alter type leadflow.consent_scope add value if not exists 'admt_opt_out';
