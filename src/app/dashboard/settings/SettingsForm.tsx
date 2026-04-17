"use client";
import { useState } from "react";
import {
  Bell, Save, Building2, Phone, Mail, Globe, Clock, AlertTriangle,
  MessageSquare, Trash2, Key, CheckCircle2
} from "lucide-react";

const NOTIF_FIELDS = [
  { key: "push_new_lead",        label: "Push — new lead",             default: true  },
  { key: "push_missed_call",     label: "Push — missed call",          default: true  },
  { key: "push_bot_escalation",  label: "Push — chatbot needs you",    default: true  },
  { key: "email_weekly_recap",   label: "Email — weekly recap",        default: true  },
  { key: "email_daily_digest",   label: "Email — daily AI digest",     default: false },
  { key: "sms_hot_lead",         label: "SMS — hot lead alerts",       default: false }
] as const;

export type SettingsUser = {
  name: string | null;
  businessName: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
  replyToEmail: string | null;
  email: string;
  timezone: string | null;
  businessHours: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  notifPrefs: Record<string, boolean> | null;
};

export function SettingsForm({ user }: { user: SettingsUser }) {
  const [form, setForm] = useState({
    name:          user.name ?? "",
    businessName:  user.businessName ?? "",
    industry:      user.industry ?? "",
    phone:         user.phone ?? "",
    website:       user.website ?? "",
    replyToEmail:  user.replyToEmail ?? user.email,
    timezone:      user.timezone ?? "America/Chicago",
    businessHours: user.businessHours ?? "Mon–Fri, 8am–6pm",
    addressStreet: user.addressStreet ?? "",
    addressCity:   user.addressCity ?? "",
    addressState:  user.addressState ?? "",
    addressZip:    user.addressZip ?? ""
  });
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() => {
    const saved = user.notifPrefs ?? {};
    const next: Record<string, boolean> = {};
    for (const f of NOTIF_FIELDS) next[f.key] = saved[f.key] ?? f.default;
    return next;
  });
  const [dirty, setDirty]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setSaved(false);
  }
  function toggleNotif(key: string) {
    setNotifs((n) => ({ ...n, [key]: !n[key] }));
    setDirty(true);
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, notifPrefs: notifs })
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Couldn't save. Try again.");
      return;
    }
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  async function deleteAccount() {
    const ok = confirm(
      "Delete your account? This permanently removes your workspace, leads, and automations. Can't undo."
    );
    if (!ok) return;
    const res = await fetch("/api/user/delete", { method: "POST" });
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Couldn't delete. Contact support.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6 min-w-0">
      {/* Business */}
      <section id="business" className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-cyan-400" /> Business info
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name"      value={form.name}         onChange={(v) => set("name", v)} />
          <Field label="Business name"  icon={Building2} value={form.businessName} onChange={(v) => set("businessName", v)} />
          <Field label="Industry"       value={form.industry}     onChange={(v) => set("industry", v)} placeholder="e.g. Dental Practice" />
          <Field label="Website"        icon={Globe} value={form.website} onChange={(v) => set("website", v)} placeholder="https://…" />
          <Field label="Primary phone"  icon={Phone} value={form.phone}  onChange={(v) => set("phone", v)} placeholder="+1 (903) 555-0100" />
          <Field label="Reply-to email" icon={Mail} type="email" value={form.replyToEmail} onChange={(v) => set("replyToEmail", v)} />
        </div>
      </section>

      {/* Contact / hours */}
      <section id="contact" className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-400" /> Contact & hours
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Timezone" value={form.timezone} onChange={(v) => set("timezone", v)}>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Denver">America/Denver</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="America/Phoenix">America/Phoenix</option>
            <option value="America/Anchorage">America/Anchorage</option>
            <option value="Pacific/Honolulu">Pacific/Honolulu</option>
          </Select>
          <Select label="Business hours" value={form.businessHours} onChange={(v) => set("businessHours", v)}>
            <option>Mon–Fri, 8am–6pm</option>
            <option>Mon–Fri, 9am–5pm</option>
            <option>Mon–Sat, 9am–5pm</option>
            <option>Mon–Sun, 10am–8pm</option>
            <option>24/7</option>
            <option>Custom</option>
          </Select>
          <Field label="Street address" value={form.addressStreet} onChange={(v) => set("addressStreet", v)} full />
          <Field label="City"           value={form.addressCity}   onChange={(v) => set("addressCity", v)} />
          <Field label="State"          value={form.addressState}  onChange={(v) => set("addressState", v)} placeholder="TX" />
          <Field label="ZIP"            value={form.addressZip}    onChange={(v) => set("addressZip", v)} />
        </div>
      </section>

      {/* Notifications */}
      <section id="notifications" className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-cyan-400" /> Notifications
        </h2>
        <p className="text-xs text-ink-400 mb-4">
          Critical alerts are always on — missed calls, hot leads, chatbot escalations. Tune the rest.
        </p>
        <div className="space-y-3">
          {NOTIF_FIELDS.map((n) => (
            <Toggle
              key={n.key}
              label={n.label}
              checked={!!notifs[n.key]}
              onChange={() => toggleNotif(n.key)}
            />
          ))}
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-4 glass-strong rounded-2xl p-3 sm:p-4 border border-cyan-500/30 flex items-center justify-between gap-3 z-10">
        <p className="text-xs sm:text-sm text-ink-300 flex items-center gap-2">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4 text-lead-400" /> Saved</>
          ) : saving ? (
            "Saving…"
          ) : dirty ? (
            "Unsaved changes"
          ) : (
            "All changes saved"
          )}
        </p>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="btn-accent text-sm py-2 px-4 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save all"}
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
            disabled
          />
          <DangerRow
            icon={MessageSquare}
            title="Clear chatbot history"
            hint="Delete every saved conversation. Can't undo."
            cta="Clear"
            disabled
          />
          <DangerRow
            icon={Trash2}
            title="Delete account"
            hint="Permanently remove your workspace, leads, and automations."
            cta="Delete"
            destructive
            onClick={deleteAccount}
          />
        </div>
      </section>
    </form>
  );
}

function Field({ label, icon: Icon, value, onChange, full, type = "text", placeholder }: {
  label: string; icon?: any; value: string; onChange: (v: string) => void;
  full?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <label className={full ? "sm:col-span-2 block" : "block"}>
      <span className="text-xs text-ink-300 font-semibold">{label}</span>
      <div className="mt-1 relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={
            "w-full bg-white/5 border border-white/10 rounded-lg py-2 text-sm text-white placeholder:text-ink-500 focus:outline-none focus:border-cyan-500/50 " +
            (Icon ? "pl-9 pr-3" : "px-3")
          }
        />
      </div>
    </label>
  );
}

function Select({ label, children, value, onChange }: {
  label: string; children: React.ReactNode; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-300 font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
      >
        {children}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0 cursor-pointer">
      <span className="text-sm text-ink-100">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-9 appearance-none rounded-full bg-white/10 checked:bg-cyan-500 transition cursor-pointer relative
          before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition
          checked:before:translate-x-4"
      />
    </label>
  );
}

function DangerRow({ icon: Icon, title, hint, cta, destructive, onClick, disabled }: {
  icon: any; title: string; hint: string; cta: string;
  destructive?: boolean; onClick?: () => void; disabled?: boolean;
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
        onClick={onClick}
        disabled={disabled}
        className={
          "text-xs py-1.5 px-3 rounded-lg border transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed " +
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
