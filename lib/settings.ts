import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export type SiteSettings = {
  meta_pixel_id: string;
  google_ads_id: string;
  google_ads_conversion_label: string;
  ga4_id: string;
  calendar_url: string;
};

export async function getSettings(): Promise<SiteSettings> {
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await supabase.from("site_settings").select("key, value");
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
  return {
    meta_pixel_id: map.meta_pixel_id ?? "",
    google_ads_id: map.google_ads_id ?? "",
    google_ads_conversion_label: map.google_ads_conversion_label ?? "",
    ga4_id: map.ga4_id ?? "",
    calendar_url: map.calendar_url ?? "",
  };
}
