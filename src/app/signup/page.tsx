"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import {
  ArrowRight, Mail, Lock, User, Building2, Chrome, AlertCircle, CheckCircle2
} from "lucide-react";
import { Logo, FunnelMark } from "@/components/site/Logo";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const signupRes = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, businessName })
    });
    const data = await signupRes.json().catch(() => ({}));
    if (!signupRes.ok) {
      setError(data.error || "Couldn't create your account. Try again.");
      setLoading(false);
      return;
    }

    // Sign them in right away so they land in the dashboard.
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard/onboarding"
    });
    if (!signInRes || signInRes.error) {
      setError("Account created, but auto-login failed. Try logging in manually.");
      setLoading(false);
      router.push("/login");
      return;
    }
    router.push(signInRes.url || "/dashboard/onboarding");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
        <div className="container h-16 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-ink-300 hover:text-white">
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex-1 grid md:grid-cols-2">
        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              Start free
            </h1>
            <p className="mt-2 text-sm text-ink-300">
              No card, no trial timer, no BS. Free forever if you stay on it.
            </p>

            <ul className="mt-4 space-y-1.5 text-xs text-ink-200">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-lead-400" /> Lead Inbox (50 leads/mo)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-lead-400" /> Missed-Call Text-Back</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-lead-400" /> Weekly AI recap</li>
            </ul>

            {error && (
              <div className="mt-5 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-ink-100">{error}</p>
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-3">
              <label className="block">
                <span className="text-xs text-ink-300 font-semibold">Your name</span>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Ryan Nichols"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs text-ink-300 font-semibold">Business name</span>
                <div className="mt-1 relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoComplete="organization"
                    placeholder="Premier Dental of Longview"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs text-ink-300 font-semibold">Email</span>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@business.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs text-ink-300 font-semibold">Password</span>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </label>

              <button type="submit" disabled={loading} className="btn-accent w-full text-sm py-2.5 disabled:opacity-60">
                {loading ? "Setting things up…" : (<>Create account <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[11px] text-ink-400">
              <div className="flex-1 h-px bg-white/10" />
              OR
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard/onboarding" })}
              className="btn-ghost w-full text-sm py-2.5 justify-center"
            >
              <Chrome className="h-4 w-4" /> Sign up with Google
            </button>

            <p className="mt-6 text-sm text-ink-300 text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-cyan-400 font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </section>

        <aside className="hidden md:flex relative overflow-hidden items-center justify-center border-l border-white/5">
          <div className="absolute inset-0 bg-promo-glow" />
          <div className="absolute inset-0 bg-grid-fade" />
          <div className="relative text-center px-10">
            <FunnelMark className="h-20 w-20 mx-auto drop-shadow-[0_0_40px_rgba(35,184,255,0.55)]" />
            <p className="mt-6 text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              The LeadFlow Pro
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white leading-tight">
              Stop missing leads. <span className="funnel-text">Start closing them.</span>
            </h2>
            <p className="mt-4 text-sm text-ink-200 max-w-sm">
              Every call, text, form, and DM in one place. AI tells you what to do next. You decide. You close.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
