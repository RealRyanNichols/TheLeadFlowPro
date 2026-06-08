import Link from "next/link";
import { ArrowRight, Coins } from "lucide-react";
import type { WeirdPurchaseProduct } from "@/lib/weird-stats";

export function UnlockCard({ product }: { product: WeirdPurchaseProduct }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-300/30 bg-accent-300/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-accent-100">
            <Coins className="h-3.5 w-3.5" />
            Micropurchase
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-white">{product.label}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{product.body}</p>
      <Link
        href={`/request?product=${product.key}`}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
      >
        {product.checkoutLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
