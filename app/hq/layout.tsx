import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
export const metadata = PRIVATE_PAGE_METADATA;

import SignOutButton from "@/components/SignOutButton";
import { getHqSession } from "@/lib/hq/session";
import HqNav from "./_components/HqNav";
import { planBadge } from "./_components/plan";

// The shell around every HQ page: which business you are in, what the plan
// is doing, and the six places you can go. A person with no workspace yet
// (the setup wizard) and a person with no session at all (the public
// thank-you page) get the bare page, because there is nothing true to put
// in the bar for them.

export const dynamic = "force-dynamic";

export default async function HqLayout({ children }: { children: React.ReactNode }) {
  let workspace = null;
  try {
    const session = await getHqSession();
    workspace = session?.workspace ?? null;
  } catch {
    workspace = null;
  }
  const badge = workspace ? planBadge(workspace) : null;

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      {workspace && badge && (
        <header className="border-b border-[var(--line)] bg-[var(--panel)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 pb-3 pt-5">
            <div className="min-w-0">
              <p className="hq-eyebrow">Your HQ</p>
              <h2 className="truncate text-lg font-black tracking-tight text-[var(--heading)]">{workspace.name}</h2>
            </div>
            <span className="hq-pill" data-tone={badge.tone === "neutral" ? undefined : badge.tone}>
              {badge.label}
            </span>
            <div className="ml-auto">
              <SignOutButton className="hq-btn hq-btn-sm" />
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-2">
            <HqNav />
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
