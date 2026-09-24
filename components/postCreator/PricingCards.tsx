import Link from "next/link";
import { Check } from "lucide-react";
import { PRICING, closedMessage } from "@/app/post-creator/copy";
import { POST_CREATOR } from "@/lib/postCreator/product";
import { BuyButton } from "./BuyButtons";

// The two paid plans on /post-creator. A server component: the page decides
// whether sales are open and whether AI writing is on, from the server's
// environment, and this renders buy buttons only when both are true. While
// sales are closed there is no button at all, just the line that says why.

export default function PricingCards({ salesOpen, aiOn, cancelled }: { salesOpen: boolean; aiOn: boolean; cancelled: boolean }) {
  return (
    <div>
      {cancelled ? (
        <p role="status" className="mb-5 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] px-4 py-3 text-[15px] font-bold text-[var(--heading)]">
          {PRICING.cancelled}
        </p>
      ) : null}

      <h2 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[34px]">{PRICING.title}</h2>
      <p className="mt-2 text-[17px] leading-relaxed text-[var(--muted)]">{PRICING.sub}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PRICING.plans.map((p) => (
          <article key={p.plan} className="flex flex-col rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--cb-shadow)]">
            <h3 className="text-[18px] font-extrabold text-[var(--heading)]">{p.name}</h3>
            <p className="mt-2 flex items-baseline gap-2 text-[var(--heading)]">
              <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em]">{p.price}</span>
              <span className="text-[16px] font-bold text-[var(--muted)]">{p.per}</span>
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--text)]">{p.note}</p>
            <ul className="mt-4 space-y-2.5">
              {p.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-[15px] leading-snug text-[var(--text)]">
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--green)]" />
                  {b}
                </li>
              ))}
            </ul>
            {salesOpen ? (
              <div className="mt-auto pt-5">
                <BuyButton plan={p.plan} label={p.button} className="button-primary w-full" />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-[var(--text)]">
        {salesOpen ? null : (
          <p className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] px-4 py-3 font-bold text-[var(--heading)]">{closedMessage(aiOn)}</p>
        )}
        {aiOn ? <p className="font-bold text-[var(--green)]">{PRICING.aiOn}</p> : null}
        <p>{PRICING.writeLine}</p>
        {PRICING.fine.map((line) => (
          <p key={line} className="text-[14px] text-[var(--muted)]">
            {line}
          </p>
        ))}
        <p className="text-[14px] text-[var(--muted)]">
          {PRICING.checkout}{" "}
          <Link href={POST_CREATOR.termsPath} className="inline-flex min-h-[44px] items-center font-bold text-[var(--blue)] underline underline-offset-4">
            {PRICING.termsLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
