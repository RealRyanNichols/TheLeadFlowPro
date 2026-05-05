// src/app/login/page.tsx — Email-only passwordless login.
//
// Step 1: User enters email → POST /api/auth/email-otp → we email them a
//         6-digit code.
// Step 2: User enters the code → signIn("email-otp", { email, otp }) →
//         NextAuth verifies and creates the session.
//
// Legacy email+password login is still supported — visit /login?legacy=1
// to use it. Useful for admin until Resend is configured in Vercel.

"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { ArrowRight, Mail, KeyRound, AlertCircle, Lock, Check } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("callbackUrl") || "/dashboard";
  const legacy = params.get("legacy") === "1";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Light header — no dashboard advertised here */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-950 hover:text-brand-700">
            The LeadFlow Pro
          </Link>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2">
        <section className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-sm">
            {legacy ? (
              <LegacyPasswordForm next={next} />
            ) : (
              <EmailOtpForm next={next} />
            )}

            <p className="mt-8 text-xs text-slate-500 text-center">
              {legacy ? (
                <Link href="/login" className="hover:underline">← Back to email-only sign-in</Link>
              ) : (
                <Link href="/login?legacy=1" className="hover:underline">Need legacy password sign-in?</Link>
              )}
            </p>
          </div>
        </section>

        <aside className="hidden lg:flex relative overflow-hidden items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white border-l border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative max-w-md px-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300 font-semibold">
              The Operator's office
            </div>
            <h2 className="mt-5 text-3xl font-bold leading-tight">
              Every lead, every move, every algorithm signal —{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-accent-400 bg-clip-text text-transparent">
                one screen.
              </span>
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {[
                "Lead inbox that never loses a call",
                "Playbooks for ads, content, and follow-up",
                "AI chatbot that answers at 2 a.m.",
                "Honest dashboard — no inflated numbers",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs text-slate-400">
              Want to see what it looks like before signing in?{" "}
              <Link href="/demo" className="text-cyan-300 hover:underline font-semibold">
                Take the demo tour →
              </Link>
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ──────────────── Email-only OTP form (default) ──────────────── */

function EmailOtpForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function startOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't send the code. Try again.");
        setLoading(false);
        return;
      }
      setStep("code");
      setInfo(`We just emailed a 6-digit code to ${email}. It expires in 10 minutes.`);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("email-otp", {
      email,
      otp,
      redirect: false,
      callbackUrl: next,
    });
    if (!res || res.error) {
      setLoading(false);
      setError("That code didn't match (or expired). Try again, or send a new code.");
      return;
    }
    router.push(res.url || next);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-950">
        {step === "email" ? "Sign in." : "Enter your code."}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {step === "email"
          ? "No password. We email you a one-time code. Same email creates your account if you don't have one yet."
          : "Check your inbox. Code's good for 10 minutes."}
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}
      {info && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
          <p>{info}</p>
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={startOtp} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Email</span>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@business.com"
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Sending the code…" : (<>Email me a code <ArrowRight className="h-4 w-4" /></>)}
          </button>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            By signing in, you agree to The LeadFlow Pro's{" "}
            <Link href="/legal" className="hover:underline">terms</Link>.
            Already paying? Same email gets you in.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">6-digit code</span>
            <div className="mt-1 relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-3 text-lg font-mono tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 disabled:opacity-60"
          >
            {loading ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setError(null); setInfo(null); }}
              className="hover:underline"
            >
              ← Use a different email
            </button>
            <button
              type="button"
              onClick={(e) => startOtp(e as unknown as React.FormEvent)}
              className="hover:underline"
            >
              Resend code
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ──────────────── Legacy email+password (admin/escape hatch) ──────────────── */

function LegacyPasswordForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: next,
    });
    if (!res || res.error) {
      setLoading(false);
      setError("That email and password didn't match. Try again.");
      return;
    }
    router.push(res.url || next);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-950">Legacy sign-in.</h1>
      <p className="mt-2 text-sm text-slate-600">
        Email + password. For admin / accounts created before email-only was wired.
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Email</span>
          <div className="mt-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@business.com"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Password</span>
          <div className="mt-1 relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={8}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Signing in…" : (<>Log in <ArrowRight className="h-4 w-4" /></>)}
        </button>
      </form>
    </div>
  );
}
