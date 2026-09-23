import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

// SellerProof — the chargeback evidence-packet builder for e-commerce sellers.
// Runs as its own app under the LeadFlow Pro umbrella at
// sellerproof.theleadflowpro.com; this card is the hub's doorway to it.
export const SELLERPROOF_URL = "https://sellerproof.theleadflowpro.com";

const sellerProofLink = `${SELLERPROOF_URL}/?utm_source=theleadflowpro&utm_medium=tools_hub&utm_campaign=sellerproof`;

const points = [
  "Free checklist + missing-evidence scanner, no account needed",
  "Members: unlimited packets, response drafts, PDF export, evidence library",
  "$20/month or $97 once — same access either way",
];

export function SellerProofPromo() {
  return (
    <section className="py-14 md:py-20" aria-labelledby="sellerproof-heading">
      <div className="container">
        <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.16),transparent_36%),linear-gradient(135deg,#050a16_0%,#0a1224_60%,#0d1020_100%)] p-8 md:p-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                App from The LeadFlow Pro
              </p>
              <h2 id="sellerproof-heading" className="mt-6 text-3xl font-black leading-tight text-white md:text-5xl">
                SellerProof: build a clean chargeback evidence packet before the deadline hits.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-200">
                For Shopify, Stripe, PayPal, Square, Etsy and Amazon sellers. Organize receipts, tracking,
                messages, policies and timelines into a dispute packet you review and submit yourself.
                It does not submit disputes or guarantee an outcome.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-ink-100">
                {points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-bold text-white">Open SellerProof</p>
              <p className="text-sm text-ink-200">
                Runs at <span className="font-mono text-cyan-200">sellerproof.theleadflowpro.com</span>. Start with the
                free checklist; membership unlocks the full toolkit.
              </p>
              <Link href={sellerProofLink} className="btn-accent mt-2 inline-flex items-center justify-center gap-2">
                Build a packet
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href={`${SELLERPROOF_URL}/pricing`} className="text-center text-sm text-ink-100 underline hover:text-white">
                See membership pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
