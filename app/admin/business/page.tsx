import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { redirect } from "next/navigation";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";
import {
  businessSsoUrl,
  dashboardUserFor,
  mintBusinessTicket,
  readBusinessDashboardConfig,
} from "@/lib/businessDashboard";
import BusinessFullScreenButton from "./BusinessFullScreenButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Business | The LeadFlow Pro" };

const FRAME_ID = "business-dashboard-frame";
/** Signs a fresh ticket and opens the dashboard in its own tab. */
const OPEN_HREF = "/admin/business/open";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

/**
 * The frame runs the dashboard's own scripts on its own origin, sends its own
 * forms, downloads its video files and copies its invoice links. It can never
 * script this page, and it can only send this tab back to the Back Office when
 * someone clicks a link inside it.
 */
const FRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-top-navigation-by-user-activation";

/**
 * The owner dashboard from the DigitalOcean server, inside the Back Office.
 * Money moves, invoices, bank deposits, the forecast, every website and the
 * server's health, signed in with the same Back Office login.
 */
export default async function BusinessPage() {
  let email: string | undefined;
  try {
    ({
      user: { email },
    } = await requireOperatorAdmin());
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      redirect(error.status === 401 ? "/login?next=/admin/business" : "/dashboard");
    }
    throw error;
  }

  const config = readBusinessDashboardConfig();
  const dashboardUser = config ? dashboardUserFor(config, email) : null;
  // A fresh one-time ticket for this page view. The frame spends it as it loads.
  const frameSrc =
    config && dashboardUser
      ? businessSsoUrl(config.origin, mintBusinessTicket(dashboardUser, config.secret), "frame")
      : null;

  return (
    <section
      aria-labelledby="business-title"
      className="overflow-hidden rounded-[26px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_14px_36px_rgba(10,18,32,0.05)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--accent-tint)] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--blue)] text-white shadow-sm">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--blue)]">
              DigitalOcean server
            </p>
            <h2 id="business-title" className="text-2xl font-black tracking-tight text-[var(--heading)]">
              Business
            </h2>
          </div>
        </div>
        {frameSrc ? (
          <div className="flex flex-wrap items-center gap-2">
            <BusinessFullScreenButton
              frameId={FRAME_ID}
              fallbackHref={OPEN_HREF}
              className={`hidden min-h-[44px] items-center gap-2 rounded-xl bg-[var(--blue)] px-4 text-sm font-black text-white hover:bg-[var(--blue-strong)] sm:inline-flex ${FOCUS}`}
            />
            <a
              href={OPEN_HREF}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-4 text-sm font-black text-[var(--heading)] hover:border-[var(--blue)] ${FOCUS}`}
            >
              Open in its own tab
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : null}
      </div>
      <p className="max-w-3xl px-5 pt-4 text-sm leading-6 text-[var(--muted)] sm:px-6">
        Money moves to make today, invoices, bank deposits, the month&apos;s forecast, every website and the
        server&apos;s health. It runs on the DigitalOcean server and opens here with your Back Office login.
      </p>
      {frameSrc ? (
        <>
          <div className="hidden px-5 pb-5 pt-4 sm:block sm:px-6 sm:pb-6">
            <iframe
              id={FRAME_ID}
              src={frameSrc}
              title="Business dashboard"
              sandbox={FRAME_SANDBOX}
              allow="clipboard-write"
              referrerPolicy="no-referrer"
              className="block h-[78vh] min-h-[640px] w-full rounded-2xl border border-[var(--line)] bg-[var(--page)]"
            />
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              The live dashboard from the DigitalOcean server. What you do in it saves there. If it asks you to sign
              in, this browser blocked the sign in inside the frame. Use Open in its own tab.
            </p>
          </div>
          <p className="px-5 pb-5 pt-3 text-sm leading-6 text-[var(--muted)] sm:hidden">
            On a phone the dashboard opens in its own tab. Tap Open in its own tab above.
          </p>
        </>
      ) : (
        <div className="px-5 pb-6 pt-4 sm:px-6">
          <p className="rounded-2xl border border-[var(--line)] bg-[var(--fill-2)] px-4 py-3 text-sm leading-6 text-[var(--text)]">
            {config
              ? `This Back Office login (${email ?? "no email"}) is not linked to a dashboard user yet.`
              : "The Business dashboard is not connected to this server yet."}
          </p>
        </div>
      )}
    </section>
  );
}
