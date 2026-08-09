import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export default async function AdminSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));

  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-slate-400">
        Paste your ad platform IDs here and tracking goes live on the whole site
        instantly — no code changes. Leave blank to keep a tracker off.
      </p>
      <SettingsForm initial={settings} />

      <div className="card mt-8 text-sm text-slate-400">
        <h2 className="mb-2 font-bold text-white">Where to find these</h2>
        <p className="mb-2">
          <span className="font-semibold text-slate-200">Meta Pixel ID:</span>{" "}
          Meta Events Manager → Data Sources → your Pixel → the 15-16 digit ID.
        </p>
        <p className="mb-2">
          <span className="font-semibold text-slate-200">Google Ads tag:</span>{" "}
          Google Ads → Tools → Data manager → Google tag. Looks like AW-123456789.
        </p>
        <p className="mb-2">
          <span className="font-semibold text-slate-200">Conversion label:</span>{" "}
          Google Ads → Goals → Conversions → your "Lead" conversion → Tag setup →
          the string after the slash in send_to.
        </p>
        <p>
          <span className="font-semibold text-slate-200">Calendar link:</span>{" "}
          your scheduling page URL (Calendly, Google appointment page, etc.).
          Shown to every lead right after they submit the form.
        </p>
      </div>
    </div>
  );
}
