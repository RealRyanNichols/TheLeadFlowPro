import { Suspense } from "react";
import { ArrowUpRight, CandlestickChart } from "lucide-react";
import { RN1_DESK_URL } from "@/lib/rn1Desk";
import Rn1DeskLive from "./Rn1DeskLive";
import Rn1FullScreenButton from "./Rn1FullScreenButton";

const FRAME_ID = "rn1-desk-frame";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

/**
 * The frame may run the desk's own scripts on its own origin (it polls its
 * data.json every minute), open its share links in a new tab, and download its
 * share cards. It can never navigate or script this page.
 */
export const RN1_FRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads";

/** Holds the numbers' space while the desk is read, so the page does not jump. */
function NumbersLoading() {
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-0" aria-hidden="true">
      <div className="h-[38px] w-64 max-w-full animate-pulse rounded-full bg-[var(--fill-2)] motion-reduce:animate-none" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((slot) => (
          <div
            key={slot}
            className="h-[122px] animate-pulse rounded-2xl bg-[var(--fill-2)] motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The RN-1 trading desk inside the Command Center. The desk page lives on the
 * trading server. This panel shows its headline numbers, frames the live page,
 * and puts it in full screen with one click. On a phone the frame is skipped
 * and Open the desk goes straight to the page.
 */
export default function Rn1DeskPanel() {
  return (
    <section
      id="rn1-desk"
      aria-labelledby="rn1-desk-title"
      className="overflow-hidden rounded-[26px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_14px_36px_rgba(10,18,32,0.05)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[#e7f3ec] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#146c34] to-[#0e6f96] text-white shadow-sm">
            <CandlestickChart className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--green)]">
              Live trading desk
            </p>
            <h2 id="rn1-desk-title" className="text-2xl font-black tracking-tight text-[var(--heading)]">
              RN-1 Desk
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Rn1FullScreenButton
            frameId={FRAME_ID}
            href={RN1_DESK_URL}
            className={`hidden min-h-[44px] items-center gap-2 rounded-xl bg-[var(--blue)] px-4 text-sm font-black text-white hover:bg-[var(--blue-strong)] sm:inline-flex ${FOCUS}`}
          />
          <a
            href={RN1_DESK_URL}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-4 text-sm font-black text-[var(--heading)] hover:border-[var(--blue)] ${FOCUS}`}
          >
            Open the desk
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
      <p className="max-w-3xl px-5 pt-4 text-sm leading-6 text-[var(--muted)] sm:px-6">
        $100 of real money on Coinbase. The RN-1 engine trades it from its own DigitalOcean server, and every
        trade stays on the record.
      </p>
      <Suspense fallback={<NumbersLoading />}>
        <Rn1DeskLive />
      </Suspense>
      <div className="hidden px-5 pb-5 pt-4 sm:block sm:px-6 sm:pb-6">
        <iframe
          id={FRAME_ID}
          src={RN1_DESK_URL}
          title="RN-1 Desk live view"
          loading="lazy"
          sandbox={RN1_FRAME_SANDBOX}
          allow="clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
          className="block h-[640px] w-full rounded-2xl border border-[var(--line)] bg-[#edf1f5] lg:h-[760px]"
        />
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          The live page from the trading server. It refreshes itself every minute. Scroll inside it for the
          chart, the watch list, and every trade.
        </p>
      </div>
    </section>
  );
}
