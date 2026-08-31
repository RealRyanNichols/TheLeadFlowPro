alter table public.operator_workspace_settings
  drop constraint if exists operator_workspace_settings_allowed_channels_check,
  add constraint operator_workspace_settings_allowed_channels_check
    check (allowed_channels <@ array['email','dm','phone','text']::text[] and cardinality(allowed_channels) > 0);

alter table public.operator_outreach_events
  add constraint operator_outreach_events_event_type_length_check
    check (char_length(event_type) between 1 and 100);

alter table public.operator_prospects
  add constraint operator_prospects_contact_email_length_check
    check (contact_email is null or char_length(contact_email) <= 320),
  add constraint operator_prospects_contact_phone_length_check
    check (contact_phone is null or char_length(contact_phone) <= 80),
  add constraint operator_prospects_contact_name_length_check
    check (contact_name is null or char_length(contact_name) <= 200),
  add constraint operator_prospects_contact_title_length_check
    check (contact_title is null or char_length(contact_title) <= 200);
