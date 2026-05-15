"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  MessageSquareText,
  ShieldCheck,
  User,
  Building2,
} from "lucide-react";

type AuthMode = "signin" | "signup" | "code";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function safeNext(raw: string | null) {
  if (!raw) return "/dashboard/work";
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  }
  return "/dashboard/work";
}

function LoginLoadingFallback() {
  return (
    <div className="min-h-screen bg-ink-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-cyan-400/20 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Client Login
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Client portal access is loading.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-200">
          Current clients receive their private workspace link directly from Ryan.
          For access help, email Hello@TheLeadFlowPro.com.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/lead-leak-audit-197" className="btn-accent justify-center text-sm">
            Start the $197 audit
          </Link>
          <Link href="/" className="btn-ghost justify-center text-sm">
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const requested = params.get("mode");
  const initialMode: AuthMode = requested === "signup" || requested === "code" ? requested : "signin";
  const next = useMemo(
    () => safeNext(params.get("callbackUrl") || params.get("next")),
    [params],
  );
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return (
    <div className="min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, rgba(92,208,255,0.22), transparent 32%), radial-gradient(circle at 88% 8%, rgba(255,154,31,0.16), transparent 30%), linear-gradient(135deg, #050918 0%, #0a1124 44%, #0a1d3f 100%)",
        }}
      />

      <header className="relative border-b border-white/10 bg-ink-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="font-bold tracking-tight text-white hover:text-cyan-300">
            The LeadFlow Pro
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/book" className="hidden rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10 sm:inline-flex">
              Book call
            </Link>
            <Link href="/" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-ink-200 hover:bg-white/5 hover:text-white">
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-center lg:py-10">
        <section className="glass-strong rounded-3xl border border-cyan-400/20 p-5 shadow-2xl shadow-cyan-950/30 sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Member access
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Get into the back office.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-200">
            Sign in, create your account, or use an email code. Paid work, messages,
            intake, workload, payments, and Ryan review all connect here.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            <ModeButton active={mode === "signin"} onClick={() => setMode("signin")}>
              Log in
            </ModeButton>
            <ModeButton active={mode === "signup"} onClick={() => setMode("signup")}>
              Create
            </ModeButton>
            <ModeButton active={mode === "code"} onClick={() => setMode("code")}>
              Code
            </ModeButton>
          </div>

          <div className="mt-6">
            {mode === "signin" && <PasswordSignInForm next={next} onCode={() => setMode("code")} />}
            {mode === "signup" && <CreateAccountForm next={next} />}
            {mode === "code" && <EmailOtpForm next={next} />}
          </div>
        </section>

        <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 lg:p-8">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "46px 46px",
            }}
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              What unlocks after login
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
              A client office that proves the work is moving.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-200 sm:text-base">
              This is not a dead account page. It is the place where sales, workload,
              messages, files, data, payment status, and next actions stay tied together.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <AccessCard
                icon={BriefcaseBusiness}
                title="Work orders"
                body="Stripe and manual orders show status, due date, hours used, and what Ryan needs next."
              />
              <AccessCard
                icon={MessageSquareText}
                title="Direct updates"
                body="Send links, files, screenshots, decisions, and context back into the order."
              />
              <AccessCard
                icon={BadgeDollarSign}
                title="Purchases"
                body="Add work blocks, open billing, or reserve a build slot without losing the thread."
              />
              <AccessCard
                icon={KeyRound}
                title="Data tools"
                body="Decision tools help the owner see leaks, follow-up gaps, and the next move."
              />
            </div>

            <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                <div>
                  <p className="font-semibold text-white">Paid buyer path</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-200">
                    Use the same email you used at checkout. If email-code delivery is not
                    configured yet, create a password account before buying or message Ryan so
                    the order can be manually linked to your login.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function PasswordSignInForm({ next, onCode }: { next: string; onCode: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: next,
    });
    if (!res || res.error) {
      setError("That email and password did not match. Try the email-code tab if Stripe created the account first.");
      setLoading(false);
      return;
    }
    router.push(res.url || next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormNotice>
        Best path for clients and admins: email + password. Email codes stay available as the fallback.
      </FormNotice>
      {error && <ErrorBox>{error}</ErrorBox>}
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        icon={Mail}
        placeholder="you@business.com"
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        icon={Lock}
        placeholder="At least 8 characters"
      />
      <button type="submit" disabled={loading} className="btn-accent w-full disabled:opacity-60">
        {loading ? "Opening office..." : <>Open my office <ArrowRight className="h-4 w-4" /></>}
      </button>
      <button
        type="button"
        onClick={onCode}
        className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-ink-200 hover:bg-white/5 hover:text-white"
      >
        Email me a one-time code instead
      </button>
    </form>
  );
}

function CreateAccountForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, businessName }),
      });
      const data = await signupRes.json().catch(() => ({}));
      if (!signupRes.ok) {
        setError(data?.error || "Account could not be created. Try signing in.");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: next,
      });
      if (!signInRes || signInRes.error) {
        setError("Account created, but auto-login failed. Try logging in with the password you just set.");
        setLoading(false);
        return;
      }
      router.push(signInRes.url || next);
      router.refresh();
    } catch {
      setError("Network issue. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormNotice>
        Create access before or after purchase. Stripe can attach later; login should not wait on payment wiring.
      </FormNotice>
      {error && <ErrorBox>{error}</ErrorBox>}
      <TextField
        label="Your name"
        type="text"
        value={name}
        onChange={setName}
        autoComplete="name"
        icon={User}
        placeholder="Ryan Nichols"
      />
      <TextField
        label="Business name"
        type="text"
        value={businessName}
        onChange={setBusinessName}
        autoComplete="organization"
        icon={Building2}
        placeholder="Your business name"
        required={false}
      />
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        icon={Mail}
        placeholder="you@business.com"
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        icon={Lock}
        placeholder="At least 8 characters"
        minLength={8}
      />
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Creating office..." : <>Create account <ArrowRight className="h-4 w-4" /></>}
      </button>
      <p className="text-center text-xs leading-relaxed text-ink-400">
        By creating access, you agree to the{" "}
        <Link href="/legal" className="font-semibold text-cyan-300 hover:underline">
          engagement terms
        </Link>
        .
      </p>
    </form>
  );
}

function EmailOtpForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function startOtp(event?: React.FormEvent) {
    event?.preventDefault();
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
        setError(data?.error || "The code could not be sent. Use password login or message Ryan.");
        setLoading(false);
        return;
      }
      setStep("code");
      setInfo(`Code sent to ${email}. It expires in 10 minutes.`);
    } catch {
      setError("Network issue. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("email-otp", {
      email,
      otp,
      redirect: false,
      callbackUrl: next,
    });
    if (!res || res.error) {
      setError("That code did not match or expired.");
      setLoading(false);
      return;
    }
    router.push(res.url || next);
    router.refresh();
  }

  return step === "email" ? (
    <form onSubmit={startOtp} className="space-y-4">
      <FormNotice>
        Use this if Stripe created your account from checkout before you set a password.
      </FormNotice>
      {error && <ErrorBox>{error}</ErrorBox>}
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        icon={Mail}
        placeholder="same email used at checkout"
      />
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Sending code..." : <>Email me a code <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  ) : (
    <form onSubmit={verifyOtp} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}
      {info && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
          {info}
        </div>
      )}
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">6-digit code</span>
        <div className="relative mt-2">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full rounded-xl border border-white/10 bg-ink-950/70 py-3 pl-9 pr-4 font-mono text-lg tracking-[0.4em] text-white outline-none placeholder:text-ink-600 focus:border-cyan-400"
          />
        </div>
      </label>
      <button type="submit" disabled={loading || otp.length !== 6} className="btn-accent w-full disabled:opacity-60">
        {loading ? "Opening office..." : <>Verify and enter <ArrowRight className="h-4 w-4" /></>}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setOtp("");
          setError(null);
          setInfo(null);
        }}
        className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-ink-200 hover:bg-white/5 hover:text-white"
      >
        Use a different email
      </button>
    </form>
  );
}

function TextField({
  label,
  type,
  value,
  onChange,
  icon: Icon,
  placeholder,
  autoComplete,
  required = true,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof Mail;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">{label}</span>
      <div className="relative mt-2">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-ink-950/70 py-3 pl-9 pr-4 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-400"
        />
      </div>
    </label>
  );
}

function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-relaxed text-ink-200">
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
      <p>{children}</p>
    </div>
  );
}

function AccessCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BriefcaseBusiness;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-950/45 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <p className="font-bold text-white">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">{body}</p>
    </div>
  );
}
