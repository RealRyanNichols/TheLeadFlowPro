"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// When the lead record fails to render, say so in plain words: it could not
// be shown, nothing was changed, and the lead is not empty. It does not guess
// at a cause (a failed read is handled on the page itself, so a failure here
// is as likely a bug as a dropped connection). The error's own message is
// never shown, so no detail about the record or the server reaches the
// screen. Try again reloads the server data, then the page.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

export default function LeadRecordError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      <div className="card !p-4" role="alert">
        <h2 className="text-lg font-black text-[var(--heading)]">The lead record could not be shown.</h2>
        <p className="my-3 text-sm text-[var(--text)]">Nothing was changed, and the lead is not empty. Try again in a moment.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={retrying}
            onClick={() =>
              startRetry(() => {
                router.refresh();
                reset();
              })
            }
            className={`inline-flex min-h-[44px] items-center rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${FOCUS}`}
          >
            {retrying ? "Trying again…" : "Try again"}
          </button>
          <Link href="/admin" className={`inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`}>
            Back to leads
          </Link>
        </div>
      </div>
    </div>
  );
}
