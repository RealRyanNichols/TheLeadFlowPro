"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, KeyRound, Loader2, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { trackEvent } from "@/lib/events";

type PartnerAuthMode = "magic" | "password" | "create";

function trackPartnerAuth(eventName: string, properties: Record<string, string | number | boolean>) {
  trackEvent(eventName, { route: "/partner/login", ...properties });
}

export function PartnerAuthPanel({ next = "/partner" }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<PartnerAuthMode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "saving" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

  async function submitMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ type: "saving", message: "Sending partner magic link." });
    trackPartnerAuth("partner_signup_started", { method: "magic_link" });
    const response = await fetch("/api/partner/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, next }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!response.ok) {
      setStatus({ type: "error", message: data.error || "Magic link could not be sent." });
      return;
    }
    setStatus({ type: "success", message: data.message || "Magic link sent." });
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    const isCreate = mode === "create";
    setStatus({ type: "saving", message: isCreate ? "Creating partner account." : "Opening partner portal." });
    trackPartnerAuth("partner_signup_started", { method: isCreate ? "password_signup" : "password" });
    const response = await fetch("/api/partner/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: isCreate ? "signup" : "signin",
        email,
        password,
        name,
        company,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; redirectTo?: string; message?: string; needsEmailConfirmation?: boolean };
    if (!response.ok) {
      setStatus({ type: "error", message: data.error || "Partner login failed." });
      return;
    }
    if (data.needsEmailConfirmation) {
      setStatus({ type: "success", message: data.message || "Check email to confirm this partner account." });
      return;
    }
    trackPartnerAuth("partner_signup_completed", { method: isCreate ? "password_signup" : "password" });
    router.push(data.redirectTo || next);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
          <div>
            <p className="font-bold text-white">Partner access is review-gated.</p>
            <p className="mt-1 text-sm leading-6 text-ink-200">
              Your source does not become sellable just because you submit it. Every source is reviewed for proof, permission, risk, suppression, and buyer use case.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
        <AuthModeButton active={mode === "magic"} onClick={() => setMode("magic")}>
          Magic
        </AuthModeButton>
        <AuthModeButton active={mode === "password"} onClick={() => setMode("password")}>
          Password
        </AuthModeButton>
        <AuthModeButton active={mode === "create"} onClick={() => setMode("create")}>
          Create
        </AuthModeButton>
      </div>

      {status.message ? (
        <div
          className={`rounded-2xl border p-3 text-sm leading-6 ${
            status.type === "error"
              ? "border-red-300/35 bg-red-300/10 text-red-100"
              : status.type === "success"
                ? "border-lead-300/35 bg-lead-300/10 text-lead-100"
                : "border-white/10 bg-white/[0.04] text-ink-100"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      {mode === "magic" ? (
        <form onSubmit={submitMagicLink} className="space-y-4">
          <PartnerInput label="Partner email" type="email" value={email} onChange={setEmail} icon="email" placeholder="partner@company.com" />
          <button type="submit" disabled={status.type === "saving"} className="btn-accent w-full justify-center disabled:opacity-60">
            {status.type === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Email magic link
          </button>
        </form>
      ) : (
        <form onSubmit={submitPassword} className="space-y-4">
          {mode === "create" ? (
            <>
              <PartnerInput label="Your name" type="text" value={name} onChange={setName} icon="user" placeholder="Your name" />
              <PartnerInput label="Company" type="text" value={company} onChange={setCompany} icon="user" placeholder="Company name" />
            </>
          ) : null}
          <PartnerInput label="Partner email" type="email" value={email} onChange={setEmail} icon="email" placeholder="partner@company.com" />
          <PartnerInput label="Password" type="password" value={password} onChange={setPassword} icon="key" placeholder="At least 8 characters" minLength={8} />
          <button type="submit" disabled={status.type === "saving"} className="btn-accent w-full justify-center disabled:opacity-60">
            {status.type === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {mode === "create" ? "Create partner account" : "Open partner portal"}
          </button>
        </form>
      )}

      <Link href="/api/partner/auth/oauth/google" className="btn-ghost w-full justify-center text-sm">
        Continue with Google if configured
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function AuthModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl bg-white px-3 py-2 text-sm font-bold text-ink-950 shadow"
          : "rounded-xl px-3 py-2 text-sm font-semibold text-ink-300 hover:bg-white/5 hover:text-white"
      }
    >
      {children}
    </button>
  );
}

function PartnerInput({
  label,
  type,
  value,
  onChange,
  icon,
  placeholder,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  icon: "email" | "key" | "user";
  placeholder: string;
  minLength?: number;
}) {
  const Icon = icon === "email" ? Mail : icon === "key" ? KeyRound : UserPlus;
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">{label}</span>
      <div className="relative mt-2">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={minLength}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-ink-950/70 py-3 pl-9 pr-4 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-400"
        />
      </div>
    </label>
  );
}
