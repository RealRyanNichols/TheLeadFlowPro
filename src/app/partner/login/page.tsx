import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Handshake, ShieldCheck, UploadCloud } from "lucide-react";
import { PartnerAuthPanel } from "@/components/partner/PartnerAuthPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Login | The LeadFlow Pro",
  description: "Partner login for source contributors, affiliates, agencies, data partners, and niche operators.",
  robots: {
    index: false,
    follow: false,
  },
};

function safeNext(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "/partner";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    if (value.startsWith("/") && !value.startsWith("//")) return value;
  }
  return "/partner";
}

export default function PartnerLoginPage({ searchParams }: { searchParams?: { next?: string | string[] } }) {
  const next = safeNext(searchParams?.next);
  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, rgba(45,212,191,0.22), transparent 32%), radial-gradient(circle at 88% 8%, rgba(255,154,31,0.16), transparent 30%), linear-gradient(135deg, #050918 0%, #07111f 48%, #111008 100%)",
        }}
      />
      <header className="relative border-b border-white/10 bg-ink-950/75 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-bold tracking-tight text-white hover:text-cyan-300">
            The LeadFlow Pro
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/submit-source" className="hidden rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10 sm:inline-flex">
              Submit source
            </Link>
            <Link href="/" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-ink-200 hover:bg-white/5 hover:text-white">
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <section className="relative container grid min-h-[calc(100vh-4rem)] gap-8 py-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-center lg:py-10">
        <div className="lead-shell p-5 shadow-2xl shadow-cyan-950/30 sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-300">
            <Handshake className="h-3.5 w-3.5" /> Partner access
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Open the partner desk.</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-200">
            Source contributors, agencies, creators, local operators, affiliates, and data partners can track submissions, review status, marketplace interest, and review-gated earnings.
          </p>
          <div className="mt-6">
            <PartnerAuthPanel next={next.startsWith("/partner") ? next : "/partner"} />
          </div>
        </div>

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
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Partner rules</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
              Proof, permission, risk, suppression, and buyer use case come first.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-200 sm:text-base">
              Your source does not become sellable just because you submit it. The platform has to review where it came from, what rights exist, what risk is attached, and how buyers may use it.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <PartnerRule icon={UploadCloud} title="Submit sources" body="Lists, routes, websites, directories, audiences, and niche market clues can enter review." />
              <PartnerRule icon={ShieldCheck} title="Block bad data" body="No hacked, leaked, login-only, minors, private medical, private financial, protected-trait, or unclear-permission data." />
              <PartnerRule icon={Handshake} title="Track review" body="See source status, risk level, marketplace status, buyer interest, and visible admin notes." />
              <PartnerRule icon={ArrowRight} title="No guarantee" body="Not every source becomes a paid product, and revenue share is not guaranteed." />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function PartnerRule({ icon: Icon, title, body }: { icon: typeof UploadCloud; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <h3 className="mt-3 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-300">{body}</p>
    </div>
  );
}
