import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  FileText,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { LightHeader } from "@/components/site/LightHeader";
import { OFFERS, type OfferSlug } from "@/lib/offers";
import { getOfferWorkload } from "@/lib/workload";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Next Step - The LeadFlow Pro",
  description: "Open your client office, send intake, and track the work after purchase.",
  path: "/start/thank-you",
  imageTitle: "Next Step",
  imageSubtitle: "Open your client office, send intake, and track the work after purchase.",
  noIndex: true,
});

function str(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ThankYouPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const source = str(searchParams?.source);
  const slug = str(searchParams?.slug) as OfferSlug | undefined;
  const offer = slug ? OFFERS[slug] : null;
  const workload = slug ? getOfferWorkload(slug) : null;
  const paid = source === "stripe" || source === "checkout" || Boolean(slug);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-950">
      <LightHeader />

      <main className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-28 top-4 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.50) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-28 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.36) 0%, transparent 65%)" }}
        />

        <section className="relative mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-12">
          <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> {paid ? "Payment received" : "Router received"}
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {paid ? "Now claim the client office." : "Now open the client office."}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
              {offer
                ? `You picked ${workload?.label || offer.metaTitle}. The next move is getting your login, intake, files, messages, and delivery path into one place.`
                : "The next move is getting your login, intake, files, messages, and delivery path into one place."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link
                href="/login?callbackUrl=%2Fdashboard%2Fwork"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800"
              >
                Open office <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/25 hover:bg-accent-400"
              >
                Send intake <FileText className="h-4 w-4" />
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-4 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                Book/check call <CalendarClock className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <NextStep
                icon={LockKeyhole}
                title="Use the checkout email"
                body="If you paid through Stripe, use the same email. That is how the work order links to your client office."
              />
              <NextStep
                icon={BriefcaseBusiness}
                title="Watch the work order"
                body="Status, due date, estimated hours, completed hours, and what Ryan needs next all live in the office."
              />
              <NextStep
                icon={MessageSquareText}
                title="Send context once"
                body="Put account links, Drive folders, screenshots, decisions, and notes into the work order instead of scattering them."
              />
              <NextStep
                icon={ShieldCheck}
                title="Ryan reviews before delivery"
                body="Customer-facing work stays human-reviewed until Ryan intentionally flips the automation switch."
              />
            </div>
          </div>

          <aside className="rounded-3xl border border-white/60 bg-slate-950 p-6 text-white shadow-[0_30px_70px_-20px_rgba(15,23,42,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              Workload sync
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              {workload ? workload.label : "Client back office"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {workload
                ? `${workload.reserveHours} hours reserve against Ryan's live capacity meter, with a ${workload.deliveryMaxDays}-business-day delivery window where that guarantee applies.`
                : "After checkout or manual admin entry, the order reserves real capacity and shows up in the client office."}
            </p>

            <div className="mt-6 space-y-3">
              <Metric label="Capacity" value={workload ? `${workload.reserveHours} hrs` : "Synced"} />
              <Metric label="Delivery window" value={workload ? `${workload.deliveryMinDays}-${workload.deliveryMaxDays} business days` : "By order"} />
              <Metric label="Status starts as" value="Intake needed" />
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <p className="text-sm font-semibold text-cyan-100">No agency hostage game.</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                The system, accounts, follow-up, leads, ads, and process should be yours. The office is built to show what is being created and what still needs a decision.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof LockKeyhole;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <Icon className="h-5 w-5 text-cyan-600" />
      <p className="mt-3 font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
