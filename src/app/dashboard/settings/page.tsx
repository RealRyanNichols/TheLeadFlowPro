import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell, Building2, Phone, AlertTriangle
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import { SettingsForm, type SettingsUser } from "./SettingsForm";

export const metadata = { title: "Settings — The LeadFlow Pro" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "business",      label: "Business info",   icon: Building2 },
  { id: "contact",       label: "Contact & hours", icon: Phone },
  { id: "notifications", label: "Notifications",   icon: Bell },
  { id: "danger",        label: "Danger zone",     icon: AlertTriangle }
];

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/settings");

  const forForm: SettingsUser = {
    name:          user.name,
    businessName:  user.businessName,
    industry:      user.industry,
    phone:         user.phone,
    website:       user.website,
    replyToEmail:  user.replyToEmail,
    email:         user.email,
    timezone:      user.timezone,
    businessHours: user.businessHours,
    addressStreet: user.addressStreet,
    addressCity:   user.addressCity,
    addressState:  user.addressState,
    addressZip:    user.addressZip,
    notifPrefs:    (user.notifPrefs as Record<string, boolean> | null) ?? null
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm text-ink-300 mt-1">
            Keep your business info sharp. We use it everywhere — chatbot, texts, emails, FlowCard.
          </p>
        </div>
        <Link href="/dashboard/billing" className="btn-accent text-sm py-2 px-4">
          Billing & plan
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        {/* Section nav */}
        <aside className="space-y-1 lg:sticky lg:top-6 self-start">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-200 hover:bg-white/5 hover:text-white"
            >
              <s.icon className="h-4 w-4 text-cyan-400" />
              {s.label}
            </a>
          ))}
        </aside>

        <SettingsForm user={forForm} />
      </div>
    </div>
  );
}
