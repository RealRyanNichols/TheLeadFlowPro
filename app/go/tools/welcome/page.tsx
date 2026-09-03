import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";
import BillingPortalButton from "./BillingPortalButton";
import PurchasePing from "@/components/PurchasePing";

export const dynamic = "force-dynamic";

export default async function ToolStudioWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  return (
    <main className="min-h-screen bg-[#050b19] px-4 py-20 text-slate-200">
      <PurchasePing sessionId={sessionId} />
      <div className="mx-auto max-w-3xl rounded-[28px] border border-emerald-400/30 bg-[#0b172b] p-7 sm:p-11">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" aria-hidden="true" />
        <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-cyan-300">Payment received</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-white sm:text-5xl">Now we lock the tool before we build it.</h1>
        <p className="mt-5 text-lg leading-8 text-slate-300">Ryan will contact you within one business day. Do not send passwords. We will request account access through the platform's approved collaborator or invitation flow.</p>
        <h2 className="mt-8 text-xl font-extrabold text-white">Have these ready:</h2>
        <ul className="mt-4 grid gap-3 leading-6 text-slate-400">
          <li>• The one decision the tool should help your customer make.</li>
          <li>• The facts, formulas, rules, or outcomes it must use.</li>
          <li>• Your approved logo, colors, photos, offer, and contact details.</li>
          <li>• The inbox or CRM that should receive a captured lead.</li>
        </ul>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/contact" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-black uppercase tracking-wider text-white">Send a Project Note <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/go/tools/manage" className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 font-black text-white">Manage Next Month</Link>
          <Suspense fallback={null}>
            <BillingPortalButton />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
