"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactRound, LoaderCircle, Save, ShieldCheck } from "lucide-react";

type Prospect = {
  id: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_source: string | null;
  contact_route: string | null;
  contact_verified_at: string | null;
  owner_name: string | null;
  priority: string;
  status: string;
  do_not_contact_reason: string | null;
};

export default function ProspectContactEditor({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [form, setForm] = useState({
    contactName: prospect.contact_name || "",
    contactTitle: prospect.contact_title || "",
    contactEmail: prospect.contact_email || "",
    contactPhone: prospect.contact_phone || "",
    contactSource: prospect.contact_source || "",
    contactRoute: prospect.contact_route || "",
    ownerName: prospect.owner_name || "Pat",
    priority: prospect.priority,
    status: prospect.status,
    verified: Boolean(prospect.contact_verified_at),
    doNotContactReason: prospect.do_not_contact_reason || "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/operator/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save prospect details");
      setNotice("Prospect details saved.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save prospect details");
    } finally {
      setBusy(false);
    }
  }

  const hasContact = Boolean(form.contactEmail || form.contactPhone);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ContactRound className="mt-0.5 h-5 w-5 text-[var(--blue)]" />
          <div>
            <h2 className="font-black text-[var(--heading)]">Decision-maker and routing</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Store only business contact information from a permitted source. Mark it verified only after a human checks it.</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${hasContact ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {hasContact ? "Contact route loaded" : "Input needed"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Contact name<input value={form.contactName} onChange={(event) => set("contactName", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Title / role<input value={form.contactTitle} onChange={(event) => set("contactTitle", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Business email<input type="email" value={form.contactEmail} onChange={(event) => set("contactEmail", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Business phone<input value={form.contactPhone} onChange={(event) => set("contactPhone", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Owner<select value={form.ownerName} onChange={(event) => set("ownerName", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]"><option value="Pat">Pat</option><option value="Ryan">Ryan</option></select></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Priority<select value={form.priority} onChange={(event) => set("priority", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="WARM">Warm</option></select></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Stage<select value={form.status} onChange={(event) => set("status", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]"><option value="research">Research</option><option value="ready">Ready</option><option value="contacted">Contacted</option><option value="responded">Responded</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="won">Won</option><option value="lost">Lost</option><option value="do_not_contact">Do not contact</option></select></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Contact source<input value={form.contactSource} onChange={(event) => set("contactSource", event.target.value)} placeholder="Public site, Chamber listing, referral, etc." className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
      </div>

      <label className="mt-4 block text-xs font-black uppercase tracking-wide text-[var(--muted)]">Best contact route<textarea rows={3} value={form.contactRoute} onChange={(event) => set("contactRoute", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm leading-6 text-[var(--text)]" /></label>

      {form.status === "do_not_contact" && (
        <label className="mt-4 block text-xs font-black uppercase tracking-wide text-red-700">Do-not-contact reason<textarea rows={2} value={form.doNotContactReason} onChange={(event) => set("doNotContactReason", event.target.value)} className="mt-1 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-950" /></label>
      )}

      <label className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-3 text-sm font-semibold text-[var(--text)]">
        <input type="checkbox" checked={form.verified} onChange={(event) => set("verified", event.target.checked)} className="mt-1" />
        <span><span className="inline-flex items-center gap-1 font-black text-[var(--heading)]"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Human verified</span><br /><span className="text-xs font-normal text-[var(--muted)]">I checked the contact information and source before approving outreach.</span></span>
      </label>

      <button type="button" disabled={busy} onClick={save} className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[var(--blue)] px-4 text-sm font-black text-white disabled:opacity-50">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save routing
      </button>
      {notice && <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${notice.startsWith("Prospect") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice}</p>}
    </section>
  );
}
