// src/components/MortgagePrequalWidget.tsx
// Embeddable pre-qual form for Mortgage OS. Drops on /solutions/mortgage, on
// any LO landing page, and (via /embed/mortgage) on a partner site. Posts to
// /api/mortgage/prequal which scores + routes the lead and auto-fires Flo's
// first-touch SMS/email under Compliance Guard.
"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Lock, Loader2 } from "lucide-react";
import {
  LoanType,
  LOAN_TYPE_ORDER,
  VERTICALS,
  scoreLead,
  PreQualInput,
} from "@/lib/mortgage";

type Props = {
  /** Optional — scopes the lead to a specific LO account. Defaults to site-wide routing. */
  loOwnerId?: string;
  /** Optional — shown in the confirmation message. */
  loDisplayName?: string;
  /** Optional — compact mode for sidebars and inline embeds. */
  compact?: boolean;
  /** Optional override of post endpoint — lets partners self-host. */
  endpoint?: string;
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

type Step = 1 | 2 | 3 | 4 | 5;

export default function MortgagePrequalWidget({
  loOwnerId,
  loDisplayName = "your loan officer",
  compact = false,
  endpoint = "/api/mortgage/prequal",
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { grade: string; reasons: string[] }>(null);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    loanType: "" as LoanType | "",
    fullName: "",
    email: "",
    phone: "",
    state: "",
    ficoBand: "" as PreQualInput["ficoBand"] | "",
    timeline: "" as PreQualInput["timeline"] | "",
    estIncomeUsd: "",
    estDtiPct: "",
    estLoanAmountUsd: "",
    estPropertyValueUsd: "",
    hasRealtor: false,
    hasContract: false,
    ownerOccupied: true,
    consentTcpa: false,
  });

  const vertical = form.loanType ? VERTICALS[form.loanType as LoanType] : null;

  const canAdvance = useMemo(() => {
    if (step === 1) return !!form.loanType;
    if (step === 2) return !!form.fullName && /.+@.+\..+/.test(form.email) && /\d{3}.*\d{3}.*\d{4}/.test(form.phone) && !!form.state;
    if (step === 3) return !!form.ficoBand && !!form.timeline;
    if (step === 4) return true; // numeric details are optional
    if (step === 5) return form.consentTcpa;
    return false;
  }, [step, form]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const payload: PreQualInput & {
        loOwnerId?: string;
        fullName: string;
        email: string;
        phone: string;
      } = {
        loanType: form.loanType as LoanType,
        ficoBand: form.ficoBand as PreQualInput["ficoBand"],
        estIncomeUsd: form.estIncomeUsd ? Number(form.estIncomeUsd) : undefined,
        estDtiPct: form.estDtiPct ? Number(form.estDtiPct) : undefined,
        estLoanAmountUsd: form.estLoanAmountUsd ? Number(form.estLoanAmountUsd) : undefined,
        estPropertyValueUsd: form.estPropertyValueUsd ? Number(form.estPropertyValueUsd) : undefined,
        timeline: form.timeline as PreQualInput["timeline"],
        state: form.state,
        hasRealtor: form.hasRealtor,
        hasContract: form.hasContract,
        ownerOccupied: form.ownerOccupied,
        consentTcpa: form.consentTcpa,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        loOwnerId,
      };

      const { grade, reasons } = scoreLead(payload);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, clientGrade: grade, clientReasons: reasons }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Server responded ${res.status}`);
      }
      setDone({ grade, reasons });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={wrap(compact)}>
        <div className="flex items-center gap-2 text-emerald-300">
          <Check className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-widest">You're in.</span>
        </div>
        <h3 className="mt-2 text-2xl font-extrabold text-white">
          Your pre-qual is queued. {loDisplayName} will reach out within 90 seconds.
        </h3>
        <p className="mt-2 text-sm text-ink-200">
          Lead grade: <span className="font-bold text-white">{done.grade}</span>. You'll receive a text and
          an email with an estimated rate range before we pick up the phone.
        </p>
        {done.reasons.length > 0 && (
          <ul className="mt-3 text-xs text-ink-300 list-disc pl-5 space-y-1">
            {done.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
        <p className="mt-4 text-[11px] text-ink-400">
          By submitting you agreed to receive automated calls/texts about your mortgage inquiry. You can reply STOP at any time. Standard rates may apply.
        </p>
      </div>
    );
  }

  return (
    <div className={wrap(compact)}>
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-1.5 rounded-full transition-all ${
              n < step ? "w-6 bg-cyan-300" : n === step ? "w-8 bg-white" : "w-3 bg-white/20"
            }`}
          />
        ))}
        <span className="ml-auto text-[11px] uppercase tracking-widest text-ink-300">Step {step} / 5</span>
      </div>

      {step === 1 && (
        <div>
          <Label>What kind of loan are you exploring?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LOAN_TYPE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update("loanType", t)}
                className={`text-left rounded-xl border px-3 py-2 transition text-sm ${
                  form.loanType === t
                    ? "border-cyan-300 bg-cyan-400/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-ink-200 hover:border-cyan-300/40"
                }`}
              >
                <div className="font-semibold">{VERTICALS[t].label}</div>
                <div className="text-[11px] text-ink-300 mt-0.5 line-clamp-2">{VERTICALS[t].blurb}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <Label>Tell us who to reach.</Label>
          <Input label="Full name" value={form.fullName} onChange={(v) => update("fullName", v)} placeholder="Jane Borrower" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="jane@email.com" />
            <Input label="Phone" type="tel" value={form.phone} onChange={(v) => update("phone", v)} placeholder="(555) 555-5555" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-ink-300">State</label>
            <select
              className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white focus:border-cyan-300 outline-none"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
            >
              <option value="">Select state</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {vertical && (
            <p className="text-[11px] text-ink-300 pt-1">
              Flo voice for this vertical: <span className="text-ink-100">{vertical.floVoice}</span>
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <Label>Credit &amp; timeline</Label>
          <div>
            <label className="text-xs uppercase tracking-wider text-ink-300">FICO band (self-report)</label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(["740+","700-739","660-699","620-659","580-619","<580","unknown"] as const).map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => update("ficoBand", b)}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${
                    form.ficoBand === b ? "border-cyan-300 bg-cyan-400/10 text-white" : "border-white/10 text-ink-200"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-ink-300">When do you want to close?</label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(["now","30d","60d","90d","6mo+"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => update("timeline", t)}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${
                    form.timeline === t ? "border-cyan-300 bg-cyan-400/10 text-white" : "border-white/10 text-ink-200"
                  }`}
                >
                  {t === "6mo+" ? "6mo+" : t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <Label>Optional: rough numbers sharpen the rate quote.</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Annual income (USD)" type="number" value={form.estIncomeUsd} onChange={(v) => update("estIncomeUsd", v)} placeholder="95000" />
            <Input label="Debt-to-income %" type="number" value={form.estDtiPct} onChange={(v) => update("estDtiPct", v)} placeholder="38" />
            <Input label="Loan amount" type="number" value={form.estLoanAmountUsd} onChange={(v) => update("estLoanAmountUsd", v)} placeholder="350000" />
            <Input label="Property value" type="number" value={form.estPropertyValueUsd} onChange={(v) => update("estPropertyValueUsd", v)} placeholder="420000" />
          </div>
          {form.loanType?.startsWith("purchase") && (
            <div className="flex flex-wrap gap-3 pt-1">
              <Check2 label="Have a realtor" value={form.hasRealtor} onChange={(v) => update("hasRealtor", v)} />
              <Check2 label="Under contract" value={form.hasContract} onChange={(v) => update("hasContract", v)} />
              <Check2 label="Will be owner-occupied" value={form.ownerOccupied} onChange={(v) => update("ownerOccupied", v)} />
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <Label>Almost done. One consent.</Label>
          <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={form.consentTcpa}
              onChange={(e) => update("consentTcpa", e.target.checked)}
            />
            <span className="text-[12px] text-ink-200 leading-relaxed">
              I agree to be contacted by {loDisplayName} (or their automated system) via phone, SMS, and email at the
              information I provided, including automated messages. Consent is not a condition of any purchase.
              Reply STOP to opt out. Standard message &amp; data rates may apply.
            </span>
          </label>
          <div className="flex items-center gap-2 text-[11px] text-ink-400">
            <Lock className="h-3.5 w-3.5" /> Your data is encrypted in transit (TLS 1.3) and at rest.
          </div>
        </div>
      )}

      {err && <p className="mt-3 text-xs text-rose-300">{err}</p>}

      <div className="mt-5 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="text-sm text-ink-300 hover:text-white"
          >
            Back
          </button>
        )}
        <button
          type="button"
          disabled={!canAdvance || submitting}
          onClick={() => {
            if (step < 5) setStep((s) => (s + 1) as Step);
            else submit();
          }}
          className={`ml-auto inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            canAdvance && !submitting
              ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950"
              : "bg-white/10 text-ink-300 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
            </>
          ) : step < 5 ? (
            <>
              Continue <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Get my rate range <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function wrap(compact: boolean) {
  return `relative rounded-2xl border border-cyan-400/20 bg-slate-950/60 backdrop-blur p-5 md:p-6 ${
    compact ? "max-w-md" : "max-w-xl"
  }`;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-widest text-cyan-300 mb-3 font-bold">{children}</div>;
}

function Input({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-ink-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder:text-ink-400 focus:border-cyan-300 outline-none"
      />
    </div>
  );
}

function Check2({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs cursor-pointer">
      <input type="checkbox" className="h-3.5 w-3.5" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-ink-100">{label}</span>
    </label>
  );
}
