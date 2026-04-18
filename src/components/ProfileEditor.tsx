// src/components/ProfileEditor.tsx
//
// Client-side editor for the small set of user-editable fields on the
// /profile page: display name, mortgage-originator flag, NMLS, state
// licenses. POSTs to /api/user (see _staged_api_user_route.ts).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  name: string;
  mortgageOriginator: boolean;
  loNmlsId: string;
  loStateLicenses: string[];
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC"
];

export default function ProfileEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [isMortgageLO, setIsMortgageLO] = useState(initial.mortgageOriginator);
  const [nmls, setNmls] = useState(initial.loNmlsId);
  const [states, setStates] = useState<string[]>(initial.loStateLicenses);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          mortgageOriginator: isMortgageLO,
          loNmlsId: isMortgageLO ? nmls.trim() || null : null,
          loStateLicenses: isMortgageLO ? states : [],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Save failed (${res.status})`);
      }
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong saving your profile.");
    } finally {
      setSaving(false);
    }
  }

  function toggleState(st: string) {
    setStates((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]
    );
  }

  return (
    <form
      onSubmit={onSave}
      className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm space-y-5"
    >
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
        Edit profile
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-slate-500">Display name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="How you want to appear in the app"
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isMortgageLO}
            onChange={(e) => setIsMortgageLO(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <span className="text-sm font-medium text-slate-900">
              I'm a licensed mortgage originator
            </span>
            <p className="text-xs text-slate-500">
              Turn on Mortgage OS — Flo Inbox, Compliance Guard, Doc Chaser, Rate-Watch, and partner portal. Requires a valid NMLS ID.
            </p>
          </div>
        </label>

        {isMortgageLO ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs uppercase tracking-wider text-slate-500">NMLS ID</span>
              <input
                type="text"
                inputMode="numeric"
                value={nmls}
                onChange={(e) => setNmls(e.target.value.replace(/[^\d]/g, ""))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 123456"
              />
            </label>
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                State licenses ({states.length} selected)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {US_STATES.map((st) => {
                  const active = states.includes(st);
                  return (
                    <button
                      type="button"
                      key={st}
                      onClick={() => toggleState(st)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ${
                        active
                          ? "bg-emerald-600 text-white ring-emerald-600"
                          : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Saved.
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
