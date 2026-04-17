"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bell, Save, Building2, Phone, Mail, Globe, Clock, AlertTriangle,
  MessageSquare, Trash2, Key
} from "lucide-react";
import { MOCK_USER } from "@/lib/mock-data";

const SECTIONS = [
  { id: "business",    label: "Business info",    icon: Building2 },
  { id: "contact",     label: "Contact & hours",  icon: Phone },
  { id: "notifications", label: "Notifications",  icon: Bell },
  { id: "danger",      label: "Danger zone",      icon: AlertTriangle }
];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  function fakeSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

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
        <aside className="space-y-1">
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

        <form onSubmit={fakeSave} className="space-y-6 min-w-0">
          {/* Business */}
          <section id="business" className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-400" /> Business info
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" icon={Building2} defaultValue={MOCK_USER.businessName} />
              <Field label="Industry"      defaultValue={MOCK_USER.industry} />
              <Field label="Website"       icon={Globe} defaultValue="https://www.theleadflowpro.com" />
              <Field label="Primary phone" icon={Phone} defaultValue="+1 (903) 555-0100" />
              <Field label="Reply-to email" icon={Mail} type="email" defaultValue="ryan@theleadflowpro.com" full />
            </div>
          </section>

          {/* Contact / hours */}
          <section id="contact" className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" /> Contact & hours
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Timezone" defaultValue="America/Chicago">
                <option>America/Chicago</option>
                <option>America/New_York</option>
                <option>America/Denver</option>
                <option>America/Los_Angeles</option>
              </Select>
              <Select label="Business hours">
                <option>Mon–Fri, 8am–6pm</option>
                <option>Mon–Sat, 9am–5pm</option>
                <option>24/7</option>
                <option>Custom</option>
              </Select>
              <Field label="Street address" defaultValue="1700 N High St" />
              <Field label="City, State ZIP" defaultValue="Longview, TX 75601" />
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications" className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-400" /> Notifications
            </h2>
            <p className="text-xs text-ink-400 mb-4">
              Critical notifications are always on — missed calls, hot leads, chatbot escalations.
              Tune the rest.
            </p>
            <div className="space-y-3">
              <Toggle label="Push — new lead"              defaultChecked />
              <Toggle label="Push — missed call"           defaultChecked />
              <Toggle label="Push — chatbot needs you"     defaultChecked />
              <Toggle label="Email — weekly recap"         defaultChecked />
              <Toggle label="Email — daily AI digest" />
              <Toggle label="SMS — hot lead alerts" />
            </div>
          </section>

          {/* Save bar */}
          <div className="sticky bottom-4 glass-strong rounded-2xl p-3 sm:p-4 border border-cyan-500/30 flex items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-ink-300">
              {saved ? "Saved ✓" : "Unsaved changes"}
            </p>
            <button type="submit" className="btn-accent text-sm py-2 px-4">
              <Save className="h-4 w-4" /> Save all
            </button>
          </div>

          {/* Danger */}
          <section id="danger" className="glass rounded-2xl p-5 sm:p-6 border border-red-500/20">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Danger zone
            </h2>
            <div className="space-y-3">
              <DangerRow
                icon={Key}
                title="Rotate API keys"
                hint="Regenerate all platform keys. Connected apps will need to reconnect."
                cta="Rotate"
              />
              <DangerRow
                icon={MessageSquare}
                title="Clear chatbot history"
                hint="Delete every saved conversation. Can't undo."
                cta="Clear"
              />
              <DangerRow
                icon={Trash2}
                title="Delete account"
                hint="Permanently remove your workspace, leads, and automations."
                cta="Delete"
                destructive
              />
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, defaultValue, full, type = "text" }: {
  label: string; icon?: any; defaultValue?: string; full?: boolean; type?: string;
}) {
  return (
    <label className={full ? "sm:col-span-2 block" : "block"}>
      <span className="text-xs text-ink-300 font-semibold">{label}</span>
      <div className="mt-1 relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />}
        <input
          type={type}
          defaultValue={defaultValue}
          className={
            "w-full bg-white/5 border border-white/10 rounded-lg py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 " +
            (Icon ? "pl-9 pr-3" : "px-3")
          }
        />
      </div>
    </label>
  );
}

function Select({ label, children, defaultValue }: { label: string; children: React.ReactNode; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-ink-300 font-semibold">{label}</span>
      <select
        defaultValue={defaultValue}
        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
      >
        {children}
      </select>
    </label>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-ink-100">{label}</span>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-5 w-9 appearance-none rounded-full bg-white/10 checked:bg-cyan-500 transition cursor-pointer relative
          before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition
          checked:before:translate-x-4"
      />
    </label>
  );
}

function DangerRow({ icon: Icon, title, hint, cta, destructive }: {
  icon: any; title: string; hint: string; cta: string; destructive?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10">
      <span className="h-8 w-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-ink-400 mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        className={
          "text-xs py-1.5 px-3 rounded-lg border transition shrink-0 " +
          (destructive
            ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
            : "bg-white/5 text-ink-200 border-white/10 hover:bg-white/10")
        }
      >
        {cta}
      </button>
    </div>
  );
}
