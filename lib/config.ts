// Public Supabase config. The publishable key is safe to expose client-side;
// all data access is protected by Row Level Security in the database.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hpzpwfymwfgwspaixrxi.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_982Vn0U_IhLI9luYOaN9rQ_PlmmeJSx";

export const SITE_NAME = "The LeadFlow Pro";
export const SITE_TAGLINE = "Own your platform. Fire your monthly fees.";
export const CONTACT_EMAIL = "Hello@TheLeadFlowPro.com";
