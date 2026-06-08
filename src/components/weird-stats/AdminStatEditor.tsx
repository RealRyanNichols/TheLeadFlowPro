"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { WeirdStat } from "@/lib/weird-stats";
import { WEIRD_STAT_CATEGORIES } from "@/lib/weird-stats";

export function AdminStatEditor({ stat }: { stat?: WeirdStat }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(formData: FormData) {
    setStatus("saving");
    const payload = Object.fromEntries(formData.entries());
    const endpoint = stat?.id ? `/api/admin/stats/${stat.id}` : "/api/admin/stats";
    const method = stat?.id ? "PATCH" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await submit(new FormData(event.currentTarget));
      }}
      className="rounded-3xl border border-white/10 bg-white/[0.055] p-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-black text-white">Title</span>
          <input name="title" defaultValue={stat?.title} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black text-white">Slug</span>
          <input name="slug" defaultValue={stat?.slug} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black text-white">Category</span>
          <select name="category" defaultValue={stat?.category ?? "Internet"} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white">
            {WEIRD_STAT_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black text-white">Unit label</span>
          <input name="unitLabel" defaultValue={stat?.unitLabel ?? "items"} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black text-white">Base value</span>
          <input name="baseValue" type="number" defaultValue={stat?.baseValue ?? 0} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black text-white">Rate per second</span>
          <input name="ratePerSecond" type="number" step="0.001" defaultValue={stat?.ratePerSecond ?? 1} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
        </label>
      </div>
      <label className="mt-4 grid gap-2">
        <span className="text-sm font-black text-white">Short description</span>
        <textarea name="shortDescription" defaultValue={stat?.shortDescription} rows={2} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
      </label>
      <label className="mt-4 grid gap-2">
        <span className="text-sm font-black text-white">Why it matters</span>
        <textarea name="whyItMatters" defaultValue={stat?.whyItMatters} rows={3} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
      </label>
      <button className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-accent-400">
        {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {status === "saved" ? "Saved" : "Save stat"}
      </button>
      {status === "error" ? (
        <p className="mt-3 text-sm font-semibold text-rose-200">Could not save. Check admin login and database tables.</p>
      ) : null}
    </form>
  );
}
