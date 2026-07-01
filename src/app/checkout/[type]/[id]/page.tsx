import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { CHECKOUT_TYPES, getCheckoutPageData, type LeadFlowCheckoutType } from "@/lib/leadflow-checkout";
import { CheckoutOrderPanel } from "./CheckoutOrderPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout | The LeadFlow Pro",
  description: "Review-gated checkout for LeadFlow lead signal products, samples, and data access.",
  robots: {
    index: false,
    follow: false,
  },
};

function validType(type: string): type is LeadFlowCheckoutType {
  return CHECKOUT_TYPES.includes(type as LeadFlowCheckoutType);
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
}

export default async function LeadFlowCheckoutPage({ params }: { params: { type: string; id: string } }) {
  if (!validType(params.type)) notFound();
  const data = await getCheckoutPageData(params.type, decodeURIComponent(params.id));
  const { product, buyerData } = data;

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 8%, rgba(35,184,255,0.20), transparent 30%), radial-gradient(circle at 86% 14%, rgba(255,186,61,0.14), transparent 28%), linear-gradient(135deg,#030711 0%,#070b14 52%,#101008 100%)",
        }}
      />
      <div className="relative">
        <header className="border-b border-white/10 bg-ink-950/78 backdrop-blur-xl">
          <div className="container flex min-h-16 items-center justify-between gap-3 py-3">
            <Link href="/" className="text-sm font-black tracking-tight text-white hover:text-cyan-300 sm:text-base">
              The LeadFlow Pro
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/marketplace" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-ink-200 hover:bg-white/[0.04] hover:text-white">
                Marketplace
              </Link>
              <Link href="/buyer/orders" className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15">
                Orders
              </Link>
            </div>
          </div>
        </header>

        <section className="container py-8 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="lead-shell overflow-hidden p-5 md:p-7">
              <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                <LockKeyhole className="h-4 w-4" />
                Review-gated checkout
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-normal text-white md:text-6xl">
                {product.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink-200 md:text-lg md:leading-8">
                {product.description}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Amount" value={formatMoney(product.amount)} />
                <Metric label="Access" value={product.accessLevel.replace(/_/g, " ")} />
                <Metric label="Review" value={product.requiresManualReview ? "manual" : "eligible"} />
                <Metric label="Status" value={product.status.replace(/_/g, " ")} />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="What this purchase can do"
                  body={product.allowedUse}
                  tone="cyan"
                />
                <InfoCard
                  icon={<AlertTriangle className="h-5 w-5" />}
                  title="What this purchase cannot do"
                  body={product.restrictedUse}
                  tone="amber"
                />
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap gap-2">
                  {product.fieldGroups.map((field) => (
                    <span key={field} className="rounded-full border border-white/10 bg-ink-950/70 px-3 py-1 text-xs font-bold text-ink-200">
                      {field.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-300">{product.buyerWarning}</p>
              </div>

              {data.loadErrors.length ? (
                <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
                  {data.loadErrors[0]}
                </div>
              ) : null}
            </div>

            <aside className="lead-shell p-5 md:p-6 lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Order path</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{product.nextAction}</h2>
                </div>
                <CheckCircle2 className="h-6 w-6 text-lead-300" />
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-300">
                Payment starts an audited order. Access is granted only when the order clears buyer status, listing availability, suppression, source proof, and review rules.
              </p>
              {!buyerData.authenticated ? (
                <div className="mt-5 rounded-xl border border-accent-300/30 bg-accent-300/10 p-4">
                  <p className="text-sm font-bold text-accent-100">Buyer login required.</p>
                  <p className="mt-2 text-sm leading-6 text-ink-200">
                    Create or log in to a buyer account before checkout. A login alone does not reveal full lead data.
                  </p>
                  <Link href={`/login?mode=buyer&next=/checkout/${product.type}/${encodeURIComponent(product.id)}`} className="btn-accent mt-4 w-full justify-center text-sm">
                    Log in to continue
                  </Link>
                </div>
              ) : (
                <CheckoutOrderPanel product={product} buyerAccountStatus={buyerData.accountStatus} />
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-lg font-black capitalize text-white">{value}</p>
    </div>
  );
}

function InfoCard({ icon, title, body, tone }: { icon: ReactNode; title: string; body: string; tone: "cyan" | "amber" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "cyan" ? "border-cyan-300/20 bg-cyan-300/8" : "border-accent-300/20 bg-accent-300/8"}`}>
      <div className={`inline-flex rounded-lg p-2 ${tone === "cyan" ? "bg-cyan-300/12 text-cyan-200" : "bg-accent-300/12 text-accent-100"}`}>
        {icon}
      </div>
      <h3 className="mt-3 text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-300">{body}</p>
    </div>
  );
}
